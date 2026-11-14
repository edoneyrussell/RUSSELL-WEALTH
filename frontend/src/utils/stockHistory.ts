export type PricePoint = { date: string; close: number };
export const historyRanges = ['1W', '1M', '1Y', 'ALL'] as const;
export type HistoryRange = typeof historyRanges[number];

export function normalizePriceHistory(history: unknown): PricePoint[] {
  if (!Array.isArray(history)) return [];
  const dates = new Map<string, PricePoint>();
  for (const item of history) {
    if (!item || typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) continue;
    const close = Number(item.close);
    if (!Number.isFinite(Date.parse(item.date)) || !Number.isFinite(close) || close <= 0) continue;
    dates.set(item.date, { date: item.date, close });
  }
  return [...dates.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function priceHistoryRange(history: readonly PricePoint[], range: HistoryRange): PricePoint[] {
  if (range === 'ALL' || !history.length) return [...history];
  const days = { '1W': 7, '1M': 30, '1Y': 365 }[range];
  const cutoff = Date.parse(history[history.length - 1].date) - (days - 1) * 86400000;
  return history.filter(point => Date.parse(point.date) >= cutoff);
}
