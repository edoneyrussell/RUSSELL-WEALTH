"""Optional PostgreSQL verification using transaction-local temporary tables only."""
import os
import unittest
from unittest.mock import patch


@unittest.skipUnless(os.environ.get('RW_TEST_POSTGRES_URL'),'No PostgreSQL test connection configured')
class BandwidthPostgresTests(unittest.TestCase):
    def test_paged_union_handles_postgres_types_and_pool_rollback(self):
        import psycopg
        from psycopg.rows import dict_row
        from flask import Flask,session
        from trading_api import transaction_history
        from postgres_adapter import PostgresAdapter
        from postgres_connection import close_connection_pool,pooled_connection
        url=os.environ['RW_TEST_POSTGRES_URL']
        # Tables are local to this connection and disappear on close.
        with psycopg.connect(url,row_factory=dict_row,connect_timeout=10) as conn:
            definitions={
                'investment_accounts':'id BIGINT,user_id BIGINT,account_name TEXT',
                'assets':'id BIGINT,symbol TEXT,name TEXT,asset_type TEXT',
                'transactions':'id BIGINT,account_id BIGINT,asset_id BIGINT,transaction_type TEXT,quantity TEXT,amount_cents BIGINT,created_at TIMESTAMPTZ',
                'rw_demo_bank_transfers':'id BIGINT,user_id BIGINT,account_id BIGINT,direction TEXT,amount_cents BIGINT,created_at TEXT,bank_code TEXT',
            }
            for table,columns in definitions.items():conn.execute(f'CREATE TEMP TABLE {table} ({columns})')
            conn.execute("INSERT INTO investment_accounts VALUES(1,100,'Own'),(2,200,'Other')")
            conn.execute("INSERT INTO assets VALUES(1,'TEST','Test asset','STOCK')")
            conn.execute("INSERT INTO transactions VALUES(1,1,1,'BUY','2',1200,'2026-11-18T12:00:00Z'),(2,2,1,'BUY','2',999,'2026-11-18T12:00:00Z')")
            conn.execute("INSERT INTO rw_demo_bank_transfers VALUES(1,100,1,'DEPOSIT',5500,'2026-11-18 13:00:00','TD')")
            conn.commit()
            class Adapter:
                def execute(self,sql,params=()):return conn.execute(sql.replace('?','%s'),params)
                def close(self):conn.rollback()
            app=Flask(__name__);app.secret_key='test-only'
            with app.test_request_context('/api/customer/transactions?account_id=all&per_page=1&page=2'):
                session.update(user_id=100,role='CUSTOMER',roles=['CUSTOMER'])
                with patch('trading_api.get_db_connection',return_value=Adapter()):response=transaction_history()
                self.assertEqual(response.json['pagination']['total'],2)
                self.assertEqual(response.json['transactions'][0]['price'],'6')
        # No application account data is accessed by these pool checks.
        with patch.dict(os.environ,{'DATABASE_URL':url}):
            close_connection_pool()
            try:
                first=PostgresAdapter();first.execute('SELECT 1');first.close();first.close()
                with pooled_connection() as check:self.assertEqual(check.execute('SELECT 1 AS n').fetchone()['n'],1)
            finally:close_connection_pool()

    def test_pool_reuses_connection_without_leaking_transaction_state(self):
        from postgres_adapter import PostgresAdapter
        from postgres_connection import close_connection_pool
        with patch.dict(os.environ,{'DATABASE_URL':os.environ['RW_TEST_POSTGRES_URL']}):
            try:
                first=PostgresAdapter()
                physical=first.connection
                first.execute('SET TRANSACTION READ ONLY')
                self.assertEqual(first.execute('SELECT 1 AS n').fetchone()['n'],1)
                first.close();first.close()
                second=PostgresAdapter()
                self.assertIs(second.connection,physical)
                self.assertEqual(second.execute("SELECT current_setting('transaction_read_only') AS state").fetchone()['state'],'off')
                second.close()
            finally:
                close_connection_pool()
