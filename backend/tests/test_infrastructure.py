"""Infrastructure probes use configured production targets and report real failures."""
import os
import json
from datetime import datetime,timezone,timedelta
from urllib.error import HTTPError
from unittest.mock import MagicMock,patch
import test_access
import database
from infrastructure_history import observed_history

class InfrastructureTests(test_access.AccessTests):
    def get(self, side_effect=None, **environment):
        response=MagicMock()
        response.__enter__.return_value.status=200
        with patch.dict(os.environ,{'RW_RENDER_HEALTH_URL':'','RW_VERCEL_URL':'','RENDER_EXTERNAL_URL':'','RW_PUBLIC_APP_URL':'',**environment}), patch('urllib.request.urlopen',return_value=response,side_effect=side_effect) as probe:
            result=self.admin.get('/api/security/infrastructure')
            urls=sorted(call.args[0].full_url for call in probe.call_args_list if not call.args[0].full_url.endswith(('/api/deployment','/deployment.json')))
        return result,urls

    def test_defaults_probe_the_actual_deployments(self):
        response,urls=self.get()
        self.assertEqual(response.status_code,200,response.json)
        self.assertEqual(urls,['https://russell-wealth-api.onrender.com/','https://russell-wealth.vercel.app/'])
        services={row['name']:row for row in response.json['services']}
        self.assertEqual(services['Render']['status'],'online')
        self.assertEqual(services['Vercel']['status'],'online')
        self.assertEqual(response.headers['Cache-Control'],'private, no-store')

    def test_deployment_context_keeps_local_checkout_separate_and_redacts_urls(self):
        from infrastructure_history import current_application
        with patch.dict(os.environ, {'RENDER':'', 'RENDER_GIT_COMMIT':'', 'RW_DEPLOY_COMMIT':''}), patch('subprocess.check_output', side_effect=['local-commit', 'feature/local', ' M backend/app.py']):
            context = current_application()
        self.assertEqual(context['environment'], 'local')
        self.assertEqual(context['commit'], 'local-commit')
        self.assertTrue(context['uncommitted_changes'])
        response,_ = self.get(RW_VERCEL_URL='https://username:password@frontend.example/path?token=secret')
        services = {row['name']:row for row in response.json['services']}
        self.assertEqual(services['Vercel']['endpoint'], 'https://frontend.example')
        self.assertNotIn('password', json.dumps(response.json))
        self.assertNotIn('token=secret', json.dumps(response.json))

    def test_explicit_targets_override_public_app_defaults(self):
        _,urls=self.get(RW_RENDER_HEALTH_URL='https://backend.example/health',RW_VERCEL_URL='https://frontend.example/',RW_PUBLIC_APP_URL='https://other.example/')
        self.assertEqual(urls,['https://backend.example/health','https://frontend.example/'])

    def test_unreachable_or_error_services_are_not_reported_online(self):
        def probe(request,**kwargs):
            if 'onrender.com' in request.full_url:
                raise TimeoutError('timeout')
            raise HTTPError(request.full_url,503,'unavailable',None,None)
        response,_=self.get(side_effect=probe)
        services={row['name']:row for row in response.json['services']}
        self.assertEqual(services['Render']['status'],'offline')
        self.assertEqual(services['Vercel']['status'],'degraded')
        self.assertEqual(services['Vercel']['http_status'],503)

    def test_bad_targets_and_access_controls(self):
        response,urls=self.get(RW_RENDER_HEALTH_URL='http://backend.example',RW_VERCEL_URL='not a URL')
        self.assertEqual(urls,[])
        self.assertTrue(all(row['status']=='unconfigured' for row in response.json['services'] if row['name']!='Neon'))
        self.assertEqual(self.customer.get('/api/security/infrastructure').status_code,403)
        self.assertEqual(self.app.test_client().get('/api/security/infrastructure').status_code,401)

    def test_history_persists_checks_and_does_not_fill_gaps_with_success(self):
        db=database.get_db_connection()
        db.execute('DELETE FROM infrastructure_checks');db.commit();db.close()
        now=datetime(2026,11,16,12,0,tzinfo=timezone.utc)
        services=[dict(name='Render',status='online',latency_ms=30)]
        first=observed_history(services,now)['Render']
        self.assertEqual(first['sample_count'],1)
        self.assertEqual(sum(block['status']=='unknown' for block in first['blocks']),47)
        # Multiple viewers in the same sampling slot do not multiply observations.
        self.assertEqual(observed_history(services,now)['Render']['sample_count'],1)
        services[0]['status']='offline'
        history=observed_history(services,now+timedelta(seconds=16))['Render']
        self.assertEqual(history['sample_count'],2)
        self.assertEqual(history['availability_pct'],50)
        self.assertEqual(history['blocks'][-1]['status'],'offline')
        # History from an entirely unobserved later day has no invented successes.
        later=observed_history([],now+timedelta(days=2))['Render']
        self.assertEqual(later['sample_count'],0)
        self.assertIsNone(later['availability_pct'])

    def test_remote_metadata_is_whitelisted_and_not_inferred_from_local_environment(self):
        metadata=MagicMock()
        metadata.__enter__.return_value.status=200
        metadata.__enter__.return_value.read.return_value=json.dumps(dict(provider='Vercel',commit='abc123',branch='main',environment='production',built_at='2026-11-16T12:00:00Z',secret='never expose')).encode()
        with patch.dict(os.environ,{'DATABASE_URL':'','RW_RENDER_HEALTH_URL':'','RW_VERCEL_URL':'','RENDER_EXTERNAL_URL':'','RW_PUBLIC_APP_URL':''}),patch('urllib.request.urlopen',return_value=metadata):
            response=self.admin.get('/api/security/infrastructure')
        services={row['name']:row for row in response.json['services']}
        self.assertEqual(services['Vercel']['deployment']['commit'],'abc123')
        self.assertNotIn('secret',services['Vercel']['deployment'])
        self.assertIsNone(services['Render']['deployment'])

for _name in list(test_access.AccessTests.__dict__):
    if _name.startswith('test_'):
        setattr(InfrastructureTests,_name,None)
