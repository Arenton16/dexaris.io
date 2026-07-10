import { useState, type CSSProperties } from 'react';
import { type Pool } from '../types';
import { calculateDexarisScore, calculateDexarisScoreBreakdown, getDexarisScoreColour, getDexarisScoreTier } from '../utils/dexarisScore';
import PoolDetail from './PoolDetail';
import { ProtocolLogo } from './ProtocolLogo';
import LocalDataBanner from './LocalDataBanner';

// Duplicated verbatim from YieldTable.tsx (not exported there, so can't be
// imported without touching that file) so the chain badge renders pixel-
// identically — same colours, same 13px logo, same inline styling instead
// of the .chain-badge CSS class this file used before.
const CHAIN_COLOURS: Record<string, string> = {
  Ethereum: '#3B9EFF',
  Solana:   '#A879FF',
  Base:     '#7B92D9',
  Arbitrum: '#3B9EFF',
  Avalanche:'#FF6B6B',
  Polygon:  '#FFB347',
};

// ── Score "Why" bar — recovered verbatim from YieldTable.tsx (not exported
// there, so reproduced here rather than duplicated with any deviation) so
// the watchlist renders the exact same reason bar as the Yield Explorer.
type Component = { label: string; score: number };

function generateCaption(components: Component[]): string {
  const weak = components.filter(c => c.score < 4);
  const strong = components.filter(c => c.score >= 7);
  const organicComp = components.find(c => c.label === 'Organic Yield');
  const consistencyComp = components.find(c => c.label === 'Consistency');
  const tvlComp = components.find(c => c.label === 'TVL Depth');
  if (organicComp && organicComp.score < 3 && weak.length >= 2) return 'mostly incentives';
  if (strong.length >= 4) return 'deep, consistent';
  if (consistencyComp && consistencyComp.score >= 7 && organicComp && organicComp.score >= 7) return 'stable, organic';
  if (weak.length >= 2 && strong.length === 0) return 'high risk';
  if (weak.length >= 1 && strong.length >= 1) return 'mixed signal';
  if (tvlComp && tvlComp.score < 3) return 'shallow pool';
  return 'moderate quality';
}

