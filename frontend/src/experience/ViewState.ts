import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
const prefix = 'rw-view:';
export function clearViewMemory() {
  for (const key of Object.keys(sessionStorage)) if (key.startsWith(prefix)) sessionStorage.removeItem(key);
}
export function readViewState<T>(key: string, fallback: T): T {
  try { const raw = sessionStorage.getItem(prefix + key); if(raw===null)return fallback;const value=JSON.parse(raw);
    if(key.endsWith(':account'))return (value==='all'||(Number.isInteger(value)&&value>0))?value:fallback;
    return typeof value===typeof fallback ? value : fallback; }
  catch { return fallback; }
}
export function useViewState<T>(key: string, initial: T | (() => T), preferInitial = false): [T, Dispatch<SetStateAction<T>>] {
  const storageKey=location.pathname.startsWith('/demo/') ? location.pathname+':'+key : key;
  const [value, setValue] = useState<T>(() => (preferInitial ? (typeof initial === 'function' ? (initial as () => T)() : initial) : readViewState(storageKey, typeof initial === 'function' ? (initial as () => T)() : initial)));
  useEffect(() => {try {sessionStorage.setItem(prefix + storageKey, JSON.stringify(value));} catch { /* Private browsing may disable storage. */ }}, [storageKey,value]);
  return [value,setValue];
}
