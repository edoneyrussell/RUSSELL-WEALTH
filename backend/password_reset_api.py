import hashlib
import hmac
import logging
import os
import re
import secrets
import time

import resend
from flask import Blueprint, current_app, jsonify, request
from werkzeug.security import generate_password_hash
from database import get_db_connection

password_reset_bp = Blueprint("password_reset", __name__)
logger = logging.getLogger(__name__)
EXPIRY = 600
COOLDOWN = 60
MAX_ATTEMPTS = 5

def setup():
    import os
    if os.environ.get("RW_DB_ENGINE", "sqlite").lower() == "postgres":
        return
    db = get_db_connection()
    try:
        db.execute("""
            CREATE TABLE IF NOT EXISTS password_reset_codes (
                email TEXT PRIMARY KEY,
                code_hash TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                sent_at INTEGER NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 0
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS password_reset_limits (
                source_ip TEXT PRIMARY KEY,
                window_start INTEGER NOT NULL,
                requests INTEGER NOT NULL
            )
        """)
        db.commit()
    finally:
        db.close()

def digest(email, code):
    secret = os.getenv("RW_VERIFICATION_SECRET") or current_app.secret_key
    if not secret:
        raise RuntimeError("Flask secret key is missing")
    if isinstance(secret, str):
        secret = secret.encode()
    return hmac.new(secret, ("reset:" + email + ":" + code).encode(), hashlib.sha256).hexdigest()

def generic_response():
    return jsonify(message="If this email has an account, a reset code will be sent.")

@password_reset_bp.before_request
def prepare():
    setup()

@password_reset_bp.post("/api/password-reset/request")
def request_reset():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    if len(email) > 254 or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return jsonify(error="Enter a valid email address"), 400

    now = int(time.time())
    ip = request.remote_addr or "unknown"
    db = get_db_connection()
    try:
        limit = db.execute(
            "SELECT * FROM password_reset_limits WHERE source_ip=?", (ip,)
        ).fetchone()

        if limit and now - limit["window_start"] < 3600:
            if limit["requests"] >= 20:
                return generic_response()
            db.execute(
                "UPDATE password_reset_limits SET requests=requests+1 WHERE source_ip=?",
                (ip,)
            )
        else:
            db.execute(
                """INSERT INTO password_reset_limits
            (source_ip, window_start, requests)
            VALUES (?, ?, 1)
            ON CONFLICT(source_ip) DO UPDATE SET
                window_start=excluded.window_start,
                requests=1""",
                (ip, now)
            )

        user = db.execute(
            "SELECT id FROM users WHERE lower(email)=?", (email,)
        ).fetchone()

        pending = db.execute(
            "SELECT sent_at FROM password_reset_codes WHERE email=?", (email,)
        ).fetchone()

        if not user or (pending and now - pending["sent_at"] < COOLDOWN):
            db.commit()
            return generic_response()

        key = os.getenv("RW_RESEND_API_KEY")
        if not key:
            logger.error("Password reset email delivery not configured")
            db.commit()
            return generic_response()

        code = f"{secrets.randbelow(1000000):06d}"
        resend.api_key = key
        sender = os.getenv(
            "RW_VERIFICATION_FROM",
            "Russell Wealth <onboarding@resend.dev>"
        )

        try:
            result = resend.Emails.send({
                "from": sender,
                "to": [email],
                "subject": "Russell Wealth | Reset your password",
                "html": (
                    "<div style='font-family:Arial;background:#101216;"
                    "color:#fff;padding:32px'>"
                    "<h2>Russell Wealth</h2>"
                    "<p>Your password reset code is:</p>"
                    "<h1 style='letter-spacing:7px'>" + code + "</h1>"
                    "<p>This code expires in 10 minutes.</p>"
                    "<p>If you did not request this, ignore this email.</p>"
                    "<small>Fictional fintech portfolio project.</small>"
                    "</div>"
                )
            })
            if not result:
                raise RuntimeError("Email provider returned no confirmation")
        except Exception:
            logger.exception("Password reset email delivery failed")
            db.commit()
            return generic_response()

        db.execute("""
            INSERT INTO password_reset_codes
            (email, code_hash, expires_at, sent_at, attempts)
            VALUES (?, ?, ?, ?, 0)
            ON CONFLICT(email) DO UPDATE SET
                code_hash=excluded.code_hash,
                expires_at=excluded.expires_at,
                sent_at=excluded.sent_at,
                attempts=0
        """, (email, digest(email, code), now + EXPIRY, now))
        db.commit()
        return generic_response()

    except Exception:
        db.rollback()
        logger.exception("Password reset request failed")
        return jsonify(error="Unable to process request"), 500
    finally:
        db.close()

@password_reset_bp.post("/api/password-reset/confirm")
def confirm_reset():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    code = str(data.get("code", "")).strip()
    password = data.get("password", "")

    if not re.fullmatch(r"\d{6}", code):
        return jsonify(error="Enter the six-digit code"), 400
    if not isinstance(password, str) or not 12 <= len(password) <= 128:
        return jsonify(error="Password must contain 12–128 characters"), 400

    db = get_db_connection()
    try:
        row = db.execute(
            "SELECT * FROM password_reset_codes WHERE email=?", (email,)
        ).fetchone()

        if not row or int(time.time()) > row["expires_at"]:
            return jsonify(error="Invalid or expired reset code"), 400

        if row["attempts"] >= MAX_ATTEMPTS:
            return jsonify(error="Too many attempts. Request a new code."), 429

        if not hmac.compare_digest(digest(email, code), row["code_hash"]):
            db.execute(
                "UPDATE password_reset_codes SET attempts=attempts+1 WHERE email=?",
                (email,)
            )
            db.commit()
            return jsonify(error="Invalid or expired reset code"), 400

        password_hash = generate_password_hash(password)
        cursor = db.execute(
            "UPDATE users SET password_hash=? WHERE lower(email)=?",
            (password_hash, email)
        )
        if cursor.rowcount != 1:
            db.rollback()
            return jsonify(error="Unable to reset password"), 400

        db.execute("DELETE FROM password_reset_codes WHERE email=?", (email,))
        db.commit()
        return jsonify(message="Password updated successfully")
    except Exception:
        db.rollback()
        logger.exception("Password reset confirmation failed")
        return jsonify(error="Unable to reset password"), 500
    finally:
        db.close()
