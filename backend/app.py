
from datetime import timedelta
import os
from market_search_api import market_search_bp
from trading_api import trading_bp
from portfolio_api import portfolio_bp
from market_api import market_bp
from authorization import role_required
from roles import account_roles
from flask import Flask, render_template, request, session, redirect, url_for, jsonify
from werkzeug.security import check_password_hash
from database import get_db_connection
from authorization import login_required, role_required
from security import log_security_event, detect_failed_login_attack
from login_notifications import send_login_notification

from registration_api import registration_bp
from password_reset_api import password_reset_bp
app = Flask(__name__)

from access_api import access_bp
import security_logs_api
import security_search_api
app.register_blueprint(access_bp)


@app.before_request
def validate_current_account():
    """Revalidate signed sessions against current account access on every request."""
    uid = session.get('user_id')
    if uid is None:
        return
    db = get_db_connection()
    try:
        user = db.execute(
            'SELECT name, role, account_status, access_version FROM users WHERE id=?', (uid,)
        ).fetchone()
        roles = account_roles(db, uid, user['role']) if user is not None else []
    finally:
        db.close()
    if (user is None or user['account_status'] != 'ACTIVE'
            or user['role'] != session.get('role')
            or user['access_version'] != session.get('access_version', 0)):
        session.clear()
        return jsonify(error='Your account access changed. Please sign in again.'), 401
    session['name'] = user['name']
    session['roles'] = roles
    if request.path.startswith('/api/customer/') and 'CUSTOMER' not in roles:
        return jsonify(error='Customer access required'), 403


import os
from dotenv import load_dotenv

load_dotenv()
from access_api import initialize_access_schema
initialize_access_schema()
from account_limits import initialize_account_limits
initialize_account_limits()
from owner_protection import initialize_owner_protection
initialize_owner_protection()
from portfolio_history import initialize_portfolio_history
initialize_portfolio_history()
from security import initialize_security_email_schema
initialize_security_email_schema()
from password_hints import initialize_password_hint_schema, password_hints_bp
app.register_blueprint(password_hints_bp)
initialize_password_hint_schema()
from watchlist_api import watchlist_bp, initialize_watchlist
initialize_watchlist()
app.register_blueprint(watchlist_bp)
from customer_accounts import accounts_bp, initialize_customer_accounts, AccountError
initialize_customer_accounts()
app.register_blueprint(accounts_bp)

@app.errorhandler(AccountError)
def account_request_error(error):
    return jsonify(error=error.message), error.status

# Trust forwarded client IPs only when the deployment explicitly configures its proxy chain.
from werkzeug.middleware.proxy_fix import ProxyFix
trusted_proxy_hops = int(os.environ.get('RW_TRUSTED_PROXY_HOPS', '0'))
if trusted_proxy_hops > 0:
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=trusted_proxy_hops, x_proto=0, x_host=0, x_port=0, x_prefix=0)
app.secret_key = os.environ["FLASK_SECRET_KEY"]
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=30)
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"



@app.route("/")
def home():
    return render_template("login.html")


@app.route("/login", methods=["POST"])




\
def login():
    email = request.form["email"]
    password = request.form["password"]

    connection = get_db_connection()

    user = connection.execute(
        "SELECT * FROM users WHERE email = ?",
        (email,)
    ).fetchone()

    connection.close()

    source_ip = request.remote_addr

    if (user and user["account_status"] == "ACTIVE"
            and user["role"] in ("CUSTOMER", "SOC_ADMIN")
            and check_password_hash(user["password_hash"], password)):

        log_security_event(
            user["id"],
            "LOGIN_SUCCESS",
            source_ip,
            "INFO",
            f"Successful login for {user['email']}"
        )

        session["user_id"] = user["id"]
        session["name"] = user["name"]
        session["role"] = user["role"]
        session["access_version"] = user["access_version"]

        if user["role"] == "CUSTOMER":
            return redirect(url_for("customer"))

        if user["role"] == "SOC_ADMIN":
            return redirect(url_for("soc"))

    log_security_event(
        user["id"] if user else None,
        "LOGIN_FAILED",
        source_ip,
        "WARNING",
        f"Failed login attempt for {email}",
        account_email=email
    )

    if user and user["account_status"] == "SUSPENDED":
        log_security_event(user["id"], "SUSPENDED_LOGIN_ATTEMPT", source_ip, "WARNING",
                           "Suspended account sign-in rejected", account_email=email)
    detect_failed_login_attack(source_ip)

    return "Invalid email or password."


