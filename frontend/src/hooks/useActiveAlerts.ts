import { useEffect, useState } from 'react';
import { useSecurityFetch } from '../demo/securityDemo';
import type { SecurityEvent } from './useSecurityOverview';
type Snapshot={escalated_count?:number;sla_minutes?:number;count:number;filtered_count:number;alerts:SecurityEvent[]};
export function useActiveAlerts(severity:string) {
  const request=useSecurityFetch();
  const [snapshot,setSnapshot]=useState<{severity:string;data:Snapshot}|null>(null);
  const [error,setError]=useState('');
  const [updatedAt,setUpdatedAt]=useState<Date|null>(null);
  useEffect(()=>{
    const controller=new AbortController();let pending=false,queued=false;
    const load=async()=>{
      if(pending){queued=true;return;}pending=true;
      try {
        const response=await request(`/api/security/active-alerts${severity==='All'?'':`?severity=${encodeURIComponent(severity.toUpperCase())}`}`,{credentials:'include',cache:'no-store',signal:controller.signal});
        if(!response.ok)throw new Error('Unable to refresh alerts. Displayed data may be out of date.');
        const data=await response.json();
        if(!data.success||!Array.isArray(data.alerts)||!Number.isInteger(data.count))throw new Error('Unable to read the alert snapshot.');
        if(!controller.signal.aborted){setSnapshot({severity,data});setUpdatedAt(new Date());setError('');}
      } catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Unable to refresh alerts.');}
      finally{pending=false;if(!controller.signal.aborted&&queued){queued=false;void load();}}
    };
    void load();const visible=()=>{if(document.visibilityState==='visible')void load();};
    const timer=window.setInterval(visible,10000);
    window.addEventListener('security-alerts-cleared',load);window.addEventListener('focus',visible);window.addEventListener('online',visible);document.addEventListener('visibilitychange',visible);
    return()=>{controller.abort();window.clearInterval(timer);window.removeEventListener('security-alerts-cleared',load);window.removeEventListener('focus',visible);window.removeEventListener('online',visible);document.removeEventListener('visibilitychange',visible);};
  },[request,severity]);
  return {escalatedCount:snapshot?.data.escalated_count??0,slaMinutes:snapshot?.data.sla_minutes??15,count:snapshot?.data.count??null,alerts:snapshot?.severity===severity?snapshot.data.alerts:[],filteredCount:snapshot?.severity===severity?snapshot.data.filtered_count:0,loading:snapshot?.severity!==severity,error,updatedAt};
}
