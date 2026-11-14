import { useCallback, useEffect, useRef, useState } from 'react';
import { useCustomerFetch } from '../demo/customerDemo';
import { subscribePortfolioUpdates } from '../utils/portfolioSync';
import { notifyWatchlistUpdated } from '../utils/watchlist';
type Selections = { symbols: string[]; items: {symbol:string;name:string}[] };
export function useWatchlist() {
  const customerFetch=useCustomerFetch();
  const [data,setData]=useState<Selections>({symbols:[],items:[]});
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
  const revision=useRef(0), mutation=useRef(false), mounted=useRef(false);
  useEffect(()=>{
    mounted.current=true;
    const controller=new AbortController();
    let pending=false,queued=false;
    const load=async()=>{
      if(pending){queued=true;return;}
      pending=true;const version=revision.current;
      try {
        const response=await customerFetch('/api/customer/watchlist',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
        if(!response.ok) throw new Error('Unable to load your saved watchlist.');
        const body=await response.json();
        if(!controller.signal.aborted&&version===revision.current){setData(body);setError('');}
      } catch(e){if(!controller.signal.aborted)setError(e instanceof Error ? e.message : 'Unable to load watchlist.');}
      finally {pending=false;if(!controller.signal.aborted){setLoading(false);if(queued){queued=false;void load();}}}
    };
    void load();
    const unsubscribe=subscribePortfolioUpdates(()=>void load());
    const sync=()=>void load();
    const storage=(event:StorageEvent)=>{if(event.key==='rw-watchlist-sync')void load();};
    window.addEventListener('russellwealth:watchlist-updated',sync);window.addEventListener('storage',storage);
    return ()=>{mounted.current=false;controller.abort();unsubscribe();window.removeEventListener('russellwealth:watchlist-updated',sync);window.removeEventListener('storage',storage);};
  },[customerFetch]);
  const setWatched=useCallback(async(symbol:string,watched:boolean)=>{
    if(mutation.current) return false;
    mutation.current=true;revision.current++;setSaving(true);setError('');
    try {
      const response=await customerFetch(`/api/customer/watchlist/${encodeURIComponent(symbol.toUpperCase())}`,{method:watched?'PUT':'DELETE',credentials:'same-origin',cache:'no-store'});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Unable to save your watchlist.');
      if(mounted.current)setData(body);
      notifyWatchlistUpdated();return true;
    } catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Unable to save watchlist.');return false;}
    finally{mutation.current=false;if(mounted.current)setSaving(false);}
  },[customerFetch]);
  return {...data,loading,saving,error,setWatched};
}
