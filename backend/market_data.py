import json
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import certifi

ROOT_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
BACKEND_ENV_FILE = Path(__file__).resolve().parent / ".env"

CACHE = {}
CACHE_SECONDS = 900

def api_key(name):
    import os

    value = os.environ.get(name)
    if value:
        return value.strip()

    for env_file in (ROOT_ENV_FILE, BACKEND_ENV_FILE):
        if not env_file.is_file():
            continue

        for line in env_file.read_text().splitlines():
            line = line.strip()

            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)

            if key.strip() == name:
                value = value.strip().strip('"').strip("'")
                if value:
                    return value

    raise RuntimeError(f"Missing {name}")

def request_json(url, params):
    query = urllib.parse.urlencode(params)
    full_url = url + "?" + query
    cache_key = full_url

    cached = CACHE.get(cache_key)
    if cached and time.time() - cached[0] < CACHE_SECONDS:
        return cached[1]

    context = ssl.create_default_context(cafile=certifi.where())
    request = urllib.request.Request(
        full_url,
        headers={"User-Agent": "RussellWealth-Dev/1.0"}
    )

    with urllib.request.urlopen(
        request, context=context, timeout=15
    ) as response:
        data = json.load(response)

    CACHE[cache_key] = (time.time(), data)
    return data

def fetch_quote(symbol):
    symbol = symbol.strip().upper()

    if not symbol or len(symbol) > 25:
        raise ValueError("Invalid symbol")

    if symbol.endswith(".TO"):
        provider = "EODHD"
        data = request_json(
            f"https://eodhd.com/api/eod/{urllib.parse.quote(symbol)}",
            {
                "api_token": api_key("EODHD_API_KEY"),
                "fmt": "json",
                "order": "d",
                "from": "2026-10-01",
            }
        )

        if not isinstance(data, list) or not data:
            raise RuntimeError("No Canadian market data")

        latest = max(data, key=lambda row: str(row.get('date', '')))
        return {
            "symbol": symbol,
            "price": latest["close"],
            "currency": "CAD",
            "provider": provider,
            "as_of": latest["date"],
            "price_type": "end_of_day"
        }

    data = request_json(
        "https://financialmodelingprep.com/stable/quote",
        {
            "symbol": symbol,
            "apikey": api_key("FMP_API_KEY")
        }
    )

    if not isinstance(data, list) or not data:
        raise RuntimeError("No US market data")

    quote = data[0]
    return {
        "symbol": symbol,
        "price": quote["price"],
        "currency": "USD",
        "provider": "FMP",
        "as_of": quote.get("timestamp"),
        "price_type": "provider_quote"
    }

def fetch_history(symbol):
    symbol = symbol.strip().upper()

    if not symbol or len(symbol) > 25:
        raise ValueError("Invalid symbol")

    if symbol.endswith(".TO"):
        data = request_json(
            f"https://eodhd.com/api/eod/{urllib.parse.quote(symbol)}",
            {
                "api_token": api_key("EODHD_API_KEY"),
                "fmt": "json",
                "from": "2026-01-01"
            }
        )
        if not isinstance(data, list):
            raise RuntimeError("Historical data unavailable")
        history = [
            {"date": row["date"], "close": row["close"]}
            for row in data
            if row.get("date") is not None and row.get("close") is not None
        ]
        return sorted(history, key=lambda row: row["date"])

    data = request_json(
        "https://financialmodelingprep.com/stable/historical-price-eod/light",
        {
            "symbol": symbol,
            "apikey": api_key("FMP_API_KEY")
        }
    )
    if not isinstance(data, list):
        raise RuntimeError("Historical data unavailable")

    history = [
        {"date": row["date"], "close": row["price"]}
        for row in data
        if row.get("date") is not None and row.get("price") is not None
    ]
    return sorted(history, key=lambda row: row["date"])



def fetch_usd_cad_rate():
    """Get a recent USD-to-CAD exchange rate."""
    from decimal import Decimal
    from datetime import date

    data = request_json(
        "https://api.frankfurter.dev/v1/latest",
        {"base": "USD", "symbols": "CAD"}
    )

    rate = data.get("rates", {}).get("CAD")
    rate_date = data.get("date")

    if rate is None or not rate_date:
        raise RuntimeError("USD/CAD exchange rate unavailable")

    age = (date.today() - date.fromisoformat(rate_date)).days

    if age < 0 or age > 5:
        raise RuntimeError("USD/CAD exchange rate is stale")

    return Decimal(str(rate))


# ---------------------------------------------------------
# RUSSELL WEALTH — PERSISTENT MONTHLY MARKET DATA
# Customer-facing functions read SQLite only.
# External requests are isolated in fetch_* functions.
# ---------------------------------------------------------

def get_quote(symbol):
    from market_cache import read_quote
    return read_quote(symbol.strip().upper())


def get_history(symbol):
    from market_cache import read_history
    return read_history(symbol.strip().upper())


def get_usd_cad_rate():
    from market_cache import read_fx_rate
    return read_fx_rate()
