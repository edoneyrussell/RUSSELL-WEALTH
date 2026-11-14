// Send an invalidation marker only. Watchlist contents belong to the server account.
export function notifyWatchlistUpdated() {
  window.dispatchEvent(new Event('russellwealth:watchlist-updated'));
  try { localStorage.setItem('rw-watchlist-sync', String(Date.now())); } catch { /* Polling also synchronizes devices. */ }
}
