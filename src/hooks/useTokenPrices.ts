import { useEffect, useState } from 'react';

export interface TokenPrice {
  price: number | null;
  change24h: number | null;
  change7d: number | null;
  sparkline: number[];
  isStable: boolean;
}

export type PriceMap = Record<string, TokenPrice>;

const STABLECOINS = new Set(['USDC', 'USDT', 'DAI', 'FRAX', 'LUSD', 'BUSD', 'TUSD', 'USDP']);

// Known CoinGecko symbols — skip tokens outside this set to avoid wasted fetches
const KNOWN_SYMBOLS = new Set([
  'ETH','WETH','USDC','USDT','DAI','WBTC','BTC','SOL','ARB','OP','MATIC',
  'AVAX','BNB','LINK','UNI','AAVE','CRV','CVX','LDO','GMX','PENDLE','SNX',
  'MKR','COMP','BAL','FXS','RPL','GNO','SUSHI','1INCH',
]);

// 5-minute in-memory cache keyed by sorted symbol list
const cache = new Map<string, { data: PriceMap; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

// Parse a pool symbol string into individual token symbols.
// e.g. "USDC-ETH" → ["USDC", "ETH"], "3Crv" → []
export function parsePoolSymbols(poolSymbol: string): string[] {
  return poolSymbol
    .split(/[-/]/)
    .map(s => s.replace(/\.[a-z]+$/i, '').toUpperCase().trim())
    .filter(s => KNOWN_SYMBOLS.has(s));
}

export function useTokenPrices(poolSymbol: string) {
  const symbols = parsePoolSymbols(poolSymbol);
  const cacheKey = [...symbols].sort().join(',');

  const [prices, setPrices] = useState<PriceMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbols.length) {
      setPrices({});
      setLoading(false);
      setError(null);
      return;
    }

    // Serve from cache if fresh
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setPrices(cached.data);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/token-prices?symbols=${symbols.join(',')}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Record<string, Omit<TokenPrice, 'isStable'>>>;
      })
      .then(raw => {
        if (cancelled) return;
        const data: PriceMap = {};
        for (const [sym, val] of Object.entries(raw)) {
          data[sym] = { ...val, isStable: STABLECOINS.has(sym) };
        }
        cache.set(cacheKey, { data, ts: Date.now() });
        setPrices(data);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return { prices, loading, error };
}
