"""Daily price consistency, funding cap, profile hints and sole ADMIN authority."""
import unittest
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch
import test_access
import database
from simulation_prices import stock_price_cents as real_price


class DailyAccountRulesTests(unittest.TestCase):
    setUpClass=classmethod(test_access.AccessTests.setUpClass.__func__)
    tearDownClass=classmethod(test_access.AccessTests.tearDownClass.__func__)
    client=test_access.AccessTests.client

    def setUp(self):
        test_access.AccessTests.setUp(self)
        restore=patch('simulation_prices.stock_price_cents',side_effect=real_price)
        restore.start();self.addCleanup(restore.stop)
        db=database.get_db_connection()
        db.execute('INSERT INTO investment_accounts(user_id,cash_balance_cents) VALUES(103,100000000)')
        db.commit();db.close()

    def test_stock_prices_are_stable_in_range_and_change_daily(self):
        from trade_catalog import stock_catalog
        day=date(2026,11,13)
        for symbol,asset in stock_catalog().items():
            if asset['type']!='STOCK':continue
            price=real_price(symbol,day=day)
            self.assertGreaterEqual(price,3000)
            self.assertLessEqual(price,8500000)
            self.assertEqual(price,real_price(symbol,day=day))
        self.assertNotEqual(real_price('MSFT',day=day),real_price('MSFT',day=day+timedelta(days=1)))
        self.assertGreaterEqual(real_price('BTC','CRYPTO',12345,day), 3000000)

    def test_quote_catalog_trade_and_holdings_use_identical_daily_prices(self):
        assets=self.customer.get('/api/customer/assets').json['assets']
        price=next(row['price'] for row in assets if row['symbol']=='MSFT')
        quote=self.customer.get('/api/market/quote?symbol=MSFT').json
        self.assertEqual(Decimal(str(quote['price'])),Decimal(price))
        self.assertEqual(quote['price_type'],'SIMULATED')
        with patch('trading_api.market_status',return_value={'is_open':True}):
            response=self.customer.post('/api/customer/trade',json={'symbol':'MSFT','action':'BUY','quantity':'2'})
        self.assertEqual(response.status_code,200,response.json)
        self.assertEqual(Decimal(response.json['trade_value']),Decimal(price)*2)
        holding=self.customer.get('/api/customer/portfolio').json['holdings'][0]
        self.assertEqual(Decimal(holding['price']),Decimal(price))
        self.assertEqual(Decimal(holding['market_value']),Decimal(price)*2)

    def test_full_simulation_history_matches_the_daily_quote_and_grows(self):
        import simulation_prices
        from datetime import datetime
        from zoneinfo import ZoneInfo
        start = date(2018, 11, 13)
        with patch('simulation_prices.datetime') as clock:
            clock.now.return_value = datetime(2026, 11, 13, 12, tzinfo=ZoneInfo('America/Regina'))
            response = self.customer.get('/api/market/history?symbol=MSFT')
            self.assertEqual(response.status_code, 200, response.json)
            self.assertEqual(response.headers['Cache-Control'], 'no-store')
            self.assertEqual(response.json['price_type'], 'SIMULATED')
            self.assertEqual(response.json['currency'], 'CAD')
            history = response.json['history']
            self.assertEqual(history[0]['date'], start.isoformat())
            self.assertEqual(history[-1]['close'], self.customer.get('/api/market/quote?symbol=MSFT').json['price'])
            clock.now.return_value = datetime(2026, 11, 14, 12, tzinfo=ZoneInfo('America/Regina'))
            updated = self.customer.get('/api/market/history?symbol=MSFT').json['history']
            self.assertEqual(updated[:-1], history[1:])
            self.assertEqual(updated[-1]['close'], real_price('MSFT', day=date(2026, 11, 14)) / 100)
            self.assertEqual(len(simulation_prices.stock_history('MSFT', days=7)), 7)

    def test_all_asset_prices_history_and_orders_agree(self):
        from trade_catalog import stock_catalog
        import simulation_prices
        for symbol, asset in stock_catalog().items():
            price = real_price(symbol, asset['type'])
            low, high = simulation_prices.PRICE_BOUNDS[asset['type']]
            self.assertGreaterEqual(price, low, symbol)
            self.assertLessEqual(price, high, symbol)
        catalog = {asset['symbol']: asset for asset in self.customer.get('/api/customer/assets').json['assets']}
        for symbol in ('VFV.TO', 'ZRE.TO', 'XBB.TO', 'BTC'):
            quote = self.customer.get('/api/market/quote?symbol=' + symbol).json
            history = self.customer.get('/api/market/history?symbol=' + symbol).json['history']
            price = Decimal(catalog[symbol]['price'])
            self.assertEqual(Decimal(str(quote['price'])), price)
            self.assertEqual(Decimal(str(history[-1]['close'])), price)
            self.assertGreaterEqual(len(history), 2921)
            if catalog[symbol]['type'] in ('ETF', 'REIT'):
                self.assertTrue(all(60 <= point['close'] <= 500000 for point in history if point['date'] < simulation_prices.DAILY_PRICING_START.isoformat()))
            with patch('trading_api.market_status', return_value={'is_open':True}):
                result = self.customer.post('/api/customer/trade', json={'symbol':symbol, 'action':'BUY', 'quantity':'1'})
            self.assertEqual(result.status_code, 200, result.json)
            self.assertEqual(Decimal(result.json['trade_value']), price)
            holding = next(h for h in self.customer.get('/api/customer/portfolio').json['holdings'] if h['symbol'] == symbol)
            self.assertEqual(Decimal(holding['price']), price)
        self.assertEqual(real_price('VDY', 'ETF'), real_price('VDY.TO', 'ETF'))

    def test_watchlist_movements_match_the_same_daily_price_and_history(self):
        import simulation_prices
        from datetime import datetime
        from zoneinfo import ZoneInfo
        for today in (date(2026,11,13), date(2026,11,14)):
            with patch('simulation_prices.datetime') as clock:
                clock.now.return_value = datetime(today.year, today.month, today.day, 0, tzinfo=ZoneInfo('America/Regina'))
                for symbol in ('AAPL', 'VFV.TO', 'ZRE.TO', 'XBB.TO', 'BTC'):
                    response = self.customer.get('/api/market/quote?symbol=' + symbol)
                    self.assertEqual(response.status_code, 200, response.json)
                    self.assertEqual(response.headers['Cache-Control'], 'no-store')
                    quote = response.json
                    history = simulation_prices.stock_history(symbol, days=2)
                    self.assertEqual(quote['price'], history[-1]['close'])
                    self.assertEqual(quote['previous_close'], history[-2]['close'])
                    expected = Decimal(str(quote['price'])) - Decimal(str(quote['previous_close']))
                    self.assertEqual(Decimal(str(quote['change'])), expected)
                    self.assertAlmostEqual(quote['change_percent'], float(expected / Decimal(str(quote['previous_close'])) * 100))
                    self.assertEqual(quote['reference_date'], (today-timedelta(days=1)).isoformat())
                    self.assertEqual(quote['price_date'], today.isoformat())

    def test_daily_updates_have_balanced_gainers_and_losers(self):
        from trade_catalog import stock_catalog
        for today in (date(2026,11,13),date(2026,11,14),date(2026,11,15)):
            groups = {}
            for symbol, asset in stock_catalog().items():
                current = real_price(symbol,asset['type'],day=today)
                previous = real_price(symbol,asset['type'],day=today-timedelta(days=1))
                gains, losses = groups.setdefault(asset['type'],[0,0])
                self.assertNotEqual(current,previous,symbol)
                groups[asset['type']][0 if current > previous else 1] += 1
            for kind,(gains,losses) in groups.items():
                self.assertLessEqual(abs(gains-losses),1,(today,kind,gains,losses))

    def test_daily_price_updates_revalue_total_portfolio_and_history(self):
        from datetime import datetime, timezone
        from zoneinfo import ZoneInfo
        db=database.get_db_connection()
        account=db.execute('SELECT id FROM investment_accounts WHERE user_id=103').fetchone()['id']
        for symbol,quantity in [('AAPL','2'),('MSFT','3')]:
            asset=db.execute('SELECT id FROM assets WHERE symbol=?',(symbol,)).fetchone()
            if asset is None:
                asset=db.execute("INSERT INTO assets(symbol,name,asset_type,currency,price_cents) VALUES(?,?,'STOCK','CAD',10000) RETURNING id",(symbol,symbol)).fetchone()
            db.execute('INSERT INTO holdings(account_id,asset_id,quantity) VALUES(?,?,?)',(account,asset['id'],quantity))
        db.commit();db.close()
        totals=[]
        for today in (date(2026,11,13),date(2026,11,14)):
            with patch('simulation_prices.datetime') as clock, patch('portfolio_history.datetime') as observations:
                clock.now.return_value=datetime(today.year,today.month,today.day,12,tzinfo=ZoneInfo('America/Regina'))
                observations.now.return_value=datetime(today.year,today.month,today.day,18,tzinfo=timezone.utc)
                result=self.customer.get('/api/customer/portfolio').json
                invested=sum((Decimal(str(real_price(h['symbol'],day=today)))*Decimal(h['quantity'])/100 for h in result['holdings']),Decimal(0))
                expected=invested+Decimal(result['cash_balance'])
                self.assertEqual(Decimal(result['invested_value']),invested)
                self.assertEqual(Decimal(result['total_value']),expected)
                self.assertEqual(Decimal(str(result['history'][-1]['value'])),expected)
                totals.append(expected)
        self.assertNotEqual(totals[0],totals[1])

    def test_funding_stops_at_900_million_including_holdings(self):
        db=database.get_db_connection()
        db.execute('UPDATE investment_accounts SET cash_balance_cents=89999999900 WHERE user_id=103')
        db.commit();db.close()
        self.customer.get('/api/customer/demo-banking')
        payload={'bank_code':'TD','direction':'DEPOSIT','amount':'1.00','request_id':'limit-first-123'}
        self.assertEqual(self.customer.post('/api/customer/demo-banking/transfer',json=payload).status_code,200)
        blocked=self.customer.post('/api/customer/demo-banking/transfer',json={**payload,'amount':'0.01','request_id':'limit-second-123'})
        self.assertEqual(blocked.status_code,400,blocked.json)
        self.assertEqual(self.customer.get('/api/customer/portfolio').json['cash_balance'],'900000000')
        db=database.get_db_connection()
        account=db.execute('SELECT id FROM investment_accounts WHERE user_id=103').fetchone()['id']
        db.execute('UPDATE investment_accounts SET cash_balance_cents=89999999900 WHERE id=?',(account,))
        asset=db.execute("INSERT INTO assets(symbol,name,asset_type,currency,price_cents) VALUES('LIMIT','Limit fixture','ETF','CAD',10000) RETURNING id").fetchone()['id']
        db.execute('INSERT INTO holdings(account_id,asset_id,quantity) VALUES(?,?,1)',(account,asset))
        db.commit();db.close()
        blocked=self.customer.post('/api/customer/demo-banking/transfer',json={**payload,'request_id':'limit-third-123'})
        self.assertEqual(blocked.status_code,400)

    def test_profile_hint_can_be_changed_and_removed(self):
        response=self.customer.put('/api/me/profile',json={'password_hint':'Favourite childhood place'})
        self.assertEqual(response.status_code,200,response.json)
        self.assertEqual(self.customer.get('/api/me/profile').json['password_hint'],'Favourite childhood place')
        self.assertEqual(self.app.test_client().post('/api/password-hint',json={'email':'user103@example.com'}).json['hint'],'Favourite childhood place')
        self.assertEqual(self.customer.put('/api/me/profile',json={'password_hint':'test-password-12345'}).status_code,400)
        self.assertEqual(self.customer.put('/api/me/profile',json={'password_hint':''}).status_code,200)
        self.assertIsNone(self.app.test_client().post('/api/password-hint',json={'email':'user103@example.com'}).json['hint'])

    def test_only_designated_email_and_its_password_can_administer_accounts(self):
        from owner_protection import OWNER_EMAIL
        from werkzeug.security import generate_password_hash
        db=database.get_db_connection()
        db.execute('INSERT INTO users(id,name,email,password_hash,role) VALUES(104,?,?,?,?)',('ADMIN',OWNER_EMAIL,generate_password_hash('owner-password-123'),'SOC_ADMIN'))
        db.commit();db.close()
        owner=self.client(104,'SOC_ADMIN')
        with patch('access_api.ACCESS_ADMIN_EMAIL',OWNER_EMAIL):
            directory=self.admin.get('/api/security/users').json['users']
            self.assertFalse(any(row['manageable'] for row in directory))
            for method,payload in [('PATCH',{'role':'BOTH'}),('PATCH',{'account_status':'SUSPENDED'}),('DELETE',{})]:
                response=self.admin.open('/api/security/users/103',method=method,json={**payload,'current_password':'owner-password-123'})
                self.assertEqual(response.status_code,403,response.json)
            self.assertEqual(owner.patch('/api/security/users/103',json={'role':'BOTH','current_password':'test-password-12345'}).status_code,403)
            self.assertEqual(owner.patch('/api/security/users/103',json={'role':'BOTH','current_password':'owner-password-123'}).status_code,200)
        # This fixture was inserted after guards were initialized; remove it for fixture cleanup.
        db=database.get_db_connection()
        for row in db.execute("SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'rw_owner_%'").fetchall():db.execute(f"DROP TRIGGER {row['name']}")
        db.commit();db.close()

    def test_market_clock_is_saved_per_account_across_sessions(self):
        self.assertEqual(self.customer.get('/api/me/market-clock').json['exchange_code'],'TSX')
        response=self.customer.put('/api/me/market-clock',json={'exchange_code':'TSE'})
        self.assertEqual(response.status_code,200,response.json)
        phone=self.client(103,'CUSTOMER')
        self.assertEqual(phone.get('/api/me/market-clock').json['exchange_code'],'TSE')
        self.assertEqual(self.admin.get('/api/me/market-clock').json['exchange_code'],'TSX')
        self.assertEqual(phone.put('/api/me/market-clock',json={'exchange_code':'UNKNOWN'}).status_code,400)
        self.assertEqual(phone.get('/api/me/market-clock').json['exchange_code'],'TSE')
        self.assertEqual(self.app.test_client().get('/api/me/market-clock').status_code,401)
