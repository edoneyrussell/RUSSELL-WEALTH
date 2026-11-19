"""Default account provisioning and SOC email coverage; no real messages or accounts."""
import unittest
from unittest.mock import patch
import test_access
import database

class LoginMailAndDefaultsTests(unittest.TestCase):
    setUpClass=classmethod(test_access.AccessTests.setUpClass.__func__)
    tearDownClass=classmethod(test_access.AccessTests.tearDownClass.__func__)
    client=test_access.AccessTests.client
    setUp=test_access.AccessTests.setUp

    def test_every_customer_and_admin_login_notifies_soc(self):
        for uid in (101,103):
            with patch.object(self.module,'send_login_notification') as mail:
                result=self.app.test_client().post('/api/login',json={'email':f'user{uid}@example.com','password':'test-password-12345'})
                self.assertEqual(result.status_code,200)
                mail.assert_called_once_with(f'user{uid}@example.com','127.0.0.1')
        with patch.object(self.module,'send_login_notification') as mail:
            result=self.app.test_client().post('/login',data={'email':'user103@example.com','password':'test-password-12345'})
            self.assertEqual(result.status_code,302)
            mail.assert_called_once_with('user103@example.com','127.0.0.1')

    def test_registration_notifies_and_provisions_two_empty_accounts_idempotently(self):
        visitor=self.app.test_client()
        with patch('login_notifications.send_login_notification') as mail:
            result=visitor.post('/api/register/start',json={'firstName':'New','lastName':'Customer','email':'new-defaults@example.com','password':'a-long-default-password','acceptedTerms':True})
            self.assertEqual(result.status_code,201,result.json)
            mail.assert_called_once_with('new-defaults@example.com','127.0.0.1')
        db=database.get_db_connection()
        uid=db.execute("SELECT id FROM users WHERE email='new-defaults@example.com'").fetchone()['id']
        from registration_api import _ensure_investment_account
        _ensure_investment_account(db,'new-defaults@example.com')
        db.commit()
        rows=[dict(row) for row in db.execute('SELECT user_id,account_type,management_mode,status,cash_balance_cents FROM investment_accounts WHERE user_id=? ORDER BY id',(uid,)).fetchall()]
        db.close()
        self.assertEqual([row['account_type'] for row in rows],['PERSONAL','TFSA'])
        self.assertTrue(all(row['user_id']==uid and row['cash_balance_cents']==0 and row['status']=='OPEN' and row['management_mode']=='SELF_DIRECTED' for row in rows))
        response=visitor.get('/api/customer/accounts')
        self.assertEqual(response.status_code,200,response.json)
        self.assertEqual(len(response.json['accounts']),2)

    def test_failed_signin_does_not_notify_and_delivery_failure_does_not_block_login(self):
        with patch.object(self.module,'send_login_notification') as mail:
            self.assertEqual(self.app.test_client().post('/api/login',json={'email':'user103@example.com','password':'wrong'}).status_code,401)
            mail.assert_not_called()
        with patch.object(self.module,'send_login_notification',side_effect=RuntimeError('Simulated provider outage')):
            with self.assertLogs(self.app.logger,level='ERROR'):
                self.assertEqual(self.app.test_client().post('/api/login',json={'email':'user103@example.com','password':'test-password-12345'}).status_code,200)

    def test_notification_recipient_is_soc_inbox_for_other_customers(self):
        from login_notifications import send_login_notification
        import os
        with patch.dict(os.environ,{'RW_RESEND_API_KEY':'test-only-key','RW_ALERT_EMAIL':'soc@example.com'}), patch('login_notifications.approximate_location',return_value='Example location'), patch('resend.Emails.send',return_value={'id':'test-message'}) as provider:
            send_login_notification('another-customer@example.com','192.0.2.10')
            payload=provider.call_args.args[0]
            self.assertEqual(payload['to'],['soc@example.com'])
            self.assertIn('another-customer@example.com',payload['html'])
            self.assertNotIn('test-only-key',payload['html'])
