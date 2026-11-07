import { useEffect, useState } from 'react';

type Portfolio = {
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

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/customer/portfolio', {
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(response => {
        if (!response.ok) throw new Error('Portfolio request failed');
        return response.json();
      })
      .then(setPortfolio)
      .catch(error => {
        if (error.name !== 'AbortError') setError(true);
      });

    const refresh = () => {
      fetch('/api/customer/portfolio', {
        credentials: 'same-origin',
      })
        .then(response => {
          if (!response.ok) throw new Error('Portfolio refresh failed');
          return response.json();
        })
        .then(data => {
          setPortfolio(data);
          setError(false);
        })
        .catch(() => setError(true));
    };

    window.addEventListener('portfolio-updated', refresh);
    window.addEventListener('rw:portfolio-updated', refresh);

    return () => {
      controller.abort();
      window.removeEventListener('portfolio-updated', refresh);
      window.removeEventListener('rw:portfolio-updated', refresh);
    };
  }, []);

  return { portfolio, error };
}

export function formatCAD(value: string) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(Number(value));
}
