from database import get_db_connection


def log_security_event(user_id, event_type, source_ip, severity, details):
    connection = get_db_connection()

    connection.execute("""
        INSERT INTO security_events
        (user_id, event_type, source_ip, severity, details)
        VALUES (?, ?, ?, ?, ?)
    """, (
        user_id,
        event_type,
        source_ip,
        severity,
        details
    ))

    connection.commit()
    connection.close()

def detect_failed_login_attack(source_ip):
    """Record a potential credential attack after repeated failed logins."""
    if not source_ip:
        return False

    connection = get_db_connection()

    try:
        row = connection.execute("""
            SELECT COUNT(*) AS attempts
            FROM security_events
            WHERE event_type = 'LOGIN_FAILED'
              AND source_ip = ?
              AND datetime(created_at) >= datetime('now', '-60 seconds')
        """, (source_ip,)).fetchone()

        attempts = row["attempts"]

        if attempts < 5:
            return False

        existing = connection.execute("""
            SELECT COUNT(*) AS count
            FROM security_events
            WHERE event_type = 'POSSIBLE_CREDENTIAL_ATTACK'
              AND source_ip = ?
              AND datetime(created_at) >= datetime('now', '-60 seconds')
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
