import { demoAnalysts, demoModuleResponse } from './securityDemoModules';
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
const assignments:Record<number,{id:number|null;version:number;ack?:string}>={};

export function demoSecurityResponse(input: string, init?: RequestInit): Response {
  const url = new URL(input, 'https://demo.invalid');
  const path = url.pathname;
  const allAlerts = demoEvents.filter(event => event.event_type === 'LOGIN_FAILED').map(event=>{
    const assignment=assignments[event.id]??{id:event.id%2?99:null,version:0};
    const analyst=demoAnalysts.find(row=>row.id===assignment.id);
    const status=alertsCleared?'RESOLVED':reviewStates[event.id]||'NEW';
    const overdue=event.severity==='CRITICAL'&&status!=='RESOLVED'&&Date.now()-Date.parse(event.created_at)>900000;
    return {...event,title:'Demo: Repeated failed sign-ins',status,evidence:[],assigned_user_id:assignment.id,assigned_name:analyst?.name,assigned_email:analyst?.email,workflow_version:assignment.version,is_overdue:overdue,due_at:new Date(Date.parse(event.created_at)+900000).toISOString(),escalated_at:overdue?new Date(Date.parse(event.created_at)+900000).toISOString():null,escalation_ack_at:assignment.ack};
  });
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
  const method=(init?.method??'GET').toUpperCase();
  const assignment=path.match(/^\/api\/security\/alerts\/(\d+)\/(assignment|acknowledge-escalation)$/);
  if(assignment&&method!=='GET'){
    const id=Number(assignment[1]),record=allAlerts.find(row=>row.id===id);if(!record)return Response.json({error:'Demo alert not found'},{status:404});
    const current=assignments[id]??{id:record.assigned_user_id,version:0};
    if(assignment[2]==='assignment'){
      const payload=JSON.parse(String(init?.body??'{}'));
      if(payload.expected_version!==current.version)return Response.json({error:'This demo alert changed. Refresh and retry.'},{status:409});
      if(payload.assigned_user_id!==null&&!demoAnalysts.some(row=>row.id===payload.assigned_user_id))return Response.json({error:'Select a demo analyst'},{status:400});
      assignments[id]={...current,id:payload.assigned_user_id,version:current.version+1};
    }else assignments[id]={...current,ack:new Date().toISOString(),version:current.version+1};
    return Response.json({success:true});
  }
  const legacyWrite=path==='/api/security/clear-alerts'||/^\/api\/security\/alerts\/\d+$/.test(path);
  const module=legacyWrite?null:demoModuleResponse(url,init,demoEvents);if(module)return module;
  let body: unknown;
  if (path === '/api/me') body = {authenticated:true,name:'Morgan Chen',email:'morgan@example.com',role:'SOC_ADMIN',roles:['SOC_ADMIN'],profile_photo:null};
  else if (path === '/api/security/search') {
    const q=(url.searchParams.get('q') || '').trim().toLowerCase();
    const matches=q ? demoEvents.filter(row=>`${row.email} ${row.source_ip} ${row.event_type} ${row.details}`.toLowerCase().includes(q)) : [];
    body={results:[...matches.slice(0,6).map(row=>({key:`demo:Log:${row.id}`,kind:'Log',title:row.event_type.replaceAll('_',' '),description:`${row.email} · ${row.source_ip} · Security Logs`,href:`/demo/security?panel=logs&search=${encodeURIComponent(q)}&event=${row.event_key}`})),...[...new Set(matches.map(row=>row.source_ip))].map(ip=>({key:`demo:IP:${ip}`,kind:'IP address',title:ip,description:'Demo security activity · Security Logs',href:`/demo/security?panel=logs&search=${encodeURIComponent(ip)}`}))],unavailable_sources:[]};
  }
  else if (path === '/api/security/activity-map') body = {events:demoEvents.map((event,index)=>({...event,latitude:[50.4452,51.5074,43.6532][index%3],longitude:[-104.6189,-0.1278,-79.3832][index%3],city:['Regina, Saskatchewan','London','Toronto'][index%3],country:['Canada','United Kingdom','Canada'][index%3],location_basis:'DEMO'})),truncated:false,window_hours:24};
  else if (path === '/api/security/overview') body = { success: true,
    metrics: { total_events: 36, successful_logins: 24, failed_logins: 12, blocked_attempts: 0, open_incidents: 2, total_incidents: 3, resolved_incidents: 1, info_events: 24, warning_events: 6, critical_events: 6 },
    threat_trends:Array.from(demoEvents.reduce((buckets,event)=>{const hour=event.created_at.slice(0,13)+':00:00Z';const bucket=buckets.get(hour)??{hour,total:0,failed:0,successful:0};bucket.total++;if(event.event_type==='LOGIN_FAILED')bucket.failed++;else if(event.event_type==='LOGIN_SUCCESS')bucket.successful++;buckets.set(hour,bucket);return buckets;},new Map<string,{hour:string;total:number;failed:number;successful:number}>()).values()),
    recent_events: demoEvents, top_sources: ['192.0.2.10', '198.51.100.24', '203.0.113.8'].map(source_ip => ({source_ip, event_count:12})) };
  else if (path === '/api/security/active-alerts') body = { success: true,count:alerts.length,escalated_count:alerts.filter(event=>event.is_overdue).length,sla_minutes:15,filtered_count:alerts.filter(event=>!url.searchParams.get('severity')||event.severity===url.searchParams.get('severity')).length,alerts:alerts.filter(event=>!url.searchParams.get('severity')||event.severity===url.searchParams.get('severity')) };
  else if (path === '/api/security/alerts') {
    const status=url.searchParams.get('status'),id=url.searchParams.get('alert');
    const assignment=url.searchParams.get('assignment');
    const filtered=allAlerts.filter(event=>
      (!status||(status==='ACTIVE'?event.status!=='RESOLVED':event.status===status))&&
      (!id||String(event.id)===id)&&
      (assignment!=='mine'||event.assigned_user_id===99)&&
      (assignment!=='unassigned'||event.assigned_user_id===null)&&
      (url.searchParams.get('escalated')!=='1'||event.is_overdue));
    body={...pagination(filtered),analysts:demoAnalysts,current_user_id:99,sla_minutes:15,escalated_count:alerts.filter(event=>event.is_overdue).length};
  }
  else if (path === '/api/security/logs') body = pagination(demoEvents);
  else if (path === '/api/security/clear-alerts' && init?.method === 'POST') { alertsCleared = true; body = { success: true, message: 'Demo alerts cleared in this preview only.' }; }
  else if (/^\/api\/security\/alerts\/\d+$/.test(path) && init?.method === 'PATCH') { const id=Number(path.split('/').pop()); reviewStates[id]=JSON.parse(String(init.body)).status; body={success:true}; }
  else if (path === '/api/security/coverage') {
    const coverage=(checks:Record<string,boolean>)=>({status:'HEALTHY',checks_passed:Object.keys(checks).length,checks_total:Object.keys(checks).length,checks});
    body={success:true,authentication:coverage({password_verification_available:true,http_only_cookies:true,same_site_configured:true}),access_control:coverage({role_authorization_available:true,authenticated_soc_session:true}),event_monitoring:coverage({logging_function_available:true,event_table_accessible:true})};
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

/** Share the same JSON/error handling across live and sandbox SOC screens. */
export function useSecurityRequest(){
  const request=useSecurityFetch();
  return useCallback(async <T,>(url:string,options:RequestInit={}):Promise<T>=>{
    const response=await request(url,{credentials:'include',cache:'no-store',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
    if(!response.ok){let message=`Request failed (${response.status})`;try{const body=await response.json();if(typeof body.error==='string')message=body.error;}catch{}throw new Error(message);}
    return response.json() as Promise<T>;
  },[request]);
}