@app.route("/customer")
def customer():
    if "user_id" not in session:
        return redirect(url_for("home"))

    if "CUSTOMER" not in session.get("roles", [session["role"]]):
        return "Access Denied", 403

    return f"Customer Dashboard — Welcome {session['name']}"


@app.route("/soc")
def soc():
    if "user_id" not in session:
        return redirect(url_for("home"))

    if "SOC_ADMIN" not in session.get("roles", [session["role"]]):
        return "Access Denied", 403

    return f"SOC Dashboard — Welcome {session['name']}"


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("home"))


from flask import jsonify

@app.route("/api/login", methods=["POST"])
def api_login():
    if not request.is_json:
        return jsonify({"error": "JSON request required"}), 415

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid request"}), 400

    email = data.get("email", "")
    password = data.get("password", "")
    remember_me = data.get("rememberMe") is True

    if not isinstance(email, str) or not isinstance(password, str):
        return jsonify({"error": "Invalid credentials"}), 400

    email = email.strip().lower()

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    connection = get_db_connection()

    user = connection.execute(
        "SELECT * FROM users WHERE email = ?",
        (email,)
    ).fetchone()

    connection.close()

    source_ip = request.remote_addr

    if (
        user
        and check_password_hash(user["password_hash"], password)
        and user["account_status"] == "ACTIVE"
        and user["role"] in ("CUSTOMER", "SOC_ADMIN")
    ):
        session.clear()
        session.permanent = remember_me
        session["user_id"] = user["id"]
        session["name"] = user["name"]
        session["role"] = user["role"]
        session["access_version"] = user["access_version"]

        log_security_event(
            user["id"],
            "LOGIN_SUCCESS",
            source_ip,
            "INFO",
            f"Successful login for {email}",
            account_email=email
        )

        # Notify the account owner after successful authentication.
        try:
            send_login_notification(email, source_ip)
        except Exception:
            app.logger.exception("Login alert failed")

        return jsonify({
            "success": True,
            "name": user["name"],
            "role": user["role"],
            "roles": account_roles_for_login(user)
        }), 200

    log_security_event(
        user["id"] if user else None,
        "LOGIN_FAILED",
        source_ip,
        "WARNING",
        f"Failed login attempt for {email}",
        account_email=email
    )

    if user and user["account_status"] == "SUSPENDED":
        log_security_event(user["id"], "SUSPENDED_LOGIN_ATTEMPT", source_ip, "WARNING",
                           "Suspended account sign-in rejected", account_email=email)
    detect_failed_login_attack(source_ip)

    return jsonify({
        "error": "Invalid email or password"
    }), 401


def account_roles_for_login(user):
    db = get_db_connection()
    try:
        return account_roles(db, user['id'], user['role'])
    finally:
        db.close()


@app.route("/api/me", methods=["GET"])
def api_me():
    if "user_id" not in session:
        return jsonify({"authenticated": False}), 401

    db = get_db_connection()
    try:
        columns = {
            row["name"] for row in
            db.execute(
                "SELECT column_name AS name FROM information_schema.columns "
                "WHERE table_schema = current_schema() AND table_name = 'users'"
                if os.environ.get("RW_DB_ENGINE", "sqlite").lower() == "postgres"
                else "PRAGMA table_info(users)"
            ).fetchall()
        }

        photo = None
        if "profile_photo_data" in columns:
            row = db.execute(
                "SELECT profile_photo_data, profile_photo_mime "
                "FROM users WHERE id=?",
                (session["user_id"],)
            ).fetchone()

            if row and row["profile_photo_data"]:
                photo = (
                    f"data:{row['profile_photo_mime']};base64,"
                    f"{row['profile_photo_data']}"
                )

        return jsonify({
            "authenticated": True,
            "name": session["name"],
            "role": session["role"],
            "roles": session.get("roles", [session["role"]]),
            "profile_photo": photo
        }), 200, {"Cache-Control": "private, no-store"}
    finally:
        db.close()


