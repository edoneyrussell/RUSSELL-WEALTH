import EmptyState, { emptyActionClass } from './EmptyState';
import { useWatchlist } from '../hooks/useWatchlist';
import { useWatchlistQuotes } from '../hooks/useWatchlistQuotes';
import { watchlistMoney } from '../utils/watchlistQuote';
import AssetLogo from './AssetLogo';

export default function DashboardWatchlist() {
  const {items, symbols, loading, error} = useWatchlist();
  const prices = useWatchlistQuotes(symbols);
  return <section data-tour="watchlist" className="rw-fintech-panel rounded-[22px] border border-[#2B333D] bg-[#12171E] p-5 sm:p-6">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#91a498]">MARKET WATCH</p><h2 className="mt-2 font-['Lora'] text-[25px]">Your Watchlist</h2></div><a className="text-xs text-[#b4cbbd] hover:underline" href="/dashboard#watchlist">Manage watchlist →</a></div>
    {error && <p role="alert" className="mb-3 text-sm text-amber-200">{error}</p>}
    {loading ? <p className="text-sm text-[#91a498]">Loading your watchlist…</p> : items.length ? <>
      <p className="mb-3 text-xs text-[#91a498]">Current simulated prices · Daily change since yesterday · CAD</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(item => {
          const stock = prices.data[item.symbol];
          const quote = stock?.quote;
          const change = stock?.change;
          const percent = stock?.percent;
          const direction = change === undefined ? '' : change > 0 ? 'Up' : change < 0 ? 'Down' : 'Unchanged';
          const colour = change === undefined || change === 0 ? 'text-[#A5B2C2]' : change > 0 ? 'text-[#7DD9A8]' : 'text-[#F19A9A]';
          return <a key={item.symbol} href={`/markets?symbol=${encodeURIComponent(item.symbol)}`} className="rw-dashboard-stock rw-fintech-tile min-w-0 rounded-xl border border-[#34404D] p-3 hover:bg-[#202A35]" data-watchlist-symbol={item.symbol}>
            <div className="flex min-w-0 items-center gap-3"><AssetLogo symbol={item.symbol} name={item.name} size={32}/><div className="min-w-0"><p className="text-sm font-semibold">{item.symbol}</p><p className="truncate text-xs text-[#91a498]">{item.name}</p></div></div>
            <p className="mt-4 text-lg font-semibold">{quote ? watchlistMoney(quote.price, quote.currency) : prices.loading ? 'Loading…' : '—'}</p>
            <p className={`mt-1 text-xs ${colour}`} title={stock?.referenceDate ? `Compared with ${stock.referenceDate}` : undefined}>
              {typeof change === 'number' && typeof percent === 'number'
                ? `${direction} ${watchlistMoney(Math.abs(change), quote?.currency)} (${percent > 0 ? '+' : ''}${percent.toFixed(2)}%) today`
                : stock?.error ? 'Price refresh failed' : quote ? 'Daily change unavailable' : 'Loading daily change…'}
            </p>
          </a>;
        })}
      </div>
    </> : !error && <EmptyState title="Your watchlist is empty" description="Star an investment in Markets to follow it here. You can also add a symbol in Manage watchlist."><a href="/markets" className={emptyActionClass}>Explore markets</a></EmptyState>}
  </section>;
}
