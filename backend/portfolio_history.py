"""Account-owned balance observations shared by every signed-in device."""
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from database import get_db_connection


def initialize_portfolio_history():
    db = get_db_connection()
    try:
        db.execute('''CREATE TABLE IF NOT EXISTS portfolio_snapshots (
            account_id INTEGER NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
            recorded_at BIGINT NOT NULL,
            value_cents BIGINT NOT NULL,
            PRIMARY KEY (account_id, recorded_at)
        )''')
        db.commit()
    finally:
        db.close()


def observe_portfolio(db, account_id, value_cents, now=None):
    now = now or datetime.now(timezone.utc)
    timestamp = int(now.timestamp() * 1000)
    value_cents = int(Decimal(value_cents).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
    last = db.execute('''SELECT recorded_at, value_cents FROM portfolio_snapshots
        WHERE account_id=? ORDER BY recorded_at DESC LIMIT 1''', (account_id,)).fetchone()
    # Unfunded accounts start recording with their first positive balance.
    if (last is None and value_cents > 0) or (last is not None and
            (last['value_cents'] != value_cents or timestamp - last['recorded_at'] >= 3600000)):
        db.execute('''INSERT INTO portfolio_snapshots (account_id, recorded_at, value_cents)
            VALUES (?, ?, ?) ON CONFLICT (account_id, recorded_at) DO NOTHING''',
            (account_id, timestamp, value_cents))
        db.commit()
    rows = db.execute('''SELECT recorded_at, value_cents FROM portfolio_snapshots
        WHERE account_id=? AND recorded_at>=? ORDER BY recorded_at DESC LIMIT 10000''',
        (account_id, timestamp - 366 * 86400000)).fetchall()
    return [dict(time=row['recorded_at'], value=float(Decimal(row['value_cents']) / 100))
            for row in reversed(rows)]
