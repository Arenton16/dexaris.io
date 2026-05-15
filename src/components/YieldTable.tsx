import { useEffect, useMemo, useRef, useState } from 'react';
import { CHAIN_LABELS, CHAIN_LOGOS, type ChainKey, type Pool } from '../types';
import Charts from './Charts';
import PoolDetail from './PoolDetail';
import StatsBar from './StatsBar';

const CHAIN_COLORS: Record<string, { bg: string; text: string }> = {
  Ethereum: { bg: '#1a3a5c', text: '#3B9EFF' },
  Base:     { bg: '#1a1a4a', text: '#6B7FFF' },
  Solana:   { bg: '#2d1a4a', text: '#9945FF' },
  Arbitrum: { bg: '#1a2d4a', text: '#2D9CDB' },
  Avalanche:{ bg: '#4a1a1a', text: '#E84142' },
  Polygon:  { bg: '#2d1a4a', text: '#8247E5' },
};

function isValidApy(apy: number | null | undefined): boolean {
  return apy != null && Number.isFinite(apy) && apy >= 0.005;
}

interface Props {
  selectedChains: ChainKey[];
  minApy: number;
  sortKey: 'apy' | 'tvlUsd';
  sortDir: 'desc' | 'asc';
  onSortChange: (key: 'apy' | 'tvlUsd') => void;
  onLoadingChange: (v: boolean) => void;
  refreshTick: number;
}

