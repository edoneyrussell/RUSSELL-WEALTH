"""Saved password hints on sign-in and in owner reset emails."""
import os
import unittest
from unittest.mock import patch
import test_access
import database


class PasswordHintTests(unittest.TestCase):
    setUpClass = classmethod(test_access.AccessTests.setUpClass.__func__)
    tearDownClass = classmethod(test_access.AccessTests.tearDownClass.__func__)
    def setUp(self):
        test_access.AccessTests.setUp(self)
        db = database.get_db_connection()
        db.execute('DELETE FROM password_hint_limits')
        db.commit(); db.close()
    client = test_access.AccessTests.client

    def payload(self, **changes):
        return dict(firstName='Hint', lastName='User', email='hint@example.com',
                    password='a-long-test-password', acceptedTerms=True) | changes

    def test_hint_saved_optional_and_validated(self):
        response = self.app.test_client().post('/api/register/start', json=self.payload(passwordHint='  First trip <place>  '))
        self.assertEqual(response.status_code, 201)
        db = database.get_db_connection()
        self.assertEqual(db.execute("SELECT password_hint FROM users WHERE email='hint@example.com'").fetchone()['password_hint'], 'First trip <place>')
        db.close()
        for hint in (123, 'x' * 201, 'My a-long-test-password reminder'):
            response = self.app.test_client().post('/api/register/start', json=self.payload(passwordHint=hint))
            self.assertEqual(response.status_code, 400)
        payload = self.payload()
        payload['email'] = 'nohint@example.com'
        self.assertEqual(self.app.test_client().post('/api/register/start', json=payload).status_code, 201)

    def test_hint_email_is_escaped_and_reset_clears_stale_hint(self):
        import password_reset_api
        self.app.test_client().post('/api/register/start', json=self.payload(passwordHint='<b>Trip & city</b>'))
        client = self.app.test_client()
        with patch.dict(os.environ, {'RW_RESEND_API_KEY': 'test-only'}), patch('password_reset_api.resend.Emails.send', return_value={'id': 'test'}) as send:
            self.assertEqual(client.post('/api/password-reset/request', json={'email': 'hint@example.com'}).status_code, 200)
            body = send.call_args.args[0]
            self.assertEqual(body['to'], ['hint@example.com'])
            self.assertIn('&lt;b&gt;Trip &amp; city&lt;/b&gt;', body['html'])
            self.assertNotIn('<b>Trip', body['html'])
        import re
        from html import unescape
        from urllib.parse import urlsplit, parse_qs
        link = unescape(re.search(r"href='([^']+)'", body['html']).group(1))
        token = parse_qs(urlsplit(link).fragment)['token'][0]
        response = client.post('/api/password-reset/confirm', json={'email': 'hint@example.com', 'token': token, 'password': 'different-long-password'})
        self.assertEqual(response.status_code, 200)
        db = database.get_db_connection()
        self.assertIsNone(db.execute("SELECT password_hint FROM users WHERE email='hint@example.com'").fetchone()['password_hint'])
        db.close()

    def test_seven_character_minimum_and_sign_in_hint_lookup(self):
        for password in ['six666', 'x' * 129]:
            response = self.app.test_client().post('/api/register/start', json=self.payload(password=password))
            self.assertEqual(response.status_code, 400)
        response = self.app.test_client().post('/api/register/start', json=self.payload(password='seven77', passwordHint='Favourite vacation'))
        self.assertEqual(response.status_code, 201, response.json)
        visitor = self.app.test_client()
        hint = visitor.post('/api/password-hint', json={'email':'  HINT@example.com '})
        self.assertEqual(hint.status_code, 200)
        self.assertEqual(hint.json, {'hint':'Favourite vacation'})
        self.assertIn('no-store', hint.headers['Cache-Control'])
        self.assertNotIn('seven77', hint.get_data(as_text=True))
        self.assertEqual(visitor.post('/api/password-hint', json={'email':'unknown@example.com'}).json, {'hint':None})
        for payload in [None, [], {'email':5}, {'email':'not-an-email'}]:
            self.assertEqual(visitor.post('/api/password-hint', json=payload).json, {'hint':None})
        db = database.get_db_connection()
        db.execute("UPDATE users SET account_status='SUSPENDED' WHERE email='hint@example.com'")
        db.commit(); db.close()
        self.assertEqual(visitor.post('/api/password-hint', json={'email':'hint@example.com'}).json, {'hint':None})

    def test_hint_lookup_is_rate_limited_without_blocking_sign_in(self):
        visitor = self.app.test_client()
        with patch('password_hints.time.time', return_value=1000):
            for _ in range(30):
                self.assertEqual(visitor.post('/api/password-hint',json={'email':'unknown@example.com'}).status_code,200)
            self.assertEqual(visitor.post('/api/password-hint',json={'email':'unknown@example.com'}).status_code,429)
            with patch.object(self.module, 'send_login_notification'):
                self.assertEqual(visitor.post('/api/login',json={'email':'user103@example.com','password':'test-password-12345'}).status_code,200)
        with patch('password_hints.time.time', return_value=1061):
            self.assertEqual(visitor.post('/api/password-hint',json={'email':'unknown@example.com'}).status_code,200)
