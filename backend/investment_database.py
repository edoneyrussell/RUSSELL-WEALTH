from database import get_db_connection
import os


def initialize_investments():
    if os.environ.get("RW_DB_ENGINE", "sqlite").lower() == "postgres":
        return
    conn = get_db_connection()

    conn.executescript("""
    CREATE TABLE IF NOT EXISTS investment_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        account_name TEXT NOT NULL DEFAULT 'Investment Portfolio',
        cash_balance_cents INTEGER NOT NULL DEFAULT 0
            CHECK (cash_balance_cents >= 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        asset_type TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'CAD',
        price_cents INTEGER NOT NULL CHECK (price_cents > 0)
    );

    CREATE TABLE IF NOT EXISTS holdings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        asset_id INTEGER NOT NULL,
        quantity TEXT NOT NULL DEFAULT '0',
        UNIQUE(account_id, asset_id),
        FOREIGN KEY (account_id) REFERENCES investment_accounts(id),
        FOREIGN KEY (asset_id) REFERENCES assets(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        asset_id INTEGER,
        transaction_type TEXT NOT NULL
            CHECK (transaction_type IN ('DEPOSIT', 'WITHDRAWAL', 'BUY', 'SELL')),
        quantity TEXT,
        amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES investment_accounts(id),
        FOREIGN KEY (asset_id) REFERENCES assets(id)
    );
    """)

    conn.commit()
    conn.close()
    print("Investment database initialized successfully.")


if __name__ == "__main__":
    initialize_investments()