export default function YieldTable({ selectedChains, minApy, sortKey, sortDir, onSortChange, onLoadingChange, refreshTick }: Props) {
  const [allPools, setAllPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [apyDelta, setApyDelta] = useState<number | null>(null);
  const hasLoadedOnce = useRef(false);
  const prevApyRef = useRef<number | null>(null);

  useEffect(() => {
    const supportedChains = new Set(Object.values(CHAIN_LABELS));
    const isBackground = hasLoadedOnce.current;

    if (!isBackground) setLoading(true);
    setError(null);
    onLoadingChange(true);

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
        const wasLoaded = hasLoadedOnce.current;
        hasLoadedOnce.current = true;
        setAllPools(filtered);
        setFetchedAt(new Date());
        setLoading(false);
        onLoadingChange(false);
        if (wasLoaded) {
          setIsFlashing(true);
          setTimeout(() => setIsFlashing(false), 1800);
        }
      })
      .catch(() => {
        if (!hasLoadedOnce.current) setError('fetch_failed');
        setLoading(false);
        onLoadingChange(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount, refreshTick]);

  useEffect(() => {
    if (allPools.length === 0) return;
    const current = allPools.reduce((max, p) => Math.max(max, p.apy ?? 0), 0);
    if (prevApyRef.current !== null) {
      const d = parseFloat((current - prevApyRef.current).toFixed(2));
      setApyDelta(d !== 0 ? d : null);
    }
    prevApyRef.current = current;
  }, [allPools]);

  const displayPools = useMemo(() => {
    const allowed = new Set(selectedChains.map(c => CHAIN_LABELS[c]));
    const q = search.toLowerCase().trim();
    return allPools
      .filter(p =>
        allowed.has(p.chain) &&
        isValidApy(p.apy) &&
        (p.apy ?? 0) >= minApy
      )
      .filter(p => !q || p.project.toLowerCase().includes(q) || p.symbol.toLowerCase().includes(q))
      .sort((a, b) => {
        const av = sortKey === 'apy' ? (a.apy ?? 0) : a.tvlUsd;
        const bv = sortKey === 'apy' ? (b.apy ?? 0) : b.tvlUsd;
        return sortDir === 'desc' ? bv - av : av - bv;
      })
      .slice(0, 30);
  }, [allPools, selectedChains, minApy, search, sortKey, sortDir]);

  const highestApy = displayPools.length > 0 ? Math.max(...displayPools.map(p => p.apy ?? 0)) : 0;
  const totalTvl = displayPools.reduce((sum, p) => sum + p.tvlUsd, 0);
  const protocolCount = new Set(displayPools.map(p => p.project)).size;
  const chainCount = new Set(displayPools.map(p => p.chain)).size;

  if (loading) return <TableSkeleton />;
  if (error) return (
    <div className="error-state">
      <p className="error-msg">Unable to load yield data. Retrying...</p>
      <button
        className="retry-btn"
        onClick={() => setRetryCount(c => c + 1)}
      >
        Retry
      </button>
    </div>
  );
  return (
    <>
    <StatsBar
      highestApy={highestApy}
      totalTvl={totalTvl}
      protocolCount={protocolCount}
      chainCount={chainCount}
      apyDelta={apyDelta}
    />
    <div className="table-wrap">
      <Charts displayPools={displayPools} allPools={allPools} />
      <h2 className="table-title">Top Yields</h2>
      <div className="search-wrap">
        <input
          className="search-input"
          type="text"
          placeholder="Search protocol or asset..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {displayPools.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-msg">
            No pools match your search — try a different term or adjust your filters
          </p>
          {search.trim() && (
            <button className="clear-search-btn" onClick={() => setSearch('')}>
              Clear search
            </button>
          )}
        </div>
      ) : (
        <>
          <table className="yield-table">
            <thead>
              <tr>
                <th className="hide-mobile">#</th>
                <th>Protocol</th>
                <th>Asset</th>
                <th>Chain</th>
                <th
                  className={`th-sortable hide-mobile${sortKey === 'apy' ? ' th-sort-active' : ''}`}
                  onClick={() => onSortChange('apy')}
                >
                  APY {sortKey === 'apy' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  className={`th-sortable hide-mobile${sortKey === 'tvlUsd' ? ' th-sort-active' : ''}`}
                  onClick={() => onSortChange('tvlUsd')}
                >
                  TVL {sortKey === 'tvlUsd' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th className="show-mobile">APY / TVL</th>
              </tr>
            </thead>
            <tbody>
              {displayPools.map((pool, i) => (
                <tr
                  key={pool.pool}
                  className="tr-clickable"
                  onClick={() => setSelectedPool(pool)}
                >
                  <td className="dim hide-mobile">{i + 1}</td>
                  <td className="protocol">
                    <div className="protocol-cell">
                      <ProtocolLogo logo={pool.logo} name={pool.project} />
                      {pool.project}
                    </div>
                  </td>
                  <td>{pool.symbol}</td>
                  <td>
                    <span
                      className="chain-badge"
                      style={{
                        backgroundColor: CHAIN_COLORS[pool.chain]?.bg ?? 'rgba(107,79,255,0.1)',
                        color: CHAIN_COLORS[pool.chain]?.text ?? 'rgba(232,230,255,0.45)',
                      }}
                    >
                      {CHAIN_LOGOS[pool.chain] && (
                        <img
                          src={CHAIN_LOGOS[pool.chain]}
                          alt={pool.chain}
                          width={16}
                          height={16}
                          className="chain-logo"
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      {pool.chain}
                    </span>
                  </td>
                  <td className="apy hide-mobile">{pool.apy!.toFixed(2)}%</td>
                  <td className="tvl hide-mobile">${formatTvl(pool.tvlUsd)}</td>
                  <td className="show-mobile">
                    <div className="mobile-apy-tvl">
                      <span className="mobile-apy">{pool.apy!.toFixed(2)}%</span>
                      <span className="mobile-tvl">${formatTvl(pool.tvlUsd)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {fetchedAt && (
            <p className={`last-updated${isFlashing ? ' flashing' : ''}`}>
              Last updated: {fetchedAt.toLocaleTimeString()}
            </p>
          )}
        </>
      )}
      <PoolDetail pool={selectedPool} onClose={() => setSelectedPool(null)} />
    </div>
    </>
  );
}

function ProtocolLogo({ logo, name }: { logo?: string; name: string }) {
  const [err, setErr] = useState(false);
  if (!logo || err) {
    return <span className="protocol-logo-placeholder">{name[0]}</span>;
  }
  return (
    <img
      src={logo}
      alt={name}
      width={20}
      height={20}
      className="protocol-logo"
      onError={() => setErr(true)}
    />
  );
}

function TableSkeleton() {
  const cols = ['28px', '130px', '90px', '100px', '64px', '80px'];
  return (
    <div className="skeleton-wrap">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="skeleton-row" style={{ animationDelay: `${i * 0.06}s` }}>
          {cols.map((w, j) => (
            <div key={j} className="skeleton-bar" style={{ width: w }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function formatTvl(val: number): string {
  if (val >= 1e9) return (val / 1e9).toFixed(2) + 'B';
  if (val >= 1e6) return (val / 1e6).toFixed(2) + 'M';
  if (val >= 1e3) return (val / 1e3).toFixed(2) + 'K';
  return val.toFixed(0);
}
