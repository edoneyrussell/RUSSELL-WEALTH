export type PortfolioPoint = { time: number; value: number };
export type PortfolioRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

export function buildHistorySeries(
  history: PortfolioPoint[], value: number | null, range: PortfolioRange, now = Date.now(),
): PortfolioPoint[] {
  const days = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, '1Y': 365, ALL: Infinity };
  const points = history.filter(point => Number.isFinite(point.time) && Number.isFinite(point.value)
    && point.time >= now - days[range] * 86400000 && point.time <= now)
    .sort((a, b) => a.time - b.time);
  const last = points.at(-1);
  if (value !== null && Number.isFinite(value) && (points.length > 0 || value > 0)) {
    if (!last || last.value !== value) points.push({ time: now, value });
    else if (last.time < now) points.push({ time: now, value });
  }
  // A flat baseline displays the first observed balance without inventing returns.
  if (points.length === 1) points.push({ ...points[0], time: points[0].time + 1 });
  return points;
}
