"""SOC account administration. Password hashes never leave the server."""
import os
from pathlib import Path
import sqlite3
from datetime import datetime, timezone
from roles import access_role
from werkzeug.security import check_password_hash

from urllib.parse import urlsplit

import database

from flask import Blueprint, current_app, jsonify, request, session
from authorization import role_required
from database import get_db_connection
from owner_protection import OWNER_EMAIL


def is_owner(email):
    return str(email).strip().lower() == OWNER_EMAIL

ACCESS_ADMIN_EMAIL = OWNER_EMAIL

access_bp = Blueprint('access', __name__)
def ensure_access_schema(db, source):
    if source == 'live':
        db.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS access_version INTEGER NOT NULL DEFAULT 0')
    elif 'access_version' not in {row['name'] for row in db.execute('PRAGMA table_info(users)')}:
        db.execute('ALTER TABLE users ADD COLUMN access_version INTEGER NOT NULL DEFAULT 0')


def initialize_access_schema():
    db = get_db_connection()
    try:
        source = 'live' if os.environ.get('RW_DB_ENGINE', 'sqlite').lower() == 'postgres' else 'local'
        ensure_access_schema(db, source)
        db.commit()
    finally:
        if db is not None:
            db.close()


USER_FIELDS = 'id, name, email, role, account_status, created_at'


def directory_sources():
    """Only the configured current databases; never scan backups or copy account data."""
    primary = 'live' if os.environ.get('RW_DB_ENGINE', 'sqlite').lower() == 'postgres' else 'local'
    sources = [primary]
    if primary == 'local' and os.environ.get('DATABASE_URL'):
        sources.append('live')
    return primary, sources


def source_connection(source, primary):
    if source == primary:
        return get_db_connection()
    if source == 'live':
        from postgres_adapter import get_postgres_adapter
        return get_postgres_adapter()
    db = sqlite3.connect(Path(database.DATABASE).resolve().as_uri() + '?mode=rw', uri=True)
    db.row_factory = sqlite3.Row
    return db


def source_actor(db, source, primary):
    """Use the signed-in SOC identity; verify its authority in the target database."""
    if source == primary:
        actor = db.execute('SELECT id,name,email,role,account_status,access_version,password_hash FROM users WHERE id=?', (session['user_id'],)).fetchone()
        if actor is None or dict(actor).get('access_version', 0) != session.get('access_version', 0):
            return None
    else:
        primary_db = get_db_connection()
        try:
            identity = primary_db.execute('SELECT email, role, account_status, access_version FROM users WHERE id=?', (session['user_id'],)).fetchone()
        finally:
            primary_db.close()
        if (identity is None or identity['role'] != 'SOC_ADMIN' or identity['account_status'] != 'ACTIVE'
                or identity['access_version'] != session.get('access_version', 0)):
            return None
        actor = db.execute('SELECT id,name,email,role,account_status,access_version,password_hash FROM users WHERE lower(email)=lower(?)', (identity['email'],)).fetchone()
    if actor is None or actor['role'] != 'SOC_ADMIN' or actor['account_status'] != 'ACTIVE':
        return None
    return actor


def creation_timestamp(value):
    """SQLite and PostgreSQL store UTC creation times; emit an explicit timezone."""
    if value is None:
        return None
    try:
        timestamp = value if isinstance(value, datetime) else datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        return timestamp.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')
    except (ValueError, TypeError):
        return None


def read_directory_source(source, primary):
    db = source_connection(source, primary)
    try:
        if source == 'live':
            db.execute('SET TRANSACTION READ ONLY')
            db.execute("SET LOCAL statement_timeout = '5s'")
        actor = source_actor(db, source, primary)
        records = [dict(row) for row in db.execute(f'SELECT {USER_FIELDS}, EXISTS(SELECT 1 FROM admin_customer_links WHERE admin_user_id=users.id) AS has_customer_access FROM users ORDER BY id').fetchall()]
        for record in records:
            record['created_at'] = creation_timestamp(record['created_at'])
            linked=record.pop('has_customer_access')
            record.update(access_role='BOTH' if record['role']=='SOC_ADMIN' and linked else record['role'],
                          is_owner=is_owner(record['email']), manageable=actor is not None and actor['email'].lower() == ACCESS_ADMIN_EMAIL, is_self=actor is not None and actor['id'] == record['id'])
        return records
    finally:
        if db is not None:
            db.close()


