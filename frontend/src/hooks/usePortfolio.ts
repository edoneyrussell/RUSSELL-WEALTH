import { useCallback, useEffect, useState } from 'react';

export type Portfolio = {
  account_name: string;
  currency: string;
  cash_balance: string;
  invested_value: string;
  total_value: string;
  holdings: Array<{
    symbol: string;
    name: string;
    asset_type: string;
    quantity: string;
    price: string;
    market_value: string;
  }>;
};

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [error, setError] = useState(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/customer/portfolio', {
        credentials: 'same-origin',
        cache: 'no-store',
        signal,
      });

      if (!response.ok) {
        throw new Error('Portfolio request failed');
      }

      const data: Portfolio = await response.json();

      if (
        !data ||
        !Array.isArray(data.holdings) ||
        data.cash_balance === undefined ||
        data.total_value === undefined
      ) {
        throw new Error('Invalid portfolio response');
      }

      setPortfolio(data);
      setError(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(true);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void refresh(controller.signal);

    // Keep account data synchronized across dashboard sessions.
    const interval = window.setInterval(() => {
      void refresh();
    }, 10000);

    const onPortfolioUpdated = () => {
      void refresh();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    window.addEventListener('portfolio-updated', onPortfolioUpdated);
    window.addEventListener('rw:portfolio-updated', onPortfolioUpdated);
    window.addEventListener('focus', onVisibilityChange);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Synchronize other tabs on the same browser.
    const channel = typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel('rw-portfolio-sync')
      : null;

    channel?.addEventListener('message', onPortfolioUpdated);

    return () => {
      controller.abort();
      window.clearInterval(interval);

      window.removeEventListener('portfolio-updated', onPortfolioUpdated);
      window.removeEventListener('rw:portfolio-updated', onPortfolioUpdated);
      window.removeEventListener('focus', onVisibilityChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);

      channel?.removeEventListener('message', onPortfolioUpdated);
      channel?.close();
    };
  }, [refresh]);

  return { portfolio, error };
}

export function formatCAD(value: string) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(Number(value));
}
