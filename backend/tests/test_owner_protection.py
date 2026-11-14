"""Administrative confirmation and protected owner account regression tests."""
import unittest
from unittest.mock import patch
import test_access
import database
from werkzeug.security import generate_password_hash


class OwnerProtectionTests(unittest.TestCase):
    setUpClass = classmethod(test_access.AccessTests.setUpClass.__func__)
    tearDownClass = classmethod(test_access.AccessTests.tearDownClass.__func__)
    setUp = test_access.AccessTests.setUp
    client = test_access.AccessTests.client

    def tearDown(self):
        # Dispose of fixture guards so the next test can clear its owner fixture.
        db = database.get_db_connection()
        for row in db.execute("SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'rw_owner_%'").fetchall():
            db.execute(f"DROP TRIGGER {row['name']}")
        db.commit(); db.close()

    def test_every_action_requires_own_password(self):
        db = database.get_db_connection()
        db.execute('UPDATE users SET password_hash=? WHERE id=103', (generate_password_hash('target-password'),))
        db.commit(); db.close()
        for method, payload in [('PATCH', {'role': 'BOTH'}), ('PATCH', {'account_status': 'SUSPENDED'}), ('DELETE', {})]:
            for password, expected in [(None, 400), ('wrong', 403), ('target-password', 403)]:
                data = dict(payload)
                if password is not None: data['current_password'] = password
                response = self.admin.open('/api/security/users/103', method=method, json=data)
                self.assertEqual(response.status_code, expected, response.json)
        self.assertEqual(self.admin.patch('/api/security/users/103', json={'role': 'BOTH', 'current_password': 'test-password-12345'}).status_code, 200)

    def test_other_admin_cannot_delete_suspend_or_demote_owner(self):
        db = database.get_db_connection()
        db.execute("UPDATE users SET email='edoneyrussell@gmail.com',name='BIG BRO' WHERE id=102")
        db.execute('INSERT INTO admin_customer_links(admin_user_id,customer_user_id) VALUES(102,102)')
        db.commit(); db.close()
        owner = [x for x in self.admin.get('/api/security/users').json['users'] if x['id'] == 102][0]
        self.assertTrue(owner['is_owner'])
        for method, data in [('DELETE', {}), ('PATCH', {'account_status': 'SUSPENDED'}), ('PATCH', {'role': 'CUSTOMER'}), ('PATCH', {'role': 'SOC_ADMIN'})]:
            response = self.admin.open('/api/security/users/102', method=method, json={**data, 'current_password': 'test-password-12345'})
            self.assertEqual(response.status_code, 403, response.json)
        account = self.client(102, 'SOC_ADMIN')
        self.assertEqual(account.get('/api/me').json['roles'], ['CUSTOMER', 'SOC_ADMIN'])
        self.assertEqual(account.get('/api/customer/overview').status_code, 200)

    def test_database_guards_protect_owner_even_from_older_backends(self):
        import sqlite3
        from owner_protection import initialize_owner_protection
        db = database.get_db_connection()
        db.execute("UPDATE users SET email='edoneyrussell@gmail.com' WHERE id=102")
        db.commit(); db.close()
        initialize_owner_protection()
        db = database.get_db_connection()
        try:
            for sql in ["DELETE FROM users WHERE id=102", "UPDATE users SET account_status='SUSPENDED' WHERE id=102", "UPDATE users SET role='CUSTOMER' WHERE id=102", "DELETE FROM admin_customer_links WHERE admin_user_id=102"]:
                with self.assertRaises(sqlite3.IntegrityError): db.execute(sql)
                db.rollback()
            # Non-owner accounts can still be administered.
            db.execute("UPDATE users SET account_status='SUSPENDED' WHERE id=103")
            db.commit()
        finally:
            db.close()

    def test_secondary_database_uses_signed_in_password(self):
        db = database.get_db_connection()
        db.execute('UPDATE users SET password_hash=? WHERE id=102', (generate_password_hash('remote-password'),))
        db.commit(); db.close()
        import access_api
        with patch('access_api.directory_sources', return_value=('local', ['local', 'secondary'])), patch('access_api.source_connection', side_effect=lambda *_: database.get_db_connection()), patch('access_api.source_actor', side_effect=lambda db,*_: db.execute('SELECT * FROM users WHERE id=102').fetchone()):
            denied = self.admin.patch('/api/security/users/103?source=secondary', json={'role': 'BOTH', 'current_password': 'remote-password'})
            self.assertEqual(denied.status_code, 403)
            accepted = self.admin.patch('/api/security/users/103?source=secondary', json={'role': 'BOTH', 'current_password': 'test-password-12345'})
            self.assertEqual(accepted.status_code, 200, accepted.json)
