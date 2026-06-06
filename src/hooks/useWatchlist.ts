import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getAnonymousId } from '../lib/anonymousId';

export function useWatchlist() {
  const [ids, setIds] = useState<Set<string>>(new Set());

  // On mount: load this user's watchlist from Supabase.
  // Fails silently — if Supabase is unreachable the UI renders with an empty watchlist.
  useEffect(() => {
    const anonId = getAnonymousId();
    supabase
      .from('watchlists')
      .select('pool_id')
      .eq('anonymous_id', anonId)
      .then(({ data, error }) => {
        if (error || !data) return;
        setIds(new Set(data.map((r: { pool_id: string }) => r.pool_id)));
      });
  }, []);

  // Optimistic toggle: update local state immediately, sync to Supabase in background.
  // If Supabase fails the session state stays correct but won't persist to next visit.
  const toggle = useCallback((poolId: string) => {
    const anonId = getAnonymousId();
    setIds(prev => {
      const next = new Set(prev);
      if (next.has(poolId)) {
        next.delete(poolId);
        supabase
          .from('watchlists')
          .delete()
          .eq('anonymous_id', anonId)
          .eq('pool_id', poolId)
          .then(() => {});
      } else {
        next.add(poolId);
        supabase
          .from('watchlists')
          .insert({ anonymous_id: anonId, pool_id: poolId })
          .then(() => {});
      }
      return next;
    });
  }, []);

  return { ids, toggle };
}