@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"success": True})
@app.route("/api/customer/overview", methods=["GET"])
@role_required("CUSTOMER")
def api_customer_overview():
    return jsonify({
        "success": True,
        "message": "Customer financial API access granted"
    })



# Approximate public-IP geolocation for SOC visualization.
# Private, loopback and otherwise non-global addresses are never geolocated.
import ipaddress
import json
from urllib.request import Request, urlopen
from urllib.parse import quote

_security_geo_cache = {}

def lookup_security_ip_location(source_ip):
    empty = {
        "latitude": None,
        "longitude": None,
        "city": None,
        "country": None
    }

    if not source_ip:
        return empty.copy()

    try:
        ip = ipaddress.ip_address(source_ip.strip())
    except ValueError:
        return empty.copy()

    if not ip.is_global:
        return empty.copy()

    key = str(ip)

    if key in _security_geo_cache:
        return _security_geo_cache[key].copy()

    result = empty.copy()

    try:
        url = "https://ipwho.is/" + quote(key, safe="")
        request_geo = Request(
            url,
            headers={"User-Agent": "RussellWealth-SOC/1.0"}
        )

        with urlopen(request_geo, timeout=2) as response:
            payload = json.load(response)

        if payload.get("success") is True:
            lat = payload.get("latitude")
            lon = payload.get("longitude")

            if (
                isinstance(lat, (int, float))
                and not isinstance(lat, bool)
                and isinstance(lon, (int, float))
                and not isinstance(lon, bool)
                and -90 <= lat <= 90
                and -180 <= lon <= 180
            ):
                result = {
                    "latitude": lat,
                    "longitude": lon,
                    "city": payload.get("city"),
                    "country": payload.get("country")
                }

    except Exception:
        pass

    _security_geo_cache[key] = result.copy()
    return result


@app.route("/api/security/coverage", methods=["GET"])
@role_required("SOC_ADMIN")
def api_security_coverage():
    from pathlib import Path
    from werkzeug.security import check_password_hash

    authentication_checks = {
        "password_verification_available": callable(check_password_hash),
        "http_only_cookies": app.config.get("SESSION_COOKIE_HTTPONLY") is True,
        "same_site_configured": app.config.get("SESSION_COOKIE_SAMESITE") in (
            "Lax", "Strict"
        ),
    }

    access_checks = {
        "role_authorization_available": callable(role_required),
        "authenticated_soc_session": (
            session.get("role") == "SOC_ADMIN"
            and bool(session.get("user_id"))
        ),
    }

    monitoring_checks = {
        "logging_function_available": callable(log_security_event),
        "event_table_accessible": False,
    }

    try:
        connection = get_db_connection()
        try:
            connection.execute(
                "SELECT COUNT(*) FROM security_events"
            ).fetchone()
            monitoring_checks["event_table_accessible"] = True
        finally:
            connection.close()
    except Exception:
        pass

    def summarize(checks):
        passed = sum(bool(value) for value in checks.values())
        total = len(checks)

        if passed == total:
            status = "ACTIVE"
        elif passed:
            status = "PARTIAL"
        else:
            status = "UNAVAILABLE"

        return {
            "status": status,
            "checks_passed": passed,
            "checks_total": total,
            "checks": checks
        }

    return jsonify({
        "success": True,
        "authentication": summarize(authentication_checks),
        "access_control": summarize(access_checks),
        "event_monitoring": summarize(monitoring_checks),
        "scope": "Application-level checks only",
        "note": "These checks do not establish production security effectiveness."
    })


