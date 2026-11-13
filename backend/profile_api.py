"""Account-owned identity and contact details."""
import json
import re
import sqlite3
import psycopg
from flask import Blueprint, current_app, jsonify, request, session
from werkzeug.security import check_password_hash
from database import get_db_connection

profile_bp = Blueprint('customer_profile', __name__)
FIELDS = {'first_name':80, 'last_name':80, 'phone':40, 'address_line1':160,
          'address_line2':160, 'city':100, 'region':100, 'postal_code':24, 'country':80}


def initialize_profile_schema():
    from password_reset_api import setup
    setup()
    db = get_db_connection()
    try:
        db.execute("""CREATE TABLE IF NOT EXISTS user_profiles (
            user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            profile_data TEXT NOT NULL DEFAULT '{}'
        )""")
        db.commit()
    finally:
        db.close()


def profile_details(user, row):
    stored = json.loads(row['profile_data']) if row else {}
    parts = user['name'].split(maxsplit=1)
    result = {key: stored.get(key, '') for key in FIELDS}
    result['first_name'] = stored.get('first_name', parts[0] if parts else '')
    result['last_name'] = stored.get('last_name', parts[1] if len(parts) > 1 else '')
    return {**result, 'name':user['name'], 'email':user['email'], 'role':user['role']}


@profile_bp.route('/api/me/profile', methods=['GET','PUT'])
def profile():
    uid = session.get('user_id')
    if not uid:
        return jsonify(error='Authentication required'), 401
    payload = request.get_json(silent=True) if request.method == 'PUT' else None
    if request.method == 'PUT' and not isinstance(payload, dict):
        return jsonify(error='Invalid request'), 400
    db = get_db_connection()
    try:
        user = db.execute('SELECT id,name,email,role,password_hash,access_version FROM users WHERE id=?',(uid,)).fetchone()
        if not user:
            return jsonify(error='Account not found'), 404
        row = db.execute('SELECT profile_data FROM user_profiles WHERE user_id=?',(uid,)).fetchone()
        result = profile_details(user, row)
        if request.method == 'GET':
            response = jsonify(result)
            response.headers['Cache-Control'] = 'no-store'
            return response
        if not set(payload).intersection(set(FIELDS) | {'name','email'}):
            return jsonify(error='No profile changes provided'), 400
        if 'name' in payload and not {'first_name','last_name'}.intersection(payload):
            full = payload['name']
            if not isinstance(full,str) or not 2 <= len(full.strip()) <= 161:
                return jsonify(error='Enter your first and last name'), 400
            parts = full.strip().split(maxsplit=1)
            payload = {**payload, 'first_name':parts[0], 'last_name':parts[1] if len(parts)>1 else ''}
        for field, limit in FIELDS.items():
            if field not in payload: continue
            value = payload[field]
            if not isinstance(value,str) or len(value) > limit:
                return jsonify(error=f'{field.replace("_"," ").capitalize()} must be at most {limit} characters'), 400
            result[field] = ' '.join(value.split())
        if not result['first_name'] or not result['last_name']:
            return jsonify(error='Enter both your first and last name'), 400
        if result['phone'] and not re.fullmatch(r'[0-9+(). xX#-]{3,40}',result['phone']):
            return jsonify(error='Enter a valid phone number'), 400
        name = result['first_name'] + ' ' + result['last_name']
        email = payload.get('email',user['email'])
        if not isinstance(email,str) or len(email)>254 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email.strip()):
            return jsonify(error='Enter a valid email address'),400
        email = email.strip().lower()
        email_changed = email != user['email'].lower()
        if email_changed:
            password = payload.get('current_password')
            if not isinstance(password,str) or not check_password_hash(user['password_hash'],password):
                return jsonify(error='Enter your current password to change your login email'),400
            if db.execute('SELECT id FROM users WHERE lower(email)=? AND id<>?',(email,uid)).fetchone():
                return jsonify(error='Email already in use'),409
        db.execute('UPDATE users SET name=?,email=?,access_version=access_version+? WHERE id=?',(name,email,1 if email_changed else 0,uid))
        version = db.execute('SELECT access_version FROM users WHERE id=?',(uid,)).fetchone()['access_version']
        db.execute('''INSERT INTO user_profiles(user_id,profile_data) VALUES (?,?)
                      ON CONFLICT(user_id) DO UPDATE SET profile_data=excluded.profile_data''',
                   (uid,json.dumps({key:result[key] for key in FIELDS})))
        if email_changed:
            db.execute('DELETE FROM password_reset_codes WHERE lower(email) IN (?,?)',(user['email'].lower(),email))
        db.commit()
        session['name'] = name
        session['access_version'] = version
        try:
            from security import log_security_event
            log_security_event(uid,'PROFILE_EMAIL_CHANGED' if email_changed else 'PROFILE_UPDATED',request.remote_addr,'INFO',
                               'Account owner updated login email' if email_changed else 'Account owner updated profile details',account_email=email)
        except Exception:
            current_app.logger.exception('Profile audit logging failed')
        response = jsonify({**result,'success':True,'name':name,'email':email})
        response.headers['Cache-Control'] = 'no-store'
        return response
    except (sqlite3.IntegrityError, psycopg.errors.UniqueViolation):
        db.rollback()
        return jsonify(error='Email already in use'),409
    except Exception:
        db.rollback()
        current_app.logger.exception('Profile request failed')
        return jsonify(error='Unable to save profile. Please try again.'),500
    finally:
        db.close()
