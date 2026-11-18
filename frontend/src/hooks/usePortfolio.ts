import { getLocale } from '../i18n/language.ts';
import { subscribePortfolioUpdates } from "../utils/portfolioSync";
import { useCustomerFetch } from "../demo/customerDemo";
import { useEffect } from 'react';
import { useRemoteData } from '../experience/useRemoteData';

export type Portfolio = {
  account_id?: number | null;
  account_type?: string;
  management_mode?: string | null;
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

export type AccountScope = 'all' | number;

export function usePortfolio(scope?: AccountScope) {
  const customerFetch = useCustomerFetch();
  const result = useRemoteData<Portfolio>('/api/customer/portfolio' + (scope === undefined ? '' : `?account_id=${scope}`), customerFetch, {
    validate: data => Boolean(data && Array.isArray(data.holdings) && data.cash_balance !== undefined && data.total_value !== undefined),
  });
  useEffect(() => subscribePortfolioUpdates(() => {void result.refresh();},30000,false), [result.refresh]);
  return {portfolio:result.data, error:result.error, loading:result.loading, refresh:result.refresh, updatedAt:result.updatedAt};
}

export function formatCAD(value: string) {
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency: 'CAD',
  }).format(Number(value));
}
