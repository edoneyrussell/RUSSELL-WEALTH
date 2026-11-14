import { useCustomerFetch } from '../demo/customerDemo';
import { useEffect, useState } from 'react';
import { subscribePortfolioUpdates } from '../utils/portfolioSync';

export type Transaction = {
  id: string | number;
  symbol: string;
  name: string;
  action: string;
  quantity: string | null;
  price: string | null;
  total: string;
  created_at: string;
  category?: string;
  bank_code?: string | null;
};

export function useTransactions() {
  const customerFetch = useCustomerFetch();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false, queued = false;
    const refresh = async () => {
      if (pending) { queued = true; return; }
      pending = true;
      try {
        const response = await customerFetch('/api/customer/transactions', {
          credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        });
        if (!response.ok) throw new Error('Failed to load transactions');
        const data = await response.json();
        if (!Array.isArray(data.transactions)) throw new Error('Invalid transactions');
        if (!controller.signal.aborted) { setTransactions(data.transactions); setError(false); }
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        pending = false;
        if (!controller.signal.aborted) {
          setLoading(false);
          if (queued) { queued = false; void refresh(); }
        }
      }
    };
    void refresh();
    const unsubscribe = subscribePortfolioUpdates(() => { void refresh(); });
    return () => { controller.abort(); unsubscribe(); };
  }, [customerFetch]);
  return { transactions, loading, error };
}
