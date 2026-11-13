"""Password hints persist and are disclosed only in owner reset emails."""
import os
import unittest
from unittest.mock import patch
import test_access
import database


class PasswordHintTests(unittest.TestCase):
    setUpClass = classmethod(test_access.AccessTests.setUpClass.__func__)
    tearDownClass = classmethod(test_access.AccessTests.tearDownClass.__func__)
    setUp = test_access.AccessTests.setUp
    client = test_access.AccessTests.client

    def payload(self, **changes):
        return dict(firstName='Hint', lastName='User', email='hint@example.com',
                    password='a-long-test-password', acceptedTerms=True, **changes)

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
