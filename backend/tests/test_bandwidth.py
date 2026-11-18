"""Bandwidth regressions against disposable accounts, never live customer data."""
import json
import unittest
from datetime import datetime,timezone
from unittest.mock import patch,MagicMock
import test_access
import database


class BandwidthTests(unittest.TestCase):
    setUpClass=classmethod(test_access.AccessTests.setUpClass.__func__)
    tearDownClass=classmethod(test_access.AccessTests.tearDownClass.__func__)
    client=test_access.AccessTests.client
    setUp=test_access.AccessTests.setUp

    def test_light_auth_omits_avatar_but_still_revalidates_revocation(self):
        db=database.get_db_connection()
        db.execute("UPDATE users SET profile_photo_data=?,profile_photo_mime='image/png' WHERE id=103",('x'*64000,))
        db.commit();db.close()
        light=self.customer.get('/api/me?include_photo=0')
        full=self.customer.get('/api/me')
        self.assertEqual(light.status_code,200)
        self.assertNotIn('profile_photo',light.json)
        self.assertLess(len(light.data),500)
        self.assertGreater(len(full.data),64000)
        db=database.get_db_connection();db.execute("UPDATE users SET account_status='SUSPENDED',access_version=access_version+1 WHERE id=103");db.commit();db.close()
        self.assertEqual(self.customer.get('/api/me?include_photo=0').status_code,401)

    def test_transaction_pagination_search_and_owner_isolation(self):
        db=database.get_db_connection()
        account=db.execute("INSERT INTO investment_accounts(user_id,account_name,cash_balance_cents) VALUES(103,'Paged',100000) RETURNING id").fetchone()['id']
        foreign=db.execute("INSERT INTO investment_accounts(user_id,account_name,cash_balance_cents) VALUES(101,'Other',0) RETURNING id").fetchone()['id']
        for i in range(125):
            db.execute("INSERT INTO transactions(account_id,transaction_type,amount_cents,created_at) VALUES(?,'DEPOSIT',?,'2026-11-18 12:00:00')",(account,i+1))
        db.execute("INSERT INTO transactions(account_id,transaction_type,amount_cents) VALUES(?,'DEPOSIT',999999)",(foreign,))
        db.commit();db.close()
        first=self.customer.get('/api/customer/transactions?account_id=all&per_page=50').json
        second=self.customer.get('/api/customer/transactions?account_id=all&per_page=50&page=2').json
        third=self.customer.get('/api/customer/transactions?account_id=all&per_page=50&page=3').json
        self.assertEqual(first['pagination']['total'],125)
        self.assertEqual([len(x['transactions']) for x in [first,second,third]],[50,50,25])
        ids=[row['id'] for batch in [first,second,third] for row in batch['transactions']]
        self.assertEqual(len(set(ids)),125)
        self.assertTrue(all(row['account_id']==account for row in first['transactions']))
        self.assertEqual(self.customer.get('/api/customer/transactions?account_id=all&search=Paged').json['pagination']['total'],125)
        self.assertEqual(self.customer.get('/api/customer/transactions?account_id=all&search=Other').json['pagination']['total'],0)
        self.assertEqual(self.customer.get('/api/customer/transactions?per_page=bad').status_code,400)

    def test_uptime_returns_aggregates_instead_of_thousands_of_samples(self):
        import infrastructure_history
        now=datetime(2026,11,18,12,0,tzinfo=timezone.utc);slot=int(now.timestamp())//15
        db=database.get_db_connection();db.execute('DELETE FROM infrastructure_checks')
        for service in infrastructure_history.SERVICES:
            db.executemany('INSERT INTO infrastructure_checks(service,bucket,checked_at,status,latency_ms) VALUES(?,?,?,?,1)',
                [(service,index,datetime.fromtimestamp(index*15,timezone.utc).isoformat(),'online') for index in range(slot-5759,slot+1)])
        db.commit()
        raw=[dict(row) for row in db.execute('SELECT service,bucket,status,checked_at FROM infrastructure_checks WHERE bucket>=? ORDER BY bucket',(slot-5760,)).fetchall()]
        db.close()
        sizes=[]
        real=database.get_db_connection
        class Tracked:
            def __init__(self):self.db=real()
            def execute(self,sql,params=()):
                cursor=self.db.execute(sql,params)
                if 'GROUP BY service' not in sql:return cursor
                class Result:
                    def fetchall(self):
                        rows=cursor.fetchall();sizes.append((len(rows),len(json.dumps([dict(row) for row in rows]))));return rows
                return Result()
            def commit(self):self.db.commit()
            def close(self):self.db.close()
        with patch('infrastructure_history.get_db_connection',Tracked):result=infrastructure_history.observed_history([],now)
        self.assertEqual(len(raw),17280)
        self.assertLessEqual(sizes[0][0],147)
        self.assertLess(sizes[0][1],len(json.dumps(raw))*.03)
        self.assertTrue(all(result[name]['sample_count']==5760 and result[name]['availability_pct']==100 for name in infrastructure_history.SERVICES))
        self.assertEqual(sum(block['checks'] for block in result['Render']['blocks']),5641)

    def test_pooled_adapter_rolls_back_and_returns_connection_once(self):
        import postgres_adapter
        pool=MagicMock();connection=pool.getconn.return_value;connection.closed=False
        with patch('postgres_adapter.get_connection_pool',return_value=pool):adapter=postgres_adapter.PostgresAdapter()
        adapter.close();adapter.close()
        connection.rollback.assert_called_once();pool.putconn.assert_called_once_with(connection)
        connection.close.assert_not_called()

    def test_public_history_cache_expires_and_invalidates_without_caching_private_data(self):
        import market_cache
        market_cache._read_history_cached.cache_clear()
        market_cache.save_history('BANDWIDTH.TEST',[{'date':'2026-11-18','close':10}],'test')
        with patch('market_cache.monotonic',return_value=120):
            first=market_cache.read_history('BANDWIDTH.TEST')
            first[0]['close']=999
            self.assertEqual(market_cache.read_history('BANDWIDTH.TEST')[0]['close'],10)
            self.assertEqual(market_cache._read_history_cached.cache_info().hits,1)
            market_cache.save_history('BANDWIDTH.TEST',[{'date':'2026-11-18','close':11}],'test')
            self.assertEqual(market_cache.read_history('BANDWIDTH.TEST')[0]['close'],11)
        with patch('market_cache.monotonic',return_value=180):
            market_cache.read_history('BANDWIDTH.TEST')
        self.assertEqual(market_cache._read_history_cached.cache_info().misses,2)
        market_cache._read_history_cached.cache_clear()
