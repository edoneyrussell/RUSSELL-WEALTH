from database import get_db_connection

conn = get_db_connection()

try:
    conn.execute("BEGIN")

    customer = conn.execute(
        "SELECT id FROM users WHERE role = ? ORDER BY id LIMIT 1",
        ("CUSTOMER",)
    ).fetchone()

    if customer is None:
        raise RuntimeError("No customer account found.")

    user_id = customer["id"]

    account = conn.execute(
        "SELECT id FROM investment_accounts WHERE user_id = ?",
        (user_id,)
    ).fetchone()

    if account is None:
        cursor = conn.execute(
            """
            INSERT INTO investment_accounts
            (user_id, account_name, cash_balance_cents)
            VALUES (?, ?, ?)
            """,
            (user_id, "Russell Wealth Portfolio", 500000)
        )
        account_id = cursor.lastrowid

        conn.execute(
            """
            INSERT INTO transactions
            (account_id, transaction_type, amount_cents)
            VALUES (?, 'DEPOSIT', ?)
            """,
            (account_id, 500000)
        )
    else:
        account_id = account["id"]

    assets = [
        ("VDY", "Vanguard FTSE Canadian High Dividend Yield ETF", "ETF", "CAD", 7893),
        ("XEG", "iShares S&P/TSX Capped Energy Index ETF", "ETF", "CAD", 2200),
        ("RY", "Royal Bank of Canada", "STOCK", "CAD", 18000),
        ("SHOP", "Shopify", "STOCK", "CAD", 16000)
    ]

    for symbol, name, asset_type, currency, price in assets:
        conn.execute(
            """
            INSERT OR IGNORE INTO assets
            (symbol, name, asset_type, currency, price_cents)
            VALUES (?, ?, ?, ?, ?)
            """,
            (symbol, name, asset_type, currency, price)
        )

    conn.commit()

    print("Simulated portfolio initialized.")
    print("Customer ID:", user_id)
    print("Account ID:", account_id)
    print("Assets available:", len(assets))

finally:
    conn.close()
