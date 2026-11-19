/** Fictional, browser-only records for the public SOC preview. Never uses production APIs. */
import type { SecurityEvent } from '../hooks/useSecurityOverview';
const now=Date.now();
const ago=(minutes:number)=>new Date(now-minutes*60000).toISOString();
export const demoAnalysts=[{id:99,name:'Morgan Chen',email:'morgan@example.com'},{id:98,name:'Riley Patel',email:'riley@example.com'}];
const customers=['Alex Morgan','Jordan Lee','Taylor Quinn','Sam Rivera'].map((name,i)=>({id:i+1,name,email:['alex@example.com','jordan@example.com','taylor@example.com','sam@example.com'][i],role:i===1?'SOC_ADMIN':'CUSTOMER',access_role:i===1?'BOTH':'CUSTOMER',account_status:i===2?'SUSPENDED':'ACTIVE',created_at:ago(43200+i*1000),source:'demo',source_label:'Public demo',manageable:false,is_owner:false,is_self:false}));
const incidents=[{id:1,title:'Repeated failed sign-ins',severity:'CRITICAL',status:'INVESTIGATING',source_ip:'192.0.2.10',created_at:ago(90),resolved_at:null,related_event_count:12},{id:2,title:'Session access review',severity:'WARNING',status:'OPEN',source_ip:'198.51.100.24',created_at:ago(65),resolved_at:null,related_event_count:4},{id:3,title:'Account access change',severity:'INFO',status:'RESOLVED',source_ip:'203.0.113.8',created_at:ago(180),resolved_at:ago(120),related_event_count:3}];
type Note={id:number;note:string;created_at:string;analyst_id:number};
const notes:Record<number,Note[]>={1:[{id:1,note:'Demo analyst reviewed the related sign-in attempts and opened an investigation.',created_at:ago(75),analyst_id:99}],2:[],3:[]};
const actions:Record<number,{key:string;kind:string;title:string;created_at:string;details:string;reason:string;actor_name:string;outcome:string}[]>={1:[],2:[],3:[]};
export function demoModuleResponse(url:URL,init:RequestInit|undefined,events:SecurityEvent[]):Response|null{
 const path=url.pathname,method=(init?.method??'GET').toUpperCase();
 const json=(data:unknown,status=200)=>Response.json(data,{status});
 const denied=()=>json({success:false,error:'Public demo: account controls and profile changes are disabled.'},403);
 if(path==='/api/security/incidents'&&method==='GET')return json({incidents});
 const match=path.match(/^\/api\/security\/incidents\/(\d+)(?:\/(investigation|notes|response))?$/);
 if(match){
  const id=Number(match[1]),incident=incidents.find(row=>row.id===id);if(!incident)return json({error:'Demo incident not found'},404);
  const related=events.filter(row=>row.source_ip===incident.source_ip).slice(0,12);
  if(method==='GET'&&match[2]==='investigation')return json({timeline:[...related.map(row=>({key:`event:${row.id}`,kind:'EVENT',title:row.event_type,created_at:row.created_at,details:row.details,account_email:row.email,source_ip:row.source_ip,severity:row.severity})),...notes[id].map(row=>({key:`note:${row.id}`,kind:'NOTE',title:'Analyst note',created_at:row.created_at,details:row.note,actor_name:'Morgan Chen'})),...actions[id]].sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at)),accounts:customers.slice(0,2).map(row=>({...row,status:row.account_status,can_suspend:false,can_revoke:false,protection_reason:'Public preview · Account controls are disabled'})),can_manage_accounts:false,truncated:false});
  if(method==='GET'&&!match[2])return json({incident,events:related,notes:notes[id]});
  if(method==='POST'&&match[2]==='notes'){
   const payload=JSON.parse(String(init?.body??'{}'));if(typeof payload.note!=='string'||!payload.note.trim())return json({error:'Enter an analyst note'},400);
   notes[id].push({id:notes[id].length+1,note:payload.note.trim().slice(0,2000),created_at:new Date().toISOString(),analyst_id:99});return json({success:true});
  }
  if(method==='POST'&&match[2]==='response'){
   const payload=JSON.parse(String(init?.body??'{}'));
   if(payload.action!=='UPDATE_STATUS')return denied();
   if(!['OPEN','INVESTIGATING','CONTAINED','RESOLVED'].includes(payload.status)||typeof payload.reason!=='string'||payload.reason.trim().length<10)return json({error:'Choose a status and document a reason of at least 10 characters.'},400);
   incident.status=payload.status;incident.resolved_at=payload.status==='RESOLVED'?new Date().toISOString():null;
   actions[id].push({key:`action:${actions[id].length+1}`,kind:'RESPONSE',title:'Demo incident status updated',details:payload.status,reason:payload.reason.trim().slice(0,1000),created_at:new Date().toISOString(),actor_name:'Morgan Chen',outcome:'SUCCESS'});return json({success:true});
  }
  return denied();
 }
 if(path==='/api/security/users'&&method==='GET')return json({users:customers,sources:[{key:'demo',label:'Public demo',status:'connected',count:customers.length,manageable:false,primary:true}],current_user_id:99,current_source:'demo'});
 if(path==='/api/security/sessions'&&method==='GET')return json({sessions:customers.filter(row=>row.account_status==='ACTIVE').map((row,i)=>({id:`demo-session-${row.id}`,name:row.name,email:row.email,role:row.role,device:['Chrome · Windows','Safari · iPhone','Firefox · Linux'][i],source_ip:['192.0.2.10','198.51.100.24','203.0.113.8'][i],location:['Regina, Saskatchewan, Canada','London, United Kingdom','Toronto, Canada'][i],location_basis:'DEMO',created_at:ago(60+i*30),last_seen_at:ago(i+1),expires_at:ago(-60),is_current:false,can_revoke:false,protection_reason:'Public preview · Revocation is disabled; no real sessions are connected.'})),truncated:false});
 if(path==='/api/me/profile'&&method==='GET')return json({name:'Morgan Chen',first_name:'Morgan',last_name:'Chen',email:'morgan@example.com',role:'SOC_ADMIN',phone:'',address_line1:'',address_line2:'',city:'',region:'',postal_code:'',country:'',password_hint:''});
 if(path==='/api/security/infrastructure'&&method==='GET'){
  const services=['Vercel','Render','Neon'].map((name,i)=>({name,status:'online',latency_ms:[48,83,22][i],http_status:name==='Neon'?null:200,detail:'Illustrative demo check · No live production connection',endpoint:name==='Neon'?null:`https://${name.toLowerCase()}.example.invalid`,deployment:name==='Neon'?null:{provider:name,commit:'demo-release-example',branch:'demo-preview',environment:'public-demo',built_at:ago(180)}}));
  const history=Object.fromEntries(services.map(({name},i)=>[name,{blocks:Array.from({length:48},(_,index)=>({start:new Date(now-(48-index)*1800000).toISOString(),status:index===20&&i===1?'degraded':'online',checks:30})),sample_count:1440,availability_pct:i===1?97.9:100,first_check_at:ago(1440)}]));
  return json({success:true,checked_at:new Date().toISOString(),services,history,history_available:true,current_application:{provider:'Public preview',environment:'public-demo',commit:'demo-release-example',branch:'demo-preview',built_at:ago(180)}});
 }
 return method==='GET'?null:denied();
}