def valid_origin():
    origin = request.headers.get('Origin')
    if not origin:
        return request.headers.get('Sec-Fetch-Site') != 'cross-site'

    def normalized(value):
        try:
            parsed = urlsplit(value)
            if parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.username or parsed.password:
                return None
            port = parsed.port or (443 if parsed.scheme == 'https' else 80)
            return parsed.scheme, parsed.hostname.lower(), port
        except ValueError:
            return None

    # The public frontend and API have different hosts behind Vercel/Render.
    # Trust explicit configuration, never client-supplied forwarded-host headers.
    allowed = {normalized(request.host_url)}
    allowed.add(normalized(os.environ.get('RW_PUBLIC_APP_URL', 'https://russell-wealth.vercel.app')))
    allowed.update(normalized(value.strip()) for value in os.environ.get('RW_ALLOWED_ORIGINS', '').split(',') if value.strip())
    candidate = normalized(origin)
    return candidate is not None and candidate in allowed


@access_bp.get('/api/security/users')
@role_required('SOC_ADMIN')
def directory():
    primary, configured_sources = directory_sources()
    users, sources = [], []
    for source in configured_sources:
        label = 'Live website' if source == 'live' else 'Local development'
        try:
            records = read_directory_source(source, primary)
            for record in records:
                record.update(source=source, source_label=label)
            users.extend(records)
            sources.append(dict(key=source, label=label, status='connected', count=len(records),
                                manageable=any(record.get('manageable') for record in records), primary=source == primary))
        except Exception:
            current_app.logger.exception('Account directory source unavailable: %s', source)
            sources.append(dict(key=source, label=label, status='unavailable', count=None))
    if not users and all(source['status'] == 'unavailable' for source in sources):
        response = jsonify(error='Account databases are unavailable. Please try again.', sources=sources)
        response.status_code = 503
    else:
        response = jsonify(users=users, sources=sources, current_source=primary,
                           current_user_id=session['user_id'])
    response.headers['Cache-Control'] = 'no-store'
    return response


def audit(db, event, target, detail, actor_id=None):
    db.execute('''INSERT INTO security_events
        (user_id, event_type, source_ip, severity, details)
        VALUES (?, ?, ?, 'INFO', ?)''',
        (actor_id if actor_id is not None else session['user_id'], event, request.remote_addr,
         f"Account {target['id']} ({target['email']}): {detail}"))


