"""Device location is consent based, fresh, and bound to the authenticated login."""
from datetime import datetime,timezone,timedelta
from unittest.mock import patch
import test_access
import database

class LoginLocationTests(test_access.AccessTests):
    def setUp(self):
        db=database.get_db_connection()
        db.execute('DELETE FROM security_event_locations')
        db.commit();db.close()
        super().setUp()

    def sign_in(self):
        with patch.object(self.module,'send_login_notification'):
            response=self.customer.post('/api/login',json={'email':'user103@example.com','password':'test-password-12345'})
        self.assertEqual(response.status_code,200,response.json)
        return self.customer

    def device(self):
        return dict(status='GRANTED',latitude=51.5074,longitude=-0.1278,accuracy_m=25,
                    captured_at=datetime.now(timezone.utc).isoformat())

    def test_device_capture_updates_the_login_in_all_soc_views(self):
        customer=self.sign_in()
        self.assertTrue(customer.get('/api/me/sign-in-location').json['pending'])
        response=customer.post('/api/me/sign-in-location',json=self.device())
        self.assertEqual(response.status_code,200,response.json)
        self.assertFalse(customer.get('/api/me/sign-in-location').json['pending'])
        for url,key in [('/api/security/activity-map','events'),('/api/security/overview','recent_events'),('/api/security/logs','logs')]:
            response=self.admin.get(url)
            self.assertEqual(response.status_code,200,response.json)
            event=response.json[key][0]
            self.assertEqual(event['location_basis'],'BROWSER_REPORTED')
            self.assertEqual(event['latitude'],51.5074)
            self.assertEqual(event['accuracy_m'],25)
            self.assertEqual(event['location_permission'],'GRANTED')

    def test_deny_skip_and_unavailable_never_invent_device_locations(self):
        for status in ('DENIED','UNAVAILABLE','SKIPPED'):
            customer=self.sign_in()
            self.assertEqual(customer.post('/api/me/sign-in-location',json={'status':status}).status_code,200)
            event=self.admin.get('/api/security/activity-map').json['events'][0]
            self.assertEqual(event['location_permission'],status)
            self.assertIsNone(event['latitude'])
            self.assertEqual(event['location'],'Location unavailable')

    def test_capture_cannot_change_another_login_or_be_reused(self):
        customer=self.sign_in()
        self.assertFalse(self.admin.get('/api/me/sign-in-location').json['pending'])
        self.assertEqual(self.admin.post('/api/me/sign-in-location',json=self.device()).status_code,409)
        self.assertEqual(customer.post('/api/me/sign-in-location',json=self.device()).status_code,200)
        self.assertEqual(customer.post('/api/me/sign-in-location',json=self.device()).status_code,409)
        self.sign_in()
        events=self.admin.get('/api/security/activity-map').json['events']
        self.assertNotEqual(events[0]['location_basis'],'BROWSER_REPORTED')
        self.assertEqual(events[1]['location_basis'],'BROWSER_REPORTED')

    def test_validation_origin_and_authentication(self):
        self.assertEqual(self.app.test_client().get('/api/me/sign-in-location').status_code,401)
        customer=self.sign_in()
        self.assertEqual(customer.post('/api/me/sign-in-location',json=self.device(),headers={'Origin':'https://evil.example'}).status_code,403)
        for field,value in [('latitude',999),('longitude',True),('accuracy_m',-1),('captured_at','2020-01-01T00:00:00Z')]:
            payload=self.device();payload[field]=value
            self.assertEqual(customer.post('/api/me/sign-in-location',json=payload).status_code,400)
        self.assertTrue(customer.get('/api/me/sign-in-location').json['pending'])

    def test_old_sign_in_cannot_receive_a_new_location(self):
        customer=self.sign_in()
        db=database.get_db_connection()
        db.execute("UPDATE security_events SET created_at=?",((datetime.now(timezone.utc)-timedelta(hours=1)).isoformat(),))
        db.commit();db.close()
        self.assertFalse(customer.get('/api/me/sign-in-location').json['pending'])
        self.assertEqual(customer.post('/api/me/sign-in-location',json=self.device()).status_code,409)

    def test_existing_session_can_share_a_fresh_location_without_rewriting_old_logins(self):
        self.assertFalse(self.customer.get('/api/me/sign-in-location').json['pending'])
        response=self.customer.post('/api/me/sign-in-location/request')
        self.assertEqual(response.status_code,200,response.json)
        self.assertTrue(self.customer.get('/api/me/sign-in-location').json['pending'])
        # Retrying the open request does not create duplicate events.
        self.customer.post('/api/me/sign-in-location/request')
        db=database.get_db_connection()
        self.assertEqual(db.execute("SELECT COUNT(*) AS n FROM security_events WHERE event_type='SESSION_LOCATION_REQUESTED'").fetchone()['n'],1)
        db.close()
        self.assertEqual(self.customer.post('/api/me/sign-in-location',json=self.device()).status_code,200)
        events=self.admin.get('/api/security/activity-map').json['events']
        self.assertEqual(len(events),1)
        self.assertEqual(events[0]['event_type'],'SESSION_LOCATION_SHARED')
        self.assertEqual(events[0]['latitude'],51.5074)
        self.assertEqual(events[0]['location_basis'],'BROWSER_REPORTED')

    def test_location_retry_requires_an_authenticated_same_origin_request(self):
        self.assertEqual(self.app.test_client().post('/api/me/sign-in-location/request').status_code,401)
        self.assertEqual(self.customer.post('/api/me/sign-in-location/request',headers={'Origin':'https://evil.example'}).status_code,403)

for _name in list(test_access.AccessTests.__dict__):
    if _name.startswith('test_'):
        setattr(LoginLocationTests,_name,None)
