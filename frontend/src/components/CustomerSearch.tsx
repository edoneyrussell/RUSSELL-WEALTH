import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ArrowUpRight } from 'lucide-react';
import { usePortfolio } from '../hooks/usePortfolio';
import { useWatchlist } from '../hooks/useWatchlist';
import { useTransactions } from '../hooks/useTransactions';
import { customerDemoNavigate, useCustomerFetch } from '../demo/customerDemo';
import { customerSearchPages, matchCustomerResults, type CustomerSearchResult } from '../utils/customerSearch';

function SearchDialog({ close, profileName }: {close:()=>void; profileName:string}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const customerFetch = useCustomerFetch();
  const {portfolio, error:portfolioError} = usePortfolio();
  const {items, error:watchlistError} = useWatchlist();
  const [query, setQuery] = useState('');
  const [transactionQuery,setTransactionQuery]=useState('');
  useEffect(()=>{const timer=setTimeout(()=>setTransactionQuery(query.trim()),250);return()=>clearTimeout(timer);},[query]);
  const {transactions, error:transactionError} = useTransactions(undefined,1,transactionQuery,20);
  const [active, setActive] = useState(-1);
  const [market, setMarket] = useState<{query:string; results:CustomerSearchResult[]}>({query:'',results:[]});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const term = query.trim();
  const local: CustomerSearchResult[] = [
    ...customerSearchPages,
    ...(profileName ? [{key:'profile',title:profileName,detail:'Your profile · Name, photo and account settings',href:'/customer/settings',kind:'Your account'}] : []),
    ...(portfolio?.holdings ?? []).map(h => ({key:`holding:${h.symbol}`,title:`${h.symbol} · ${h.name}`,detail:`Your holdings · ${h.quantity} units · CAD ${h.market_value}`,href:`/portfolio?search=${encodeURIComponent(h.symbol)}`,kind:'Holding'})),
    ...items.map(item => ({key:`watchlist:${item.symbol}`,title:`${item.symbol} · ${item.name}`,detail:'Saved in your watchlist',href:'/dashboard#watchlist',kind:'Watchlist'})),
    ...transactions.map(item => ({key:`transaction:${item.id}`,title:`${item.action} ${item.symbol} · ${item.name}`,detail:`${item.created_at} · CAD ${item.total} · ${item.quantity ?? ''} units`,href:`/transactions?search=${encodeURIComponent(item.symbol || item.action)}`,kind:'Transaction'})),
  ];
  const results = [...matchCustomerResults(local,term).slice(0,40), ...(market.query === term ? market.results : [])];
  const go = (row:CustomerSearchResult | undefined) => {
    if (!row) return;
    close();
    if (customerDemoNavigate(row.href)) return;
    window.location.assign(row.href);
  };
  useEffect(() => {dialog.current?.showModal();input.current?.focus();}, []);
  useEffect(() => {
    if (term.length < 2) {setLoading(false);setError('');return;}
    const controller = new AbortController();
    setLoading(true);setError('');
    const timer = window.setTimeout(async () => {
      try {
        const response = await customerFetch(`/api/market/search?q=${encodeURIComponent(term)}`,{credentials:'same-origin',cache:'no-store',signal:controller.signal});
        if (!response.ok) throw new Error('Investment search is temporarily unavailable.');
        const data = await response.json();
        if (!controller.signal.aborted) setMarket({query:term,results:(data.results ?? []).slice(0,20).map((item:{symbol:string;name:string;exchange?:string;type?:string})=>({key:`market:${item.symbol}`,title:`${item.symbol} · ${item.name}`,detail:`${item.exchange ?? ''} · ${item.type ?? 'Investment'} · Open Trade`,href:`/markets?symbol=${encodeURIComponent(item.symbol)}`,kind:'Investment'}))});
      } catch(err) {
        if (!controller.signal.aborted) {setMarket({query:term,results:[]});setError(err instanceof Error ? err.message : 'Search unavailable.');}
      } finally {if (!controller.signal.aborted) setLoading(false);}
    },200);
    return () => {window.clearTimeout(timer);controller.abort();};
  }, [term, customerFetch]);
  useEffect(() => {if (active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({block:'nearest'});}, [active,listId]);
  return createPortal(<dialog ref={dialog} aria-label="Search customer dashboard" onCancel={close} onClick={event=>{if(event.target===event.currentTarget) close();}} className="fixed inset-0 m-auto w-[calc(100%-24px)] max-w-2xl rounded-2xl border border-[#445063] bg-[#111821] p-0 text-white shadow-2xl backdrop:bg-black/75">
    <div className="flex items-center gap-3 border-b border-[#34404D] p-4"><Search size={20}/><input ref={input} role="combobox" aria-label="Search customer dashboard" aria-expanded="true" aria-autocomplete="list" aria-controls={listId} aria-activedescendant={active>=0 && results[active] ? `${listId}-${active}` : undefined} value={query} maxLength={128} placeholder="Search anything in your dashboard…" className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none" onChange={event=>{setQuery(event.target.value);setActive(-1);}} onKeyDown={event=>{
      if(event.key==='ArrowDown'||event.key==='ArrowUp') {event.preventDefault();setActive(index=>results.length ? (event.key==='ArrowDown' ? (index+1)%results.length : index<=0 ? results.length-1 : index-1) : -1);}
      if(event.key==='Enter'){event.preventDefault();go(results[active<0 ? 0 : active]);}
    }}/><button type="button" aria-label="Close dashboard search" onClick={close} className="rounded-lg p-2 hover:bg-[#29394D]"><X size={18}/></button></div>
    <div id={listId} role="listbox" aria-label="Dashboard search results" className="max-h-[60dvh] overflow-y-auto p-2">
      {results.map((row,index)=><button type="button" id={`${listId}-${index}`} key={row.key} role="option" aria-selected={active===index} onMouseEnter={()=>setActive(index)} onClick={()=>go(row)} className={`flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-[#25364C] ${active===index?'bg-[#25364C]':''}`}><div className="min-w-0 flex-1"><p className="text-[10px] uppercase tracking-wider text-[#91A9BF]">{row.kind}</p><p className="mt-1 text-sm font-medium">{row.title}</p><p className="mt-1 text-xs text-[#A5B2C2]">{row.detail}</p></div><ArrowUpRight size={16} className="shrink-0"/></button>)}
    </div>
    <p role="status" className="border-t border-[#34404D] p-4 text-xs text-[#A5B2C2]">{loading ? 'Searching investments…' : error || (results.length ? `${results.length} results · Select a result to open it` : 'No matching results.')}{(portfolioError || watchlistError || transactionError) && ' Some account data could not be loaded.'}</p>
  </dialog>,document.body);
}

export default function CustomerSearch({profileName}: {profileName:string}) {
  const [open,setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {setOpen(false);trigger.current?.focus();};
  useEffect(() => {
    const shortcut = (event:KeyboardEvent) => {if ((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k') {event.preventDefault();setOpen(true);}};
    window.addEventListener('keydown',shortcut);
    return () => window.removeEventListener('keydown',shortcut);
  },[]);
  return <><button ref={trigger} type="button" onClick={()=>setOpen(true)} className="flex items-center gap-2 rounded-xl border border-[#34404D] bg-[#171E27] px-4 py-3 text-xs text-[#C4CED9] hover:bg-[#26313D]"><Search size={16}/>Search Dashboard</button>{open && <SearchDialog close={close} profileName={profileName}/>}</>;
}
