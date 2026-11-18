import { Skeleton } from '../experience/Feedback';
import { useViewState } from '../experience/ViewState';
import { getLocale } from '../i18n/language.ts';
import { useSecurityFetch } from "../demo/securityDemo";
import * as React from 'react';
import { useEffect, useState } from 'react';
import type { SecurityEvent } from '../hooks/useSecurityOverview';

type Props = {
  onClose: () => void;
  initialEscalated?: boolean;
};

type ResponseData = {
  success: boolean;
  logs: SecurityEvent[];
  active_count: number;
  analysts?: {id:number;name:string;email:string}[];
  escalated_count?: number;
  sla_minutes?: number;
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
};

function reginaTime(value: string) {
  const normalized = value.trim().replace(' ', 'T');
  const iso = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized)
    ? normalized
    : normalized + 'Z';
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return { date: '—', time: '—' };
  }

  return {
    date: new Intl.DateTimeFormat(getLocale('en-US'), {
      timeZone: 'America/Regina',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date),
    time: new Intl.DateTimeFormat(getLocale('en-US'), {
      timeZone: 'America/Regina',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: getLocale() !== 'fr-CA'
    }).format(date)
  };
}


function ClearSecurityAlertsButton() {
  const securityFetch = useSecurityFetch();
  const [clearing, setClearing] = React.useState(false);
  const [message, setMessage] = React.useState('');

  async function clearAlerts() {
    setClearing(true);
    setMessage('');

    try {
      const response = await securityFetch('/api/security/clear-alerts', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Unable to clear alerts (${response.status})`);
      }

      setMessage('Active alerts resolved. History retained.');

      window.dispatchEvent(new Event('security-alerts-cleared'));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to clear alerts'
      );
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={clearAlerts}
        disabled={clearing}
        className="rounded-lg bg-[#8f202b] px-4 py-2 text-sm font-medium text-white hover:bg-[#a52b38] disabled:opacity-50"
      >
        {clearing ? 'Resolving…' : 'Resolve all alerts'}
      </button>
      {message && (
        <span className="text-xs text-[#b4b8c0]">{message}</span>
      )}
    </div>
  );
}

export default function SecurityAlerts({ onClose, initialEscalated=false }: Props) {
  const securityFetch = useSecurityFetch();
  const [page, setPage] = useViewState('alerts:page',1);
  const [severity, setSeverity] = useViewState('alerts:severity','');
  const [status, setStatus] = useViewState('alerts:status','ACTIVE');
  const [assignment,setAssignment]=useViewState('alerts:assignment','all');
  const [escalatedOnly,setEscalatedOnly]=useState(initialEscalated);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useViewState('alerts:search',() => new URLSearchParams(window.location.search).get('search') || '',new URLSearchParams(location.search).has('search'));
  const [alertId, setAlertId] = useState(() => new URLSearchParams(window.location.search).get('alert') || '');
  const [data, setData] = useState<ResponseData | null>(null);
  const [error, setError] = useState('');
  const [actionError,setActionError]=useState('');
  const [saving, setSaving] = useState<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let pending=false;
    async function load() {
      if(pending)return;pending=true;
      try {
        const params = new URLSearchParams({page:String(page), per_page:'25', severity, status, search, alert:alertId, assignment, escalated:escalatedOnly?'1':''});
        const response = await securityFetch(`/api/security/alerts?${params}`, {credentials:'include', cache:'no-store', signal:controller.signal});
        if (!response.ok) throw new Error('Unable to load alerts');
        setData(await response.json()); setError('');
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Request failed'); } finally {pending=false;}
    }
    load();
    const interval = window.setInterval(()=>{if(document.visibilityState==='visible')void load();}, 10000);
    const refresh = () => load();
    window.addEventListener('security-alerts-cleared', refresh);window.addEventListener('online',refresh);window.addEventListener('rw-retry-data',refresh);
    return () => { controller.abort(); clearInterval(interval); window.removeEventListener('security-alerts-cleared', refresh);window.removeEventListener('online',refresh);window.removeEventListener('rw-retry-data',refresh); };
  }, [page, severity, status, search, alertId, revision, assignment, escalatedOnly, securityFetch]);
  async function review(id:number, next:string) {
    setSaving(id);
    try {
      const response = await securityFetch(`/api/security/alerts/${id}`, {method:'PATCH', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status:next})});
      if (!response.ok) throw new Error('Unable to update this alert');
      setRevision(value => value+1);
      window.dispatchEvent(new Event('security-alerts-cleared'));
    } catch(e) { setError(e instanceof Error ? e.message : 'Update failed'); }
    finally { setSaving(null); }
  }
  async function changeAssignment(event:SecurityEvent, analyst:string) {
    setSaving(event.id);setActionError('');
    try {
      const response=await securityFetch(`/api/security/alerts/${event.id}/assignment`,{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({assigned_user_id:analyst?Number(analyst):null,expected_version:event.workflow_version??0})});
      if(!response.ok){const data=await response.json();throw new Error(data.error||'Unable to assign this alert');}
      setRevision(value=>value+1);window.dispatchEvent(new Event('security-alerts-cleared'));
    }catch(err){setActionError(err instanceof Error?err.message:'Assignment failed');setRevision(value=>value+1);}
    finally{setSaving(null);}
  }
  async function acknowledge(id:number) {
    setSaving(id);setActionError('');
    try {
      const response=await securityFetch(`/api/security/alerts/${id}/acknowledge-escalation`,{method:'POST',credentials:'include'});
      if(!response.ok)throw new Error('Unable to acknowledge escalation');
      setRevision(value=>value+1);window.dispatchEvent(new Event('security-alerts-cleared'));
    }catch(err){setActionError(err instanceof Error?err.message:'Update failed');}finally{setSaving(null);}
  }
  return <main className="rw-alert-workspace p-4 md:p-8 min-h-screen text-[#f5f5f5]">
    <header className="flex flex-wrap justify-between gap-4 mb-6">
      <div><p className="text-xs text-[#9aa39e] mb-2">RUSSELL WEALTH / SECURITY</p><h1 className="text-3xl font-semibold">Security alerts</h1>
      <p className="text-sm text-[#9aa39e] mt-2">Recorded detections · Regina time (CST) · Refreshes every 10 seconds</p></div>
      <button onClick={onClose} className="border border-[#354039] rounded-xl px-4 py-2 self-start">← SOC Dashboard</button>
    </header>
    <p className="mb-5 text-sm text-[#9aa39e]">Critical alerts that remain unresolved for {data?.sla_minutes??15} minutes enter the escalation queue. Assignment does not stop the deadline.</p>
    <div className="flex flex-wrap gap-4 mb-6">
      <div className="rw-alert-summary"><span>Recorded alerts</span><strong>{data?.pagination.total ?? '—'}</strong></div>
      <div className="rw-alert-summary"><span>Needs review</span><strong>{data?.active_count ?? '—'}</strong></div>
      <button className="rw-alert-summary text-left" onClick={()=>{setEscalatedOnly(value=>!value);setStatus('ACTIVE');setPage(1);}} aria-pressed={escalatedOnly}><span>Overdue critical alerts</span><strong className="text-[#ff8585]">{data?.escalated_count??0}</strong></button>
    </div>
    <div className="flex flex-wrap gap-3 items-center mb-5">
      <select aria-label="Filter alerts by severity" value={severity} onChange={e=>{setSeverity(e.target.value);setPage(1);}} className="rw-alert-select"><option value="">All severities</option><option value="WARNING">Warning</option><option value="CRITICAL">Critical</option></select>
      <select aria-label="Filter alerts by status" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}} className="rw-alert-select"><option value="ACTIVE">Active alerts</option><option value="">All statuses</option><option value="NEW">New</option><option value="UNDER_REVIEW">Under review</option><option value="RESOLVED">Resolved</option></select>
      <select aria-label="Filter alerts by assignment" value={assignment} onChange={e=>{setAssignment(e.target.value);setPage(1);}} className="rw-alert-select"><option value="all">All analysts</option><option value="mine">Assigned to me</option><option value="unassigned">Unassigned</option></select>
      <button type="button" aria-pressed={escalatedOnly} className="rw-alert-select" onClick={()=>{setEscalatedOnly(value=>!value);setPage(1);}}>{escalatedOnly?'Showing escalations · Show all':'Escalation queue'}</button>
      <input type="search" aria-label="Search alerts" placeholder="Search alerts, names or IPs" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} className="rw-alert-select" />
      {alertId && <button className="rw-alert-select" onClick={()=>{setAlertId('');setPage(1);}}>Showing alert #{alertId} · Show all</button>}
      <ClearSecurityAlertsButton />
    </div>
    {actionError&&<p role="alert" className="mb-4 text-[#ff8585]">{actionError}</p>}
    {!data && !error && <Skeleton rows={4}/>}
    {error && <p role="alert" className="text-[#ff8585] mb-4">{error}</p>}
    <div className="space-y-3">
      {data?.logs.map(event => {
        const time = reginaTime(event.created_at);
        return <article key={event.id} className={`rw-alert-card ${event.is_overdue?'ring-1 ring-[#8f303b]':''}`}>
          {event.is_overdue && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#35161b] p-3 text-sm text-[#ff8585]"><div><strong>Escalated · Overdue critical alert</strong><p className="mt-1 text-xs">Deadline: {event.due_at?`${reginaTime(event.due_at).date} · ${reginaTime(event.due_at).time}`:'—'}</p></div>{event.escalation_ack_at?<span className="text-xs">Escalation acknowledged</span>:<button disabled={saving===event.id} className="rounded border border-[#8f303b] px-3 py-2 text-xs disabled:opacity-50" onClick={()=>void acknowledge(event.id)}>Acknowledge escalation</button>}</div>}
          <div className="flex flex-wrap gap-3 items-start justify-between">
            <div className="min-w-0"><span className={event.severity==='CRITICAL' ? 'text-[#ff8585] text-xs' : 'text-[#e8c785] text-xs'}>{event.severity}</span>
              <h2 className="text-lg font-semibold mt-1">{event.title || event.event_type.replaceAll('_',' ')}</h2>
              <p className="text-sm text-[#aeb9b2] mt-2 break-words">{event.details}</p></div>
            <label className="text-xs text-[#aeb9b2]">Status<select aria-label={`Status for alert ${event.id}`} disabled={saving===event.id} value={event.status || 'NEW'} onChange={e=>review(event.id,e.target.value)} className="rw-alert-select block mt-1"><option value="NEW">New</option><option value="UNDER_REVIEW">Under review</option><option value="RESOLVED">Resolved</option></select></label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#2b3830] pt-4">
            <label className="min-w-0 text-xs text-[#aeb9b2]">Assigned analyst<select aria-label={`Assigned analyst for alert ${event.id}`} disabled={saving===event.id||event.status==='RESOLVED'} value={event.assigned_user_id??''} onChange={e=>void changeAssignment(event,e.target.value)} className="rw-alert-select mt-2 block max-w-full"><option value="">Unassigned</option>{event.assigned_user_id&&!data?.analysts?.some(analyst=>analyst.id===event.assigned_user_id)&&<option value={event.assigned_user_id}>{event.assigned_name||event.assigned_email||'Unavailable analyst'}</option>}{data?.analysts?.map(analyst=><option key={analyst.id} value={analyst.id}>{analyst.name} · {analyst.email}</option>)}</select></label>
            {event.assigned_at&&<p className="text-xs text-[#819087]">Assigned {reginaTime(event.assigned_at).date} · {reginaTime(event.assigned_at).time}</p>}
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 text-sm">
            <div className="min-w-0"><dt className="text-[#819087] text-xs">Account email</dt><dd className="break-all mt-1">{event.email || 'Not recorded'}</dd></div>
            <div><dt className="text-[#819087] text-xs">Source IP</dt><dd className="font-mono mt-1 break-all">{event.source_ip || 'Not recorded'}</dd>{(event.source_ip==='127.0.0.1'||event.source_ip==='::1')&&<small className="text-[#819087]">Local connection</small>}</div>
            <div><dt className="text-[#819087] text-xs">Recorded in Regina (CST)</dt><dd className="mt-1">{time.date} · {time.time}</dd></div>
          </dl>
          <details open={String(event.id)===alertId || undefined} className="mt-5 border-t border-[#2b3830] pt-3 text-sm"><summary className="cursor-pointer text-[#bce6cd]">Related events · Alert #{event.id}</summary>
            <p className="text-xs text-[#819087] mt-3">{event.event_type} · UTC {event.created_at}</p>
            {event.evidence?.length ? <ul className="space-y-2 mt-3">{event.evidence.map(item=><li key={item.id} className="break-words text-[#aeb9b2]">#{item.id} · {item.event_type} · {item.account_email || 'No email recorded'} · {item.source_ip || 'No IP recorded'} · {reginaTime(item.created_at).date} {reginaTime(item.created_at).time}</li>)}</ul> : <p className="text-[#819087] mt-2">No related event snapshot was stored for this older alert.</p>}
          </details>
        </article>;
      })}
      {!data && !error && <p>Loading alerts…</p>}
      {data?.logs.length===0 && <p className="rw-alert-card text-[#aeb9b2]">No alerts match these filters. Successful sign-ins and individual failed attempts are recorded in Logs.</p>}
    </div>
    <footer className="flex flex-wrap items-center justify-between gap-4 mt-6 text-sm"><span>Page {page} of {data?.pagination.total_pages || 1}</span><div className="flex gap-3"><button className="rw-alert-select" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</button><button className="rw-alert-select" disabled={page>=(data?.pagination.total_pages||1)} onClick={()=>setPage(p=>p+1)}>Next</button></div></footer>
  </main>;
}
