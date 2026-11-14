"""Asset directory metadata for simulated trading; this file contains no live prices."""
import simulation_prices
from decimal import Decimal
from functools import lru_cache
import json
from pathlib import Path
from exchanges import exchange_code

SIMULATION_PRICE_CENTS = 10000


@lru_cache(maxsize=1)
def stock_catalog():
    payload = json.loads((Path(__file__).parent / 'data' / 'trade_catalog.json').read_text())
    extra = json.loads((Path(__file__).parent / 'data' / 'additional_assets.json').read_text())
    international = json.loads((Path(__file__).parent / 'data' / 'international_assets.json').read_text())
    return {asset['symbol']: asset for asset in payload['assets'] + extra['assets'] + international['assets']}


def available_assets(db):
    # Listing metadata is separate from the CAD price used by the simulation.
    assets = {symbol: dict(asset, currency='CAD', price=format(Decimal(simulation_prices.stock_price_cents(symbol,asset['type']))/100,'.2f'), price_source='SIMULATED')
              for symbol, asset in stock_catalog().items()}
    for row in db.execute('SELECT symbol, name, asset_type, currency, price_cents FROM assets ORDER BY symbol').fetchall():
        known = assets.get(row['symbol'], assets.get(row['symbol'] + '.TO', {}))
        assets[row['symbol']] = dict(known, symbol=row['symbol'],
            name=known.get('name', row['name']) if row['name'] == row['symbol'] else row['name'],
            type=known.get('type', row['asset_type']), currency='CAD',
            price=format(Decimal(simulation_prices.stock_price_cents(row['symbol'],known.get('type',row['asset_type']),row['price_cents'])) / 100, '.2f'), price_source='SIMULATED' if known.get('type',row['asset_type']) in simulation_prices.PRICE_BOUNDS else 'STORED')
    for asset in assets.values():
        asset['market_code'] = exchange_code(asset['symbol'], asset['type'], asset.get('exchange', ''))
        asset.setdefault('exchange', asset['market_code'])
    return sorted(assets.values(), key=lambda asset: asset['symbol'])
