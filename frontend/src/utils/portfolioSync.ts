const channelName = 'rw-portfolio-sync';
const storageKey = 'rw-portfolio-sync';

// Notify this page and other tabs after the server commits a trade or transfer.
export function notifyPortfolioUpdated() {
  window.dispatchEvent(new Event('portfolio-updated'));
  try {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage('updated');
    channel.close();
  } catch { /* Polling and storage also work without BroadcastChannel. */ }
  try {
    localStorage.setItem(storageKey, String(Date.now()));
  } catch { /* Storage may be unavailable in private browsing. */ }
}

export function subscribePortfolioUpdates(refresh: () => void) {
  const onVisible = () => {
    if (document.visibilityState === 'visible') refresh();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey) refresh();
  };
  const interval = window.setInterval(onVisible, 10000);
  window.addEventListener('portfolio-updated', refresh);
  window.addEventListener('rw:portfolio-updated', refresh);
  window.addEventListener('focus', onVisible);
  window.addEventListener('online', onVisible);
  window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', onVisible);
  let channel: BroadcastChannel | undefined;
  try {
    channel = new BroadcastChannel(channelName);
    channel.addEventListener('message', refresh);
  } catch { /* Fall back to storage events and polling. */ }

  return () => {
    window.clearInterval(interval);
    window.removeEventListener('portfolio-updated', refresh);
    window.removeEventListener('rw:portfolio-updated', refresh);
    window.removeEventListener('focus', onVisible);
    window.removeEventListener('online', onVisible);
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', onVisible);
    channel?.close();
  };
}
