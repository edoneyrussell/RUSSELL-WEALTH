import { useEffect, useState } from 'react';
import { Moon, Timer } from 'lucide-react';
import { marketCountdown } from '../utils/marketCountdown';

export type TradeMarketStatus = {
  is_open:boolean; message:string; next_open:string|null; closes_at:string|null;
  exchange?:string; next_session?:string|null; session?:string;
  checked_at?:string; is_simulated_session?:boolean;
};
export default function MarketCountdown({status, error}: {status:TradeMarketStatus|null; error:string}) {
  const [clock,setClock] = useState({now:Date.now(),received:Date.now()});
  useEffect(()=>{const now=Date.now();setClock({now,received:now});},[status]);
  useEffect(()=>{const timer=window.setInterval(()=>setClock(value=>({...value,now:Date.now()})),1000);return()=>window.clearInterval(timer);},[]);
  const checked = status?.checked_at ? Date.parse(status.checked_at) : NaN;
  const now = Number.isFinite(checked) ? checked + Math.max(0,clock.now-clock.received) : clock.now;
  const countdown = marketCountdown(status?.is_open ? status.closes_at : status?.next_open,now);
  const night = status?.session === 'overnight' || status?.next_session === 'overnight';
  return <div className="mt-4 rounded-xl border border-[#34485E] bg-[#111C29] p-4 text-center" aria-label="Selected asset market countdown">
    <p className="flex items-center justify-center gap-2 text-xs text-[#A9BCD3]">{night ? <Moon size={15}/> : <Timer size={15}/>} {status?.exchange ?? 'Selected exchange'}{night ? ' · Simulated night session' : ''}</p>
    <p className="mt-2 text-sm font-semibold text-[#E0E9F5]">{error ? 'Market status unavailable' : !status ? 'Checking market hours…' : status.exchange==='CRYPTO' ? 'Market open · 24/7' : countdown ? countdown.seconds===0 ? 'Refreshing market status…' : status.is_open ? 'Market closes in' : 'Market opens in' : status.is_open ? 'Market open' : 'Opening time unavailable'}</p>
    {!error && countdown && countdown.seconds>0 && <p className="mt-2 font-mono text-xl tabular-nums tracking-wide text-white">{countdown.text}</p>}
  </div>;
}
