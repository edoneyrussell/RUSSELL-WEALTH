"""Multi-account isolation, cash conservation, replay protection and ownership."""
import unittest
from unittest.mock import patch
from decimal import Decimal
import test_access
import database


class CustomerAccountsTests(unittest.TestCase):
    setUpClass = classmethod(test_access.AccessTests.setUpClass.__func__)
    tearDownClass = classmethod(test_access.AccessTests.tearDownClass.__func__)
    client = test_access.AccessTests.client

    def setUp(self):
        test_access.AccessTests.setUp(self)
        db = database.get_db_connection()
        self.original = db.execute("INSERT INTO investment_accounts(user_id,account_name,cash_balance_cents) VALUES(103,'Existing',100000) RETURNING id").fetchone()['id']
        db.execute("INSERT INTO investment_accounts(user_id,account_name,cash_balance_cents) VALUES(101,'Another user',50000)")
        db.commit(); db.close()

    def open(self, kind='TFSA', mode='SELF_DIRECTED', name='My savings'):
        response = self.customer.post('/api/customer/accounts',json={'account_type':kind,'management_mode':mode,'name':name})
        self.assertEqual(response.status_code,201,response.json)
        return response.json['account']['id']

    def select(self, target):
        return self.customer.put('/api/customer/accounts/selection',json={'account_id':target})

    def test_all_account_types_and_validated_modes(self):
        catalog = self.customer.get('/api/customer/accounts').json
        self.assertEqual(len(catalog['types']),16)
        self.assertEqual(len(catalog['accounts']),1)
        self.assertEqual(catalog['accounts'][0]['cash_balance'],'1000')
        for item in catalog['types']:
            target = self.open(item['code'],item['modes'][0],item['name'])
            self.assertEqual(self.customer.get(f'/api/customer/portfolio?account_id={target}').json['cash_balance'],'0')
        for body in ({'account_type':'UNKNOWN'}, {'account_type':'CRYPTO','management_mode':'MANAGED'}, {'account_type':'TFSA','name':'x'*81}):
            self.assertEqual(self.customer.post('/api/customer/accounts',json=body).status_code,400)
        self.assertEqual(self.customer.post('/api/customer/accounts',json={'account_type':'TFSA'},headers={'Origin':'https://untrusted.invalid'}).status_code,403)

    def test_selection_persists_across_sessions_and_does_not_mix_holdings(self):
        target = self.open()
        with patch('trading_api.market_status',return_value={'is_open':True}):
            self.assertEqual(self.customer.post('/api/customer/trade',json={'account_id':self.original,'symbol':'MSFT','action':'BUY','quantity':'2'}).status_code,200)
        self.assertEqual(self.select(target).status_code,200)
        another_session = self.client(103,'CUSTOMER')
        self.assertEqual(another_session.get('/api/customer/accounts').json['selected_account_id'],target)
        empty = another_session.get('/api/customer/portfolio').json
        self.assertEqual(empty['account_id'],target)
        self.assertEqual(empty['holdings'],[])
        self.assertEqual(empty['cash_balance'],'0')
        self.assertEqual(another_session.get('/api/customer/transactions').json['transactions'],[])
        original = self.customer.get(f'/api/customer/portfolio?account_id={self.original}').json
        self.assertEqual(original['holdings'][0]['symbol'],'MSFT')
        self.assertEqual(original['cash_balance'],'800')

    def test_external_funding_goes_to_explicit_destination_and_history_stays_scoped(self):
        target = self.open()
        self.assertEqual(self.select(self.original).status_code,200)
        data={'account_id':target,'bank_code':'TD','direction':'DEPOSIT','amount':'75.25','request_id':'accounts-fund-123'}
        response=self.customer.post('/api/customer/demo-banking/transfer',json=data)
        self.assertEqual(response.status_code,200,response.json)
        self.assertEqual(self.customer.post('/api/customer/demo-banking/transfer',json=data).status_code,200)
        self.assertEqual(self.customer.post('/api/customer/demo-banking/transfer',json={**data,'account_id':self.original}).status_code,409)
        first=self.customer.get('/api/customer/demo-banking').json
        second=self.customer.get(f'/api/customer/demo-banking?account_id={target}').json
        self.assertEqual(first['cash_balance'],'1000')
        self.assertFalse(any(row['amount']=='75.25' for row in first['history']))
        self.assertEqual(second['cash_balance'],'75.25')
        self.assertEqual(second['account_id'],target)
        self.assertTrue(any(row['amount']=='75.25' for row in second['history']))
        transactions=self.customer.get(f'/api/customer/transactions?account_id={target}').json['transactions']
        self.assertTrue(any(row['total']=='75.25' for row in transactions))

    def test_internal_cash_transfer_conserves_money_and_is_idempotent(self):
        target=self.open()
        payload={'from_account_id':self.original,'to_account_id':target,'amount':'150.25','request_id':'internal-transfer-123'}
        for _ in range(2):
            response=self.customer.post('/api/customer/accounts/transfer',json=payload)
            self.assertEqual(response.status_code,200,response.json)
        result=self.customer.get('/api/customer/accounts').json
        accounts={row['id']:row for row in result['accounts']}
        self.assertEqual(accounts[self.original]['cash_balance'],'849.75')
        self.assertEqual(accounts[target]['cash_balance'],'150.25')
        self.assertEqual(Decimal(result['total_value']),Decimal('1000'))
        conflict=self.customer.post('/api/customer/accounts/transfer',json={**payload,'amount':'200'})
        self.assertEqual(conflict.status_code,409)
        self.assertEqual(self.customer.post('/api/customer/accounts/transfer',json={**payload,'request_id':'overdraft-123','amount':'5000'}).status_code,409)
        db=database.get_db_connection()
        self.assertEqual(db.execute('SELECT COUNT(*) AS n FROM customer_account_transfers').fetchone()['n'],1)
        self.assertEqual(db.execute('SELECT COUNT(*) AS n FROM transactions WHERE account_id IN (?,?)',(self.original,target)).fetchone()['n'],2)
        db.close()

    def test_cross_customer_ids_are_denied_everywhere(self):
        db=database.get_db_connection()
        other=db.execute('SELECT id FROM investment_accounts WHERE user_id=101').fetchone()['id'];db.close()
        for path in ('/api/customer/portfolio','/api/customer/demo-banking','/api/customer/transactions'):
            self.assertEqual(self.customer.get(path+f'?account_id={other}').status_code,404,path)
        self.assertEqual(self.select(other).status_code,404)
        self.assertEqual(self.customer.patch(f'/api/customer/accounts/{other}',json={'name':'Stolen'}).status_code,404)
        self.assertEqual(self.customer.post('/api/customer/accounts/transfer',json={'from_account_id':other,'to_account_id':self.original,'amount':'10','request_id':'forbidden-transfer'}).status_code,404)
        with patch('trading_api.market_status',return_value={'is_open':True}):
            self.assertEqual(self.customer.post('/api/customer/trade',json={'account_id':other,'symbol':'MSFT','action':'BUY','quantity':'1'}).status_code,404)

    def test_overview_balances_revalue_each_account_without_mixing_cash(self):
        target=self.open()
        transfer={'from_account_id':self.original,'to_account_id':target,'amount':'125','request_id':'overview-transfer-123'}
        self.assertEqual(self.customer.post('/api/customer/accounts/transfer',json=transfer).status_code,200)
        with patch('trading_api.market_status',return_value={'is_open':True}):
            bought=self.customer.post('/api/customer/trade',json={'account_id':target,'symbol':'MSFT','action':'BUY','quantity':'1'})
            self.assertEqual(bought.status_code,200,bought.json)
        with patch('simulation_prices.stock_price_cents',return_value=25000):
            overview=self.customer.get('/api/customer/accounts').json
            rows={row['id']:row for row in overview['accounts']}
            self.assertEqual(Decimal(rows[self.original]['cash_balance']),Decimal('875'))
            self.assertEqual(Decimal(rows[self.original]['invested_value']),Decimal('0'))
            self.assertEqual(Decimal(rows[target]['cash_balance']),Decimal('25'))
            self.assertEqual(Decimal(rows[target]['invested_value']),Decimal('250'))
            self.assertEqual(Decimal(rows[target]['total_value']),Decimal('275'))
            self.assertEqual(Decimal(overview['total_value']),Decimal('1150'))
            portfolio=self.customer.get(f'/api/customer/portfolio?account_id={target}').json
            self.assertEqual(Decimal(portfolio['total_value']),Decimal(rows[target]['total_value']))

    def test_close_rename_reopen_and_account_mode_guards(self):
        target=self.open()
        self.assertEqual(self.customer.patch(f'/api/customer/accounts/{self.original}',json={'status':'CLOSED'}).status_code,400)
        self.select(target)
        response=self.customer.patch(f'/api/customer/accounts/{target}',json={'status':'CLOSED','name':'House fund'})
        self.assertEqual(response.status_code,200,response.json)
        self.assertEqual(self.customer.get('/api/customer/accounts').json['selected_account_id'],self.original)
        self.assertEqual(self.select(target).status_code,404)
        self.assertEqual(self.customer.patch(f'/api/customer/accounts/{target}',json={'status':'OPEN'}).status_code,200)
        cash=self.open('SAVINGS','SAVINGS')
        crypto=self.open('CRYPTO')
        with patch('trading_api.market_status',return_value={'is_open':True}):
            for target in (cash,crypto):
                result=self.customer.post('/api/customer/trade',json={'account_id':target,'symbol':'MSFT','action':'BUY','quantity':'1'})
                self.assertEqual(result.status_code,400,result.json)
