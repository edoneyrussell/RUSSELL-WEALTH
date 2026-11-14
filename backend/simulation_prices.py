"""Deterministic simulated CAD prices shared by quotes, orders and holdings."""
import hashlib
import json
from pathlib import Path
from functools import lru_cache
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

# Earlier dates form the requested synthetic backfill; subsequent dates retain
# their actual simulation price forever, including after the next daily refresh.
DAILY_PRICING_START = date(2026, 11, 13)
PRICE_BOUNDS = {
    'STOCK': (3000, 8500000),
    'EQUITY': (3000, 8500000),
    'ETF': (3800, 8585300),
    'REIT': (3800, 8585300),
    'BOND': (3800, 8585300),
    'CRYPTO': (3000000, 40000000),
}


def asset_metadata(symbol):
    from trade_catalog import stock_catalog
    symbol = symbol.strip().upper()
    return stock_catalog().get(symbol) or stock_catalog().get(symbol + '.TO')


@lru_cache(maxsize=1)
def daily_phases():
    # Persist the initial balanced pairs so adding a new ticker never changes
    # another holding's price history. New tickers use their stable hash phase.
    return json.loads((Path(__file__).parent / 'data' / 'simulation_phases.json').read_text())


def stock_price_cents(symbol, asset_type='STOCK', fallback=10000, day=None):
    metadata = asset_metadata(symbol)
    asset_type = (metadata['type'] if metadata else asset_type).upper()
    symbol = metadata['symbol'] if metadata else symbol.strip().upper()
    bounds = PRICE_BOUNDS.get(asset_type)
    if bounds is None:
        return int(fallback)
    day = day or datetime.now(ZoneInfo('America/Regina')).date()
    if day < DAILY_PRICING_START - timedelta(days=1) and asset_type in ('STOCK', 'EQUITY', 'ETF', 'REIT'):
        bounds = (6000, 50000000)
    low, high = bounds
    span = high - low
    base_hash = hashlib.sha256(f'russell-balanced-base-v1:{symbol}'.encode()).digest()
    base = low + span // 10 + int.from_bytes(base_hash[:8], 'big') % max(1, span * 8 // 10)
    daily_hash = hashlib.sha256(f'russell-balanced-day-v1:{day.isoformat()}:{symbol}'.encode()).digest()
    amplitude = 1 + int.from_bytes(daily_hash[:8], 'big') % max(1, min(span // 25, base // 20))
    phase = daily_phases().get(symbol, base_hash[0] % 2)
    direction = 1 if (day.toordinal() + phase) % 2 else -1
    return base + direction * amplitude


def stock_quote(symbol):
    metadata = asset_metadata(symbol)
    if not metadata or metadata['type'] not in PRICE_BOUNDS:
        return None
    now = datetime.now(ZoneInfo('America/Regina'))
    today = now.date()
    yesterday = today - timedelta(days=1)
    current = stock_price_cents(symbol, metadata['type'], day=today)
    previous = stock_price_cents(symbol, metadata['type'], day=yesterday)
    change = current - previous
    return dict(symbol=symbol, price=current / 100,
                previous_close=previous / 100, change=change / 100,
                change_percent=change / previous * 100,
                reference_date=yesterday.isoformat(), price_date=today.isoformat(),
                currency='CAD', provider='Russell Wealth daily simulation', price_type='SIMULATED',
                as_of=now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat())



def history_start(today):
    try:
        return today.replace(year=today.year - 8)
    except ValueError:  # February 29 in a non-leap target year.
        return today.replace(year=today.year - 8, day=28)


def stock_history(symbol, days=None):
    today = datetime.now(ZoneInfo('America/Regina')).date()
    count = (today - history_start(today)).days + 1
    if days is not None:
        count = min(count, max(1, int(days)))
    return [dict(date=(today-timedelta(days=i)).isoformat(),
                 close=stock_price_cents(symbol, day=today-timedelta(days=i)) / 100)
            for i in reversed(range(count))]
