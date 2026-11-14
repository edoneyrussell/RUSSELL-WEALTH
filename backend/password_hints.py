"""Optional account reminders; never used as authentication credentials."""
import os
import re
import time
from flask import Blueprint, jsonify, request
from database import get_db_connection


def initialize_password_hint_schema():
    db = get_db_connection()
    try:
        if os.environ.get('RW_DB_ENGINE', 'sqlite').lower() == 'postgres':
            db.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hint TEXT')
        elif 'password_hint' not in {row['name'] for row in db.execute('PRAGMA table_info(users)')}:
            db.execute('ALTER TABLE users ADD COLUMN password_hint TEXT')
        db.execute('''CREATE TABLE IF NOT EXISTS password_hint_limits(
            source_ip TEXT PRIMARY KEY,window_start BIGINT NOT NULL,requests INTEGER NOT NULL)''')
        db.commit()
    finally:
        db.close()


password_hints_bp = Blueprint('password_hints', __name__)


@password_hints_bp.post('/api/password-hint')
def sign_in_hint():
    data = request.get_json(silent=True)
    email = data.get('email') if isinstance(data, dict) else None
    if not isinstance(email, str) or len(email) > 254 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email.strip()):
        response = jsonify(hint=None)
    else:
        db = get_db_connection()
        try:
            now = int(time.time())
            row = db.execute('''INSERT INTO password_hint_limits(source_ip,window_start,requests)
                VALUES(?,?,1) ON CONFLICT(source_ip) DO UPDATE SET
                requests=CASE WHEN password_hint_limits.window_start<=? THEN 1 ELSE password_hint_limits.requests+1 END,
                window_start=CASE WHEN password_hint_limits.window_start<=? THEN excluded.window_start ELSE password_hint_limits.window_start END
                RETURNING requests''', (request.remote_addr or 'unknown', now, now-60, now-60)).fetchone()
            db.commit()
            if row['requests'] > 30:
                response = jsonify(hint=None)
                response.status_code = 429
                response.headers['Retry-After'] = '60'
            else:
                user = db.execute("SELECT password_hint FROM users WHERE lower(email)=? AND account_status='ACTIVE'", (email.strip().lower(),)).fetchone()
                response = jsonify(hint=user['password_hint'] if user else None)
        finally:
            db.close()
    response.headers['Cache-Control'] = 'private, no-store'
    return response
