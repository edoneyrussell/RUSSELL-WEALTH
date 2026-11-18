import { sharedFetch } from './sharedFetch';
import { useCallback, useEffect, useRef, useState } from 'react';
type Request = (url: string, init?: RequestInit) => Promise<Response>;

/** Keep stale data for the same resource only; never reuse another account scope. */
export function useRemoteData<T>(url: string, request: Request = sharedFetch, options: {pollMs?: number;validate?:(value:T)=>boolean} = {}) {
  const validate = useRef(options.validate); validate.current = options.validate;
  const [snapshot,setSnapshot] = useState<{key:string;data:T;updatedAt:Date}|null>(null);
  const [failure,setFailure] = useState<{key:string;message:string}|null>(null);
  const pending = useRef<AbortController|null>(null);
  const queued=useRef(false);
  const refresh = useCallback(async ():Promise<void> => {
    if (pending.current) {queued.current=true;return;}
    const controller = new AbortController(); pending.current=controller;
    let timedOut=false;
    const timer=setTimeout(()=>{timedOut=true;controller.abort();},30000);
    try {
      const response=await request(url,{credentials:'same-origin',cache:'no-store',signal:controller.signal});
      if(!response.ok) throw new Error(response.status===401 ? 'Your session expired. Please sign in again.' : 'Unable to refresh data. Please try again.');
      const data:T=await response.json();
      if(validate.current && !validate.current(data)) throw new Error('Unable to read the latest data. Please try again.');
      if(!controller.signal.aborted){setSnapshot({key:url,data,updatedAt:new Date()});setFailure(null);}
    } catch(error) {
      if(!controller.signal.aborted || timedOut) setFailure({key:url,message:timedOut?'The connection is taking too long. Please retry.':error instanceof Error?error.message:'Unable to refresh data. Please try again.'});
    } finally {clearTimeout(timer);if(pending.current===controller){pending.current=null;if(queued.current){queued.current=false;void refresh();}}}
  },[url,request]);
  useEffect(()=>{
    void refresh();
    const visible=()=>{if(document.visibilityState==='visible')void refresh();};
    const timer=options.pollMs ? setInterval(visible,options.pollMs) : undefined;
    window.addEventListener('online',visible);window.addEventListener('focus',visible);window.addEventListener('rw-retry-data',visible);document.addEventListener('visibilitychange',visible);
    return()=>{const controller=pending.current;pending.current=null;queued.current=false;controller?.abort();clearInterval(timer);window.removeEventListener('online',visible);window.removeEventListener('focus',visible);window.removeEventListener('rw-retry-data',visible);document.removeEventListener('visibilitychange',visible);};
  },[refresh,options.pollMs]);
  const current=snapshot?.key===url?snapshot:null;
  const error=failure?.key===url?failure.message:'';
  return {data:current?.data??null,updatedAt:current?.updatedAt??null,error,loading:!current&&!error,refresh};
}
