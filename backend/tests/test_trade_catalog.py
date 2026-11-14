import test_access
from datetime import datetime, timezone
from trading_hours import market_status
import unittest
from unittest.mock import patch
import database


class TradeCatalogTests(unittest.TestCase):
    setUpClass = classmethod(test_access.AccessTests.setUpClass.__func__)
    tearDownClass = classmethod(test_access.AccessTests.tearDownClass.__func__)
    def setUp(self):
        test_access.AccessTests.setUp(self)
        clock = patch('trading_api.market_status', side_effect=lambda symbol, asset_type='STOCK', exchange='':
                      market_status(symbol, asset_type, exchange, now=datetime(2026, 11, 13, 16, tzinfo=timezone.utc)))
        clock.start()
        self.addCleanup(clock.stop)

    client = test_access.AccessTests.client

    def fund_customer(self, balance=100000):
        db = database.get_db_connection()
        db.execute('INSERT INTO investment_accounts (user_id,cash_balance_cents) VALUES (103,?)', (balance,))
        db.commit()
        db.close()

    def test_thousands_of_named_stocks_available_without_creating_database_records(self):
        db = database.get_db_connection()
        original = db.execute('SELECT COUNT(*) FROM assets').fetchone()[0]
        db.close()
        response = self.customer.get('/api/customer/assets')
        self.assertEqual(response.status_code, 200)
        catalog = {asset['symbol']: asset for asset in response.json['assets']}
        self.assertGreater(len(catalog), 5000)
        for symbol in ('AAPL', 'MSFT', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'DIS', 'KO', 'NFLX'):
            self.assertIn(symbol, catalog)
            self.assertNotEqual(catalog[symbol]['name'], symbol)
        self.assertEqual(catalog['MSFT']['currency'], 'CAD')
        self.assertEqual(catalog['MSFT']['listing_currency'], 'USD')
        self.assertEqual(response.json['pricing'], 'SIMULATED')
        db = database.get_db_connection()
        self.assertEqual(db.execute('SELECT COUNT(*) FROM assets').fetchone()[0], original)
        db.close()

    def test_new_stock_buy_and_sell_preserve_metadata_cash_and_shares(self):
        from trade_catalog import stock_catalog
        db = database.get_db_connection()
        existing = {row[0] for row in db.execute('SELECT symbol FROM assets')}
        db.close()
        symbol = next(symbol for symbol in ('MSFT', 'AMZN', 'COST', 'UBER', 'ORCL') if symbol not in existing)
        self.fund_customer()
        result = self.customer.post('/api/customer/trade', json=dict(symbol=symbol, action='BUY', quantity='2'))
        self.assertEqual(result.status_code, 200, result.json)
        self.assertEqual(result.json['cash_balance'], '800')
        self.assertEqual(result.json['shares_owned'], '2')
        db = database.get_db_connection()
        asset = db.execute('SELECT name,currency FROM assets WHERE symbol=?', (symbol,)).fetchone()
        self.assertEqual(asset['name'], stock_catalog()[symbol]['name'])
        self.assertEqual(asset['currency'], 'CAD')
        db.close()
        result = self.customer.post('/api/customer/trade', json=dict(symbol=symbol, action='SELL', quantity='2'))
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json['cash_balance'], '1000')
        self.assertEqual(result.json['shares_owned'], '0')

    def test_known_stock_search_does_not_depend_on_market_provider(self):
        with patch('market_search_api.request_json', side_effect=RuntimeError('Offline')) as provider:
            result = self.customer.get('/api/market/search?q=microsoft')
        self.assertEqual(result.status_code, 200)
        self.assertTrue(any(asset['symbol'] == 'MSFT' for asset in result.json['results']))
        provider.assert_not_called()

    def test_stored_prices_are_preserved_and_insufficient_cash_does_not_create_assets(self):
        self.fund_customer(100)
        db = database.get_db_connection()
        existing = {row['symbol']: row['price_cents'] for row in db.execute('SELECT symbol,price_cents FROM assets')}
        db.close()
        before = self.customer.get('/api/customer/assets').json['assets']
        for asset in before:
            if asset['symbol'] in existing:
                self.assertEqual(round(float(asset['price']) * 100), existing[asset['symbol']])
        result = self.customer.post('/api/customer/trade', json=dict(symbol='MSFT', action='BUY', quantity='2'))
        self.assertEqual(result.status_code, 400)
        db = database.get_db_connection()
        after = {row['symbol']: row['price_cents'] for row in db.execute('SELECT symbol,price_cents FROM assets')}
        self.assertEqual(after, existing)
        db.close()
