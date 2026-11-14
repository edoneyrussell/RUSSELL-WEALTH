import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useCustomerFetch } from '../demo/customerDemo';
import { historyRanges, normalizePriceHistory, priceHistoryRange, type HistoryRange, type PricePoint } from '../utils/stockHistory';

const dateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-CA', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' });

export default function StockPriceHistory({ symbol }: { symbol: string }) {
  const customerFetch = useCustomerFetch();
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [currency, setCurrency] = useState('CAD');
  const [simulated, setSimulated] = useState(false);
  const [range, setRange] = useState<HistoryRange>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    let pending: AbortController | null = null;
    setHistory([]);
    setLoading(true);
    setError('');
    async function load() {
      if (pending) return;
      const controller = new AbortController();
      pending = controller;
      try {
        const response = await customerFetch(`/api/market/history?symbol=${encodeURIComponent(symbol)}`, {
          credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        });
        if (!response.ok) throw new Error('Price history is unavailable. Please try again.');
        const data = await response.json();
        const points = normalizePriceHistory(data.history);
        if (!points.length) throw new Error('No price history is available for this asset yet.');
        if (active) {
          setHistory(points);
          setSimulated(data.price_type === 'SIMULATED');
          setCurrency(/^[A-Z]{3}$/.test(data.currency) ? data.currency : 'CAD');
          setError('');
        }
      } catch (err) {
        if (active && !controller.signal.aborted) setError(err instanceof Error ? err.message : 'Price history unavailable.');
      } finally {
        if (active) setLoading(false);
        pending = null;
      }
    }
    void load();
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      pending?.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [symbol, customerFetch, retry]);

  const points = priceHistoryRange(history, range);
  const money = (value: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(value);
  const first = points[0];
  const last = points[points.length - 1];
  return (
    <section aria-label={`${symbol} historical prices`} className="mt-4 min-w-0 rounded-xl border border-[#455262] bg-[#111821] p-4">
      <h3 className="text-sm font-semibold text-[#C0CBD8]">Historical Price Chart · {symbol}</h3>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Price history range">
        {historyRanges.map(item => <button key={item} type="button" aria-pressed={range === item} onClick={() => setRange(item)} className={`rounded-lg border px-3 py-1.5 text-xs ${range === item ? 'border-[#8DA9C9] bg-[#2D415A] text-white' : 'border-[#34404D] text-[#A5B2C2] hover:bg-[#202D3D]'}`}>{item === 'ALL' ? 'All' : item}</button>)}
      </div>
      {loading ? <p role="status" className="py-10 text-xs text-[#A5B2C2]">Loading price history…</p> : null}
      {error && <div role="status" className="mt-3 text-xs text-[#F0C89D]">{error}{history.length > 0 && ' Showing the last loaded history.'} <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
      {!loading && first && last && <>
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 text-xs text-[#A5B2C2]"><strong className="text-base text-white">{money(last.close)}</strong><span>{dateLabel(first.date)} – {dateLabel(last.date)}</span></div>
        <div className="mt-3 h-[220px] w-full" role="img" aria-label={`${symbol} daily prices from ${dateLabel(first.date)} to ${dateLabel(last.date)}; latest ${money(last.close)}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid stroke="#2B3746" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={date => date.slice(5)} minTickGap={45} tick={{ fill: '#91A0B0', fontSize: 10 }} />
              <YAxis width={52} tickFormatter={value => Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(0)}k` : String(value)} tick={{ fill: '#91A0B0', fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip labelFormatter={label => dateLabel(String(label))} formatter={value => [money(Number(value)), 'Daily price']} contentStyle={{ background: '#202A35', border: '1px solid #465362', borderRadius: 12, color: '#F2F4F7' }} />
              <Line type="linear" dataKey="close" stroke="#8DBBFF" strokeWidth={2} dot={points.length === 1 ? { r: 4 } : false} activeDot={{ r: 5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-[#8795A5]">{simulated ? 'Simulated daily prices · CAD · Updates at midnight Regina time. All shows eight years of simulated history, including a generated backfill. These are not real exchange prices.' : `Available recorded daily prices · ${currency}. All shows the full available history.`}</p>
      </>}
    </section>
  );
}
