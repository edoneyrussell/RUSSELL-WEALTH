import { getLocale } from '../i18n/language.ts';
import { useExchanges } from "../hooks/useExchanges";
import { useCustomerFetch } from "../demo/customerDemo";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Moon } from "lucide-react";

export default function GlobalMarketsClock() {
  const { exchanges: markets, error } = useExchanges();
  const request=useCustomerFetch();
  const [selectedCode,setSelectedCode]=useState('TSX');
  const [saveError,setSaveError]=useState('');
  const revision=useRef(0),pending=useRef(0),writes=useRef(Promise.resolve());
  const selected=Math.max(0,markets.findIndex(item=>item.code===selectedCode));
  useEffect(()=>{
    const controller=new AbortController();
    let loading=false;
    const load=async()=>{
      if(loading||pending.current)return;
      loading=true;const version=revision.current;
      try {
        const response=await request('/api/me/market-clock',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
        if(response.ok){const data=await response.json();if(!controller.signal.aborted&&version===revision.current&&typeof data.exchange_code==='string')setSelectedCode(data.exchange_code);}
      }catch{ /* Keep the displayed clock during connection interruptions. */ }
      finally{loading=false;}
    };
    void load();const refresh=()=>{if(document.visibilityState==='visible')void load();};
    const timer=window.setInterval(refresh,60000);window.addEventListener('focus',refresh);
    return()=>{controller.abort();window.clearInterval(timer);window.removeEventListener('focus',refresh);};
  },[request]);
  const setSelected=(index:number)=>{
    const code=markets[index]?.code || 'TSX';setSelectedCode(code);revision.current++;pending.current++;setSaveError('');
    writes.current=writes.current.catch(()=>{}).then(async()=>{
      try {const response=await request('/api/me/market-clock',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({exchange_code:code})});if(!response.ok)throw new Error();}
      catch{setSaveError('Could not save the clock selection. Please try again.');}
      finally{pending.current--;}
    });
  };
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const market = markets[selected] ?? markets[0];
  const status = market.status;
  const opens = status?.next_open ? new Intl.DateTimeFormat(getLocale(), {
    timeZone: market.zone, weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: getLocale() !== 'fr-CA',
  }).format(new Date(status.next_open)) : null;
  const closes = status?.closes_at ? new Intl.DateTimeFormat(getLocale(), {
    timeZone: market.zone, hour: 'numeric', minute: '2-digit', hour12: getLocale() !== 'fr-CA',
  }).format(new Date(status.closes_at)) : null;

  const time = new Intl.DateTimeFormat(getLocale(), {
    timeZone: market.zone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: getLocale() !== 'fr-CA',
  }).format(now);

  const date = new Intl.DateTimeFormat(getLocale(), {
    timeZone: market.zone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(now);

  const move = (direction: number) => {
    setSelected((selected + direction + markets.length) % markets.length);
  };

  return (
    <div className="w-full rounded-xl border border-[#34404D] bg-[#171E27] px-3 py-2.5 text-[#C4CED9]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Clock3 size={14} className="shrink-0 text-[#91A9BA]" />
          <select
            aria-label="Select market exchange"
            value={selected}
            onChange={e => setSelected(Number(e.target.value))}
            className="min-w-0 max-w-[105px] cursor-pointer bg-transparent text-xs font-semibold text-[#E7EDF4] outline-none"
          >
            {markets.map((item, index) => (
              <option key={item.code} value={index} className="bg-[#171E27]">
                {item.code}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous market"
            onClick={() => move(-1)}
            className="rounded-md p-1 hover:bg-[#293440]"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            aria-label="Next market"
            onClick={() => move(1)}
            className="rounded-md p-1 hover:bg-[#293440]"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="mt-1 flex items-end justify-between gap-2">
        <span className="whitespace-nowrap font-mono text-[17px] font-semibold tabular-nums text-white">
          {time}
        </span>
        <span className="pb-0.5 text-right text-[10px] text-[#91A0B0]">
          {date}
        </span>
      </div>

      {saveError && <p role="alert" className="mt-1 text-[10px] text-amber-200">{saveError}</p>}
      <div className="mt-1 text-[10px] text-[#91A0B0]">
        {market.city} local time
      </div>
      <div className="mt-1.5 border-t border-[#34404D] pt-1.5 text-[10px]" aria-label="Market session status">
        <p className={status?.is_open ? 'flex items-center gap-1 text-[#8ED7AF]' : 'text-[#A8B4C2]'}>
          {status?.session === 'overnight' && <Moon size={11} aria-label="Night session" />}
          {error || (!status ? 'Checking market status…' : status.is_open ?
            status.session === 'overnight' ? 'Night market open · Simulated' : 'Market open' : 'Market closed')}
        </p>
        {status && <p className="mt-0.5 text-[#91A0B0]">
          {status.is_open ? closes ? `Closes ${closes} local` : 'Open 24/7' :
            opens ? `${status.next_session === 'overnight' ? 'Night session opens' : 'Opens'} ${opens} local` : status.message}
        </p>}
      </div>
    </div>
  );
}
