from database import get_db_connection
import os


def initialize_security_email_schema():
    db = get_db_connection()
    try:
        if os.environ.get('RW_DB_ENGINE', 'sqlite').lower() == 'postgres':
            db.execute('ALTER TABLE security_events ADD COLUMN IF NOT EXISTS account_email TEXT')
        elif 'account_email' not in {row['name'] for row in db.execute('PRAGMA table_info(security_events)')}:
            db.execute('ALTER TABLE security_events ADD COLUMN account_email TEXT')
        from alert_rules import initialize_alert_schema
        initialize_alert_schema(db)
        db.commit()
    finally:
        db.close()


def log_security_event(user_id, event_type, source_ip, severity, details, account_email=None):
    connection = get_db_connection()
    try:
        if not account_email and user_id is not None:
            user = connection.execute('SELECT email FROM users WHERE id=?', (user_id,)).fetchone()
            account_email = user['email'] if user else None
        inserted = connection.execute("""
            INSERT INTO security_events
            (user_id, event_type, source_ip, severity, details, account_email)
            VALUES (?, ?, ?, ?, ?, ?) RETURNING id
        """, (user_id, event_type, source_ip, severity, details,
              account_email.strip().lower()[:254] if account_email else None)).fetchone()
        from alert_rules import evaluate_event
        event = connection.execute("SELECT * FROM security_events WHERE id=?", (inserted["id"],)).fetchone()
        evaluate_event(connection, event)
        connection.commit()
    finally:
        connection.close()

def detect_failed_login_attack(source_ip):
    """Record a potential credential attack after repeated failed logins."""
    if not source_ip:
        return False

    connection = get_db_connection()

    try:
        recent_condition = (
            "created_at >= CURRENT_TIMESTAMP - INTERVAL '60 seconds'"
            if os.environ.get("RW_DB_ENGINE", "sqlite").lower() == "postgres"
            else "datetime(created_at) >= datetime('now', '-60 seconds')"
        )

        row = connection.execute(f"""
            SELECT COUNT(*) AS attempts
            FROM security_events
            WHERE event_type = 'LOGIN_FAILED'
              AND source_ip = ?
              AND {recent_condition}
        """, (source_ip,)).fetchone()

        attempts = row["attempts"]

        if attempts < 5:
            return False

        existing = connection.execute(f"""
            SELECT COUNT(*) AS count
            FROM security_events
            WHERE event_type = 'POSSIBLE_CREDENTIAL_ATTACK'
              AND source_ip = ?
              AND {recent_condition}
        """, (source_ip,)).fetchone()

        if existing["count"] > 0:
            return True

        connection.execute("""
            INSERT INTO security_events
            (user_id, event_type, source_ip, severity, details)
            VALUES (?, ?, ?, ?, ?)
        """, (
            None,
            "POSSIBLE_CREDENTIAL_ATTACK",
            source_ip,
            "CRITICAL",
            f"{attempts} failed logins detected within 60 seconds"
        ))

        connection.commit()
        return True

    finally:
        connection.close()
