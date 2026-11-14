"""Origin checks, exchange-specific orders and synchronized account identity."""
import test_access
import test_trading_features
import unittest
from datetime import datetime
from unittest.mock import patch
from trading_hours import market_status, exchange_status


class ExchangeAccessTests(unittest.TestCase):
    setUpClass = classmethod(test_access.AccessTests.setUpClass.__func__)
    tearDownClass = classmethod(test_access.AccessTests.tearDownClass.__func__)
    setUp = test_trading_features.TradingFeaturesTests.setUp
    client = test_access.AccessTests.client
    trade = test_trading_features.TradingFeaturesTests.trade
    freeze = test_trading_features.TradingFeaturesTests.freeze

    def test_configured_frontend_can_suspend_change_roles_and_delete(self):
        with patch.dict('os.environ', {'RW_PUBLIC_APP_URL': 'https://wealth.example'}):
            headers = {'Origin': 'https://wealth.example'}
            response = self.admin.patch('/api/security/users/103', json={'current_password': 'test-password-12345', 'account_status':'SUSPENDED'}, headers=headers)
            self.assertEqual(response.status_code, 200, response.json)
            self.assertEqual(self.admin.patch('/api/security/users/103', json={'current_password': 'test-password-12345', 'account_status':'ACTIVE'}, headers=headers).status_code, 200)
            self.assertEqual(self.admin.patch('/api/security/users/103', json={'current_password': 'test-password-12345', 'role':'BOTH'}, headers=headers).status_code, 200)
            self.assertEqual(self.admin.delete('/api/security/users/103', json={'current_password': 'test-password-12345', 'confirm_email':'user103@example.com'}, headers=headers).status_code, 200)

    def test_same_origin_proxy_and_exact_additional_origin_are_accepted(self):
        from access_api import valid_origin
        with self.app.test_request_context(base_url='http://127.0.0.1:5173', headers={'Origin':'http://127.0.0.1:5173'}):
            self.assertTrue(valid_origin())
        with patch.dict('os.environ', {'RW_ALLOWED_ORIGINS':'https://preview.example:8443'}):
            response = self.admin.patch('/api/security/users/103', json={'current_password': 'test-password-12345', 'account_status':'SUSPENDED'}, headers={'Origin':'https://preview.example:8443'})
            self.assertEqual(response.status_code, 200)

    def test_untrusted_origins_remain_denied_including_forged_proxy_headers(self):
        with patch.dict('os.environ', {'RW_PUBLIC_APP_URL':'https://wealth.example', 'RW_ALLOWED_ORIGINS':''}):
            for origin in ('https://evil.example','https://wealth.example.evil.test','http://wealth.example','https://wealth.example:8443','null'):
                response = self.admin.patch('/api/security/users/103', json={'current_password': 'test-password-12345', 'account_status':'SUSPENDED'},
                                            headers={'Origin':origin, 'X-Forwarded-Host':origin.split('://')[-1]})
                self.assertEqual(response.status_code, 403, origin)
            self.assertEqual(self.admin.get('/api/security/users').json['users'][-1]['account_status'], 'ACTIVE')

    def test_only_nasdaq_can_trade_at_night_and_request_cannot_override_exchange(self):
        with self.freeze('2026-11-11T02:00:00+00:00'):
            bought = self.trade('AAPL','2')
            self.assertEqual(bought.status_code, 200, bought.json)
            self.assertEqual(self.trade('AAPL','1','SELL').status_code, 200)
            for symbol in ('IBM','RY.TO','VFV.TO'):
                denied = self.customer.post('/api/customer/trade', json={'symbol':symbol,'quantity':'1','action':'BUY','exchange':'NASDAQ'})
                self.assertEqual(denied.status_code, 409, (symbol, denied.json))
            status = self.customer.get('/api/customer/trading-status?symbol=AAPL').json
            self.assertEqual(status['session'], 'overnight')
            self.assertTrue(status['is_simulated_session'])

    def test_international_listings_use_their_own_local_sessions(self):
        for symbol, when in [('RY.TO','2026-11-11T16:00:00+00:00'),('IBM','2026-11-11T16:00:00+00:00'),
                             ('HSBA.L','2026-11-11T10:00:00+00:00'),('7203.T','2026-11-11T01:00:00+00:00'),
                             ('0700.HK','2026-11-11T02:00:00+00:00'),('BHP.AX','2026-11-11T00:00:00+00:00')]:
            with self.freeze(when):
                response = self.trade(symbol)
                self.assertEqual(response.status_code, 200, (symbol,response.json))
        assets = self.customer.get('/api/customer/assets').json['assets']
        codes = {asset['market_code'] for asset in assets}
        self.assertTrue({'NASDAQ','NYSE','TSX','LSE','TSE','HKEX','ASX','CRYPTO'}.issubset(codes))
        clocks = self.customer.get('/api/customer/exchanges').json['exchanges']
        self.assertTrue(codes.issubset({clock['code'] for clock in clocks}))

    def test_dual_listings_do_not_merge_us_and_canadian_positions(self):
        with self.freeze('2026-11-11T16:00:00+00:00'):
            self.assertEqual(self.trade('RY').status_code, 200)
            self.assertEqual(self.trade('RY.TO').status_code, 200)
        positions = {h['symbol']: h for h in self.customer.get('/api/customer/portfolio').json['holdings']}
        self.assertEqual(positions['RY']['exchange'], 'NYSE')
        self.assertEqual(positions['RY.TO']['exchange'], 'TSX')

    def test_soc_profile_reads_updated_name_and_customer_photo(self):
        import database
        db = database.get_db_connection()
        columns = {row['name'] for row in db.execute('PRAGMA table_info(users)')}
        for column in ('profile_photo_data', 'profile_photo_mime'):
            if column not in columns:
                db.execute(f'ALTER TABLE users ADD COLUMN {column} TEXT')
        db.execute("UPDATE users SET name='Shared Identity',profile_photo_data='dGVzdA==',profile_photo_mime='image/png' WHERE id=101")
        db.commit()
        db.close()
        me = self.admin.get('/api/me')
        self.assertEqual(me.json['name'], 'Shared Identity')
        self.assertEqual(me.json['profile_photo'], 'data:image/png;base64,dGVzdA==')
        self.assertIn('no-store', me.headers['Cache-Control'])


