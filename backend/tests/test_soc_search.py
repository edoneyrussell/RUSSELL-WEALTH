"""SOC autocomplete authorization, matching and destination filtering."""
import unittest
from urllib.parse import urlsplit, parse_qs
from unittest.mock import patch
import test_access
import database


class SocSearchTests(unittest.TestCase):
    setUpClass = classmethod(test_access.AccessTests.setUpClass.__func__)
    tearDownClass = classmethod(test_access.AccessTests.tearDownClass.__func__)
    client = test_access.AccessTests.client

    def setUp(self):
        test_access.AccessTests.setUp(self)
        db = database.get_db_connection()
        db.execute("DELETE FROM incident_notes")
        db.execute("DELETE FROM security_incidents")
        db.execute("UPDATE users SET name='Edoney Russell',email='edo@example.com' WHERE id=103")
        self.event_id = db.execute("INSERT INTO security_events(user_id,event_type,source_ip,severity,details,account_email) VALUES(103,'LOGIN_FAILED','198.51.100.42','WARNING','Sign-in rejected','edo@example.com') RETURNING id").fetchone()['id']
        db.execute("INSERT INTO security_events(user_id,event_type,source_ip,severity,details) VALUES(102,'LOGIN_SUCCESS','203.0.113.9','INFO','Unrelated event')")
        self.alert_id = db.execute("INSERT INTO security_alerts(event_id,alert_type,title,description,severity,source_ip,account_email) VALUES(?,'REPEATED_ACCOUNT_FAILURES','Repeated sign-ins','Investigate this account','WARNING','198.51.100.42','edo@example.com') RETURNING id",(self.event_id,)).fetchone()['id']
        self.incident_id = db.execute("INSERT INTO security_incidents(title,description,severity,status,source_ip) VALUES('Account investigation','Review sign-ins','WARNING','OPEN','198.51.100.42') RETURNING id").fetchone()['id']
        db.execute('INSERT INTO incident_notes(incident_id,analyst_id,note) VALUES(?,101,?)',(self.incident_id,'Unique investigation memo'))
        db.commit(); db.close()

    def search(self, term):
        return self.admin.get('/api/security/search',query_string={'q':term})

    def test_only_soc_can_search_and_response_contains_no_credentials(self):
        self.assertEqual(self.app.test_client().get('/api/security/search?q=edo').status_code,401)
        self.assertEqual(self.customer.get('/api/security/search?q=edo').status_code,403)
        response=self.search('edo')
        self.assertEqual(response.status_code,200,response.json)
        self.assertIn('no-store',response.headers['Cache-Control'])
        for secret in ['password_hash','password_hint','profile_photo',self.password_hash]:
            self.assertNotIn(secret,response.get_data(as_text=True))

    def test_partial_name_finds_all_related_locations_and_deep_links(self):
        response=self.search('EdO')
        self.assertEqual(response.status_code,200,response.json)
        results=response.json['results']
        self.assertEqual({x['kind'] for x in results},{'Account','Log','IP address','Alert','Incident'})
        user=next(x for x in results if x['kind']=='Account')
        self.assertEqual(user['title'],'Edoney Russell')
        self.assertEqual(parse_qs(urlsplit(user['href']).query)['account'],['local:103'])
        alert=next(x for x in results if x['kind']=='Alert')
        self.assertEqual(parse_qs(urlsplit(alert['href']).query)['alert'],[str(self.alert_id)])
        incident=next(x for x in results if x['kind']=='Incident')
        self.assertEqual(parse_qs(urlsplit(incident['href']).query)['incident'],[str(self.incident_id)])
        for query in ['EdO','198.51.100.4']:
            logs=self.admin.get('/api/security/logs',query_string={'search':query}).json['logs']
            self.assertEqual([x['id'] for x in logs],[self.event_id])
        filtered=self.admin.get('/api/security/alerts',query_string={'alert':self.alert_id})
        self.assertEqual([x['id'] for x in filtered.json['logs']],[self.alert_id])
        self.assertEqual(len(self.admin.get('/api/security/alerts?search=EdO').json['logs']),1)

    def test_ip_prefix_and_incident_notes_are_searchable(self):
        results=self.search('198.51').json['results']
        self.assertIn('198.51.100.42',[x['title'] for x in results if x['kind']=='IP address'])
        self.assertNotIn('203.0.113.9',[x['title'] for x in results])
        self.assertEqual([x['kind'] for x in self.search('Unique investigation memo').json['results']],['Incident'])

    def test_wildcards_and_sql_are_literal_and_results_are_bounded(self):
        self.assertEqual(self.search('%').json['results'],[])
        self.assertEqual(self.search("' OR 1=1 --").json['results'],[])
        self.assertEqual(self.search('   ').json['results'],[])
        self.assertLessEqual(len(self.search('e').json['results']),40)
        self.assertEqual(self.search('not-present-anywhere').json['results'],[])

    def test_source_failures_are_explicit_without_exposing_exception(self):
        import security_search_api
        original=security_search_api.search_source
        def search(source,primary,term):
            if source=='live':raise ConnectionError('internal-only-connection-string')
            return original(source,primary,term)
        with patch('security_search_api.directory_sources',return_value=('local',['local','live'])),patch('security_search_api.search_source',side_effect=search),patch.object(self.app.logger,'exception'):
            response=self.search('edo')
            self.assertEqual(response.status_code,200)
            self.assertEqual(response.json['unavailable_sources'],['live'])
            self.assertTrue(response.json['results'])
            self.assertNotIn('internal-only',response.get_data(as_text=True))
        with patch('security_search_api.search_source',side_effect=ConnectionError()),patch.object(self.app.logger,'exception'):
            self.assertEqual(self.search('edo').status_code,503)
