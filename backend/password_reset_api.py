import hashlib
import hmac
import logging
import os
import re
import secrets
from html import escape
from urllib.parse import urlencode, urlsplit
import time

import resend
from flask import Blueprint, current_app, jsonify, request, session
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

def reset_link(email, token):
    # Use a configured frontend URL, never an untrusted Host/Origin header.
    public_url = os.getenv("RW_PUBLIC_APP_URL", "").rstrip("/")
    if not public_url:
        public_url = ("http://127.0.0.1:5173" if request.host in
                      {"127.0.0.1:5001", "localhost:5001"}
                      else "https://russell-wealth.vercel.app")
    parts = urlsplit(public_url)
    if parts.scheme not in {"http", "https"} or not parts.netloc or parts.query or parts.fragment:
        raise RuntimeError("RW_PUBLIC_APP_URL must be a frontend URL without query or fragment")
    # Fragments keep the secret out of HTTP access logs and referrers.
    return public_url + "/reset-password#" + urlencode({"email": email, "token": token})


def generic_response():
    response = jsonify(message="If this email has an account, a password reset link will be sent. Check your inbox and spam folder.")
    response.headers["Cache-Control"] = "no-store"
    return response

@password_reset_bp.before_request
def prepare():
    setup()

@password_reset_bp.post("/api/password-reset/request")
def request_reset():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="Invalid request"), 400
    email = str(data.get("email", "")).strip().lower()
    if len(email) > 254 or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return jsonify(error="Enter a valid email address"), 400

    from security import log_security_event
    log_security_event(None, "PASSWORD_RESET_REQUEST", request.remote_addr, "INFO",
                       "Password reset requested (delivery and rate limits applied separately)", account_email=email)
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
            "SELECT id, password_hint FROM users WHERE lower(email)=?", (email,)
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

        token = secrets.token_urlsafe(32)
        link = reset_link(email, token)
        resend.api_key = key
        sender = os.getenv(
            "RW_VERIFICATION_FROM",
            "Russell Wealth <onboarding@resend.dev>"
        )

        hint_html = (
            "<p>Your password hint: " + escape(user["password_hint"]) + "</p>"
            if user["password_hint"] else ""
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
                    + hint_html + "<p>Choose a new password for your Russell Wealth account.</p>"
                    "<p><a style='display:inline-block;padding:14px 22px;background:#c2edce;"
                    "color:#14251a;border-radius:8px;text-decoration:none' href='" + escape(link, quote=True) + "'>Reset password</a></p>"
                    "<p>This link expires in 10 minutes and can be used once.</p>"
                    "<p>If the button does not work, copy this link into your browser:</p>"
                    "<p style='word-break:break-all'>" + escape(link) + "</p>"
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
        """, (email, digest(email, "link:" + token), now + EXPIRY, now))
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
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="Invalid request"), 400
    email = str(data.get("email", "")).strip().lower()
    token = data.get("token", "")
    # Allow already-issued six-digit codes until their short expiry during rollout.
    code = data.get("code", "")
    password = data.get("password", "")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email) or len(email) > 254:
        return jsonify(error="Invalid reset link. Request a new link."), 400
    if isinstance(token, str) and re.fullmatch(r"[A-Za-z0-9_-]{43}", token):
        credential = "link:" + token
    elif not token and isinstance(code, str) and re.fullmatch(r"\d{6}", code):
        credential = code
    else:
        return jsonify(error="Invalid reset link. Request a new link."), 400
    if not isinstance(password, str) or not 12 <= len(password) <= 128:
        return jsonify(error="Password must contain 12–128 characters"), 400

    db = get_db_connection()
    try:
        row = db.execute(
            "SELECT * FROM password_reset_codes WHERE email=?", (email,)
        ).fetchone()

        if not row or int(time.time()) >= row["expires_at"]:
            return jsonify(error="Invalid or expired reset link. Request a new link."), 400

        if row["attempts"] >= MAX_ATTEMPTS:
            return jsonify(error="Too many attempts. Request a new link."), 429

        if not hmac.compare_digest(digest(email, credential), row["code_hash"]):
            db.execute(
                "UPDATE password_reset_codes SET attempts=attempts+1 WHERE email=?",
                (email,)
            )
            db.commit()
            return jsonify(error="Invalid or expired reset link. Request a new link."), 400

        password_hash = generate_password_hash(password)
        # Atomic consumption: concurrent requests cannot use the same link twice.
        consumed = db.execute(
            "DELETE FROM password_reset_codes WHERE email=? AND code_hash=? AND expires_at>? AND attempts<?",
            (email, row["code_hash"], int(time.time()), MAX_ATTEMPTS)
        )
        if consumed.rowcount != 1:
            db.rollback()
            return jsonify(error="Invalid or expired reset link. Request a new link."), 400
        cursor = db.execute(
            "UPDATE users SET password_hash=?, password_hint=NULL, access_version=access_version+1 WHERE lower(email)=?",
            (password_hash, email)
        )
        if cursor.rowcount != 1:
            db.rollback()
            return jsonify(error="Unable to reset password"), 400

        user = db.execute("SELECT id FROM users WHERE lower(email)=?", (email,)).fetchone()
        db.commit()
        session.clear()
        try:
            from security import log_security_event
            log_security_event(user["id"], "PASSWORD_RESET", request.remote_addr, "INFO",
                               "Account password reset using email verification", account_email=email)
        except Exception:
            logger.exception("Password reset audit logging failed")
        response = jsonify(message="Password updated successfully. Sign in with your new password.")
        response.headers["Cache-Control"] = "no-store"
        return response
    except Exception:
        db.rollback()
        logger.exception("Password reset confirmation failed")
        return jsonify(error="Unable to reset password"), 500
    finally:
        db.close()