class ExchangeSessionTests(unittest.TestCase):
    def status(self, code, when):
        return exchange_status(code, now=datetime.fromisoformat(when))

    def test_nasdaq_overnight_boundaries_weekends_and_holidays(self):
        for when, expected in [('2026-11-11T00:59:59+00:00',False),('2026-11-11T01:00:00+00:00',True),
                               ('2026-11-11T08:59:59+00:00',True),('2026-11-11T09:00:00+00:00',False),
                               ('2026-11-14T02:00:00+00:00',False),('2026-11-16T01:00:00+00:00',True),
                               ('2026-05-25T01:00:00+00:00',False)]:
            self.assertEqual(self.status('NASDAQ',when)['is_open'],expected,when)
        self.assertFalse(self.status('NYSE','2026-11-11T02:00:00+00:00')['is_open'])

    def test_lunch_breaks_and_published_international_holidays(self):
        tokyo = self.status('TSE','2026-11-11T03:00:00+00:00')
        self.assertFalse(tokyo['is_open'])
        self.assertEqual(tokyo['next_open'],'2026-11-11T12:30:00+09:00')
        self.assertFalse(self.status('HKEX','2026-11-11T04:30:00+00:00')['is_open'])
        for code, when in [('TSE','2026-11-23T01:00:00+00:00'),('HKEX','2027-02-08T02:00:00+00:00'),
                           ('LSE','2026-12-25T10:00:00+00:00'),('ASX','2026-12-25T00:00:00+00:00')]:
            self.assertFalse(self.status(code,when)['is_open'],code)
        self.assertTrue(self.status('ASX','2027-04-26T01:00:00+00:00')['is_open'])

    def test_missing_regional_calendar_does_not_open_a_market(self):
        self.assertEqual(self.status('HKEX','2028-01-03T02:00:00+00:00')['session'],'unavailable')
