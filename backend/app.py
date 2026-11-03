from market_search_api import market_search_bp
from trading_api import trading_bp
from portfolio_api import portfolio_bp
from market_api import market_bp
from authorization import role_required
from flask import Flask, render_template, request, session, redirect, url_for
from werkzeug.security import check_password_hash
from database import get_db_connection
from authorization import login_required, role_required
from security import log_security_event

app = Flask(__name__)

import os
from dotenv import load_dotenv

load_dotenv()
app.secret_key = os.environ["FLASK_SECRET_KEY"]


@app.route("/")
def home():
    return render_template("login.html")


@app.route("/login", methods=["POST"])
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

    if user and check_password_hash(user["password_hash"], password):

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

        if user["role"] == "CUSTOMER":
            return redirect(url_for("customer"))

        if user["role"] == "SOC_ADMIN":
            return redirect(url_for("soc"))

    log_security_event(
        user["id"] if user else None,
        "LOGIN_FAILED",
        source_ip,
        "WARNING",
        f"Failed login attempt for {email}"
    )

    return "Invalid email or password."


@app.route("/customer")
def customer():
    if "user_id" not in session:
        return redirect(url_for("home"))

    if session["role"] != "CUSTOMER":
        return "Access Denied", 403

    return f"Customer Dashboard — Welcome {session['name']}"


@app.route("/soc")
def soc():
    if "user_id" not in session:
        return redirect(url_for("home"))

    if session["role"] != "SOC_ADMIN":
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
        session["user_id"] = user["id"]
        session["name"] = user["name"]
        session["role"] = user["role"]

        log_security_event(
            user["id"],
            "LOGIN_SUCCESS",
            source_ip,
            "INFO",
            f"Successful login for {email}"
        )

        return jsonify({
            "success": True,
            "name": user["name"],
            "role": user["role"]
        }), 200

    log_security_event(
        user["id"] if user else None,
        "LOGIN_FAILED",
        source_ip,
        "WARNING",
        f"Failed login attempt for {email}"
    )

    return jsonify({
        "error": "Invalid email or password"
    }), 401


@app.route("/api/me", methods=["GET"])
def api_me():
    if "user_id" not in session:
        return jsonify({"authenticated": False}), 401

    return jsonify({
        "authenticated": True,
        "name": session["name"],
        "role": session["role"]
    })


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


@app.route("/api/security/overview", methods=["GET"])
@role_required("SOC_ADMIN")
def api_security_overview():
    return jsonify({
        "success": True,
        "message": "SOC security API access granted"
    })

app.register_blueprint(market_bp)
app.register_blueprint(market_search_bp)
app.register_blueprint(trading_bp)
app.register_blueprint(portfolio_bp)

if __name__ == "__main__":
    app.run(debug=True, port=5001)
