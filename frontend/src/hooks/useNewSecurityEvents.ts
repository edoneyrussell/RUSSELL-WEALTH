import { useEffect, useRef, useState } from 'react';

export function useNewSecurityEvents(ids: number[]) {
  const previousIds = useRef<Set<number> | null>(null);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const current = new Set(ids);

    if (previousIds.current === null) {
      previousIds.current = current;
      return;
    }

    const incoming = ids.filter(id => !previousIds.current!.has(id));
    previousIds.current = current;

    if (incoming.length === 0) return;

    setNewIds(new Set(incoming));

    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }

    timer.current = window.setTimeout(() => {
      setNewIds(new Set());
      timer.current = null;
    }, 1100);
  }, [ids.join(',')]);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  return newIds;
}