@app.route("/api/security/overview", methods=["GET"])
@role_required("SOC_ADMIN")
def api_security_overview():
    connection = get_db_connection()

    try:
        counts = connection.execute("""
            SELECT
                COUNT(*) AS total_events,
                SUM(CASE WHEN event_type = 'LOGIN_SUCCESS' THEN 1 ELSE 0 END) AS successful_logins,
                SUM(CASE WHEN event_type = 'LOGIN_FAILED' THEN 1 ELSE 0 END) AS failed_logins,
                SUM(CASE WHEN severity = 'INFO' THEN 1 ELSE 0 END) AS info_events,
                SUM(CASE WHEN severity = 'WARNING' THEN 1 ELSE 0 END) AS warning_events,
                SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) AS critical_events
            FROM security_events
        """).fetchone()

        events = connection.execute("""
            SELECT
                e.id,
                e.user_id,
                u.email,
                e.event_type,
                e.source_ip,
                e.severity,
                e.details,
                e.created_at
            FROM security_events e
            LEFT JOIN users u ON u.id = e.user_id
            ORDER BY e.created_at DESC, e.id DESC
            LIMIT 50
        """).fetchall()

        incident_counts = connection.execute("""
            SELECT
                COUNT(*) AS total_incidents,
                SUM(CASE WHEN status IN ('OPEN', 'INVESTIGATING')
                    THEN 1 ELSE 0 END) AS open_incidents,
                SUM(CASE WHEN status = 'RESOLVED'
                    THEN 1 ELSE 0 END) AS resolved_incidents
            FROM security_incidents
        """).fetchone()

        trend_hour = (
            "to_char(date_trunc('hour', created_at), 'YYYY-MM-DD\"T\"HH24:00:00\"Z\"')"
            if os.environ.get("RW_DB_ENGINE", "sqlite").lower() == "postgres"
            else "strftime('%Y-%m-%dT%H:00:00Z', created_at)"
        )
        trend_recent = (
            "created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'"
            if os.environ.get("RW_DB_ENGINE", "sqlite").lower() == "postgres"
            else "datetime(created_at) >= datetime('now', '-24 hours')"
        )
        trends = connection.execute(f"""
            SELECT
                {trend_hour} AS hour,
                COUNT(*) AS total,
                SUM(CASE WHEN event_type = 'LOGIN_FAILED' THEN 1 ELSE 0 END) AS failed,
                SUM(CASE WHEN event_type = 'LOGIN_SUCCESS' THEN 1 ELSE 0 END) AS successful
            FROM security_events
            WHERE {trend_recent}
            GROUP BY {trend_hour}
            ORDER BY hour
        """).fetchall()

        sources = connection.execute("""
            SELECT source_ip, COUNT(*) AS event_count
            FROM security_events
            WHERE source_ip IS NOT NULL
            GROUP BY source_ip
            ORDER BY event_count DESC
            LIMIT 10
        """).fetchall()

        return jsonify({
            "success": True,
            "metrics": {
                "total_events": counts["total_events"],
                "successful_logins": counts["successful_logins"],
                "failed_logins": counts["failed_logins"],
                "blocked_attempts": 0,
                "open_incidents": incident_counts["open_incidents"],
                "total_incidents": incident_counts["total_incidents"],
                "resolved_incidents": incident_counts["resolved_incidents"],
                "info_events": counts["info_events"],
                "warning_events": counts["warning_events"],
                "critical_events": counts["critical_events"]
            },
            "recent_events": [dict(event) for event in events],
            "top_sources": [dict(source) for source in sources],
            "threat_trends": [dict(row) for row in trends]
        })
    finally:
        connection.close()




app.register_blueprint(market_bp)
app.register_blueprint(market_search_bp)
app.register_blueprint(trading_bp)
from demo_banking_api import banking_bp
app.register_blueprint(portfolio_bp)
app.register_blueprint(banking_bp)

app.register_blueprint(registration_bp)

app.register_blueprint(password_reset_bp)






from alerts_api import alerts_bp
app.register_blueprint(alerts_bp)


# RW INCIDENT API START

