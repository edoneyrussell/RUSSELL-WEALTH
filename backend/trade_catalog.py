"""Stock directory metadata for simulated trading; this file contains no live prices."""
from decimal import Decimal
from functools import lru_cache
import json
from pathlib import Path

SIMULATION_PRICE_CENTS = 10000


@lru_cache(maxsize=1)
def stock_catalog():
    payload = json.loads((Path(__file__).parent / 'data' / 'trade_catalog.json').read_text())
    return {asset['symbol']: asset for asset in payload['assets']}


def available_assets(db):
    # Listing metadata is separate from the CAD price used by the simulation.
    assets = {symbol: dict(asset, currency='CAD', price='100.00', price_source='SIMULATED')
              for symbol, asset in stock_catalog().items()}
    for row in db.execute('SELECT symbol, name, asset_type, currency, price_cents FROM assets ORDER BY symbol').fetchall():
        known = assets.get(row['symbol'], {})
        assets[row['symbol']] = dict(known, symbol=row['symbol'],
            name=known.get('name', row['name']) if row['name'] == row['symbol'] else row['name'],
            type=row['asset_type'], currency=row['currency'],
            price=format(Decimal(row['price_cents']) / 100, '.2f'), price_source='STORED')
    return sorted(assets.values(), key=lambda asset: asset['symbol'])
