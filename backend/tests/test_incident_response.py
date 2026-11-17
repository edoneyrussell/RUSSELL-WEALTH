"""Incident containment integration checks against disposable account data."""
import uuid
from unittest.mock import patch
import test_access
import database


class IncidentResponseTests(test_access.AccessTests):
    # Reuse fixture helpers without rerunning the unrelated account test methods.
    def setUp(self):
        db = database.get_db_connection()
        for table in ('incident_response_actions', 'incident_notes', 'security_incidents'):
            db.execute(f'DELETE FROM {table}')
        db.commit()
        db.close()
        super().setUp()
        db = database.get_db_connection()
        self.incident = db.execute("INSERT INTO security_incidents(title,source_ip) VALUES ('Test incident','192.0.2.1') RETURNING id").fetchone()['id']
        for uid, ip, kind in [(103,'192.0.2.1','LOGIN_SUCCESS'),(103,'192.0.2.2','ACCOUNT_UPDATED'),(102,'192.0.2.9','LOGIN_SUCCESS')]:
            db.execute("INSERT INTO security_events(user_id,event_type,source_ip,severity,details,account_email) VALUES (?,?,?,'INFO','Evidence',?)",(uid,kind,ip,f'user{uid}@example.com'))
        db.commit()
        db.close()
        self.url = f'/api/security/incidents/{self.incident}'

    def payload(self, action='REVOKE_SESSIONS', **kwargs):
        return dict(action=action,account_id=103,current_password='test-password-12345',reason='Investigating suspicious activity',request_id=str(uuid.uuid4()),**kwargs)

    def read(self, sql, params=()):
        db = database.get_db_connection()
        try: return dict(db.execute(sql,params).fetchone())
        finally: db.close()

    def test_response_revokes_sessions_once_and_audits(self):
        payload=self.payload()
        response=self.admin.post(self.url+'/response',json=payload)
        self.assertEqual(response.status_code,200,response.json)
        self.assertEqual(self.customer.get('/api/customer/accounts').status_code,401)
        self.assertEqual(self.admin.post(self.url+'/response',json=payload).json['response_id'],response.json['response_id'])
        self.assertEqual(self.read('SELECT access_version FROM users WHERE id=103')['access_version'],1)
        payload['reason']='Different reason for same request'
        self.assertEqual(self.admin.post(self.url+'/response',json=payload).status_code,409)
        trail=self.admin.get(self.url+'/investigation').json['timeline']
        actions=[row for row in trail if row['kind']=='RESPONSE']
        self.assertEqual(len(actions),1)
        self.assertEqual(actions[0]['actor_email'],'user101@example.com')
        self.assertEqual(actions[0]['outcome'],'SUCCEEDED')
        self.assertNotIn('test-password',str(trail))

    def test_suspension_blocks_existing_access(self):
        response=self.admin.post(self.url+'/response',json=self.payload('SUSPEND_ACCOUNT'))
        self.assertEqual(response.status_code,200,response.json)
        self.assertEqual(self.read('SELECT account_status FROM users WHERE id=103')['account_status'],'SUSPENDED')
        self.assertEqual(self.customer.get('/api/customer/accounts').status_code,401)

    def test_permission_password_and_evidence_checks(self):
        self.assertEqual(self.customer.post(self.url+'/response',json=self.payload()).status_code,403)
        analyst=self.client(102,'SOC_ADMIN')
        self.assertEqual(analyst.post(self.url+'/response',json=self.payload()).status_code,403)
        payload=self.payload();payload['current_password']='incorrect'
        self.assertEqual(self.admin.post(self.url+'/response',json=payload).status_code,403)
        payload=self.payload();payload['account_id']=102
        self.assertEqual(self.admin.post(self.url+'/response',json=payload).status_code,400)
        self.assertEqual(self.read('SELECT access_version FROM users WHERE id=103')['access_version'],0)
        trail=self.admin.get(self.url+'/investigation').json['timeline']
        self.assertEqual(len([row for row in trail if row.get('outcome')=='FAILED']),3)

    def test_status_requires_reason_and_is_audited(self):
        self.assertEqual(self.admin.patch(self.url+'/status',json={'status':'RESOLVED'}).status_code,400)
        payload=self.payload('UPDATE_STATUS',status='RESOLVED')
        response=self.client(102,'SOC_ADMIN').patch(self.url+'/status',json=payload)
        self.assertEqual(response.status_code,200,response.json)
        row=self.read('SELECT status,resolved_at FROM security_incidents WHERE id=?',(self.incident,))
        self.assertEqual(row['status'],'RESOLVED');self.assertTrue(row['resolved_at'])

    def test_timeline_correlates_accounts_and_orders_evidence(self):
        self.admin.post(self.url+'/notes',json={'note':'Reviewed login evidence'})
        response=self.admin.get(self.url+'/investigation')
        self.assertEqual(response.status_code,200,response.json)
        self.assertEqual([a['id'] for a in response.json['accounts']],[103])
        trail=response.json['timeline']
        self.assertTrue(any(row['title']=='ACCOUNT UPDATED' for row in trail))
        self.assertTrue(any(row['kind']=='NOTE' for row in trail))
        self.assertEqual([row['created_at'] for row in trail],sorted(row['created_at'] for row in trail))
        self.assertEqual(response.headers['Cache-Control'],'private, no-store')

    def test_origin_and_input_validation(self):
        self.assertEqual(self.admin.post(self.url+'/response',json=self.payload(),headers={'Origin':'https://evil.example'}).status_code,403)
        for field,value in [('reason','short'),('request_id','invalid'),('account_id',True)]:
            payload=self.payload();payload[field]=value
            self.assertEqual(self.admin.post(self.url+'/response',json=payload).status_code,400)

    def test_owner_and_self_protection(self):
        db=database.get_db_connection()
        db.execute("INSERT INTO security_events(user_id,event_type,source_ip,severity,details) VALUES (101,'LOGIN_SUCCESS','192.0.2.1','INFO','Evidence')")
        db.commit();db.close()
        with patch('incident_response.is_owner',side_effect=lambda email: email=='user103@example.com'):
            self.assertEqual(self.admin.post(self.url+'/response',json=self.payload()).status_code,403)
        payload=self.payload();payload['account_id']=101
        self.assertEqual(self.admin.post(self.url+'/response',json=payload).status_code,403)

    def test_audit_failure_rolls_back_account_change(self):
        with patch('incident_response.record_action',side_effect=RuntimeError('audit unavailable')):
            with self.assertRaises(RuntimeError):
                self.admin.post(self.url+'/response',json=self.payload('SUSPEND_ACCOUNT'))
        account=self.read('SELECT account_status,access_version FROM users WHERE id=103')
        self.assertEqual(account,{'account_status':'ACTIVE','access_version':0})

    def test_map_includes_logins_without_inventing_local_locations(self):
        db=database.get_db_connection()
        db.execute("INSERT INTO security_events(user_id,event_type,source_ip,severity,details) VALUES (103,'LOGIN_SUCCESS','127.0.0.1','INFO','Local login')")
        db.commit();db.close()
        response=self.admin.get('/api/security/activity-map')
        self.assertEqual(response.status_code,200,response.json)
        events=response.json['events']
        local=next(row for row in events if row['source_ip']=='127.0.0.1')
        self.assertEqual((local['latitude'],local['longitude']),(None,None))
        self.assertEqual(local['location_basis'],'UNAVAILABLE')
        self.assertEqual(local['location'],'Location unavailable')
        self.assertEqual(local['email'],'user103@example.com')
        self.assertTrue(all(row['event_type'].startswith('LOGIN_') for row in events))
        self.assertTrue(any(row['latitude'] is None for row in events))
        self.assertEqual(self.customer.get('/api/security/activity-map').status_code,403)

    def test_map_uses_geolocation_for_public_addresses(self):
        db=database.get_db_connection()
        db.execute("INSERT INTO security_events(user_id,event_type,source_ip,severity,details) VALUES (103,'LOGIN_SUCCESS','8.8.8.8','INFO','Public login')")
        db.commit();db.close()
        with patch.object(self.module,'security_map_location',return_value=dict(latitude=51.5,longitude=-0.1,city='London',country='United Kingdom')):
            response=self.admin.get('/api/security/activity-map')
        public=next(row for row in response.json['events'] if row['source_ip']=='8.8.8.8')
        self.assertEqual(public['latitude'],51.5)
        self.assertEqual(public['location_basis'],'IP_APPROXIMATE')

    def test_incident_list_detail_and_investigation_load(self):
        response=self.admin.get('/api/security/incidents')
        self.assertEqual(response.status_code,200,response.json)
        self.assertEqual(response.json['incidents'][0]['id'],self.incident)
        self.assertEqual(self.admin.get(self.url).status_code,200)
        self.assertEqual(self.admin.get(self.url+'/investigation').status_code,200)

    def test_overview_counts_all_events_beyond_recent_list(self):
        db=database.get_db_connection()
        for _ in range(70):
            db.execute("INSERT INTO security_events(user_id,event_type,source_ip,severity,details) VALUES (103,'LOGIN_SUCCESS','127.0.0.1','INFO','Login evidence')")
        db.commit();db.close()
        response=self.admin.get('/api/security/overview')
        self.assertEqual(response.status_code,200,response.json)
        self.assertEqual(len(response.json['recent_events']),50)
        self.assertEqual(sum(bucket['successful'] for bucket in response.json['threat_trends']),72)
        self.assertTrue(all(row['location']=='Location unavailable' for row in response.json['recent_events']))

# Inherited test methods are covered by test_access.py itself.
for _name in list(test_access.AccessTests.__dict__):
    if _name.startswith('test_'):
        setattr(IncidentResponseTests,_name,None)
