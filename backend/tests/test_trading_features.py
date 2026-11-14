"""Trading and shared balance history against a disposable account database."""
import test_access
import unittest
from datetime import datetime, timezone
from unittest.mock import patch
import database
from trading_hours import market_status


class TradingFeaturesTests(unittest.TestCase):
    setUpClass = classmethod(test_access.AccessTests.setUpClass.__func__)
    tearDownClass = classmethod(test_access.AccessTests.tearDownClass.__func__)
    client = test_access.AccessTests.client

    def setUp(self):
        test_access.AccessTests.setUp(self)
        db = database.get_db_connection()
        db.execute('INSERT INTO investment_accounts (user_id,cash_balance_cents) VALUES (103,100000)')
        db.commit()
        db.close()

    def trade(self, symbol, quantity='1', action='BUY'):
        return self.customer.post('/api/customer/trade', json=dict(symbol=symbol, quantity=quantity, action=action))

    def freeze(self, when):
        return patch('trading_api.market_status', side_effect=lambda symbol, asset_type='STOCK', exchange='':
                     market_status(symbol, asset_type, exchange, now=datetime.fromisoformat(when)))

    def test_closed_market_rejects_buy_without_creating_assets_or_changing_cash(self):
        before = self.customer.get('/api/customer/portfolio').json
        with self.freeze('2026-11-13T21:00:00+00:00'):
            response = self.trade('MSFT')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json['code'], 'MARKET_CLOSED')
        self.assertEqual(self.customer.get('/api/customer/portfolio').json, before)
        db = database.get_db_connection()
        self.assertIsNone(db.execute("SELECT id FROM assets WHERE symbol='MSFT'").fetchone())
        db.close()

    def test_etfs_have_metadata_and_can_be_bought_and_sold(self):
        assets = {asset['symbol']: asset for asset in self.customer.get('/api/customer/assets').json['assets']}
        self.assertGreaterEqual(sum(a['type'] == 'ETF' for a in assets.values()), 40)
        self.assertEqual(assets['LINK']['type'], 'STOCK')
        self.assertEqual(assets['LTC']['type'], 'STOCK')
        self.assertEqual(assets['LINK-CAD']['type'], 'CRYPTO')
        self.assertEqual(assets['LTC-CAD']['type'], 'CRYPTO')
        for symbol in ('VFV.TO', 'XEQT.TO', 'VOO', 'QQQ'):
            self.assertEqual(assets[symbol]['type'], 'ETF')
        with self.freeze('2026-11-13T16:00:00+00:00'):
            self.assertEqual(self.trade('VFV.TO', '2').status_code, 200)
            self.assertEqual(self.trade('VFV.TO', '1', 'SELL').status_code, 200)
            self.assertEqual(self.trade('VOO').status_code, 200)
            self.assertEqual(self.trade('VFV.TO', '0.5').status_code, 400)
        portfolio = self.customer.get('/api/customer/portfolio').json
        self.assertEqual({h['type'] for h in portfolio['holdings']}, {'ETF'})
        self.assertEqual({h['symbol'] for h in portfolio['holdings']}, {'VFV.TO', 'VOO'})

    def test_fractional_crypto_is_available_on_holidays_and_round_trips_exactly(self):
        with self.freeze('2026-12-25T23:00:00+00:00'):
            self.assertEqual(self.customer.get('/api/customer/trading-status?symbol=BTC').json['is_open'], True)
            response = self.trade('BTC', '0.125')
            self.assertEqual(response.status_code, 200, response.json)
            self.assertEqual(response.json['trade_value'], '12.5')
            portfolio = self.customer.get('/api/customer/portfolio').json
            self.assertEqual(portfolio['holdings'][0]['type'], 'CRYPTO')
            self.assertEqual(portfolio['holdings'][0]['quantity'], '0.125')
            self.assertEqual(self.customer.get('/api/customer/transactions').json['transactions'][0]['category'], 'CRYPTO')
            self.assertEqual(self.trade('BTC', '0.125', 'SELL').status_code, 200)
        self.assertEqual(self.customer.get('/api/customer/portfolio').json['cash_balance'], '1000')
        self.assertEqual(self.customer.get('/api/customer/portfolio').json['holdings'], [])

    def test_crypto_invalid_quantities_and_overselling_cannot_change_balance(self):
        with self.freeze('2026-12-25T23:00:00+00:00'):
            for quantity in ('0', '-1', 'NaN', 'Infinity', '0.000000001', '0.00000001', '1000001', True):
                self.assertEqual(self.trade('BTC', quantity).status_code, 400, quantity)
            self.assertEqual(self.trade('BTC', '1', 'SELL').status_code, 400)
            self.assertEqual(self.trade('BTC', '1000').status_code, 400)
        portfolio = self.customer.get('/api/customer/portfolio').json
        self.assertEqual(portfolio['cash_balance'], '1000')
        self.assertEqual(portfolio['holdings'], [])

    def test_history_starts_with_funding_is_shared_between_devices_and_tracks_changes(self):
        first = self.customer.get('/api/customer/portfolio').json
        self.assertEqual(len(first['history']), 1)
        self.assertEqual(first['history'][0]['value'], 1000)
        mobile = self.client(103, 'CUSTOMER')
        self.assertEqual(first['history'], mobile.get('/api/customer/portfolio').json['history'])
        from portfolio_history import observe_portfolio
        db = database.get_db_connection()
        account = db.execute('SELECT id FROM investment_accounts WHERE user_id=103').fetchone()['id']
        later = datetime.fromtimestamp(first['history'][0]['time'] / 1000 + 3601, timezone.utc)
        same_balance = observe_portfolio(db, account, 100000, now=later)
        self.assertEqual(len(same_balance), 2)
        later = datetime.fromtimestamp(later.timestamp() + 1, timezone.utc)
        zero = observe_portfolio(db, account, 0, now=later)
        self.assertEqual(zero[-1]['value'], 0)
        db.close()
        # A different unfunded account has neither another person's line nor a fake balance.
        db = database.get_db_connection()
        db.execute("INSERT INTO users (id,name,email,password_hash,role) VALUES (104,'Other','other@example.com',?,'CUSTOMER')", (self.password_hash,))
        db.execute('INSERT INTO investment_accounts (user_id,cash_balance_cents) VALUES (104,0)')
        db.commit()
        db.close()
        self.assertEqual(self.client(104, 'CUSTOMER').get('/api/customer/portfolio').json['history'], [])