@app.route("/api/security/incidents", methods=["GET"])
@role_required("SOC_ADMIN")
def api_incident_list():
    connection = get_db_connection()
    try:
        related_recent = (
            "e.created_at >= i.created_at - INTERVAL '5 minutes'"
            if os.environ.get("RW_DB_ENGINE", "sqlite").lower() == "postgres"
            else "datetime(e.created_at) >= datetime(i.created_at, '-5 minutes')"
        )
        incidents = connection.execute(f"""
            SELECT i.*,
                (SELECT COUNT(*)
                 FROM security_events e
                 WHERE e.source_ip = i.source_ip
                   AND {related_recent}
                ) AS related_event_count
            FROM security_incidents i
            ORDER BY i.created_at DESC, i.id DESC
        """).fetchall()

        return jsonify({
            "success": True,
            "incidents": [dict(row) for row in incidents]
        })
    finally:
        connection.close()


@app.route("/api/security/incidents/<int:incident_id>",
           methods=["GET"])
@role_required("SOC_ADMIN")
def api_incident_detail(incident_id):
    connection = get_db_connection()
    try:
        incident = connection.execute(
            "SELECT * FROM security_incidents WHERE id = ?",
            (incident_id,)
        ).fetchone()

        if not incident:
            return jsonify({"error": "Incident not found"}), 404

        event_recent = (
            "e.created_at >= CAST(? AS timestamp) - INTERVAL '5 minutes'"
            if os.environ.get("RW_DB_ENGINE", "sqlite").lower() == "postgres"
            else "datetime(e.created_at) >= datetime(?, '-5 minutes')"
        )
        events = connection.execute(f"""
            SELECT e.id, e.user_id, u.email,
                   e.event_type, e.source_ip,
                   e.severity, e.details, e.created_at
            FROM security_events e
            LEFT JOIN users u ON u.id = e.user_id
            WHERE e.source_ip = ?
              AND {event_recent}
            ORDER BY e.created_at DESC, e.id DESC
            LIMIT 100
        """, (
            incident["source_ip"],
            incident["created_at"]
        )).fetchall()

        notes = connection.execute("""
            SELECT n.id, n.note, n.created_at,
                   n.analyst_id
            FROM incident_notes n
            WHERE n.incident_id = ?
            ORDER BY n.id DESC
        """, (incident_id,)).fetchall()

        return jsonify({
            "success": True,
            "incident": dict(incident),
            "events": [dict(row) for row in events],
            "notes": [dict(row) for row in notes]
        })
    finally:
        connection.close()


@app.route("/api/security/incidents/<int:incident_id>/status",
           methods=["PATCH"])
@role_required("SOC_ADMIN")
def api_incident_update_status(incident_id):
    payload = request.get_json(silent=True) or {}
    status = payload.get("status")

    if status not in ("OPEN", "INVESTIGATING", "RESOLVED"):
        return jsonify({"error": "Invalid status"}), 400

    connection = get_db_connection()
    try:
        cursor = connection.execute("""
            UPDATE security_incidents
            SET status = ?,
                resolved_at = CASE
                    WHEN ? = 'RESOLVED'
                    THEN CURRENT_TIMESTAMP
                    ELSE NULL
                END
            WHERE id = ?
        """, (status, status, incident_id))

        if cursor.rowcount == 0:
            return jsonify({"error": "Incident not found"}), 404

        connection.commit()

        return jsonify({
            "success": True,
            "incident_id": incident_id,
            "status": status
        })
    finally:
        connection.close()


@app.route("/api/security/incidents/<int:incident_id>/notes",
           methods=["POST"])
@role_required("SOC_ADMIN")
def api_incident_add_note(incident_id):
    payload = request.get_json(silent=True) or {}
    note = payload.get("note", "")

    if not isinstance(note, str) or not note.strip():
        return jsonify({"error": "Note required"}), 400

    if len(note) > 5000:
        return jsonify({"error": "Note too long"}), 400

    connection = get_db_connection()
    try:
        incident = connection.execute(
            "SELECT id FROM security_incidents WHERE id = ?",
            (incident_id,)
        ).fetchone()

        if not incident:
            return jsonify({"error": "Incident not found"}), 404

        postgres = os.environ.get("RW_DB_ENGINE", "sqlite").lower() == "postgres"
        note_sql = """
            INSERT INTO incident_notes
            (incident_id, analyst_id, note)
            VALUES (?, ?, ?)
        """ + (" RETURNING id" if postgres else "")
        cursor = connection.execute(note_sql, (
            incident_id,
            session["user_id"],
            note.strip()
        ))

        note_id = cursor.fetchone()["id"] if postgres else cursor.lastrowid
        connection.commit()

        return jsonify({
            "success": True,
            "note_id": note_id
        }), 201
    finally:
        connection.close()

