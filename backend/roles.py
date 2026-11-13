"""Customer membership is explicit; SOC accounts can also own a customer portfolio.

Combined access uses the existing SOC role and a self-link, so existing deployed
backends can still resolve that account's portfolio.
"""


def account_roles(db, user_id, role):
    if role == 'CUSTOMER':
        return ['CUSTOMER']
    if role == 'SOC_ADMIN':
        linked = db.execute('SELECT 1 FROM admin_customer_links WHERE admin_user_id=? LIMIT 1', (user_id,)).fetchone()
        return ['CUSTOMER', 'SOC_ADMIN'] if linked else ['SOC_ADMIN']
    return []


def access_role(db, user_id, role):
    return 'BOTH' if len(account_roles(db, user_id, role)) == 2 else role
