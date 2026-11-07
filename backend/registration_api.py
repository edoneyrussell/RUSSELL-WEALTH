import psycopg
import os
import re
import time
import hmac
import hashlib
import secrets
import sqlite3
from html import escape

import certifi
import resend
from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash

from database import get_db_connection

registration_bp = Blueprint("registration", __name__)

CODE_LIFETIME = 600
RESEND_COOLDOWN = 60
MAX_ATTEMPTS = 5

def initialize():
    import os
    if os.environ.get("RW_DB_ENGINE", "sqlite").lower() == "postgres":
        return
    db = get_db_connection()
    db.execute("""
        CREATE TABLE IF NOT EXISTS pending_registrations (
            email TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            code_hash TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            last_sent_at INTEGER NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS registration_rate_limits (
            source_ip TEXT PRIMARY KEY,
            window_start INTEGER NOT NULL,
            requests INTEGER NOT NULL
        )
    """)
    db.commit()
    db.close()

def code_digest(email, code):
    secret = os.environ.get("RW_VERIFICATION_SECRET")
    if not secret:
        from flask import current_app
        secret = current_app.secret_key
    if not secret:
        raise RuntimeError("Verification secret is not configured")
    if isinstance(secret, bytes):
        secret = secret.decode("utf-8")
    return hmac.new(
        secret.encode(),
        f"{email}:{code}".encode(),
        hashlib.sha256
    ).hexdigest()

def rate_limited(db, ip, now):
    row = db.execute(
        "SELECT window_start, requests FROM registration_rate_limits WHERE source_ip=?",
        (ip,)
    ).fetchone()
    if not row or now - row["window_start"] >= 3600:
        db.execute(
            """INSERT INTO registration_rate_limits
            (source_ip, window_start, requests)
            VALUES (?, ?, ?)
            ON CONFLICT(source_ip) DO UPDATE SET
                window_start=excluded.window_start,
                requests=excluded.requests""",
            (ip, now, 1)
        )
        return False
    db.execute(
        "UPDATE registration_rate_limits SET requests=requests+1 WHERE source_ip=?",
        (ip,)
    )
    return row["requests"] >= 20


@registration_bp.before_request
def prepare_registration_database():
    initialize()

@registration_bp.post("/api/register/start")
def start_registration():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="Invalid request"), 400

    first = str(data.get("firstName", "")).strip()
    last = str(data.get("lastName", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")

    if not first or not last or len(first) > 80 or len(last) > 80:
        return jsonify(error="Enter your first and last name"), 400

    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email) or len(email) > 254:
        return jsonify(error="Enter a valid email address"), 400

    if not isinstance(password, str) or len(password) < 12 or len(password) > 128:
        return jsonify(error="Password must contain 12–128 characters"), 400

    now = int(time.time())
    ip = request.remote_addr or "unknown"
    db = get_db_connection()

    try:
        if rate_limited(db, ip, now):
            db.commit()
            return jsonify(error="Too many requests. Try again later."), 429

        existing = db.execute(
            "SELECT id FROM users WHERE lower(email)=?",
            (email,)
        ).fetchone()
        if existing:
            db.commit()
            return jsonify(error="This email is already registered. Sign in instead."), 409

        pending = db.execute(
            "SELECT last_sent_at FROM pending_registrations WHERE email=?",
            (email,)
        ).fetchone()
        if pending and now - pending["last_sent_at"] < RESEND_COOLDOWN:
            db.commit()
            return jsonify(error="Wait 60 seconds before requesting another code"), 429

        code = f"{secrets.randbelow(1000000):06d}"
        password_hash = generate_password_hash(password)
        digest = code_digest(email, code)

        api_key = os.getenv("RW_RESEND_API_KEY")
        if not api_key:
            db.commit()
            return jsonify(error="Email delivery is not configured"), 503

        os.environ["SSL_CERT_FILE"] = certifi.where()
        resend.api_key = api_key

        sender = os.getenv(
            "RW_VERIFICATION_FROM",
            "Russell Wealth <onboarding@resend.dev>"
        )

        result = resend.Emails.send({
            "from": sender,
            "to": [email],
            "subject": "Russell Wealth | Verify your email",
            "html": (
                "<div style='font-family:Arial,sans-serif;background:#101216;"
                "color:#f5f5f5;padding:32px'>"
                "<h2>Russell Wealth</h2>"
                "<p>Your email verification code is:</p>"
                "<p style='font-size:34px;letter-spacing:8px;font-weight:bold'>"
                + escape(code) +
                "</p><p>This code expires in 10 minutes.</p>"
                "<p>If you did not request this, ignore this email.</p>"
                "<small>Fictional fintech portfolio project.</small></div>"
            )
        })

        if not result:
            raise RuntimeError("Email provider did not confirm delivery request")

        db.execute("""
            INSERT INTO pending_registrations
            (email, name, password_hash, code_hash, expires_at, last_sent_at, attempts)
            VALUES (?, ?, ?, ?, ?, ?, 0)
            ON CONFLICT(email) DO UPDATE SET
                name=excluded.name,
                password_hash=excluded.password_hash,
                code_hash=excluded.code_hash,
                expires_at=excluded.expires_at,
                last_sent_at=excluded.last_sent_at,
                attempts=0
        """, (email, first + " " + last, password_hash,
              digest, now + CODE_LIFETIME, now))
        db.commit()
        return jsonify(message="Verification code sent", email=email), 200

    except Exception:
        db.rollback()
        registration_bp.logger if False else None
        import logging
        logging.getLogger(__name__).exception("Registration email failed")
        return jsonify(error="Could not send verification email. Check email configuration."), 502
    finally:
        db.close()

@registration_bp.post("/api/register/verify")
def verify_registration():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="Invalid request"), 400

    email = str(data.get("email", "")).strip().lower()
    code = str(data.get("code", "")).strip()

    if not re.fullmatch(r"\d{6}", code):
        return jsonify(error="Enter the six-digit code"), 400

    now = int(time.time())
    db = get_db_connection()

    try:
        row = db.execute(
            "SELECT * FROM pending_registrations WHERE email=?",
            (email,)
        ).fetchone()

        if not row:
            return jsonify(error="No pending registration. Request a new code."), 400

        if now > row["expires_at"]:
            return jsonify(error="Code expired. Request a new code."), 400

        if row["attempts"] >= MAX_ATTEMPTS:
            return jsonify(error="Too many attempts. Request a new code."), 429

        expected = code_digest(email, code)
        if not hmac.compare_digest(expected, row["code_hash"]):
            db.execute(
                "UPDATE pending_registrations SET attempts=attempts+1 WHERE email=?",
                (email,)
            )
            db.commit()
            return jsonify(error="Incorrect verification code"), 400

        try:
            db.execute("""
                INSERT INTO users
                (name, email, password_hash, role, account_status)
                VALUES (?, ?, ?, 'CUSTOMER', 'ACTIVE')
            """, (row["name"], email, row["password_hash"]))
        except (sqlite3.IntegrityError, psycopg.errors.UniqueViolation):
            db.rollback()
            return jsonify(error="Account already exists. Sign in."), 409

        db.execute(
            "DELETE FROM pending_registrations WHERE email=?",
            (email,)
        )
        db.commit()
        return jsonify(message="Account created successfully"), 201

    except Exception:
        db.rollback()
        import logging
        logging.getLogger(__name__).exception("Registration verification failed")
        return jsonify(error="Unable to complete registration"), 500
    finally:
        db.close()