# RW INCIDENT API END


# CUSTOMER PROFILE PHOTO
import base64

@app.route("/api/me/photo", methods=["POST", "DELETE"])
def api_profile_photo():
    if "user_id" not in session:
        return jsonify({"error": "Authentication required"}), 401

    db = get_db_connection()
    user_id = session["user_id"]

    try:
        columns = {
            row["name"] for row in
            db.execute(
                "SELECT column_name AS name FROM information_schema.columns "
                "WHERE table_schema = current_schema() AND table_name = 'users'"
                if os.environ.get("RW_DB_ENGINE", "sqlite").lower() == "postgres"
                else "PRAGMA table_info(users)"
            ).fetchall()
        }

        if "profile_photo_data" not in columns:
            db.execute("ALTER TABLE users ADD COLUMN profile_photo_data TEXT")

        if "profile_photo_mime" not in columns:
            db.execute("ALTER TABLE users ADD COLUMN profile_photo_mime TEXT")

        if request.method == "DELETE":
            db.execute(
                "UPDATE users SET profile_photo_data=NULL, "
                "profile_photo_mime=NULL WHERE id=?",
                (user_id,)
            )
            db.commit()
            return jsonify({"success": True, "photo": None})

        uploaded = request.files.get("photo")
        if not uploaded:
            return jsonify({"error": "Select a photo"}), 400

        data = uploaded.read(5 * 1024 * 1024 + 1)

        if len(data) > 5 * 1024 * 1024:
            return jsonify({"error": "Maximum photo size is 5 MB"}), 413

        mime = uploaded.mimetype
        valid = (
            mime == "image/jpeg" and data.startswith(b"\xff\xd8\xff")
            or mime == "image/png" and data.startswith(b"\x89PNG\r\n\x1a\n")
            or mime == "image/webp" and data.startswith(b"RIFF") and data[8:12] == b"WEBP"
        )

        if not valid:
            return jsonify({"error": "Use a valid JPG, PNG or WebP image"}), 400

        encoded = base64.b64encode(data).decode("ascii")

        db.execute(
            "UPDATE users SET profile_photo_data=?, "
            "profile_photo_mime=? WHERE id=?",
            (encoded, mime, user_id)
        )
        db.commit()

        return jsonify({
            "success": True,
            "photo": f"data:{mime};base64,{encoded}"
        })

    except Exception:
        db.rollback()
        return jsonify({"error": "Unable to update profile photo"}), 500
    finally:
        db.close()


# Russell Wealth SOC infrastructure health monitoring

