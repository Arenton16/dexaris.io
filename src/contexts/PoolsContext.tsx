import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CHAIN_LABELS, type Pool } from '../types';

interface PoolsContextValue {
  allPools: Pool[];
  isLoading: boolean;
  error: string | null;
  fetchedAt: Date | null;
  refresh: () => void;
}

const PoolsContext = createContext<PoolsContextValue | null>(null);

function isValidApy(apy: number | null | undefined): boolean {
  return apy != null && Number.isFinite(apy) && apy >= 0.005;
}

export function PoolsProvider({ children }: { children: ReactNode }) {
  const [allPools, setAllPools] = useState<Pool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [fetchTick, setFetchTick] = useState(0);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    const supportedChains = new Set(Object.values(CHAIN_LABELS));
    const background = hasLoadedOnce.current;
    if (!background) setIsLoading(true);
    setError(null);

    fetch('https://yields.llama.fi/pools')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ data: Pool[] }>;
      })
      .then(({ data }) => {
        const filtered = data
          .filter(p =>
            supportedChains.has(p.chain) &&
            p.tvlUsd >= 1_000_000 &&
            isValidApy(p.apy) &&
            (p.apy ?? 0) <= 200
          )
          .sort((a, b) => b.tvlUsd - a.tvlUsd);
        hasLoadedOnce.current = true;
        setAllPools(filtered);
        setFetchedAt(new Date());
        setIsLoading(false);
      })
      .catch(() => {
        if (!hasLoadedOnce.current) setError('fetch_failed');
        setIsLoading(false);
      });
  }, [fetchTick]);

  const refresh = useCallback(() => setFetchTick(t => t + 1), []);

  return (
    <PoolsContext.Provider value={{ allPools, isLoading, error, fetchedAt, refresh }}>
      {children}
    </PoolsContext.Provider>
  );
}

export function usePools(): PoolsContextValue {
  const ctx = useContext(PoolsContext);
  if (!ctx) throw new Error('usePools must be used within PoolsProvider');
  return ctx;
}