@access_bp.route('/api/security/users/<int:user_id>', methods=['PATCH', 'DELETE'])
@role_required('SOC_ADMIN')
def manage_user(user_id):
    if not valid_origin():
        return jsonify(error='Request origin denied'), 403
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error='A JSON request is required'), 400
    password = data.pop('current_password', None)
    if not isinstance(password, str) or not password or len(password) > 1024:
        return jsonify(error='Enter your administrator password to confirm this action.'), 400
    identity_db = get_db_connection()
    try:
        identity = identity_db.execute('SELECT email,password_hash FROM users WHERE id=?', (session['user_id'],)).fetchone()
    finally:
        identity_db.close()
    if identity is None or identity['email'].lower() != ACCESS_ADMIN_EMAIL:
        return jsonify(error='Only the ADMIN account can change account access.'), 403
    if not check_password_hash(identity['password_hash'], password):
        return jsonify(error='Your administrator password is incorrect.'), 403
    primary, sources = directory_sources()
    source = request.args.get('source', primary)
    if source not in sources:
        return jsonify(error='Unknown account database'), 400

    db = None
    try:
        db = source_connection(source, primary)
        if source == 'live':
            db.execute('SELECT id FROM users ORDER BY id FOR UPDATE').fetchall()
        else:
            db.execute('BEGIN IMMEDIATE')
        actor = source_actor(db, source, primary)
        if actor is None:
            return jsonify(error='Your signed-in account must be an active SOC administrator in this database.'), 403
        ensure_access_schema(db, source)
        if user_id == actor['id']:
            # Adding customer access to your own SOC account cannot remove your administration rights.
            if request.method != 'PATCH' or data != {'role': 'BOTH'}:
                return jsonify(error='You cannot remove your own access or delete your account here.'), 409
        target = db.execute(f'SELECT {USER_FIELDS} FROM users WHERE id=?', (user_id,)).fetchone()
        if target is None:
            return jsonify(error='Account not found'), 404
        if is_owner(target['email']):
            return jsonify(error='The owner account is protected. Its access cannot be changed or deleted here.'), 403
        role, status = access_role(db, user_id, target['role']), target['account_status']
        if request.method == 'PATCH':
            if not data or set(data) - {'role', 'account_status'}:
                return jsonify(error='Choose a role or account status'), 400
            role = data.get('role', role)
            status = data.get('account_status', status)
            if role not in ('CUSTOMER', 'SOC_ADMIN', 'BOTH') or status not in ('ACTIVE', 'SUSPENDED'):
                return jsonify(error='Invalid role or account status'), 400

        removing_admin = request.method == 'DELETE' or role not in ('SOC_ADMIN', 'BOTH') or status != 'ACTIVE'
        if target['role'] == 'SOC_ADMIN' and target['account_status'] == 'ACTIVE' and removing_admin:
            remaining = db.execute("SELECT COUNT(*) AS n FROM users WHERE role='SOC_ADMIN' AND account_status='ACTIVE' AND id<>?", (user_id,)).fetchone()['n']
            if not remaining:
                return jsonify(error='At least one active SOC administrator is required'), 409

        if request.method == 'PATCH':
            db.execute('UPDATE users SET role=?, account_status=?, access_version=access_version+1 WHERE id=?', ('SOC_ADMIN' if role == 'BOTH' else role, status, user_id))
            if role in ('CUSTOMER', 'BOTH'):
                db.execute('''INSERT INTO investment_accounts (user_id, account_name, cash_balance_cents)
                    SELECT ?, 'Investment Portfolio', 0
                    WHERE NOT EXISTS (SELECT 1 FROM investment_accounts WHERE user_id=?)''', (user_id, user_id))
            if 'role' in data:
                db.execute('DELETE FROM admin_customer_links WHERE admin_user_id=?', (user_id,))
                if role == 'BOTH':
                    db.execute('INSERT INTO admin_customer_links (admin_user_id, customer_user_id) VALUES (?, ?)', (user_id, user_id))
            audit(db, 'ACCOUNT_ACCESS_UPDATED', target,
                  f"role {target['role']} → {role}; status {target['account_status']} → {status}", actor_id=actor['id'])
            db.commit()
            if user_id == actor['id'] and source == primary:
                session['access_version'] = actor['access_version'] + 1
            return jsonify(message='Account access updated')

        # Preserve security history while removing the account and its owned records.
        tables = {row['name'] for row in db.execute(
            "SELECT table_name AS name FROM information_schema.tables WHERE table_schema=current_schema()"
            if source == 'live'
            else "SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
        for table in ('holdings', 'transactions', 'portfolio_snapshots'):
            if table in tables:
                db.execute(f'DELETE FROM {table} WHERE account_id IN (SELECT id FROM investment_accounts WHERE user_id=?)', (user_id,))
        for table in ('customer_account_selection', 'customer_account_transfers', 'investment_accounts', 'rw_demo_bank_accounts', 'rw_demo_bank_transfers', 'customer_preferences', 'user_profiles', 'customer_watchlist', 'market_clock_preferences', 'customer_welcome_tours'):
            if table in tables:
                db.execute(f'DELETE FROM {table} WHERE user_id=?', (user_id,))
        if 'admin_customer_links' in tables:
            db.execute('DELETE FROM admin_customer_links WHERE admin_user_id=? OR customer_user_id=?', (user_id, user_id))
        for table in ('pending_registrations', 'password_reset_codes'):
            if table in tables:
                db.execute(f'DELETE FROM {table} WHERE lower(email)=lower(?)', (target['email'],))
        db.execute('UPDATE security_events SET user_id=NULL WHERE user_id=?', (user_id,))
        db.execute('DELETE FROM users WHERE id=?', (user_id,))
        audit(db, 'ACCOUNT_DELETED', target, 'Account and owned investment records deleted', actor_id=actor['id'])
        db.commit()
        return jsonify(message='Account deleted')
    except Exception:
        if db is not None:
            db.rollback()
        current_app.logger.exception('Account administration failed')
        return jsonify(error='Unable to update account. Please try again.'), 500
    finally:
        if db is not None:
            db.close()
