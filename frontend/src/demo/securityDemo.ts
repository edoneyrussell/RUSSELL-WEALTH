import { sharedFetch } from '../experience/sharedFetch';
import { createContext, useCallback, useContext } from 'react';

export const SecurityDemoContext = createContext(false);
export const demoEvents = Array.from({ length: 36 }, (_, index) => ({
  id: 1000 + index,
  user_id: index % 4 + 1,
  email: ['alex@example.com', 'jordan@example.com', 'taylor@example.com', 'sam@example.com'][index % 4],
  event_type: index % 3 === 0 ? 'LOGIN_FAILED' : 'LOGIN_SUCCESS',
  source_ip: ['192.0.2.10', '198.51.100.24', '203.0.113.8'][index % 3],
  severity: index % 6 === 0 ? 'CRITICAL' : index % 3 === 0 ? 'WARNING' : 'INFO',
  details: index % 3 === 0 ? 'Fictional sign-in attempt flagged for review.' : 'Fictional account signed in successfully.',
  created_at: new Date(Date.now() - index * 180000).toISOString(),
  location: ['Regina, Saskatchewan, Canada','London, United Kingdom','Toronto, Canada'][index%3], location_basis:'DEMO',
  source: 'demo', source_label: 'Demo dataset', event_key: `demo:${1000 + index}`,
}));
let alertsCleared = false;
const reviewStates: Record<number,string> = {};

export function demoSecurityResponse(input: string, init?: RequestInit): Response {
  const url = new URL(input, 'https://demo.invalid');
  const path = url.pathname;
  const allAlerts = demoEvents.filter(event => event.event_type === 'LOGIN_FAILED').map(event=>({...event,title:'Demo: Repeated failed sign-ins',status:alertsCleared ? 'RESOLVED' : (reviewStates[event.id] || 'NEW'),evidence:[]}));
  const alerts = allAlerts.filter(event => event.status !== 'RESOLVED');
  const pagination = (rows: typeof demoEvents) => {
    const severity = url.searchParams.get('severity');
    const eventType = url.searchParams.get('event_type');
    const search = (url.searchParams.get('search') || '').toLowerCase();
    const filtered = rows.filter(row => (!severity || row.severity === severity) && (!eventType || row.event_type === eventType) && (!search || `${row.email} ${row.source_ip}`.toLowerCase().includes(search)));
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const size = Math.min(100, Math.max(1, Number(url.searchParams.get('per_page')) || 25));
    return { success: true, logs: filtered.slice((page - 1) * size, page * size), active_count: alerts.length,
      sources: [{ key: 'demo', label: 'Demo dataset', status: 'connected', count: filtered.length }],
      pagination: { page, per_page: size, total: filtered.length, total_pages: Math.ceil(filtered.length / size) } };
  };
  let body: unknown;
  if (path === '/api/me') body = {authenticated:true,name:'Demo SOC Administrator',profile_photo:null};
  else if (path === '/api/security/search') {
    const q=(url.searchParams.get('q') || '').trim().toLowerCase();
    const matches=q ? demoEvents.filter(row=>`${row.email} ${row.source_ip} ${row.event_type} ${row.details}`.toLowerCase().includes(q)) : [];
    body={results:[...matches.slice(0,6).map(row=>({key:`demo:Log:${row.id}`,kind:'Log',title:row.event_type.replaceAll('_',' '),description:`${row.email} · ${row.source_ip} · Security Logs`,href:`/demo/security?panel=logs&search=${encodeURIComponent(q)}&event=${row.event_key}`})),...[...new Set(matches.map(row=>row.source_ip))].map(ip=>({key:`demo:IP:${ip}`,kind:'IP address',title:ip,description:'Demo security activity · Security Logs',href:`/demo/security?panel=logs&search=${encodeURIComponent(ip)}`}))],unavailable_sources:[]};
  }
  else if (path === '/api/security/activity-map') body = {events:demoEvents.map((event,index)=>({...event,latitude:[50.4452,51.5074,43.6532][index%3],longitude:[-104.6189,-0.1278,-79.3832][index%3],city:['Regina, Saskatchewan','London','Toronto'][index%3],country:['Canada','United Kingdom','Canada'][index%3],location_basis:'DEMO'})),truncated:false,window_hours:24};
  else if (path === '/api/security/overview') body = { success: true,
    metrics: { total_events: 36, successful_logins: 24, failed_logins: 12, blocked_attempts: 8, open_incidents: 3, total_incidents: 8, resolved_incidents: 5, info_events: 24, warning_events: 6, critical_events: 6 },
    recent_events: demoEvents, top_sources: ['192.0.2.10', '198.51.100.24', '203.0.113.8'].map(source_ip => ({source_ip, event_count:12})) };
  else if (path === '/api/security/active-alerts') body = { success: true,count:alerts.length,filtered_count:alerts.filter(event=>!url.searchParams.get('severity')||event.severity===url.searchParams.get('severity')).length,alerts:alerts.filter(event=>!url.searchParams.get('severity')||event.severity===url.searchParams.get('severity')) };
  else if (path === '/api/security/alerts') body = pagination(allAlerts.filter(event=>(!url.searchParams.get('status') || (url.searchParams.get('status')==='ACTIVE' ? event.status!=='RESOLVED' : event.status===url.searchParams.get('status'))) && (!url.searchParams.get('alert') || String(event.id)===url.searchParams.get('alert'))));
  else if (path === '/api/security/logs') body = pagination(demoEvents);
  else if (path === '/api/security/clear-alerts' && init?.method === 'POST') { alertsCleared = true; body = { success: true, message: 'Demo alerts cleared in this preview only.' }; }
  else if (/^\/api\/security\/alerts\/\d+$/.test(path) && init?.method === 'PATCH') { const id=Number(path.split('/').pop()); reviewStates[id]=JSON.parse(String(init.body)).status; body={success:true}; }
  else if (path === '/api/security/coverage') {
    const coverage = { status:'HEALTHY', checks_passed: 4, checks_total: 4, checks: { passwords_hashed: true, sessions_protected: true, access_control: true, audit_logging: true } };
    body = { success: true, authentication: coverage, access_control: coverage, event_monitoring: coverage };
  } else return Response.json({success:false, error:'This endpoint is unavailable in the demo.'}, {status:404});
  return Response.json(body);
}

// Demo components never fall through to a real API, even for unknown endpoints.
export function useSecurityFetch() {
  const demo = useContext(SecurityDemoContext);
  return useCallback((input: string, init?: RequestInit): Promise<Response> => {
    if (demo) return Promise.resolve(demoSecurityResponse(input, init));
    return sharedFetch(input, init);
  }, [demo]);
}
