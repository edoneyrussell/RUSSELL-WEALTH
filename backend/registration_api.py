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

    first = data.get("firstName", "")
    last = data.get("lastName", "")
    email = data.get("email", "")
    password = data.get("password", "")

    if not all(isinstance(v, str) for v in (first, last, email, password)):
        return jsonify(error="Invalid registration details"), 400

    first = first.strip()
    last = last.strip()
    email = email.strip().lower()

    if not first or not last or len(first) > 80 or len(last) > 80:
        return jsonify(error="Enter your first and last name"), 400

    if not re.fullmatch(r"[^@\\s]+@[^@\\s]+\\.[^@\\s]+", email) or len(email) > 254:
        return jsonify(error="Enter a valid email address"), 400

    if len(password) < 12 or len(password) > 128:
        return jsonify(error="Password must contain 12–128 characters"), 400

    if data.get("acceptedTerms") is not True:
        return jsonify(error="You must accept the agreement to continue"), 400

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
            return jsonify(
                error="This email is already registered. Sign in instead."
            ), 409

        password_hash = generate_password_hash(password)

        try:
            db.execute("""
                INSERT INTO users
                (name, email, password_hash, role, account_status)
                VALUES (?, ?, ?, 'CUSTOMER', 'ACTIVE')
            """, (first + " " + last, email, password_hash))

        except (sqlite3.IntegrityError, psycopg.errors.UniqueViolation):
            db.rollback()
            return jsonify(error="Account already exists. Sign in."), 409

        db.commit()

        return jsonify(
            message="Account created successfully"
        ), 201

    except Exception:
        db.rollback()
        import logging
        logging.getLogger(__name__).exception(
            "Direct customer registration failed"
        )
        return jsonify(error="Unable to create account. Please try again."), 500

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
