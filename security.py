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