function ReasonBar({ components }: { components: Component[] }) {
  const getColour = (score: number) => {
    if (score >= 7) return '#4ECDA4';
    if (score >= 4) return '#FFB347';
    return '#FF6B6B';
  };
  return (
    <div>
      <div style={{ display: 'flex', gap: '1.5px', width: '64px' }}>
        {components.map((c, i) => (
          <div key={i} style={{
            height: '5px',
            flex: 1,
            borderRadius: '1px',
            background: c.score > 0 ? getColour(c.score) : 'rgba(232,230,255,0.07)',
          }} />
        ))}
      </div>
      <div style={{ fontSize: '8px', color: 'rgba(232,230,255,0.32)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '64px' }}>
        {generateCaption(components)}
      </div>
    </div>
  );
}

// apyPct1D is present on the raw DeFiLlama pool objects (confirmed live
// against yields.llama.fi/pools) but isn't part of the typed Pool interface
// yet — same situation as ilRisk/outlier in dexarisScore.ts, accessed the
// same way rather than widening the shared Pool type.
function get24hChange(pool: Pool): number | null {
  const raw = (pool as unknown as { apyPct1D?: number | null }).apyPct1D;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

// Single source of truth for column widths — used on every <th> AND every
// <td> below so the header row and data rows can never drift out of sync.
// Protocol has no fixed width (flexible, absorbs remaining space), matching
// how it behaved before this table used table-layout: fixed.
const COL_WIDTHS = {
  star: 32,
  rank: 44,
  asset: 130,
  chain: 180,
  apy: 100,
  tvl: 150,
  score: 170,
  why: 80,
  change24h: 110,
};

type SortKey = 'apy' | 'tvl' | 'score' | '24h';

interface Props {
  allPools: Pool[];
  watchlistedIds: Set<string>;
  onToggleWatchlist: (id: string) => void;
  onNavigateToYields: () => void;
}

export default function Watchlist({ allPools, watchlistedIds, onToggleWatchlist, onNavigateToYields }: Props) {
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [hoveredSortCol, setHoveredSortCol] = useState<SortKey | null>(null);

  const handleSortClick = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  const sortHeaderStyle = (key: SortKey, width?: number): CSSProperties => ({
    width,
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    color: sortBy === key ? 'var(--accent-text)' : hoveredSortCol === key ? 'rgba(232,230,255,0.7)' : undefined,
  });

  // Score and 24h change are precomputed once here (rather than inside the
  // render map) so they can be used for both sorting and rendering without
  // calculating them twice per pool.
  const watchlistPools = allPools
    .filter(p => watchlistedIds.has(p.pool))
    .map(pool => ({ pool, score: calculateDexarisScore(pool), change24h: get24hChange(pool) }))
    .sort((a, b) => {
      let diff = 0;
      switch (sortBy) {
        case 'apy': diff = (a.pool.apy ?? 0) - (b.pool.apy ?? 0); break;
        case 'tvl': diff = (a.pool.tvlUsd ?? 0) - (b.pool.tvlUsd ?? 0); break;
        case 'score': diff = a.score - b.score; break;
        case '24h': diff = (a.change24h ?? -Infinity) - (b.change24h ?? -Infinity); break;
      }
      return sortDir === 'desc' ? -diff : diff;
    });

  const highestApy = watchlistPools.length > 0
    ? Math.max(...watchlistPools.map(({ pool }) => pool.apy ?? 0))
    : 0;

  return (
    <div className={`watchlist-page${watchlistPools.length === 0 ? ' watchlist-page--empty' : ''}`}>
      <LocalDataBanner />
      {watchlistPools.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          minHeight: 'calc(100vh - 120px)',
          textAlign: 'center',
          padding: '24px',
        }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(107,79,255,0.1)',
            border: '1px solid rgba(107,79,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: 28,
          }}>★</div>
          <p style={{ color: '#E8E6FF', fontSize: 18, fontWeight: 500, margin: '0 0 8px' }}>No pools saved yet</p>
          <p style={{ color: 'rgba(232,230,255,0.45)', fontSize: 14, margin: '0 0 24px' }}>Star any pool from the Yields page to track it here</p>
          <button
            style={{
              background: '#6B4FFF',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
            onClick={onNavigateToYields}
          >Browse Yields</button>
        </div>
      ) : (
        <>
          <div className="watchlist-header">
            <h2 className="watchlist-title">My Watchlist</h2>
            <p className="watchlist-subtitle">Your saved pools — updated in real time</p>
          </div>
          <p className="watchlist-summary">
            Tracking {watchlistPools.length} pool{watchlistPools.length !== 1 ? 's' : ''} — highest yield: {highestApy.toFixed(1)}%
          </p>
          <div className="table-wrap">
            <style>{`.yield-table td { vertical-align: middle; line-height: 1.4; }`}</style>
            <table className="yield-table" style={{ fontVariantNumeric: 'tabular-nums', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: COL_WIDTHS.star }} />
                  <th className="hide-mobile" style={{ width: COL_WIDTHS.rank, cursor: 'default' }}>#</th>
                  <th style={{ cursor: 'default' }}>Protocol</th>
                  <th style={{ width: COL_WIDTHS.asset, cursor: 'default' }}>Asset</th>
                  <th style={{ width: COL_WIDTHS.chain, cursor: 'default' }}>Chain</th>
                  <th
                    className="hide-mobile"
                    style={sortHeaderStyle('apy', COL_WIDTHS.apy)}
                    onClick={() => handleSortClick('apy')}
                    onMouseEnter={() => setHoveredSortCol('apy')}
                    onMouseLeave={() => setHoveredSortCol(null)}
                  >
                    APY {sortBy === 'apy' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                  </th>
                  <th
                    className="hide-mobile"
                    style={sortHeaderStyle('tvl', COL_WIDTHS.tvl)}
                    onClick={() => handleSortClick('tvl')}
                    onMouseEnter={() => setHoveredSortCol('tvl')}
                    onMouseLeave={() => setHoveredSortCol(null)}
                  >
                    TVL {sortBy === 'tvl' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                  </th>
                  <th
                    className="hide-mobile"
                    style={sortHeaderStyle('score', COL_WIDTHS.score)}
                    onClick={() => handleSortClick('score')}
                    onMouseEnter={() => setHoveredSortCol('score')}
                    onMouseLeave={() => setHoveredSortCol(null)}
                  >
                    Score {sortBy === 'score' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                  </th>
                  <th className="hide-mobile" style={{ width: COL_WIDTHS.why, cursor: 'default' }}>Why</th>
                  <th
                    className="hide-mobile"
                    style={sortHeaderStyle('24h', COL_WIDTHS.change24h)}
                    onClick={() => handleSortClick('24h')}
                    onMouseEnter={() => setHoveredSortCol('24h')}
                    onMouseLeave={() => setHoveredSortCol(null)}
                  >
                    24h {sortBy === '24h' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                  </th>
                  <th className="show-mobile" style={{ cursor: 'default' }}>APY / TVL</th>
                </tr>
              </thead>
              <tbody>
                {watchlistPools.map(({ pool, score, change24h }, i) => {
                  const scoreColour = getDexarisScoreColour(score);
                  const scoreTier = getDexarisScoreTier(score);
                  const breakdown = calculateDexarisScoreBreakdown(pool).components;

                  return (
                    <tr
                      key={pool.pool}
                      className="tr-clickable"
                      onClick={() => setSelectedPool(pool)}
                      style={{ height: '44px' }}
                    >
                      <td onClick={e => e.stopPropagation()} style={{ width: COL_WIDTHS.star }}>
                        <button
                          className="star-btn starred"
                          onClick={() => onToggleWatchlist(pool.pool)}
                          aria-label="Remove from watchlist"
                        >
                          ★
                        </button>
                      </td>
                      <td className="dim hide-mobile" style={{ width: COL_WIDTHS.rank }}>{i + 1}</td>
                      <td className="protocol">
                        <div className="protocol-cell">
                          <ProtocolLogo project={pool.project} />
                          {pool.project}
                        </div>
                      </td>
                      <td style={{ width: COL_WIDTHS.asset }}>{pool.symbol}</td>
                      <td style={{ width: COL_WIDTHS.chain }}>
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
                      <td className="apy hide-mobile" style={{ width: COL_WIDTHS.apy }}>{(pool.apy ?? 0).toFixed(2)}%</td>
                      <td className="tvl hide-mobile" style={{ width: COL_WIDTHS.tvl }}>${formatTvl(pool.tvlUsd)}</td>
                      <td className="hide-mobile" style={{ width: COL_WIDTHS.score }}>
                        <span className="score-cell">
                          <span className="score-num" style={{ color: scoreColour }}>{score}</span>
                          <span className="score-badge" style={{
                            background: `${scoreColour}1a`,
                            color: scoreColour,
                            border: `1px solid ${scoreColour}40`,
                          }}>{scoreTier}</span>
                        </span>
                      </td>
                      <td className="hide-mobile" style={{ width: COL_WIDTHS.why }}>
                        <ReasonBar components={breakdown} />
                      </td>
                      <td className="hide-mobile" style={{ width: COL_WIDTHS.change24h }}>
                        {change24h !== null ? (
                          <span style={{ fontSize: 12, fontWeight: 600, color: change24h >= 0 ? '#4ECDA4' : '#FF6B6B' }}>
                            {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'rgba(232,230,255,0.3)' }}>—</span>
                        )}
                      </td>
                      <td className="show-mobile">
                        <div className="mobile-apy-tvl">
                          <span className="mobile-apy">{(pool.apy ?? 0).toFixed(2)}%</span>
                          <span className="mobile-tvl">${formatTvl(pool.tvlUsd)}</span>
                          <span className="mobile-score" style={{ color: scoreColour }}>{score}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <PoolDetail pool={selectedPool} onClose={() => setSelectedPool(null)} />
    </div>
  );
}


function formatTvl(val: number): string {
  if (val >= 1e9) return (val / 1e9).toFixed(2) + 'B';
  if (val >= 1e6) return (val / 1e6).toFixed(2) + 'M';
  if (val >= 1e3) return (val / 1e3).toFixed(2) + 'K';
  return val.toFixed(0);
}
