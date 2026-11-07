import sys
from pathlib import Path
from decimal import Decimal, ROUND_HALF_UP

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from database import get_db_connection
from market_cache import (
    ensure_schema,
    refresh_due,
    refresh_status,
    commit_monthly_snapshot,
)
from market_data import (
    fetch_quote,
    fetch_history,
    fetch_usd_cad_rate,
)


def refresh(force=False):
    ensure_schema()

    if not force and not refresh_due():
        print("Monthly refresh already completed:", refresh_status())
        return

    conn = get_db_connection()
    try:
        assets = conn.execute(
            "SELECT symbol FROM assets ORDER BY symbol"
        ).fetchall()
    finally:
        conn.close()

    if not assets:
        raise RuntimeError("No registered assets to refresh.")

    print("Preparing monthly snapshot:", len(assets), "assets")

    # Fetch everything before changing the database.
    rate = fetch_usd_cad_rate()
    quotes = {}
    histories = {}
    asset_prices = {}

    for asset in assets:
        symbol = asset["symbol"]
        print("Fetching:", symbol)

        quote = fetch_quote(symbol)
        price = Decimal(str(quote["price"]))

        if not price.is_finite() or price <= 0:
            raise ValueError(f"Invalid quote: {symbol}")

        currency = quote.get("currency")
        if currency not in ("CAD", "USD"):
            raise ValueError(f"Unsupported currency: {symbol}")

        history = fetch_history(symbol)
        if not history:
            raise ValueError(f"Missing history: {symbol}")

        history = sorted(history, key=lambda row: row["date"])

        for point in history:
            if (
                not point.get("date")
                or not Decimal(str(point["close"])).is_finite()
                or Decimal(str(point["close"])) <= 0
            ):
                raise ValueError(f"Invalid history record: {symbol}")

        cad_price = price * (
            rate if currency == "USD" else Decimal("1")
        )

        cents = int(
            (cad_price * 100).quantize(
                Decimal("1"), rounding=ROUND_HALF_UP
            )
        )

        if cents <= 0:
            raise ValueError(f"Invalid CAD price: {symbol}")

        quote["symbol"] = symbol
        quotes[symbol] = quote
        histories[symbol] = history
        asset_prices[symbol] = cents

    if len(quotes) != len(assets):
        raise RuntimeError("Snapshot incomplete. Nothing committed.")

    # One transaction: all data or no data.
    commit_monthly_snapshot(
        quotes, histories, rate, asset_prices
    )

    print("\nMONTHLY SNAPSHOT SUCCESSFULLY COMMITTED")
    print(refresh_status())


if __name__ == "__main__":
    refresh(force="--force" in sys.argv)
