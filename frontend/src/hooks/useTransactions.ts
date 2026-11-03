import { useEffect, useState } from 'react';

export type Transaction = {
  id: number;
  symbol: string;
  name: string;
  action: 'BUY' | 'SELL';
  quantity: string;
  price: string;
  total: string;
  created_at: string;
};

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const response = await fetch('/api/customer/transactions', {
          credentials: 'same-origin',
        });

        if (!response.ok) {
          throw new Error('Failed to load transactions');
        }

        const data = await response.json();

        if (active) {
          setTransactions(data.transactions);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    refresh();
    window.addEventListener('portfolio-updated', refresh);

    return () => {
      active = false;
      window.removeEventListener('portfolio-updated', refresh);
    };
  }, []);

  return { transactions, loading, error };
}
