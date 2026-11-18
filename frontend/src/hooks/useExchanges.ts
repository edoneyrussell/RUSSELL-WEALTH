import { useEffect, useState } from 'react';
import { useCustomerFetch } from '../demo/customerDemo';

export type ExchangeStatus = {
  is_open: boolean; session: 'regular' | 'overnight' | 'closed' | 'continuous' | 'unavailable';
  message: string; next_open: string | null; closes_at: string | null; checked_at: string;
  is_simulated_session: boolean; next_session?: string | null;
};
export type Exchange = { code: string; name: string; city: string; zone: string; status?: ExchangeStatus };
const initialMarkets: Exchange[] = [
  { code: 'TSX', name: 'Toronto Stock Exchange', city: 'Toronto', zone: 'America/Toronto' },
  { code: 'NASDAQ', name: 'Nasdaq', city: 'New York', zone: 'America/New_York' },
  { code: 'NYSE', name: 'New York Stock Exchange', city: 'New York', zone: 'America/New_York' },
  { code: 'LSE', name: 'London Stock Exchange', city: 'London', zone: 'Europe/London' },
  { code: 'TSE', name: 'Tokyo Stock Exchange', city: 'Tokyo', zone: 'Asia/Tokyo' },
  { code: 'HKEX', name: 'Hong Kong Stock Exchange', city: 'Hong Kong', zone: 'Asia/Hong_Kong' },
  { code: 'ASX', name: 'Australian Securities Exchange', city: 'Sydney', zone: 'Australia/Sydney' },
];

export function useExchanges() {
  const request = useCustomerFetch();
  const [exchanges, setExchanges] = useState<Exchange[]>(initialMarkets);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let pending = false;
    const controller = new AbortController();
    async function load() {
      if (pending) return;
      pending = true;
      try {
        const response = await request('/api/customer/exchanges', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Exchange status unavailable');
        const data = await response.json();
        if (!Array.isArray(data.exchanges) || data.exchanges.length === 0) throw new Error('Exchange status unavailable');
        if (active) { setExchanges(data.exchanges); setError(''); }
      } catch {
        if (active) {
          setError('Exchange status unavailable');
          setExchanges(previous => previous.map(({ status: _status, ...exchange }) => exchange));
        }
      } finally { pending = false; }
    }
    const visible = () => { if (document.visibilityState === 'visible') void load(); };
    void load();
    const timer = window.setInterval(visible, 60000);
    window.addEventListener('focus', visible);
    document.addEventListener('visibilitychange', visible);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', visible);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [request]);
  return { exchanges, error };
}
