from flask import session


def customer_user_id(connection):
    """Resolve the customer account authorized for this session."""
    user_id = session.get("user_id")
    role = session.get("role")

    if not user_id:
        raise PermissionError("Authentication required")

    if role == "CUSTOMER":
        return user_id

    if role == "SOC_ADMIN":
        row = connection.execute(
            """
            SELECT l.customer_user_id
            FROM admin_customer_links l
            JOIN users customer ON customer.id = l.customer_user_id
            WHERE l.admin_user_id = ?
              AND customer.role = 'CUSTOMER'
              AND customer.account_status = 'ACTIVE'
            ORDER BY l.customer_user_id
            LIMIT 1
            """,
            (user_id,)
        ).fetchone()

        if row:
            return row["customer_user_id"]

        raise PermissionError("No linked customer account")

    raise PermissionError("Customer access denied")
