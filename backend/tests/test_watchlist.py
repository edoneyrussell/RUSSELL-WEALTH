"""Watchlists persist per account across independent device sessions."""
import unittest
import test_access
import database


class WatchlistTests(unittest.TestCase):
    setUpClass=classmethod(test_access.AccessTests.setUpClass.__func__)
    tearDownClass=classmethod(test_access.AccessTests.tearDownClass.__func__)
    setUp=test_access.AccessTests.setUp
    client=test_access.AccessTests.client

    def test_empty_new_accounts_and_independent_device_persistence(self):
        self.assertEqual(self.customer.get('/api/customer/watchlist').json, {'symbols':[],'items':[]})
        phone=self.client(103,'CUSTOMER')
        for symbol in ['MSFT','XEQT.TO','BTC']:
            response=self.customer.put(f'/api/customer/watchlist/{symbol}')
            self.assertEqual(response.status_code,200,response.json)
        self.assertEqual(phone.get('/api/customer/watchlist').json,self.customer.get('/api/customer/watchlist').json)
        self.assertNotIn('AAPL',phone.get('/api/customer/watchlist').json['symbols'])
        self.assertEqual(phone.delete('/api/customer/watchlist/MSFT').status_code,200)
        response=self.customer.get('/api/customer/watchlist')
        self.assertEqual(response.json['symbols'],['BTC','XEQT.TO'])
        self.assertIn('no-store',response.headers['Cache-Control'])
        self.assertIn('Cookie',response.headers['Vary'])
        self.assertEqual(self.client(103,'CUSTOMER').get('/api/customer/watchlist').json,response.json)

    def test_accounts_are_isolated_and_linked_admin_reads_same_customer(self):
        db=database.get_db_connection()
        db.execute("INSERT INTO users(id,name,email,password_hash,role) VALUES(104,'Other Customer','other@example.com',?,'CUSTOMER')",(self.password_hash,))
        db.execute('INSERT INTO admin_customer_links(admin_user_id,customer_user_id) VALUES(101,103)')
        db.commit();db.close()
        self.customer.put('/api/customer/watchlist/AAPL')
        other=self.client(104,'CUSTOMER')
        self.assertEqual(other.get('/api/customer/watchlist').json['symbols'],[])
        other.put('/api/customer/watchlist/MSFT')
        self.assertEqual(self.customer.get('/api/customer/watchlist').json['symbols'],['AAPL'])
        self.assertEqual(other.get('/api/customer/watchlist').json['symbols'],['MSFT'])
        self.assertEqual(self.admin.get('/api/customer/watchlist').json['symbols'],['AAPL'])

    def test_authorization_validation_and_idempotent_updates(self):
        self.assertEqual(self.app.test_client().get('/api/customer/watchlist').status_code,401)
        self.assertEqual(self.admin.get('/api/customer/watchlist').status_code,403)
        self.assertEqual(self.customer.put('/api/customer/watchlist/AAPL',headers={'Origin':'https://evil.example'}).status_code,403)
        self.assertEqual(self.customer.put('/api/customer/watchlist/not%20a%20symbol').status_code,400)
        for _ in range(2):
            self.assertEqual(self.customer.put('/api/customer/watchlist/msft').json['symbols'],['MSFT'])
        self.assertEqual(self.customer.delete('/api/customer/watchlist/MSFT').json['symbols'],[])
        self.assertEqual(self.customer.delete('/api/customer/watchlist/MSFT').json['symbols'],[])

    def test_deleting_account_removes_its_watchlist(self):
        self.customer.put('/api/customer/watchlist/AAPL')
        response=self.admin.delete('/api/security/users/103',json={'current_password':'test-password-12345'})
        self.assertEqual(response.status_code,200,response.json)
        db=database.get_db_connection()
        self.assertEqual(db.execute('SELECT count(*) AS n FROM customer_watchlist WHERE user_id=103').fetchone()['n'],0)
        db.close()