# RW CUSTOMER ACTIVITY
@app.route("/api/customer/activity", methods=["GET"])
def rw_customer_activity():
    from datetime import datetime, timezone

    user_id = session.get("user_id")
    if user_id is None:
        return jsonify({"error": "Authentication required"}), 401

    connection = get_db_connection()
    try:
        events = connection.execute("""
            SELECT id, event_type, source_ip, severity,
                   details, created_at
            FROM security_events
            WHERE user_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 500
        """, (user_id,)).fetchall()

        transactions = connection.execute("""
            SELECT t.id, t.transaction_type, t.quantity,
                   t.amount_cents, t.created_at
            FROM transactions t
            JOIN investment_accounts a ON a.id = t.account_id
            WHERE a.user_id = ?
            ORDER BY t.created_at DESC, t.id DESC
            LIMIT 500
        """, (user_id,)).fetchall()

        items = []

        for row in events:
            kind = str(row["event_type"] or "")
            items.append({
                "id": "event-" + str(row["id"]),
                "category": (
                    "login" if kind.startswith("LOGIN_")
                    else "account" if any(
                        x in kind for x in
                        ("PROFILE", "PASSWORD", "ACCOUNT", "EMAIL")
                    )
                    else "security"
                ),
                "type": kind,
                "title": kind.replace("_", " ").title(),
                "details": row["details"] or "",
                "timestamp": str(row["created_at"] or ""),
                "ip": row["source_ip"] or None,
                "severity": row["severity"] or "INFO",
                "amount_cents": None
            })

        for row in transactions:
            kind = str(row["transaction_type"] or "TRANSACTION")
            items.append({
                "id": "transaction-" + str(row["id"]),
                "category": "transaction",
                "type": kind,
                "title": kind.replace("_", " ").title(),
                "details": (
                    "Quantity: " + str(row["quantity"])
                    if row["quantity"] is not None else ""
                ),
                "timestamp": str(row["created_at"] or ""),
                "ip": None,
                "severity": "INFO",
                "amount_cents": row["amount_cents"]
            })

        def sort_time(item):
            value = item["timestamp"].replace("Z", "+00:00")
            try:
                dt = datetime.fromisoformat(value)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.timestamp()
            except (ValueError, OverflowError):
                return 0

        items.sort(key=lambda item: (sort_time(item), item["id"]), reverse=True)

        return jsonify({
            "success": True,
            "summary": {
                "successful_logins": sum(
                    e["type"] == "LOGIN_SUCCESS" for e in items
                ),
                "failed_logins": sum(
                    e["type"] == "LOGIN_FAILED" for e in items
                ),
                "transactions": sum(
                    e["category"] == "transaction" for e in items
                ),
                "account_changes": sum(
                    e["category"] == "account" for e in items
                )
            },
            "events": items,
            "limit_per_source": 500
        })
    except Exception:
        app.logger.exception("Customer activity request failed")
        return jsonify({"error": "Unable to load account activity"}), 500
    finally:
        connection.close()
# RW CUSTOMER ACTIVITY END


# RW CUSTOMER ACCOUNT MANAGEMENT
@app.route("/api/customer/account-management", methods=["GET", "PUT"])
def rw_customer_account_management():
    from werkzeug.security import check_password_hash, generate_password_hash
    import json

    uid = session.get("user_id")
    if uid is None:
        return jsonify(error="Authentication required"), 401

    db = get_db_connection()
    try:
        db.execute("""
            CREATE TABLE IF NOT EXISTS customer_preferences (
                user_id INTEGER PRIMARY KEY,
                preferences TEXT NOT NULL
            )
        """)

        user = db.execute(
            "SELECT id, name, email, password_hash, account_status "
            "FROM users WHERE id=?", (uid,)
        ).fetchone()
        if user is None:
            return jsonify(error="Account not found"), 404

        stored = db.execute(
            "SELECT preferences FROM customer_preferences WHERE user_id=?",
            (uid,)
        ).fetchone()

        defaults = {
            "email_notifications": True,
            "security_notifications": True,
            "compact_view": False
        }
        preferences = dict(defaults)
        if stored:
            saved = json.loads(stored["preferences"])
            if isinstance(saved, dict):
                preferences.update({
                    key: saved[key] for key in defaults
                    if type(saved.get(key)) is bool
                })

        if request.method == "GET":
            return jsonify(
                name=user["name"], email=user["email"],
                account_status=user["account_status"],
                preferences=preferences
            )

        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify(error="JSON request required"), 400

        action = data.get("action")
        if action == "preferences":
            incoming = data.get("preferences")
            if not isinstance(incoming, dict):
                return jsonify(error="Invalid preferences"), 400
            if any(key not in defaults or type(value) is not bool
                   for key, value in incoming.items()):
                return jsonify(error="Invalid preference values"), 400

            preferences.update(incoming)
            db.execute("""
                INSERT INTO customer_preferences(user_id, preferences)
                VALUES (?, ?)
                ON CONFLICT(user_id) DO UPDATE
                SET preferences=excluded.preferences
            """, (uid, json.dumps(preferences)))
            db.commit()
            return jsonify(success=True, preferences=preferences)

        if action == "password":
            current = data.get("current_password")
            new = data.get("new_password")
            if not isinstance(current, str) or not isinstance(new, str):
                return jsonify(error="Enter both passwords"), 400
            if not check_password_hash(user["password_hash"], current):
                return jsonify(error="Current password is incorrect"), 400
            if not 7 <= len(new) <= 128:
                return jsonify(error="New password must contain 7–128 characters"), 400
            if check_password_hash(user["password_hash"], new):
                return jsonify(error="Choose a different password"), 400

            db.execute(
                "UPDATE users SET password_hash=?, password_hint=NULL WHERE id=?",
                (generate_password_hash(new), uid)
            )
            db.commit()
            try:
                log_security_event(
                    uid, "PASSWORD_CHANGED", request.remote_addr,
                    "INFO", "Customer changed account password"
                )
            except Exception:
                app.logger.exception("Password change audit logging failed")
            return jsonify(success=True, message="Password updated successfully")

        return jsonify(error="Unsupported settings action"), 400
    except Exception:
        db.rollback()
        app.logger.exception("Customer account management failed")
        return jsonify(error="Unable to process account settings"), 500
    finally:
        db.close()
