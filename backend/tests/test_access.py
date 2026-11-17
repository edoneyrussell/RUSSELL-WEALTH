"""Account administration integration checks against a disposable database."""
import importlib.util
import os
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import database
from werkzeug.security import generate_password_hash


class AccessTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.db_path = str(Path(cls.temp.name) / 'access.db')
        # Reuse the schema only; never copy real account data.
        source = sqlite3.connect(database.DATABASE)
        schema = [r[0] for r in source.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name<>'sqlite_sequence'")]
        source.close()
        db = sqlite3.connect(cls.db_path)
        for sql in schema:
            db.execute(sql)
        db.commit()
        db.close()
        cls.db_patch = patch.object(database, 'DATABASE', cls.db_path)
        cls.db_patch.start()
        original_connect = database.get_db_connection
        def connect():
            connection = original_connect()
            connection.execute('PRAGMA foreign_keys=ON')
            return connection
        cls.connect_patch = patch.object(database, 'get_db_connection', connect)
        cls.connect_patch.start()
        cls.env_patch = patch.dict(os.environ, {'RW_DB_ENGINE': 'sqlite', 'FLASK_SECRET_KEY': 'test-only-key', 'DATABASE_URL': ''})
        cls.env_patch.start()
        spec = importlib.util.spec_from_file_location('rw_test_app', Path(__file__).resolve().parents[1] / 'app.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        cls.module = module
        cls.app = module.app
        cls.app.config.update(TESTING=True)
        cls.password_hash = generate_password_hash('test-password-12345')
        # Legacy workflow fixtures exercise the designated administrator by email.
        cls.admin_identity_patch = patch('access_api.ACCESS_ADMIN_EMAIL','user101@example.com')
        cls.admin_identity_patch.start()
        cls.price_patch = patch('simulation_prices.stock_price_cents',side_effect=lambda symbol,asset_type='STOCK',fallback=10000,day=None: fallback)
        cls.price_patch.start()

    @classmethod
    def tearDownClass(cls):
        cls.price_patch.stop()
        cls.admin_identity_patch.stop()
        cls.env_patch.stop()
        cls.connect_patch.stop()
        cls.db_patch.stop()
        cls.temp.cleanup()

    def setUp(self):
        db = database.get_db_connection()
        for table in ('active_login_sessions', 'alert_workflows', 'security_event_locations', 'incident_response_actions', 'market_clock_preferences', 'customer_watchlist', 'security_alerts', 'portfolio_snapshots', 'admin_customer_links', 'holdings', 'transactions', 'security_events', 'investment_accounts', 'users'):
            db.execute(f'DELETE FROM {table}')
        for uid, role in [(101, 'SOC_ADMIN'), (102, 'SOC_ADMIN'), (103, 'CUSTOMER')]:
            db.execute('INSERT INTO users (id,name,email,password_hash,role) VALUES (?,?,?,?,?)',
                       (uid, f'User {uid}', f'user{uid}@example.com', self.password_hash, role))
        db.commit()
        db.close()
        self.admin = self.client(101, 'SOC_ADMIN')
        self.customer = self.client(103, 'CUSTOMER')

    def client(self, uid, role):
        client = self.app.test_client()
        with client.session_transaction() as sess:
            sess.update(user_id=uid, role=role, name='Test', access_version=0)
        return client

    def test_directory_is_restricted_and_never_exposes_credentials(self):
        self.assertEqual(self.app.test_client().get('/api/security/users').status_code, 401)
        self.assertEqual(self.customer.get('/api/security/users').status_code, 403)
        response = self.admin.get('/api/security/users')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json['users']), 3)
        self.assertNotIn('password', response.get_data(as_text=True))
        self.assertEqual(response.headers['Cache-Control'], 'no-store')

    def test_directory_combines_sources_without_colliding_ids_or_merging_emails(self):
        import access_api
        original_read = access_api.read_directory_source
        live_rows = [dict(id=103, name='Live Account', email='live@example.com', role='CUSTOMER',
                          account_status='ACTIVE', created_at='2026-11-13', manageable=False, is_self=False, access_role='CUSTOMER')]
        live_rows.append(dict(live_rows[0], id=999, email='user103@example.com'))
        def read(source, primary):
            return live_rows if source == 'live' else original_read(source, primary)
        with patch('access_api.directory_sources', return_value=('local', ['local', 'live'])), \
                patch('access_api.read_directory_source', side_effect=read):
            response = self.admin.get('/api/security/users')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(len(response.json['users']), 5)
            self.assertEqual(len([row for row in response.json['users'] if row['email'] == 'user103@example.com']), 2)
            duplicates = [row for row in response.json['users'] if row['id'] == 103]
            self.assertEqual({row['source'] for row in duplicates}, {'local', 'live'})
            self.assertEqual([row['manageable'] for row in duplicates], [True, False])
            live_rows.append(dict(live_rows[0], id=104, email='new-live@example.com'))
            self.assertEqual(len(self.admin.get('/api/security/users').json['users']), 6)

    def test_secondary_failure_is_reported_without_hiding_local_accounts(self):
        import access_api
        original_read = access_api.read_directory_source
        def read(source, primary):
            if source == 'live':
                raise ConnectionError('simulated connection failure')
            return original_read(source, primary)
        with patch('access_api.directory_sources', return_value=('local', ['local', 'live'])), \
                patch('access_api.read_directory_source', side_effect=read), \
                patch.object(self.app.logger, 'exception'):
            response = self.admin.get('/api/security/users')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json['users']), 3)
        self.assertEqual(response.json['sources'][1]['status'], 'unavailable')
        self.assertIsNone(response.json['sources'][1]['count'])

    def test_secondary_source_cannot_mutate_colliding_local_id(self):
        response = self.admin.patch('/api/security/users/103?source=live', json={'current_password': 'test-password-12345', 'role': 'SOC_ADMIN'})
        self.assertEqual(response.status_code, 400)
        db = database.get_db_connection()
        self.assertEqual(db.execute('SELECT role FROM users WHERE id=103').fetchone()[0], 'CUSTOMER')
        db.close()

    def test_role_change_revokes_old_sessions_and_provisions_customer_portfolio(self):
        other = self.client(102, 'SOC_ADMIN')
        self.assertEqual(self.admin.patch('/api/security/users/102', json={'current_password': 'test-password-12345', 'role': 'CUSTOMER'}).status_code, 200)
        self.assertEqual(other.get('/api/security/users').status_code, 401)
        db = database.get_db_connection()
        self.assertEqual(db.execute('SELECT COUNT(*) FROM investment_accounts WHERE user_id=102').fetchone()[0], 1)
        db.close()
        self.assertEqual(self.admin.patch('/api/security/users/103', json={'current_password': 'test-password-12345', 'role': 'SOC_ADMIN'}).status_code, 200)
        self.assertEqual(self.customer.get('/api/me').status_code, 401)

    def test_suspension_blocks_both_logins_and_old_sessions_after_reactivation(self):
        payload = {'account_status': 'SUSPENDED'}
        self.assertEqual(self.admin.patch('/api/security/users/103', json={**payload, 'current_password': 'test-password-12345'}).status_code, 200)
        credentials = {'email': 'user103@example.com', 'password': 'test-password-12345'}
        self.assertEqual(self.app.test_client().post('/api/login', json=credentials).status_code, 401)
        self.assertNotEqual(self.app.test_client().post('/login', data=credentials).status_code, 302)
        self.assertEqual(self.admin.patch('/api/security/users/103', json={'current_password': 'test-password-12345', 'account_status': 'ACTIVE'}).status_code, 200)
        self.assertEqual(self.customer.get('/api/me').status_code, 401)
        db = database.get_db_connection()
        self.assertEqual(db.execute('SELECT account_status FROM users WHERE id=103').fetchone()[0], 'ACTIVE')
        db.close()
        with patch.object(self.module, 'send_login_notification'):
            response = self.app.test_client().post('/api/login', json=credentials)
        self.assertEqual(response.status_code, 200)

    def test_validation_and_self_protection(self):
        self.assertEqual(self.admin.patch('/api/security/users/101', json={'current_password': 'test-password-12345', 'role': 'CUSTOMER'}).status_code, 409)
        self.assertEqual(self.admin.delete('/api/security/users/101', json={'current_password': 'test-password-12345', 'confirm_email': 'user101@example.com'}).status_code, 409)
        self.assertEqual(self.admin.patch('/api/security/users/103', json={'current_password': 'test-password-12345', 'role': 'OWNER'}).status_code, 400)
        self.assertEqual(self.admin.patch('/api/security/users/999', json={'current_password': 'test-password-12345', 'role': 'CUSTOMER'}).status_code, 404)
        self.assertEqual(self.admin.patch('/api/security/users/103', json={'current_password': 'test-password-12345', 'role': 'SOC_ADMIN'}, headers={'Origin': 'https://other.example'}).status_code, 403)
        self.assertEqual(self.customer.patch('/api/security/users/102', json={'current_password': 'test-password-12345', 'role': 'CUSTOMER'}).status_code, 403)

    def test_deletion_removes_owned_records_and_preserves_audit_history(self):
        db = database.get_db_connection()
        db.execute('PRAGMA foreign_keys=ON')
        db.execute("INSERT INTO investment_accounts (id,user_id) VALUES (501,103)")
        db.execute("INSERT INTO transactions (account_id,transaction_type,amount_cents) VALUES (501,'DEPOSIT',100)")
        db.execute("INSERT INTO security_events (user_id,event_type,severity) VALUES (103,'LOGIN_SUCCESS','INFO')")
        db.commit()
        db.close()
        self.assertEqual(self.admin.delete('/api/security/users/103', json={'current_password': 'incorrect'}).status_code, 403)
        self.assertEqual(self.admin.delete('/api/security/users/103', json={'current_password': 'test-password-12345', 'confirm_email': 'user103@example.com'}).status_code, 200)
        self.assertEqual(self.customer.get('/api/me').status_code, 401)
        db = database.get_db_connection()
        self.assertIsNone(db.execute('SELECT id FROM users WHERE id=103').fetchone())
        self.assertEqual(db.execute('SELECT COUNT(*) FROM transactions WHERE account_id=501').fetchone()[0], 0)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM security_events WHERE event_type='ACCOUNT_DELETED'").fetchone()[0], 1)
        self.assertEqual(db.execute("SELECT user_id FROM security_events WHERE event_type='LOGIN_SUCCESS'").fetchone()[0], None)
        db.close()

    def test_creation_timestamps_are_explicit_utc_and_preserve_precision(self):
        from access_api import creation_timestamp
        from datetime import datetime, timezone, timedelta
        self.assertEqual(creation_timestamp('2026-11-13 02:04:05'), '2026-11-13T02:04:05Z')
        self.assertEqual(creation_timestamp(datetime(2026, 11, 13, 0, 4, 5, 123456, tzinfo=timezone(timedelta(hours=2)))), '2026-11-12T22:04:05.123456Z')
        self.assertIsNone(creation_timestamp(None))
        self.assertIsNone(creation_timestamp('invalid'))
        response = self.admin.get('/api/security/users')
        self.assertTrue(all(user['created_at'].endswith('Z') for user in response.json['users']))

    def test_combined_role_provisions_own_portfolio_and_allows_both_dashboards(self):
        response = self.admin.patch('/api/security/users/103', json={'current_password': 'test-password-12345', 'role': 'BOTH'})
        self.assertEqual(response.status_code, 200)
        member = self.app.test_client()
        with patch.object(self.module, 'send_login_notification'):
            login = member.post('/api/login', json={'email': 'user103@example.com', 'password': 'test-password-12345'})
        self.assertEqual(login.json['roles'], ['CUSTOMER', 'SOC_ADMIN'])
        self.assertEqual(member.get('/api/me').json['roles'], ['CUSTOMER', 'SOC_ADMIN'])
        self.assertEqual(member.get('/api/customer/overview').status_code, 200)
        self.assertEqual(member.get('/api/security/users').status_code, 200)
        from account_access import customer_user_id
        with self.app.test_request_context():
            from flask import session
            session.update(user_id=103, role='SOC_ADMIN', roles=['CUSTOMER', 'SOC_ADMIN'])
            db = database.get_db_connection()
            self.assertEqual(customer_user_id(db), 103)
            db.close()
        self.assertEqual(self.admin.patch('/api/security/users/103', json={'current_password': 'test-password-12345', 'role': 'SOC_ADMIN'}).status_code, 200)
        self.assertEqual(member.get('/api/me').status_code, 401)
        with patch.object(self.module, 'send_login_notification'):
            member.post('/api/login', json={'email': 'user103@example.com', 'password': 'test-password-12345'})
        self.assertEqual(member.get('/api/customer/overview').status_code, 403)
        self.assertEqual(member.get('/api/security/users').status_code, 200)
        db = database.get_db_connection()
        self.assertEqual(db.execute('SELECT COUNT(*) FROM investment_accounts WHERE user_id=103').fetchone()[0], 1)
        db.close()

    def test_admin_can_add_own_customer_access_without_losing_session(self):
        self.assertEqual(self.admin.patch('/api/security/users/101', json={'current_password': 'test-password-12345', 'role': 'BOTH'}).status_code, 200)
        self.assertEqual(self.admin.get('/api/me').json['roles'], ['CUSTOMER', 'SOC_ADMIN'])
        self.assertEqual(self.admin.patch('/api/security/users/101', json={'current_password': 'test-password-12345', 'role': 'CUSTOMER'}).status_code, 409)


