"""Real-time alerts must reflect detections and their actual review lifecycle."""
import unittest
import test_access
import database


class LiveAlertTests(unittest.TestCase):
    setUpClass=classmethod(test_access.AccessTests.setUpClass.__func__)
    tearDownClass=classmethod(test_access.AccessTests.tearDownClass.__func__)
    setUp=test_access.AccessTests.setUp
    client=test_access.AccessTests.client

    def test_individual_failed_sign_ins_are_logs_and_threshold_emits_real_alert(self):
        from security import log_security_event
        log_security_event(103,'LOGIN_FAILED','198.51.100.10','WARNING','Incorrect password')
        self.assertEqual(self.admin.get('/api/security/active-alerts').json['count'],0)
        for _ in range(4):log_security_event(103,'LOGIN_FAILED','198.51.100.10','WARNING','Incorrect password')
        result=self.admin.get('/api/security/active-alerts').json
        self.assertEqual(result['count'],1)
        alert=result['alerts'][0]
        self.assertEqual(alert['event_type'],'REPEATED_ACCOUNT_FAILURES')
        self.assertEqual(alert['title'],'Repeated failed sign-ins')
        self.assertEqual(alert['severity'],'WARNING')
        self.assertEqual(alert['status'],'NEW')
        self.assertEqual(len(alert['evidence']),5)
        self.assertTrue(alert['created_at'].endswith('Z'))
        aid=alert['id']
        response=self.admin.patch(f'/api/security/alerts/{aid}',json={'status':'UNDER_REVIEW'})
        self.assertEqual(response.status_code,200)
        self.assertEqual(self.admin.get('/api/security/active-alerts').json['alerts'][0]['status'],'UNDER_REVIEW')
        self.assertEqual(self.admin.patch(f'/api/security/alerts/{aid}',json={'status':'RESOLVED'}).status_code,200)
        empty=self.admin.get('/api/security/active-alerts').json
        self.assertEqual(empty['count'],0)
        self.assertEqual(empty['alerts'],[])
        history=self.admin.get('/api/security/alerts?status=RESOLVED').json
        self.assertEqual(history['pagination']['total'],1)
        self.assertEqual(history['logs'][0]['status'],'RESOLVED')
        self.assertTrue(history['logs'][0]['dismissed_at'].endswith('Z'))

    def test_counts_exceed_row_limit_and_server_filters_real_severity(self):
        db=database.get_db_connection()
        for index in range(107):
            db.execute('INSERT INTO security_alerts(alert_type,title,description,severity) VALUES(?,?,?,?)',('FIXTURE',f'Fixture alert {index}','Recorded fixture evidence','WARNING' if index<105 else 'CRITICAL'))
        db.commit();db.close()
        result=self.admin.get('/api/security/active-alerts')
        self.assertEqual(result.json['count'],107)
        self.assertEqual(len(result.json['alerts']),100)
        self.assertIn('no-store',result.headers['Cache-Control'])
        result=self.admin.get('/api/security/active-alerts?severity=WARNING').json
        self.assertEqual(result['count'],107)
        self.assertEqual(result['filtered_count'],105)
        self.assertEqual({row['severity'] for row in result['alerts']},{'WARNING'})
        result=self.admin.get('/api/security/active-alerts?severity=CRITICAL').json
        self.assertEqual(result['count'],107)
        self.assertEqual(result['filtered_count'],2)
        self.assertEqual(len(result['alerts']),2)
        self.assertEqual(self.admin.get('/api/security/active-alerts?severity=BOGUS').status_code,400)
        page=self.admin.get('/api/security/alerts?status=ACTIVE&per_page=25').json
        self.assertEqual(page['pagination']['total'],107)
        self.assertEqual(len(page['logs']),25)
        self.assertEqual(self.admin.post('/api/security/clear-alerts').json['cleared'],107)
        self.assertEqual(self.admin.get('/api/security/active-alerts').json['count'],0)

    def test_alert_feed_remains_soc_only(self):
        self.assertEqual(self.app.test_client().get('/api/security/active-alerts').status_code,401)
        self.assertEqual(self.customer.get('/api/security/active-alerts').status_code,403)
