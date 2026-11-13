import unittest
from unittest.mock import patch
import test_access
import database


class SecurityLogsTests(unittest.TestCase):
    setUpClass = classmethod(test_access.AccessTests.setUpClass.__func__)
    tearDownClass = classmethod(test_access.AccessTests.tearDownClass.__func__)
    setUp = test_access.AccessTests.setUp
    client = test_access.AccessTests.client

    def test_logs_include_both_sources_sorted_and_paginated_without_id_collisions(self):
        from security_logs_api import read_log_source
        from security import log_security_event
        log_security_event(103, 'LOGIN_SUCCESS', '192.0.2.5', 'INFO', 'Successful login for user103@example.com')
        db = database.get_db_connection()
        db.execute("UPDATE security_events SET created_at='2026-11-13 02:00:00'")
        event_id = db.execute('SELECT id FROM security_events').fetchone()[0]
        db.commit()
        db.close()
        remote = dict(id=event_id, user_id=103, email='dad@example.com', event_type='LOGIN_SUCCESS',
                      source_ip='198.51.100.9', severity='INFO', details='Successful login for dad@example.com',
                      created_at='2026-11-13T01:00:00Z', source='live', source_label='Live website', event_key=f'live:{event_id}')
        def read(source, primary, event_type, severity, search, limit):
            if source == 'live':
                return ([remote] if not search or search in remote['email'] else []), (1 if not search or search in remote['email'] else 0)
            return read_log_source(source, primary, event_type, severity, search, limit)
        with patch('security_logs_api.directory_sources', return_value=('local', ['local', 'live'])), patch('security_logs_api.read_log_source', side_effect=read):
            response = self.admin.get('/api/security/logs?per_page=1')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json['pagination']['total'], 2)
            self.assertEqual(response.json['logs'][0]['source'], 'local')
            second = self.admin.get('/api/security/logs?page=2&per_page=1').json['logs'][0]
            self.assertEqual(second['email'], 'dad@example.com')
            self.assertEqual(second['source_ip'], '198.51.100.9')
            self.assertNotEqual(second['event_key'], response.json['logs'][0]['event_key'])
            result = self.admin.get('/api/security/logs?search=dad@example.com').json
            self.assertEqual(result['pagination']['total'], 1)
            self.assertEqual(result['logs'][0]['source'], 'live')

    def test_email_snapshot_survives_email_change_and_deletion_and_legacy_email_is_recovered(self):
        from security import log_security_event
        log_security_event(103, 'LOGIN_SUCCESS', '192.0.2.3', 'INFO', 'Successful login')
        db = database.get_db_connection()
        db.execute("UPDATE users SET email='changed@example.com' WHERE id=103")
        db.execute('UPDATE security_events SET user_id=NULL')
        db.execute("INSERT INTO security_events (event_type, source_ip, severity, details) VALUES ('LOGIN_FAILED', '192.0.2.4', 'WARNING', 'Failed login attempt for old@example.com')")
        db.commit()
        db.close()
        logs = self.admin.get('/api/security/logs').json['logs']
        self.assertEqual({event['email'] for event in logs}, {'user103@example.com', 'old@example.com'})
        self.assertEqual(len(self.admin.get('/api/security/logs?event_type=LOGIN_SUCCESS&search=user103@example.com').json['logs']), 1)
        self.assertEqual(len(self.admin.get('/api/security/logs?severity=WARNING').json['logs']), 1)
        self.assertEqual(self.admin.get('/api/security/logs?search=%25').json['pagination']['total'], 0)

    def test_registration_autologin_and_unknown_login_capture_email(self):
        client = self.app.test_client()
        response = client.post('/api/register/start', json=dict(firstName='New', lastName='Account', email='new@example.com', password='new-password-12345', acceptedTerms=True))
        self.assertEqual(response.status_code, 201)
        response = self.app.test_client().post('/api/login', json=dict(email='unknown@example.com', password='wrong'))
        self.assertEqual(response.status_code, 401)
        events = self.admin.get('/api/security/logs').json['logs']
        self.assertEqual({event['email'] for event in events}, {'new@example.com', 'unknown@example.com'})
        self.assertTrue(all(event['source_ip'] for event in events))

    def test_proxy_ip_is_only_accepted_with_explicit_proxy_configuration(self):
        from werkzeug.middleware.proxy_fix import ProxyFix
        client = self.app.test_client()
        payload = dict(email='unknown@example.com', password='wrong')
        client.post('/api/login', json=payload, headers={'X-Forwarded-For': '198.51.100.77'})
        with patch.object(self.app, 'wsgi_app', ProxyFix(self.app.wsgi_app, x_for=1, x_proto=0, x_host=0, x_port=0, x_prefix=0)):
            client.post('/api/login', json=payload, headers={'X-Forwarded-For': '198.51.100.77'})
        events = self.admin.get('/api/security/logs').json['logs']
        self.assertEqual({event['source_ip'] for event in events}, {'127.0.0.1', '198.51.100.77'})

    def test_partial_outage_is_visible_and_permissions_are_enforced(self):
        from security_logs_api import read_log_source
        def read(source, primary, *args):
            if source == 'live':
                raise ConnectionError('Unavailable')
            return read_log_source(source, primary, *args)
        with patch('security_logs_api.directory_sources', return_value=('local', ['local', 'live'])), patch('security_logs_api.read_log_source', side_effect=read), patch.object(self.app.logger, 'exception'):
            response = self.admin.get('/api/security/logs')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['sources'][1]['status'], 'unavailable')
        self.assertEqual(self.customer.get('/api/security/logs').status_code, 403)
        self.assertEqual(self.app.test_client().get('/api/security/logs').status_code, 401)
        self.assertEqual(self.admin.get('/api/security/logs?page=bad').status_code, 400)
