import { subscribePortfolioUpdates } from "../utils/portfolioSync";
import { useCustomerFetch } from "../demo/customerDemo";
import { useCallback, useEffect, useRef, useState } from 'react';

export type Portfolio = {
  account_id?: number;
  account_type?: string;
  management_mode?: string;
  account_name: string;
  currency: string;
  cash_balance: string;
  invested_value: string;
  total_value: string;
  history?: Array<{ time: number; value: number }>;
  holdings: Array<{
    symbol: string;
    name: string;
    asset_type?: string;
    type?: string;
    currency?: string;
    exchange?: string;
    quantity: string;
    price: string;
    market_value: string;
  }>;
};

export function usePortfolio() {
  const customerFetch = useCustomerFetch();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const pending = useRef<AbortController | null>(null);

  const queued = useRef(false);

  const refresh = useCallback(async () => {
    // Let slow mobile connections finish instead of restarting them every poll.
    if (pending.current && !pending.current.signal.aborted) { queued.current = true; return; }
    const controller = new AbortController();
    pending.current = controller;
    try {
      const response = await customerFetch('/api/customer/portfolio', {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(response.status === 401
          ? 'Your session expired. Please sign in again to view your holdings.'
          : 'Unable to refresh holdings. Please try again.');
      }
      const data: Portfolio = await response.json();
      if (!data || !Array.isArray(data.holdings) ||
          data.cash_balance === undefined || data.total_value === undefined) {
        throw new Error('Unable to load holdings. Please try again.');
      }
      // Ignore an older response if another refresh or unmount superseded it.
      if (controller.signal.aborted) return;
      setPortfolio(data);
      setError('');
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Unable to refresh holdings.');
    } finally {
      if (pending.current === controller) pending.current = null;
      if (!controller.signal.aborted) {
        setLoading(false);
        if (queued.current) { queued.current = false; void refresh(); }
      }
    }
  }, [customerFetch]);

  useEffect(() => {
    void refresh();
    const unsubscribe = subscribePortfolioUpdates(() => { void refresh(); });
    return () => {
      unsubscribe();
      pending.current?.abort();
    };
  }, [refresh]);

  return { portfolio, error, loading, refresh };
}

export function formatCAD(value: string) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(Number(value));
}