# RW CUSTOMER ACCOUNT MANAGEMENT END

@app.route("/api/security/infrastructure", methods=["GET"])
@role_required("SOC_ADMIN")
def api_security_infrastructure():
    from datetime import datetime, timezone
    from time import perf_counter
    from urllib.request import Request, urlopen
    from urllib.error import HTTPError, URLError
    from urllib.parse import urlparse
    from postgres_connection import get_postgres_connection

    def check_http(name, environment_variable):
        url = os.environ.get(environment_variable, "").strip()

        if not url:
            return {
                "name": name,
                "status": "unconfigured",
                "latency_ms": None,
                "http_status": None,
                "detail": "Production URL not configured"
            }

        parsed = urlparse(url)

        if parsed.scheme != "https" or not parsed.hostname:
            return {
                "name": name,
                "status": "unconfigured",
                "latency_ms": None,
                "http_status": None,
                "detail": "Invalid production URL configuration"
            }

        started = perf_counter()

        try:
            request_obj = Request(
                url,
                headers={"User-Agent": "RussellWealth-Monitor/1.0"}
            )

            with urlopen(request_obj, timeout=8) as response:
                code = response.status

            return {
                "name": name,
                "status": "online" if 200 <= code < 400 else "degraded",
                "latency_ms": round((perf_counter() - started) * 1000),
                "http_status": code,
                "detail": "HTTP endpoint responding"
            }

        except HTTPError as exc:
            return {
                "name": name,
                "status": "degraded",
                "latency_ms": round((perf_counter() - started) * 1000),
                "http_status": exc.code,
                "detail": "HTTP endpoint returned an error"
            }

        except (URLError, TimeoutError, OSError):
            return {
                "name": name,
                "status": "offline",
                "latency_ms": round((perf_counter() - started) * 1000),
                "http_status": None,
                "detail": "Endpoint unreachable"
            }

    render = check_http("Render", "RW_RENDER_HEALTH_URL")
    vercel = check_http("Vercel", "RW_VERCEL_URL")

    started = perf_counter()

    if not os.environ.get("DATABASE_URL"):
        neon = {
            "name": "Neon",
            "status": "unconfigured",
            "latency_ms": None,
            "http_status": None,
            "detail": "PostgreSQL connection not configured"
        }
    else:
        try:
            with get_postgres_connection() as connection:
                connection.execute("SELECT 1").fetchone()

            neon = {
                "name": "Neon",
                "status": "online",
                "latency_ms": round((perf_counter() - started) * 1000),
                "http_status": None,
                "detail": "PostgreSQL query successful"
            }

        except Exception:
            neon = {
                "name": "Neon",
                "status": "offline",
                "latency_ms": round((perf_counter() - started) * 1000),
                "http_status": None,
                "detail": "PostgreSQL connection or query failed"
            }

    return jsonify({
        "success": True,
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "services": [render, neon, vercel]
    })





from profile_api import profile_bp, initialize_profile_schema
initialize_profile_schema()
app.register_blueprint(profile_bp)


if __name__ == "__main__":
    app.run(debug=True, port=5001)
