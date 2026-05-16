import { useCallback, useState } from 'react';

const STORAGE_KEY = 'dexaris_watchlist';

function loadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function useWatchlist() {
  const [ids, setIds] = useState<Set<string>>(loadIds);

  const toggle = useCallback((poolId: string) => {
    setIds(prev => {
      const next = new Set(prev);
      if (next.has(poolId)) {
        next.delete(poolId);
      } else {
        next.add(poolId);
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }, []);

  return { ids, toggle };
}
