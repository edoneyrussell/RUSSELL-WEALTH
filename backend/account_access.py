from flask import session



def customer_user_id(connection):
    """Resolve the investment owner for the authenticated login."""
    from flask import session

    uid = session.get("user_id")
    if uid is None:
        raise PermissionError("Authentication required")

    # Both owner logins use the same investment account.
    if int(uid) in (1, 2):
        return 2

    if session.get("role") == "CUSTOMER":
        return uid

    if session.get("role") == "SOC_ADMIN":
        row = connection.execute("""
            SELECT customer_user_id
            FROM admin_customer_links
            WHERE admin_user_id = ?
            ORDER BY customer_user_id
            LIMIT 1
        """, (uid,)).fetchone()
        if row:
            return row["customer_user_id"]

    raise PermissionError("Customer access denied")
