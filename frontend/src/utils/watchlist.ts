export const WATCHLIST_KEY = "russellwealth:watchlist:v1";

export function getWatchlist(): string[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(WATCHLIST_KEY) || "[]"
    );
    return Array.isArray(value)
      ? Array.from(new Set(
          value.filter((s): s is string => typeof s === "string")
            .map(s => s.trim().toUpperCase())
            .filter(Boolean)
        ))
      : [];
  } catch {
    return [];
  }
}

export function saveWatchlist(symbols: string[]) {
  localStorage.setItem(
    WATCHLIST_KEY,
    JSON.stringify(Array.from(new Set(symbols)))
  );
  window.dispatchEvent(new Event("russellwealth:watchlist-updated"));
}

export function toggleWatchlist(symbol: string) {
  const current = getWatchlist();
  const normalized = symbol.toUpperCase();
  const next = current.includes(normalized)
    ? current.filter(s => s !== normalized)
    : [...current, normalized];

  saveWatchlist(next);
  return next;
}
