"""Individual revocation must terminate one cookie without affecting other devices."""
from unittest.mock import patch
import test_access
import database

class ActiveSessionTests(test_access.AccessTests):
    def setUp(self):
        db=database.get_db_connection();db.execute('DELETE FROM active_login_sessions');db.commit();db.close()
        super().setUp()

    def sessions(self):
        response=self.admin.get('/api/security/sessions')
        self.assertEqual(response.status_code,200,response.json)
        return response.json['sessions']

    def test_revoking_one_device_preserves_the_other_device(self):
        first=self.app.test_client();second=self.app.test_client()
        with patch.object(self.module,'send_login_notification'):
            for device in (first,second):
                self.assertEqual(device.post('/api/login',json={'email':'user103@example.com','password':'test-password-12345'}).status_code,200)
        self.assertEqual(first.get('/api/me/session-heartbeat').status_code,200)
        self.assertEqual(second.get('/api/me/session-heartbeat').status_code,200)
        rows=[row for row in self.sessions() if row['user_id']==103]
        self.assertEqual(len(rows),2)
        response=self.admin.post(f"/api/security/sessions/{rows[0]['id']}/revoke",json={'reason':'Suspicious device activity','current_password':'test-password-12345'})
        self.assertEqual(response.status_code,200,response.json)
        self.assertEqual(sorted([first.get('/api/me/session-heartbeat').status_code,second.get('/api/me/session-heartbeat').status_code]),[200,401])
        self.assertEqual(len([row for row in self.sessions() if row['user_id']==103]),1)
        self.assertNotIn('token_hash',str(rows))
        self.assertNotIn('login_session_token',str(rows))

    def test_current_session_cannot_be_revoked_and_password_is_required(self):
        current=next(row for row in self.sessions() if row['is_current'])
        self.assertFalse(current['can_revoke'])
        self.assertEqual(self.admin.post(f"/api/security/sessions/{current['id']}/revoke",json={'reason':'Trying to revoke current session','current_password':'test-password-12345'}).status_code,403)
        self.customer.get('/api/me/session-heartbeat')
        target=next(row for row in self.sessions() if row['user_id']==103)
        url=f"/api/security/sessions/{target['id']}/revoke"
        self.assertEqual(self.admin.post(url,json={'reason':'Suspicious device activity','current_password':'wrong'}).status_code,403)
        self.assertEqual(self.admin.post(url,json={'reason':'short','current_password':'test-password-12345'}).status_code,400)
        self.assertEqual(self.admin.post(url,json={'reason':'Suspicious device activity','current_password':'test-password-12345'},headers={'Origin':'https://evil.example'}).status_code,403)

    def test_permissions_and_designated_admin_controls(self):
        self.assertEqual(self.customer.get('/api/security/sessions').status_code,403)
        self.customer.get('/api/me/session-heartbeat')
        target=next(row for row in self.sessions() if row['user_id']==103)
        analyst=self.client(102,'SOC_ADMIN')
        self.assertEqual(analyst.post(f"/api/security/sessions/{target['id']}/revoke",json={'reason':'Suspicious device activity','current_password':'test-password-12345'}).status_code,403)

    def test_logout_rejects_a_replayed_cookie(self):
        device=self.client(103,'CUSTOMER')
        device.get('/api/me/session-heartbeat')
        cookie=device.get_cookie('session').value
        self.assertEqual(device.post('/api/logout').status_code,200)
        replay=self.app.test_client();replay.set_cookie('session',cookie)
        self.assertEqual(replay.get('/api/me/session-heartbeat').status_code,401)

    def test_account_wide_revocation_excludes_all_old_sessions(self):
        self.customer.get('/api/me/session-heartbeat')
        db=database.get_db_connection();db.execute('UPDATE users SET access_version=access_version+1 WHERE id=103');db.commit();db.close()
        self.assertEqual(self.customer.get('/api/me/session-heartbeat').status_code,401)
        self.assertFalse(any(row['user_id']==103 for row in self.sessions()))

    def test_revocation_rolls_back_if_audit_insert_fails(self):
        self.customer.get('/api/me/session-heartbeat')
        row=next(row for row in self.sessions() if row['user_id']==103)
        db=database.get_db_connection()
        db.execute("CREATE TRIGGER fail_session_audit BEFORE INSERT ON security_events WHEN NEW.event_type='SESSION_REVOKED' BEGIN SELECT RAISE(ABORT,'Audit unavailable'); END")
        db.commit();db.close()
        try:
            with self.assertRaises(Exception):self.admin.post(f"/api/security/sessions/{row['id']}/revoke",json={'reason':'Suspicious device activity','current_password':'test-password-12345'})
            self.assertEqual(self.customer.get('/api/me/session-heartbeat').status_code,200)
        finally:
            db=database.get_db_connection();db.execute('DROP TRIGGER fail_session_audit');db.commit();db.close()

    def test_parallel_legacy_cookie_bootstrap_is_deduplicated(self):
        cookie=self.customer.get_cookie('session').value
        copied=self.app.test_client();copied.set_cookie('session',cookie)
        self.customer.get('/api/me/session-heartbeat')
        copied.get('/api/me/session-heartbeat')
        self.assertEqual(len([row for row in self.sessions() if row['user_id']==103]),1)

for _name in list(test_access.AccessTests.__dict__):
    if _name.startswith('test_'):setattr(ActiveSessionTests,_name,None)
