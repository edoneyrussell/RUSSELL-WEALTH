// Group executions of the same asset and side on the same UTC trading day.
export type GroupableTransaction = {
  id: string | number; action: string; symbol: string; category?: string;
  quantity: string | null; total: string; created_at: string;
};
export function groupTransactions<T extends GroupableTransaction>(entries: T[]) {
  const groups = new Map<string, { key: string; entries: T[]; total: number; quantity: number }>();
  for (const entry of entries) {
    const trade = entry.action === 'BUY' || entry.action === 'SELL';
    const key = trade ? JSON.stringify([entry.created_at.slice(0, 10), entry.action, entry.symbol, entry.category]) : `entry:${entry.id}`;
    const group = groups.get(key) ?? { key, entries: [], total: 0, quantity: 0 };
    group.entries.push(entry);
    // Amounts are denominated in cents; avoid accumulating decimal currency errors.
    group.total += Math.round(Number(entry.total) * 100);
    group.quantity += Number(entry.quantity ?? 0);
    groups.set(key, group);
  }
  return [...groups.values()].map(group => ({ ...group, total: group.total / 100, quantity: Number(group.quantity.toFixed(8)) }));
}
