"""Independent device sessions read the same committed account holdings."""
import test_access
from datetime import datetime, timezone
from trading_hours import market_status
from unittest.mock import patch
import unittest
import database


class PortfolioSyncTests(unittest.TestCase):
    setUpClass = classmethod(test_access.AccessTests.setUpClass.__func__)
    tearDownClass = classmethod(test_access.AccessTests.tearDownClass.__func__)
    def setUp(self):
        test_access.AccessTests.setUp(self)
        clock = patch('trading_api.market_status', side_effect=lambda symbol, asset_type='STOCK', exchange='':
                      market_status(symbol, asset_type, exchange, now=datetime(2026, 11, 13, 16, tzinfo=timezone.utc)))
        clock.start()
        self.addCleanup(clock.stop)

    client = test_access.AccessTests.client

    def fund_customer(self):
        db = database.get_db_connection()
        db.execute('INSERT INTO investment_accounts (user_id,cash_balance_cents) VALUES (103,1000000)')
        db.commit()
        db.close()

    def test_independent_devices_see_all_holdings_and_subsequent_trades(self):
        self.fund_customer()
        mobile = self.client(103, 'CUSTOMER')
        for symbol in ('AAPL', 'MSFT', 'AMZN', 'NVDA', 'META', 'NFLX'):
            response = self.customer.post('/api/customer/trade', json={
                'action': 'BUY', 'symbol': symbol, 'quantity': '2'})
            self.assertEqual(response.status_code, 200, response.json)
        desktop_result = self.customer.get('/api/customer/portfolio')
        mobile_result = mobile.get('/api/customer/portfolio', headers={'User-Agent': 'Mobile Safari'})
        self.assertEqual(desktop_result.status_code, 200)
        self.assertEqual(mobile_result.json, desktop_result.json)
        self.assertEqual(len(mobile_result.json['holdings']), 6)
        self.assertIn('no-store', mobile_result.headers['Cache-Control'])
        self.assertIn('Cookie', mobile_result.headers['Vary'])

        response = mobile.post('/api/customer/trade', json={
            'action': 'SELL', 'symbol': 'MSFT', 'quantity': '1'})
        self.assertEqual(response.status_code, 200, response.json)
        refreshed = self.customer.get('/api/customer/portfolio').json
        self.assertEqual(refreshed, mobile.get('/api/customer/portfolio').json)
        self.assertEqual(next(h['quantity'] for h in refreshed['holdings'] if h['symbol'] == 'MSFT'), '1')
        self.assertNotEqual(refreshed['cash_balance'], desktop_result.json['cash_balance'])

    def test_other_accounts_do_not_receive_another_customers_holdings(self):
        self.fund_customer()
        self.assertEqual(self.customer.post('/api/customer/trade', json={
            'action': 'BUY', 'symbol': 'MSFT', 'quantity': '2'}).status_code, 200)
        db = database.get_db_connection()
        db.execute("INSERT INTO users (id,name,email,password_hash,role) VALUES (104,'Other','other@example.com',?,'CUSTOMER')", (self.password_hash,))
        db.execute('INSERT INTO investment_accounts (user_id,cash_balance_cents) VALUES (104,0)')
        db.commit()
        db.close()
        other = self.client(104, 'CUSTOMER').get('/api/customer/portfolio')
        self.assertEqual(other.status_code, 200)
        self.assertEqual(other.json['holdings'], [])
        self.assertEqual(other.json['total_value'], '0')

    def test_missing_portfolio_and_expired_session_are_errors_not_empty_holdings(self):
        self.assertEqual(self.customer.get('/api/customer/portfolio').status_code, 404)
        response = self.app.test_client().get('/api/customer/portfolio')
        self.assertEqual(response.status_code, 401)
        self.assertNotIn('holdings', response.json)

    def test_transaction_history_is_scoped_to_same_portfolio_as_holdings(self):
        self.fund_customer()
        db = database.get_db_connection()
        db.execute("INSERT INTO users(id,name,email,password_hash,role) VALUES(104,'Legacy','customer@russellwealth.local',?,'CUSTOMER')", (self.password_hash,))
        db.execute('INSERT INTO investment_accounts(user_id,cash_balance_cents) VALUES(104,1000000)')
        db.commit(); db.close()
        other = self.client(104, 'CUSTOMER')
        for client, symbol in [(self.customer, 'MSFT'), (other, 'AAPL')]:
            self.assertEqual(client.post('/api/customer/trade', json={'action':'BUY','symbol':symbol,'quantity':'1'}).status_code, 200)
        response = self.customer.get('/api/customer/transactions')
        self.assertIn('no-store', response.headers['Cache-Control'])
        self.assertEqual([x['symbol'] for x in response.json['transactions']], ['MSFT'])
        self.assertTrue(response.json['transactions'][0]['created_at'].endswith('Z'))
        db = database.get_db_connection()
        db.execute('INSERT INTO admin_customer_links(admin_user_id,customer_user_id) VALUES(101,103)')
        db.commit(); db.close()
        self.assertEqual(self.admin.get('/api/customer/transactions').json, response.json)
