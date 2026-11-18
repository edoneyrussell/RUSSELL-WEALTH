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

export function subscribePortfolioUpdates(refresh: () => void, pollMs = 30000, listenVisibility = true) {
  let queued: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {if(queued===undefined)queued=setTimeout(()=>{queued=undefined;refresh();},100);};
  const onVisible = () => {
    if (document.visibilityState === 'visible') schedule();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey) schedule();
  };
  const interval = window.setInterval(onVisible, pollMs);
  window.addEventListener('portfolio-updated', schedule);
  window.addEventListener('rw:portfolio-updated', schedule);
  if(listenVisibility){window.addEventListener('focus', onVisible);window.addEventListener('online', onVisible);}
  window.addEventListener('storage', onStorage);
  if(listenVisibility)document.addEventListener('visibilitychange', onVisible);
  let channel: BroadcastChannel | undefined;
  try {
    channel = new BroadcastChannel(channelName);
    channel.addEventListener('message', schedule);
  } catch { /* Fall back to storage events and polling. */ }

  return () => {
    window.clearInterval(interval);
    clearTimeout(queued);
    window.removeEventListener('portfolio-updated', schedule);
    window.removeEventListener('rw:portfolio-updated', schedule);
    window.removeEventListener('focus', onVisible);
    window.removeEventListener('online', onVisible);
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', onVisible);
    channel?.close();
  };
}
