import { useEffect, useState } from 'react';
import { useCustomerFetch } from '../demo/customerDemo';
import { readWatchlistQuote, type WatchlistPrice } from '../utils/watchlistQuote';

export function useWatchlistQuotes(symbols: readonly string[], enabled = true) {
  const customerFetch = useCustomerFetch();
  const key = [...new Set(symbols)].sort().join('|');
  const [snapshot, setSnapshot] = useState<{key:string; data:Record<string, WatchlistPrice>}>({key:'', data:{}});
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!enabled || !key) { setLoading(false); return; }
    const controller = new AbortController();
    let pending = false;
    async function load() {
      if (pending || controller.signal.aborted) return;
      pending = true;
      setLoading(true);
      const entries = await Promise.all(key.split('|').map(async (symbol): Promise<[string, WatchlistPrice]> => {
        try {
          const response = await customerFetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}`, {
            credentials:'same-origin', cache:'no-store', signal:controller.signal,
          });
          if (!response.ok) throw new Error('Price unavailable');
          return [symbol, readWatchlistQuote(await response.json(), symbol)];
        } catch {
          return [symbol, {error:'Unable to refresh this price. Please try again.'}];
        }
      }));
      if (!controller.signal.aborted) {
        setSnapshot({key, data:Object.fromEntries(entries)});
        setLoading(false);
      }
      pending = false;
    }
    void load();
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [key, enabled, customerFetch, revision]);

  return {data: snapshot.key === key ? snapshot.data : {}, loading,
    refresh: () => setRevision(value => value + 1)};
}
