import { getLocale } from '../i18n/language.ts';
export type WatchlistQuote = {
  symbol: string;
  price: number;
  currency: string;
  provider: string;
  as_of: string | number | null;
  price_type: string;
};
export type WatchlistPrice = {
  quote?: WatchlistQuote;
  change?: number;
  percent?: number;
  referenceDate?: string;
  error?: string;
};

export function readWatchlistQuote(value: unknown, symbol: string): WatchlistPrice {
  const data = value as Record<string, unknown> | null;
  if (!data || data.symbol !== symbol || typeof data.price !== 'number' ||
      !Number.isFinite(data.price) || data.price <= 0 ||
      typeof data.currency !== 'string' || !/^[A-Z]{3}$/.test(data.currency)) {
    throw new Error('Price unavailable');
  }
  const quote: WatchlistQuote = {
    symbol, price: data.price, currency: data.currency,
    provider: typeof data.provider === 'string' ? data.provider : 'Market data',
    as_of: typeof data.as_of === 'string' || typeof data.as_of === 'number' ? data.as_of : null,
    price_type: typeof data.price_type === 'string' ? data.price_type : 'MARKET',
  };
  const result: WatchlistPrice = {quote};
  // Movement must come from the same daily snapshot as the displayed price.
  // Missing reference data is not reported as a zero gain/loss.
  if (typeof data.previous_close === 'number' && Number.isFinite(data.previous_close) && data.previous_close > 0 &&
      typeof data.reference_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.reference_date)) {
    result.change = Math.round((quote.price - data.previous_close) * 100) / 100;
    result.percent = result.change / data.previous_close * 100;
    result.referenceDate = data.reference_date;
  }
  return result;
}

export function watchlistMoney(value: number, currency = 'CAD') {
  return new Intl.NumberFormat(getLocale(), {style:'currency', currency, maximumFractionDigits:2}).format(value);
}
