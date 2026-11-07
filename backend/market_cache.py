
import json
import sqlite3
from pathlib import Path
import os
from database import get_db_connection
from datetime import date, datetime, timezone

DATABASE = Path(__file__).resolve().parent.parent / "russellwealth.db"


def connection():
    return get_db_connection()


def ensure_schema():
    if os.environ.get("RW_DB_ENGINE", "sqlite").lower() == "postgres":
        return
    conn = connection()
    try:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS market_quotes (
            symbol TEXT PRIMARY KEY,
            price TEXT NOT NULL,
            currency TEXT NOT NULL,
            provider TEXT NOT NULL,
            as_of TEXT,
            refreshed_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS market_history (
            symbol TEXT PRIMARY KEY,
            history_json TEXT NOT NULL,
            provider TEXT NOT NULL,
            refreshed_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS market_metadata (
            cache_key TEXT PRIMARY KEY,
            cache_value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS market_fx_rates (
            pair TEXT PRIMARY KEY,
            rate TEXT NOT NULL,
            rate_date TEXT NOT NULL,
            refreshed_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_market_quotes_refreshed
        ON market_quotes(refreshed_at);
        """)
        conn.commit()
    finally:
        conn.close()


def current_month():
    return datetime.now(timezone.utc).strftime("%Y-%m")


def refresh_due():
    ensure_schema()
    conn = connection()
    try:
        row = conn.execute(
            "SELECT cache_value FROM market_metadata WHERE cache_key = ?",
            ("last_successful_monthly_refresh",)
        ).fetchone()

        return row is None or row["cache_value"] != current_month()
    finally:
        conn.close()


def save_quote(quote):
    ensure_schema()
    now = datetime.now(timezone.utc).isoformat()

    conn = connection()
    try:
        conn.execute("""
            INSERT INTO market_quotes
            (symbol, price, currency, provider, as_of, refreshed_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(symbol) DO UPDATE SET
                price = excluded.price,
                currency = excluded.currency,
                provider = excluded.provider,
                as_of = excluded.as_of,
                refreshed_at = excluded.refreshed_at
        """, (
            quote["symbol"],
            str(quote["price"]),
            quote["currency"],
            quote["provider"],
            str(quote.get("as_of") or ""),
            now
        ))
        conn.commit()
    finally:
        conn.close()


def save_history(symbol, history, provider):
    ensure_schema()
    now = datetime.now(timezone.utc).isoformat()

    conn = connection()
    try:
        conn.execute("""
            INSERT INTO market_history
            (symbol, history_json, provider, refreshed_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(symbol) DO UPDATE SET
                history_json = excluded.history_json,
                provider = excluded.provider,
                refreshed_at = excluded.refreshed_at
        """, (
            symbol,
            json.dumps(history),
            provider,
            now
        ))
        conn.commit()
    finally:
        conn.close()


def read_quote(symbol):
    ensure_schema()
    conn = connection()
    try:
        row = conn.execute(
            "SELECT * FROM market_quotes WHERE symbol = ?",
            (symbol.upper(),)
        ).fetchone()

        if row is None:
            raise RuntimeError(
                f"No stored market quote for {symbol}. "
                "A monthly market refresh is required."
            )

        return {
            "symbol": row["symbol"],
            "price": float(row["price"]),
            "currency": row["currency"],
            "provider": row["provider"],
            "as_of": row["as_of"],
            "price_type": "monthly_snapshot",
            "refreshed_at": row["refreshed_at"]
        }
    finally:
        conn.close()


def read_history(symbol):
    ensure_schema()
    conn = connection()
    try:
        row = conn.execute(
            "SELECT history_json FROM market_history WHERE symbol = ?",
            (symbol.upper(),)
        ).fetchone()

        if row is None:
            raise RuntimeError(
                f"No stored historical data for {symbol}."
            )

        return json.loads(row["history_json"])
    finally:
        conn.close()


def save_fx_rate(rate, rate_date):
    ensure_schema()
    now = datetime.now(timezone.utc).isoformat()

    conn = connection()
    try:
        conn.execute("""
            INSERT INTO market_fx_rates
            (pair, rate, rate_date, refreshed_at)
            VALUES ('USD/CAD', ?, ?, ?)
            ON CONFLICT(pair) DO UPDATE SET
                rate = excluded.rate,
                rate_date = excluded.rate_date,
                refreshed_at = excluded.refreshed_at
        """, (str(rate), str(rate_date), now))
        conn.commit()
    finally:
        conn.close()


def read_fx_rate():
    ensure_schema()
    conn = connection()
    try:
        row = conn.execute("""
            SELECT rate FROM market_fx_rates
            WHERE pair = 'USD/CAD'
        """).fetchone()

        if row is None:
            raise RuntimeError("No stored USD/CAD rate available.")

        from decimal import Decimal
        return Decimal(row["rate"])
    finally:
        conn.close()


def mark_refresh_complete():
    ensure_schema()
    conn = connection()
    try:
        conn.execute("""
            INSERT INTO market_metadata (cache_key, cache_value)
            VALUES ('last_successful_monthly_refresh', ?)
            ON CONFLICT(cache_key) DO UPDATE SET
                cache_value = excluded.cache_value
        """, (current_month(),))
        conn.commit()
    finally:
        conn.close()


def refresh_status():
    ensure_schema()
    conn = connection()
    try:
        month = conn.execute("""
            SELECT cache_value FROM market_metadata
            WHERE cache_key = 'last_successful_monthly_refresh'
        """).fetchone()

        count = conn.execute(
            "SELECT COUNT(*) AS total FROM market_quotes"
        ).fetchone()["total"]

        return {
            "last_successful_month": month["cache_value"] if month else None,
            "current_month": current_month(),
            "assets_cached": count,
            "refresh_due": month is None or month["cache_value"] != current_month()
        }
    finally:
        conn.close()


def commit_monthly_snapshot(quotes, histories, fx_rate, asset_prices):
    """Atomically commit a complete, validated monthly market snapshot."""
    ensure_schema()
    now = datetime.now(timezone.utc).isoformat()

    if not quotes or len(quotes) != len(histories):
        raise ValueError("Incomplete market snapshot.")

    conn = connection()
    try:
        conn.execute("BEGIN IMMEDIATE")

        for symbol, quote in quotes.items():
            history = histories[symbol]

            if not history:
                raise ValueError(f"Missing history for {symbol}")

            conn.execute("""
                INSERT INTO market_quotes
                (symbol, price, currency, provider, as_of, refreshed_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(symbol) DO UPDATE SET
                    price=excluded.price,
                    currency=excluded.currency,
                    provider=excluded.provider,
                    as_of=excluded.as_of,
                    refreshed_at=excluded.refreshed_at
            """, (
                symbol, str(quote["price"]), quote["currency"],
                quote["provider"], str(quote.get("as_of") or ""), now
            ))

            conn.execute("""
                INSERT INTO market_history
                (symbol, history_json, provider, refreshed_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(symbol) DO UPDATE SET
                    history_json=excluded.history_json,
                    provider=excluded.provider,
                    refreshed_at=excluded.refreshed_at
            """, (
                symbol, json.dumps(history), quote["provider"], now
            ))

        conn.execute("""
            INSERT INTO market_fx_rates
            (pair, rate, rate_date, refreshed_at)
            VALUES ('USD/CAD', ?, ?, ?)
            ON CONFLICT(pair) DO UPDATE SET
                rate=excluded.rate,
                rate_date=excluded.rate_date,
                refreshed_at=excluded.refreshed_at
        """, (str(fx_rate), date.today().isoformat(), now))

        for symbol, price_cents in asset_prices.items():
            cursor = conn.execute("""
                UPDATE assets
                SET price_cents=?, currency='CAD'
                WHERE symbol=?
            """, (price_cents, symbol))

            if cursor.rowcount != 1:
                raise ValueError(f"Asset update failed: {symbol}")

        conn.execute("""
            INSERT INTO market_metadata (cache_key, cache_value)
            VALUES ('last_successful_monthly_refresh', ?)
            ON CONFLICT(cache_key) DO UPDATE SET
                cache_value=excluded.cache_value
        """, (current_month(),))

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
