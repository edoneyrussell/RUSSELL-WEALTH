"""Password reset integration checks use disposable accounts and mock email delivery."""
import os
import re
import unittest
from html import unescape
from urllib.parse import urlsplit, parse_qs
from unittest.mock import patch
import test_access
import database


class PasswordResetTests(unittest.TestCase):
    setUpClass = classmethod(test_access.AccessTests.setUpClass.__func__)
    tearDownClass = classmethod(test_access.AccessTests.tearDownClass.__func__)
    client = test_access.AccessTests.client

    def setUp(self):
        test_access.AccessTests.setUp(self)
        import password_reset_api
        password_reset_api.setup()
        db = database.get_db_connection()
        db.execute('DELETE FROM password_reset_codes')
        db.execute('DELETE FROM password_reset_limits')
        db.commit()
        db.close()
        self.env = patch.dict(os.environ, {'RW_RESEND_API_KEY':'mock-only', 'RW_PUBLIC_APP_URL':'https://app.example.com'})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.mail = patch('password_reset_api.resend.Emails.send', return_value={'id':'mock-mail'})
        self.send = self.mail.start()
        self.addCleanup(self.mail.stop)
        self.notifications = patch.object(self.module, 'send_login_notification')
        self.notifications.start()
        self.addCleanup(self.notifications.stop)

    def request_link(self, email='user103@example.com'):
        client = self.app.test_client()
        response = client.post('/api/password-reset/request', json={'email':email})
        self.assertEqual(response.status_code, 200)
        message = self.send.call_args.args[0]
        link = unescape(re.search(r"href='([^']+)'", message['html']).group(1))
        parts = urlsplit(link)
        self.assertEqual(parts.netloc, 'app.example.com')
        self.assertEqual(parts.path, '/reset-password')
        self.assertEqual(parts.query, '')
        token = parse_qs(parts.fragment)['token'][0]
        self.assertNotIn(token, response.get_data(as_text=True))
        db = database.get_db_connection()
        stored = db.execute('SELECT code_hash FROM password_reset_codes WHERE email=?', (email.strip().lower(),)).fetchone()['code_hash']
        db.close()
        self.assertNotEqual(stored, token)
        return token

    def test_link_changes_password_revokes_sessions_and_cannot_be_reused(self):
        self.assertEqual(self.customer.get('/api/me').status_code, 200)
        token = self.request_link(' USER103@EXAMPLE.COM ')
        payload = {'email':'user103@example.com','token':token,'password':'updated-password-12345'}
        client = self.app.test_client()
        self.assertEqual(client.post('/api/password-reset/confirm', json=payload).status_code, 200)
        self.assertEqual(client.post('/api/password-reset/confirm', json=payload).status_code, 400)
        self.assertEqual(self.customer.get('/api/me').status_code, 401)
        self.assertEqual(client.post('/api/login', json={'email':payload['email'],'password':'test-password-12345'}).status_code, 401)
        self.assertEqual(client.post('/api/login', json={'email':payload['email'],'password':payload['password']}).status_code, 200)
        db = database.get_db_connection()
        self.assertEqual(db.execute('SELECT access_version FROM users WHERE id=103').fetchone()['access_version'], 1)
        self.assertEqual(db.execute("SELECT COUNT(*) AS n FROM security_events WHERE event_type='PASSWORD_RESET'").fetchone()['n'], 1)
        db.close()

    def test_expired_wrong_account_and_invalid_tokens_cannot_reset_password(self):
        token = self.request_link()
        client = self.app.test_client()
        payload = {'email':'user102@example.com','token':token,'password':'updated-password-12345'}
        self.assertEqual(client.post('/api/password-reset/confirm', json=payload).status_code, 400)
        payload['email'] = 'user103@example.com'
        payload['token'] = 'wrong'
        self.assertEqual(client.post('/api/password-reset/confirm', json=payload).status_code, 400)
        payload['token'] = token
        db = database.get_db_connection()
        db.execute('UPDATE password_reset_codes SET expires_at=0')
        db.commit()
        db.close()
        self.assertEqual(client.post('/api/password-reset/confirm', json=payload).status_code, 400)

    def test_invalid_attempts_and_rate_limits_are_enforced(self):
        token = self.request_link()
        client = self.app.test_client()
        payload = {'email':'user103@example.com','token':'x'*43,'password':'updated-password-12345'}
        for _ in range(5):
            self.assertEqual(client.post('/api/password-reset/confirm', json=payload).status_code, 400)
        payload['token'] = token
        self.assertEqual(client.post('/api/password-reset/confirm', json=payload).status_code, 429)
        # Requests within the cooldown never send another message.
        for _ in range(21):
            self.assertEqual(client.post('/api/password-reset/request', json={'email':'user103@example.com'}).status_code, 200)
        self.assertEqual(self.send.call_count, 1)

    def test_unknown_email_is_generic_and_delivery_failure_creates_no_valid_link(self):
        client = self.app.test_client()
        unknown = client.post('/api/password-reset/request', json={'email':'unknown@example.com'})
        self.send.assert_not_called()
        self.send.side_effect = RuntimeError('mock delivery outage')
        with patch('password_reset_api.logger.exception'):
            existing = client.post('/api/password-reset/request', json={'email':'user103@example.com'})
        self.assertEqual(unknown.json, existing.json)
        db = database.get_db_connection()
        self.assertIsNone(db.execute('SELECT * FROM password_reset_codes').fetchone())
        db.close()

    def test_resending_invalidates_old_link_and_password_validation_preserves_link(self):
        old = self.request_link()
        db = database.get_db_connection()
        db.execute('UPDATE password_reset_codes SET sent_at=0')
        db.commit()
        db.close()
        new = self.request_link()
        self.assertNotEqual(old, new)
        client = self.app.test_client()
        payload = {'email':'user103@example.com','token':old,'password':'updated-password-12345'}
        self.assertEqual(client.post('/api/password-reset/confirm', json=payload).status_code, 400)
        payload.update(token=new, password='short')
        self.assertEqual(client.post('/api/password-reset/confirm', json=payload).status_code, 400)
        payload['password'] = 'updated-password-12345'
        self.assertEqual(client.post('/api/password-reset/confirm', json=payload).status_code, 200)
        for endpoint in ('request','confirm'):
            self.assertEqual(client.post('/api/password-reset/'+endpoint,json=[]).status_code, 400)
