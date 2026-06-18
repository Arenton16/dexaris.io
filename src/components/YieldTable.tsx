import { useEffect, useMemo, useState } from 'react';
import { CHAIN_LABELS, type ChainKey, type Pool } from '../types';
import { calculateDexarisScore, getDexarisScoreColour, getDexarisScoreTier } from '../utils/dexarisScore';
import PoolDetail from './PoolDetail';
import StatsBar from './StatsBar';

const CHAIN_COLOURS: Record<string, string> = {
  Ethereum: '#3B9EFF',
  Solana:   '#A879FF',
  Base:     '#7B92D9',
  Arbitrum: '#3B9EFF',
  Avalanche:'#FF6B6B',
  Polygon:  '#FFB347',
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
  selectedProtocols: string[];
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
  selectedChains, selectedProtocols, minApy, sortKey, sortDir, onSortChange,
  watchlistedIds, onToggleWatchlist, onNavigateToAnalytics,
}: Props) {
  const [search, setSearch] = useState('');
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [scoreInfoOpen, setScoreInfoOpen] = useState(false);

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
    const allowedProtocols = selectedProtocols.length ? new Set(selectedProtocols) : null;
    const q = search.toLowerCase().trim();
    return allPools
      .filter(p =>
        allowed.has(p.chain) &&
        (p.apy ?? 0) >= minApy &&
        (!allowedProtocols || allowedProtocols.has(p.project))
      )
      .filter(p => !q || p.project.toLowerCase().includes(q) || p.symbol.toLowerCase().includes(q))
      .sort((a, b) => {
        const av = sortKey === 'score' ? (scoreMap.get(a.pool) ?? 0)
          : sortKey === 'apy' ? (a.apy ?? 0) : a.tvlUsd;
        const bv = sortKey === 'score' ? (scoreMap.get(b.pool) ?? 0)
          : sortKey === 'apy' ? (b.apy ?? 0) : b.tvlUsd;
        return sortDir === 'desc' ? bv - av : av - bv;
      });
  }, [allPools, selectedChains, selectedProtocols, minApy, search, sortKey, sortDir, scoreMap]);

  const displayPools = filteredSortedPools.slice(0, visibleCount);
  const hasMore = filteredSortedPools.length > visibleCount;

  const bestPickId = useMemo(() => {
    if (!filteredSortedPools.length) return null;
    let bestId = filteredSortedPools[0].pool;
    let bestScore = scoreMap.get(filteredSortedPools[0].pool) ?? 0;
    for (const p of filteredSortedPools) {
      const s = scoreMap.get(p.pool) ?? 0;
      if (s > bestScore) { bestScore = s; bestId = p.pool; }
    }
    return bestId;
  }, [filteredSortedPools, scoreMap]);

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
        <h2 className="table-title" style={{ textTransform: 'none', marginBottom: '10px' }}>Top Yields</h2>
        <div className="search-wrap" style={{ marginBottom: '8px' }}>
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
            <table className="yield-table" style={{ fontVariantNumeric: 'tabular-nums' }}>
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
                      <button
                        className="th-info-icon"
                        onClick={e => { e.stopPropagation(); setScoreInfoOpen(true); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', color: 'inherit', fontSize: 'inherit', lineHeight: 1 }}
                        aria-label="Dexaris Score information"
                      >ⓘ</button>
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
                          {pool.pool === bestPickId && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '10px', background: 'rgba(107,79,255,0.15)', border: '0.5px solid rgba(107,79,255,0.4)', color: '#8B73FF', marginLeft: '8px', letterSpacing: '0.3px', textTransform: 'uppercase' }}>✦ Best Pick</span>
                          )}
                        </div>
                      </td>
                      <td>{pool.symbol}</td>
                      <td>
                        {(() => {
                          const cc = CHAIN_COLOURS[pool.chain] ?? 'rgba(232,230,255,0.4)';
                          return (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10px', padding: '3px 9px', borderRadius: '10px', background: 'rgba(232,230,255,0.04)', border: '0.5px solid rgba(232,230,255,0.12)', color: 'rgba(232,230,255,0.55)' }}>
                              <img
                                src={`/logos/chains/${pool.chain.toLowerCase()}.png`}
                                alt={pool.chain}
                                style={{ width: '13px', height: '13px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                onError={e => {
                                  const t = e.currentTarget;
                                  t.style.display = 'none';
                                  const fb = document.createElement('span');
                                  fb.textContent = pool.chain[0];
                                  Object.assign(fb.style, { width: '13px', height: '13px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: '700', flexShrink: '0', background: `${cc}33`, color: cc });
                                  t.parentNode?.insertBefore(fb, t);
                                }}
                              />
                              {pool.chain}
                            </span>
                          );
                        })()}
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
      <ScoreInfoModal open={scoreInfoOpen} onClose={() => setScoreInfoOpen(false)} />
    </>
  );
}

function ScoreInfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const tiers = [
    { range: '80–100', label: 'Excellent', color: '#4ECDA4' },
    { range: '60–79',  label: 'Strong',    color: 'rgba(78,205,164,0.7)' },
    { range: '40–59',  label: 'Moderate',  color: '#FFB347' },
    { range: '20–39',  label: 'Weak',      color: '#FF6B6B' },
    { range: '0–19',   label: 'Poor',      color: 'rgba(255,107,107,0.7)' },
  ];

  const components = [
    { name: 'APY Consistency',     weight: '30%' },
    { name: 'APY Level',           weight: '20%' },
    { name: 'TVL Size',            weight: '20%' },
    { name: 'Organic Yield Ratio', weight: '20%' },
    { name: 'Pool Age Proxy',      weight: '10%' },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#111028',
          border: '0.5px solid rgba(107,79,255,0.3)',
          borderRadius: 12,
          padding: '28px 28px 24px',
          width: 360,
          maxWidth: 'calc(100vw - 32px)',
          position: 'relative',
          maxHeight: 'calc(100vh - 64px)',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(232,230,255,0.4)', fontSize: 18, lineHeight: 1,
            padding: '2px 6px',
          }}
          aria-label="Close"
        >×</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 16, color: '#6B4FFF' }}>ⓘ</span>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#E8E6FF' }}>Dexaris Score</h3>
        </div>

        <div style={{ marginBottom: 20 }}>
          {tiers.map(t => (
            <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
              <div style={{ width: 4, height: 28, borderRadius: 2, background: t.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: t.color, fontWeight: 600, minWidth: 72 }}>{t.label}</span>
              <span style={{ fontSize: 12, color: 'rgba(232,230,255,0.4)' }}>{t.range}</span>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: 'rgba(107,79,255,0.15)', marginBottom: 20 }} />

        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: 'rgba(232,230,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Components</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', fontSize: 11, color: 'rgba(232,230,255,0.35)', fontWeight: 500, paddingBottom: 6, paddingRight: 8 }}>Component</th>
                <th style={{ textAlign: 'right', fontSize: 11, color: 'rgba(232,230,255,0.35)', fontWeight: 500, paddingBottom: 6 }}>Weight</th>
              </tr>
            </thead>
            <tbody>
              {components.map((c, i) => (
                <tr key={c.name} style={{ background: i % 2 === 0 ? 'rgba(107,79,255,0.04)' : 'transparent' }}>
                  <td style={{ fontSize: 13, color: 'rgba(232,230,255,0.75)', padding: '6px 8px 6px 0' }}>{c.name}</td>
                  <td style={{ fontSize: 13, color: '#6B4FFF', fontWeight: 600, textAlign: 'right', padding: '6px 0' }}>{c.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={() => { window.location.href = '/methodology'; onClose(); }}
          style={{
            display: 'block', width: '100%',
            padding: '9px 0',
            background: 'rgba(107,79,255,0.08)',
            border: '0.5px solid rgba(107,79,255,0.25)',
            borderRadius: 7,
            color: 'rgba(232,230,255,0.65)',
            fontSize: 13,
            cursor: 'pointer',
            marginBottom: 14,
          }}
        >
          Read full methodology →
        </button>

        <p style={{ margin: 0, fontSize: 11, color: 'rgba(232,230,255,0.25)', textAlign: 'center' }}>
          The Dexaris Score is an analytical tool, not financial advice.
        </p>
      </div>
    </div>
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

function SkeletonRow() {
  return (
    <tr>
      {[40, 180, 120, 80, 80, 60, 80].map((width, i) => (
        <td key={i} style={{ padding: '14px 12px' }}>
          <div style={{
            width,
            height: 14,
            borderRadius: 6,
            background: 'rgba(232,230,255,0.06)',
            animation: 'skeleton-pulse 1.5s ease-in-out infinite',
            animationDelay: `${i * 0.05}s`,
          }} />
        </td>
      ))}
    </tr>
  );
}

function TableSkeleton() {
  return (
    <div className="table-wrap">
      <table className="yield-table">
        <tbody>
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatTvl(val: number): string {
  if (val >= 1e9) return (val / 1e9).toFixed(2) + 'B';
  if (val >= 1e6) return (val / 1e6).toFixed(2) + 'M';
  if (val >= 1e3) return (val / 1e3).toFixed(2) + 'K';
  return val.toFixed(0);
}
