"""Account profile persistence and sign-in identity integration checks."""
import unittest
from unittest.mock import patch
import json
import test_access
import database


class ProfileTests(unittest.TestCase):
    setUpClass = classmethod(test_access.AccessTests.setUpClass.__func__)
    tearDownClass = classmethod(test_access.AccessTests.tearDownClass.__func__)
    setUp = test_access.AccessTests.setUp
    client = test_access.AccessTests.client

    def test_name_and_contact_details_persist_and_update_directory_and_session(self):
        payload = dict(first_name='  Alex  ', last_name='Morgan Lee', phone='+1 (306) 555-0100',
                       address_line1='100 Example Street', address_line2='Unit 4', city='Regina',
                       region='Saskatchewan', postal_code='S4P 1A1', country='Canada')
        response = self.customer.put('/api/me/profile', json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['name'], 'Alex Morgan Lee')
        saved = self.customer.get('/api/me/profile').json
        for key,value in payload.items():
            self.assertEqual(saved[key], value.strip())
        self.assertEqual(self.customer.get('/api/me').json['name'], 'Alex Morgan Lee')
        directory = self.admin.get('/api/security/users').json['users']
        self.assertEqual(next(user for user in directory if user['id']==103)['name'], 'Alex Morgan Lee')
        self.assertNotIn('password_hash', json.dumps(saved))
        # Partial edits preserve other contact details, and optional details can be cleared.
        self.assertEqual(self.customer.put('/api/me/profile', json={'address_line2':''}).status_code, 200)
        saved = self.customer.get('/api/me/profile').json
        self.assertEqual(saved['address_line2'], '')
        self.assertEqual(saved['city'], 'Regina')

    def test_email_change_updates_login_revokes_other_sessions_and_invalidates_reset_links(self):
        other_session = self.client(103,'CUSTOMER')
        db = database.get_db_connection()
        db.execute("INSERT OR REPLACE INTO password_reset_codes(email,code_hash,expires_at,sent_at) VALUES ('user103@example.com','old-link',9999999999,0)")
        db.commit()
        db.close()
        response = self.customer.put('/api/me/profile', json={'email':' NEW.Address@EXAMPLE.COM ', 'current_password':'test-password-12345'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['email'], 'new.address@example.com')
        self.assertEqual(self.customer.get('/api/me').status_code, 200)
        self.assertEqual(other_session.get('/api/me').status_code, 401)
        client = self.app.test_client()
        with patch.object(self.module, 'send_login_notification'):
            self.assertEqual(client.post('/api/login', json={'email':'user103@example.com','password':'test-password-12345'}).status_code, 401)
            self.assertEqual(client.post('/api/login', json={'email':'new.address@example.com','password':'test-password-12345'}).status_code, 200)
        db = database.get_db_connection()
        self.assertIsNone(db.execute("SELECT * FROM password_reset_codes WHERE email='user103@example.com'").fetchone())
        db.close()

    def test_email_change_requires_password_and_unique_address_without_partial_saves(self):
        self.assertEqual(self.customer.put('/api/me/profile', json={'email':'new@example.com'}).status_code, 400)
        self.assertEqual(self.customer.put('/api/me/profile', json={'email':'new@example.com','current_password':'wrong'}).status_code, 400)
        response = self.customer.put('/api/me/profile', json={'first_name':'Changed','email':'USER101@example.com','current_password':'test-password-12345'})
        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.customer.get('/api/me/profile').json['name'], 'User 103')

    def test_invalid_details_and_anonymous_requests_are_rejected(self):
        for method in ('get','put'):
            self.assertEqual(getattr(self.app.test_client(),method)('/api/me/profile',json={'first_name':'Alex'}).status_code,401)
        for payload in ({'first_name':''},{'last_name':123},{'first_name':'a'*81},{'phone':'<script>'},{'email':'invalid'},{'city':'a'*101},{'role':'SOC_ADMIN'},[]):
            self.assertEqual(self.customer.put('/api/me/profile',json=payload).status_code,400)
        self.assertEqual(self.customer.get('/api/me/profile').json['role'],'CUSTOMER')

    def test_deleting_an_account_removes_its_contact_details(self):
        self.assertEqual(self.customer.put('/api/me/profile',json={'phone':'306-555-0100'}).status_code,200)
        response=self.admin.delete('/api/security/users/103?source=local',json={'current_password': 'test-password-12345', 'confirm_email':'user103@example.com'})
        self.assertEqual(response.status_code,200)
        db=database.get_db_connection()
        self.assertIsNone(db.execute('SELECT * FROM user_profiles WHERE user_id=103').fetchone())
        db.close()
