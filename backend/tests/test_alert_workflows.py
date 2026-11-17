"""Assignment is restricted to active analysts; overdue escalation is persistent and deduplicated."""
from datetime import datetime,timedelta,timezone
import test_access
import database

class AlertWorkflowTests(test_access.AccessTests):
    def setUp(self):
        db=database.get_db_connection();db.execute('DELETE FROM alert_workflows');db.commit();db.close()
        super().setUp()
        db=database.get_db_connection()
        self.alert=db.execute("INSERT INTO security_alerts(alert_type,title,description,severity,status,review_state,created_at) VALUES ('TEST','Critical test','Test evidence','CRITICAL','ACTIVE','NEW',?) RETURNING id",((datetime.now(timezone.utc)-timedelta(minutes=16)).isoformat(),)).fetchone()['id']
        db.commit();db.close()

    def test_overdue_critical_escalates_once_and_remains_overdue_after_ack(self):
        for _ in range(2):
            response=self.admin.get('/api/security/active-alerts')
            self.assertEqual(response.status_code,200,response.json)
            self.assertEqual(response.json['escalated_count'],1)
            self.assertTrue(response.json['alerts'][0]['is_overdue'])
        db=database.get_db_connection()
        self.assertEqual(db.execute("SELECT COUNT(*) AS n FROM security_events WHERE event_type='ALERT_ESCALATED'").fetchone()['n'],1)
        db.close()
        self.assertEqual(self.admin.post(f'/api/security/alerts/{self.alert}/acknowledge-escalation').status_code,200)
        alert=self.admin.get('/api/security/alerts?escalated=1').json['logs'][0]
        self.assertTrue(alert['escalation_ack_at'])
        self.assertTrue(alert['is_overdue'])
        self.admin.patch(f'/api/security/alerts/{self.alert}',json={'status':'RESOLVED'})
        self.assertEqual(self.admin.get('/api/security/active-alerts').json['escalated_count'],0)

    def test_assignment_filters_and_stale_version_protection(self):
        alert=self.admin.get('/api/security/alerts').json['logs'][0]
        response=self.admin.patch(f'/api/security/alerts/{self.alert}/assignment',json={'assigned_user_id':102,'expected_version':alert['workflow_version']})
        self.assertEqual(response.status_code,200,response.json)
        analyst=self.client(102,'SOC_ADMIN')
        mine=analyst.get('/api/security/alerts?assignment=mine').json['logs']
        self.assertEqual(len(mine),1);self.assertEqual(mine[0]['assigned_user_id'],102)
        self.assertEqual(self.admin.get('/api/security/alerts?assignment=unassigned').json['logs'],[])
        stale=self.admin.patch(f'/api/security/alerts/{self.alert}/assignment',json={'assigned_user_id':None,'expected_version':alert['workflow_version']})
        self.assertEqual(stale.status_code,409)
        self.assertEqual(self.admin.patch(f'/api/security/alerts/{self.alert}/assignment',json={'assigned_user_id':103,'expected_version':mine[0]['workflow_version']}).status_code,400)

    def test_permissions_origin_and_resolved_alerts(self):
        url=f'/api/security/alerts/{self.alert}/assignment'
        self.assertEqual(self.customer.patch(url,json={}).status_code,403)
        self.assertEqual(self.admin.patch(url,json={},headers={'Origin':'https://evil.example'}).status_code,403)
        self.admin.patch(f'/api/security/alerts/{self.alert}',json={'status':'RESOLVED'})
        self.assertEqual(self.admin.patch(url,json={'assigned_user_id':102,'expected_version':0}).status_code,409)

    def test_new_critical_and_warning_alerts_do_not_escalate(self):
        db=database.get_db_connection()
        db.execute("UPDATE security_alerts SET severity='WARNING' WHERE id=?",(self.alert,))
        db.execute("INSERT INTO security_alerts(alert_type,title,description,severity,status,review_state) VALUES ('NEW','Fresh critical','Test','CRITICAL','ACTIVE','NEW')")
        db.commit();db.close()
        response=self.admin.get('/api/security/active-alerts')
        self.assertEqual(response.json['escalated_count'],0)
        self.assertTrue(all(not row['is_overdue'] for row in response.json['alerts']))

for _name in list(test_access.AccessTests.__dict__):
    if _name.startswith('test_'):setattr(AlertWorkflowTests,_name,None)
