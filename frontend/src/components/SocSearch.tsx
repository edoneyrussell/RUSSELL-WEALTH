import { demoSecurityLink } from '../demo/securityDemoNavigation';
import { t } from '../i18n/language.ts';
import { useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ArrowUpRight } from 'lucide-react';
import { SecurityDemoContext, useSecurityFetch } from '../demo/securityDemo';

type Result = { key: string; kind: string; title: string; description: string; href: string };
const pages: Result[] = [
  { key:'overview',kind:'Tab',title:'SOC Dashboard',description:'Security analytics, threats and overview',href:'/security' },
  { key:'access',kind:'Tab',title:'Access Management',description:'Users, accounts, names, emails and roles',href:'/security/access' },
  { key:'logs',kind:'Tab',title:'Security Logs',description:'Sign-ins, activity, IP addresses and audit history',href:'/security?panel=logs' },
  { key:'alerts',kind:'Tab',title:'Security Alerts',description:'Detections, warnings and alert review',href:'/security?panel=alerts' },
  { key:'incidents',kind:'Tab',title:'Incidents',description:'Investigations, evidence and analyst notes',href:'/security/incidents' },
  { key:'network',kind:'Tab',title:'Network & Infrastructure',description:'Assets, services, health and monitoring',href:'/security/network' },
  { key:'sessions',kind:'Tab',title:'Active Sessions',description:'Signed-in devices, locations and session revocation',href:'/security/sessions' },
  { key:'settings',kind:'Tab',title:'Admin Settings',description:'Profile, account settings and dashboards',href:'/admin/settings' },
  ...[
    ['Render','Flask backend API'], ['Neon','PostgreSQL database'], ['Vercel','React frontend website'],
  ].map(([title,description]) => ({key:title,kind:'Infrastructure',title,description,href:`/security/network?service=${encodeURIComponent(title)}`})),
];
function Highlight({ text, query }: { text: string; query: string }) {
  const index = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  return index < 0 ? <>{text}</> : <>{text.slice(0,index)}<mark className="rounded bg-[#51627a] text-white">{text.slice(index,index+query.length)}</mark>{text.slice(index+query.length)}</>;
}
export default function SocSearch() {
  const securityFetch = useSecurityFetch();
  const demo = useContext(SecurityDemoContext);
  const [query,setQuery] = useState('');
  const [open,setOpen] = useState(false);
  const [active,setActive] = useState(-1);
  const [data,setData] = useState<{query:string;results:Result[];error:string}>({query:'',results:[],error:''});
  const [loading,setLoading] = useState(false);
  const [position,setPosition] = useState({top:0,left:0,width:380});
  const root = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null), popup = useRef<HTMLDivElement>(null);
  const listId = useId();
  const term=query.trim();
  const tabs=pages.filter(row=>`${row.title} ${row.description} ${t(row.title)} ${t(row.description)}`.toLowerCase().includes(term.toLowerCase())).map(row=>demo?{...row,href:demoSecurityLink(row.href)??'/demo/security'}:row);
  const results=[...tabs,...(data.query===term ? data.results : [])];
  useEffect(()=>{
    if (!open || !term) return;
    const controller=new AbortController();
    setLoading(true);
    const timer=window.setTimeout(async()=>{
      try {
        const response=await securityFetch(`/api/security/search?q=${encodeURIComponent(term)}`,{credentials:'same-origin',cache:'no-store',signal:controller.signal});
        const body=await response.json();
        if (!response.ok) throw new Error('Search is unavailable. Please try again.');
        if (!controller.signal.aborted) setData({query:term,results:body.results ?? [],error:body.unavailable_sources?.length ? 'Some databases could not be searched.' : ''});
      } catch(error) {
        if (!controller.signal.aborted) setData({query:term,results:[],error:error instanceof Error ? error.message : 'Unable to search.'});
      } finally { if (!controller.signal.aborted) setLoading(false); }
    },200);
    return ()=>{window.clearTimeout(timer);controller.abort();};
  },[term,open,securityFetch]);
  useEffect(()=>{
    if (!open) return;
    const update=()=>{
      const rect=root.current?.getBoundingClientRect();
      if (rect) { const width=Math.min(480,window.innerWidth-24);setPosition({top:rect.bottom+8,left:Math.max(12,Math.min(rect.left,window.innerWidth-width-12)),width}); }
    };
    const outside=(event:PointerEvent)=>{if (!root.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) setOpen(false);};
    update();window.addEventListener('resize',update);window.addEventListener('scroll',update,true);document.addEventListener('pointerdown',outside);
    return ()=>{window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);document.removeEventListener('pointerdown',outside);};
  },[open]);
  useEffect(()=>{if(active>=0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({block:'nearest'});},[active,listId]);
  const go=(row:Result | undefined)=>{if(row){if(demo){setOpen(false);window.dispatchEvent(new CustomEvent('rw-demo-security-navigate',{detail:{path:row.href}}));}else window.location.assign(row.href);}};
  return <div ref={root} data-name="Search" className="flex h-12 w-[380px] max-w-full shrink-0 items-center gap-3 rounded-lg border border-[#30343b] bg-[#1a1d22] px-3">
    <Search size={19} aria-hidden="true" className="shrink-0 text-[#9faabb]" />
    <input ref={input} type="search" role="combobox" aria-label="Search SOC" aria-autocomplete="list" aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open && active>=0 && results[active] ? `${listId}-${active}` : undefined}
      autoComplete="off" placeholder="Search names, IPs, alerts or tabs…" value={query} maxLength={128}
      className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#8c929c]"
      onChange={event=>{setQuery(event.target.value);setActive(-1);setOpen(true);}} onFocus={()=>setOpen(true)}
      onBlur={event=>{if (!popup.current?.contains(event.relatedTarget as Node)) setOpen(false);}}
      onKeyDown={event=>{
        if(event.key==='Escape'){setOpen(false);setActive(-1);}
        if(event.key==='ArrowDown'||event.key==='ArrowUp') {event.preventDefault();setOpen(true);setActive(index=>results.length ? (event.key==='ArrowDown' ? (index+1)%results.length : (index<=0 ? results.length-1 : index-1)) : -1);}
        if(event.key==='Enter'&&open&&results.length){event.preventDefault();go(results[active<0 ? 0 : active]);}
      }} />
    {query && <button type="button" aria-label="Clear SOC search" className="shrink-0 text-[#9faabb]" onClick={()=>{setQuery('');setActive(-1);input.current?.focus();}}><X size={16}/></button>}
    {open && createPortal(<div ref={popup} style={position} className="fixed z-[10000] overflow-hidden rounded-xl border border-[#445063] bg-[#141b25] text-[#f0f3f7] shadow-2xl">
      <div className="flex justify-between border-b border-[#303d4d] px-4 py-3 text-xs text-[#a9b9ce]"><span>{term ? 'Search results' : 'Go to a tab'}</span><span>↑ ↓ · Enter</span></div>
      <div id={listId} role="listbox" aria-label="SOC search results" style={{maxHeight:Math.max(80,Math.min(440,window.innerHeight-position.top-90))}} className="overflow-y-auto">
        {results.map((row,index)=><a id={`${listId}-${index}`} role="option" aria-selected={active===index} key={row.key} href={row.href} onMouseEnter={()=>setActive(index)} onMouseDown={event=>event.preventDefault()}
          className={`flex items-center gap-3 border-b border-[#293544] px-4 py-3 text-left last:border-0 hover:bg-[#263449] ${active===index?'bg-[#263449]':''}`}>
          <div className="min-w-0 flex-1"><p className="text-[10px] uppercase tracking-wider text-[#96acc6]">{row.kind}</p><p className="mt-1 truncate text-sm font-medium"><Highlight text={row.title} query={term}/></p><p className="mt-1 truncate text-xs text-[#b0bed0]"><Highlight text={row.description} query={term}/></p></div><ArrowUpRight size={16} aria-hidden="true" className="shrink-0 text-[#96acc6]"/>
        </a>)}
      </div>
      <div role="status" aria-live="polite" className="px-4 py-3 text-xs text-[#a9b9ce]">
        {term && loading ? 'Searching accounts and security records…' : term && data.query===term && data.error ? data.error : results.length ? `${results.length} results · Select one to open its tab` : 'No matching records or tabs.'}
      </div>
    </div>,document.body)}
  </div>;
}