class CrossDatabaseTests(unittest.TestCase):
    setUpClass = classmethod(AccessTests.setUpClass.__func__)
    tearDownClass = classmethod(AccessTests.tearDownClass.__func__)
    client = AccessTests.client
    """Use a second disposable database to exercise actual source separation."""
    def setUp(self):
        AccessTests.setUp(self)
        self.remote_path = str(Path(self.temp.name) / 'remote.db')
        # Each test gets a separate database with the application's schema.
        import shutil
        shutil.copyfile(self.db_path, self.remote_path)
        db = self.remote_connect()
        db.execute('DELETE FROM users')
        for uid, email, role in [(201, 'user101@example.com', 'SOC_ADMIN'),
                                 (202, 'other-admin@example.com', 'SOC_ADMIN'),
                                 (103, 'remote-customer@example.com', 'CUSTOMER')]:
            db.execute('INSERT INTO users (id,name,email,password_hash,role) VALUES (?,?,?,?,?)',
                       (uid, 'Remote user', email, self.password_hash, role))
        db.commit()
        db.close()
        self.sources_patch = patch('access_api.directory_sources', return_value=('live', ['live', 'local']))
        self.sources_patch.start()
        self.addCleanup(self.sources_patch.stop)
        self.connections_patch = patch('access_api.source_connection', side_effect=lambda source, primary:
                                       self.remote_connect() if source == 'local' else database.get_db_connection())
        self.connections_patch.start()
        self.addCleanup(self.connections_patch.stop)

    # Inherit fixtures, not the tests for a single configured source.
    def remote_connect(self):
        db = sqlite3.connect(self.remote_path)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys=ON')
        return db

    def test_remote_actions_use_matching_soc_identity_and_target_database(self):
        self.assertEqual(self.admin.patch('/api/security/users/103?source=local', json={'current_password': 'test-password-12345', 'role': 'BOTH'}).status_code, 200)
        remote = self.remote_connect()
        self.assertEqual(remote.execute('SELECT role FROM users WHERE id=103').fetchone()[0], 'SOC_ADMIN')
        self.assertIsNotNone(remote.execute('SELECT 1 FROM admin_customer_links WHERE admin_user_id=103 AND customer_user_id=103').fetchone())
        self.assertEqual(remote.execute("SELECT user_id FROM security_events WHERE event_type='ACCOUNT_ACCESS_UPDATED'").fetchone()[0], 201)
        remote.close()
        local = database.get_db_connection()
        self.assertEqual(local.execute('SELECT role FROM users WHERE id=103').fetchone()[0], 'CUSTOMER')
        local.close()

    def test_remote_suspend_reactivate_delete_and_self_protection(self):
        self.assertEqual(self.admin.delete('/api/security/users/201?source=local', json={'current_password': 'test-password-12345', 'confirm_email': 'user101@example.com'}).status_code, 409)
        for status in ('SUSPENDED', 'ACTIVE'):
            self.assertEqual(self.admin.patch('/api/security/users/103?source=local', json={'current_password': 'test-password-12345', 'account_status': status}).status_code, 200)
            remote = self.remote_connect()
            self.assertEqual(remote.execute('SELECT account_status FROM users WHERE id=103').fetchone()[0], status)
            remote.close()
        self.assertEqual(self.admin.delete('/api/security/users/103?source=local', json={'current_password': 'test-password-12345', 'confirm_email': 'remote-customer@example.com'}).status_code, 200)
        local = database.get_db_connection()
        self.assertIsNotNone(local.execute('SELECT id FROM users WHERE id=103').fetchone())
        local.close()

    def test_remote_authority_is_rechecked_for_each_action(self):
        remote = self.remote_connect()
        remote.execute("UPDATE users SET account_status='SUSPENDED' WHERE id=201")
        remote.commit()
        remote.close()
        self.assertEqual(self.admin.patch('/api/security/users/103?source=local', json={'current_password': 'test-password-12345', 'role': 'BOTH'}).status_code, 403)
        remote = self.remote_connect()
        remote.execute("UPDATE users SET account_status='ACTIVE', role='CUSTOMER' WHERE id=201")
        remote.commit()
        remote.close()
        self.assertEqual(self.admin.patch('/api/security/users/103?source=local', json={'current_password': 'test-password-12345', 'role': 'BOTH'}).status_code, 403)
        remote = self.remote_connect()
        remote.execute("UPDATE users SET role='SOC_ADMIN', email='unrelated@example.com' WHERE id=201")
        remote.commit()
        remote.close()
        self.assertEqual(self.admin.patch('/api/security/users/103?source=local', json={'current_password': 'test-password-12345', 'role': 'BOTH'}).status_code, 403)


if __name__ == '__main__':
    unittest.main()
