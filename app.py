from flask import Flask, render_template, request, session, redirect, url_for
from werkzeug.security import check_password_hash
from database import get_db_connection
from security import log_security_event

app = Flask(__name__)

app.secret_key = "dev-secret-key-change-later"


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


if __name__ == "__main__":
    app.run(debug=True, port=5001)