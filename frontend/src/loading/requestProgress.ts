/** Track real fetch/body completion; elapsed time never advances progress. */
export type LoadProgress = { total: number; completed: number; visible: boolean };
const empty: LoadProgress = {total: 0, completed: 0, visible: false};

export function createRequestProgress() {
  let state = empty;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const emit = (next: LoadProgress) => {state = next; listeners.forEach(listener => listener());};
  return {
    snapshot: () => state,
    subscribe: (listener: () => void) => {listeners.add(listener); return () => {listeners.delete(listener);};},
    start() {
      clearTimeout(hideTimer);
      const pending = state.total > state.completed;
      emit({total: pending ? state.total + 1 : 1, completed: pending ? state.completed : 0, visible: true});
      let settled = false;
      return () => {
        if (settled) return;
        settled = true;
        emit({...state, completed: state.completed + 1});
        if (state.completed === state.total) {
          hideTimer = setTimeout(() => emit({...state, visible: false}), 180);
        }
      };
    },
  };
}

export const requestProgress = createRequestProgress();
export function createRequestPolicy() {
  let route = '';
  const seen = new Set<string>();
  return (page: string, url: string, method = 'GET') => {
    if (page !== route) {route = page;seen.clear();}
    if (url.includes('/session-heartbeat')) return false;
    if (method !== 'GET') return true;
    if (seen.has(url)) return false;
    seen.add(url); return true;
  };
}
let installed = false;
export function installRequestProgress() {
  if (installed) return;
  installed = true;
  const original = window.fetch.bind(window);
  const track = createRequestPolicy();
  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) return original(input, init);
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const finish = track(location.pathname + location.search, url.pathname + url.search, method) ? requestProgress.start() : () => {};
    try {
      const response = await original(input, init);
      let consumingBody = false;
      // Keep the request pending until the data used by the screen is decoded.
      for (const method of ['json', 'text', 'blob', 'arrayBuffer', 'formData'] as const) {
        const read = response[method].bind(response);
        Object.defineProperty(response, method, {configurable: true, value: (...args: unknown[]) => {
          consumingBody = true;
          return (read as (...args: unknown[]) => Promise<unknown>)(...args).finally(finish);
        }});
      }
      // Responses with no consumed body (e.g. heartbeats) still finish normally.
      setTimeout(() => {if (!consumingBody) finish();}, 0);
      return response;
    } catch (error) {finish(); throw error;}
  };
}
