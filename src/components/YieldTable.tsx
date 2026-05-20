import { useEffect, useMemo, useState } from 'react';
import { CHAIN_LABELS, CHAIN_LOGOS, type ChainKey, type Pool } from '../types';
import { calculateDexarisScore, getDexarisScoreColour, getDexarisScoreTier } from '../utils/dexarisScore';
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

interface Props {
  allPools: Pool[];
  loading: boolean;
  error: string | null;
  fetchedAt: Date | null;
  isFlashing: boolean;
  apyDelta: number | null;
  onRetry: () => void;
  selectedChains: ChainKey[];
  minApy: number;
  sortKey: 'apy' | 'tvlUsd' | 'score';
  sortDir: 'desc' | 'asc';
  onSortChange: (key: 'apy' | 'tvlUsd' | 'score') => void;
  watchlistedIds: Set<string>;
  onToggleWatchlist: (id: string) => void;
  onNavigateToAnalytics?: () => void;
}

const PAGE_SIZE = 100;

export default function YieldTable({
  allPools, loading, error, fetchedAt, isFlashing, apyDelta, onRetry,
  selectedChains, minApy, sortKey, sortDir, onSortChange,
  watchlistedIds, onToggleWatchlist, onNavigateToAnalytics,
}: Props) {
  const [search, setSearch] = useState('');
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset to first page whenever filters, sort, or search changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, selectedChains, minApy, sortKey, sortDir]);

  const scoreMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const pool of allPools) map.set(pool.pool, calculateDexarisScore(pool));
    return map;
  }, [allPools]);

  const filteredSortedPools = useMemo(() => {
    const allowed = new Set(selectedChains.map(c => CHAIN_LABELS[c]));
    const q = search.toLowerCase().trim();
    return allPools
      .filter(p =>
        allowed.has(p.chain) &&
        (p.apy ?? 0) >= minApy
      )
      .filter(p => !q || p.project.toLowerCase().includes(q) || p.symbol.toLowerCase().includes(q))
      .sort((a, b) => {
        const av = sortKey === 'score' ? (scoreMap.get(a.pool) ?? 0)
          : sortKey === 'apy' ? (a.apy ?? 0) : a.tvlUsd;
        const bv = sortKey === 'score' ? (scoreMap.get(b.pool) ?? 0)
          : sortKey === 'apy' ? (b.apy ?? 0) : b.tvlUsd;
        return sortDir === 'desc' ? bv - av : av - bv;
      });
  }, [allPools, selectedChains, minApy, search, sortKey, sortDir, scoreMap]);

  const displayPools = filteredSortedPools.slice(0, visibleCount);
  const hasMore = filteredSortedPools.length > visibleCount;

  // Stats reflect the full filtered set, not just the visible page
  const highestApy = filteredSortedPools.length > 0 ? Math.max(...filteredSortedPools.map(p => p.apy ?? 0)) : 0;
  const totalTvl = filteredSortedPools.reduce((sum, p) => sum + p.tvlUsd, 0);
  const protocolCount = new Set(filteredSortedPools.map(p => p.project)).size;
  const chainCount = new Set(filteredSortedPools.map(p => p.chain)).size;

  if (loading) return <TableSkeleton />;
  if (error) return (
    <div className="error-state">
      <p className="error-msg">Unable to load yield data. Retrying...</p>
      <button className="retry-btn" onClick={onRetry}>Retry</button>
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
      {onNavigateToAnalytics && (
        <div className="analytics-teaser">
          Explore macro yield trends and protocol intelligence →{' '}
          <button className="analytics-teaser-link" onClick={onNavigateToAnalytics}>
            View Analytics ›
          </button>
        </div>
      )}
      <div className="table-wrap">
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
            <p className="empty-state-main">No pools match your search</p>
            <p className="empty-state-sub">Try a different term or adjust your filters</p>
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
                  <th style={{ width: 32 }} />
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
                  <th
                    className={`th-sortable hide-mobile${sortKey === 'score' ? ' th-sort-active' : ''}`}
                    onClick={() => onSortChange('score')}
                  >
                    <span className="th-score-header">
                      Score {sortKey === 'score' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                      <span className="th-info-wrap" onClick={e => e.stopPropagation()}>
                        <span className="th-info-icon">ⓘ</span>
                        <span className="th-info-tooltip">The Dexaris Score rates each pool 0–100 based on TVL size, APY level, yield consistency, and organic yield ratio.</span>
                      </span>
                    </span>
                  </th>
                  <th className="show-mobile">APY / TVL</th>
                </tr>
              </thead>
              <tbody>
                {displayPools.map((pool, i) => {
                  const starred = watchlistedIds.has(pool.pool);
                  const score = scoreMap.get(pool.pool) ?? 0;
                  const scoreColour = getDexarisScoreColour(score);
                  const scoreTier = getDexarisScoreTier(score);
                  return (
                    <tr
                      key={pool.pool}
                      className="tr-clickable"
                      onClick={() => setSelectedPool(pool)}
                    >
                      <td onClick={e => e.stopPropagation()}>
                        <button
                          className={`star-btn${starred ? ' starred' : ''}`}
                          onClick={() => onToggleWatchlist(pool.pool)}
                          aria-label={starred ? 'Remove from watchlist' : 'Add to watchlist'}
                        >
                          {starred ? '★' : '☆'}
                        </button>
                      </td>
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
                      <td className="hide-mobile">
                        <span className="score-cell">
                          <span className="score-num" style={{ color: scoreColour }}>{score}</span>
                          <span className="score-badge" style={{
                            background: `${scoreColour}1a`,
                            color: scoreColour,
                            border: `1px solid ${scoreColour}40`,
                          }}>{scoreTier}</span>
                        </span>
                      </td>
                      <td className="show-mobile">
                        <div className="mobile-apy-tvl">
                          <span className="mobile-apy">{pool.apy!.toFixed(2)}%</span>
                          <span className="mobile-tvl">${formatTvl(pool.tvlUsd)}</span>
                          <span className="mobile-score" style={{ color: scoreColour }}>{score}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {fetchedAt && (
              <p className={`last-updated${isFlashing ? ' flashing' : ''}`}>
                Last updated: {fetchedAt.toLocaleTimeString()}
              </p>
            )}
            {hasMore && (
              <div style={{ textAlign: 'center', padding: '28px 0 8px' }}>
                <button
                  className="load-more-btn"
                  onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                >
                  Load more — showing {displayPools.length} of {filteredSortedPools.length}
                </button>
              </div>
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
  const cols = ['28px', '28px', '130px', '90px', '100px', '64px', '80px', '90px'];
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
