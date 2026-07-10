import { useState } from 'react';
import { CHAIN_LOGOS, type Pool } from '../types';
import { calculateDexarisScore, calculateDexarisScoreBreakdown, getDexarisScoreColour, getDexarisScoreTier } from '../utils/dexarisScore';
import PoolDetail from './PoolDetail';
import { ProtocolLogo } from './ProtocolLogo';
import LocalDataBanner from './LocalDataBanner';

const CHAIN_COLORS: Record<string, { bg: string; text: string }> = {
  Ethereum: { bg: '#1a3a5c', text: '#3B9EFF' },
  Base:     { bg: '#1a1a4a', text: '#6B7FFF' },
  Solana:   { bg: '#2d1a4a', text: '#9945FF' },
  Arbitrum: { bg: '#1a2d4a', text: '#2D9CDB' },
  Avalanche:{ bg: '#4a1a1a', text: '#E84142' },
  Polygon:  { bg: '#2d1a4a', text: '#8247E5' },
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

interface Props {
  allPools: Pool[];
  watchlistedIds: Set<string>;
  onToggleWatchlist: (id: string) => void;
  onNavigateToYields: () => void;
}

export default function Watchlist({ allPools, watchlistedIds, onToggleWatchlist, onNavigateToYields }: Props) {
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);

  // Preserves the existing sort — highest APY first — unchanged.
  const watchlistPools = allPools
    .filter(p => watchlistedIds.has(p.pool))
    .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0));

  const highestApy = watchlistPools.length > 0
    ? Math.max(...watchlistPools.map(p => p.apy ?? 0))
    : 0;

  return (
    <div className={`watchlist-page${watchlistPools.length === 0 ? ' watchlist-page--empty' : ''}`} style={{ padding: '24px' }}>
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
            <table className="yield-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }} />
                  <th className="hide-mobile">#</th>
                  <th>Protocol</th>
                  <th>Asset</th>
                  <th>Chain</th>
                  <th className="hide-mobile">APY</th>
                  <th className="hide-mobile">TVL</th>
                  <th className="hide-mobile">Score</th>
                  <th className="hide-mobile" style={{ width: 80 }}>Why</th>
                  <th className="hide-mobile">24h</th>
                  <th className="show-mobile">APY / TVL</th>
                </tr>
              </thead>
              <tbody>
                {watchlistPools.map((pool, i) => {
                  const score = calculateDexarisScore(pool);
                  const scoreColour = getDexarisScoreColour(score);
                  const scoreTier = getDexarisScoreTier(score);
                  const breakdown = calculateDexarisScoreBreakdown(pool).components;
                  const change24h = get24hChange(pool);

                  return (
                    <tr
                      key={pool.pool}
                      className="tr-clickable"
                      onClick={() => setSelectedPool(pool)}
                    >
                      <td onClick={e => e.stopPropagation()}>
                        <button
                          className="star-btn starred"
                          onClick={() => onToggleWatchlist(pool.pool)}
                          aria-label="Remove from watchlist"
                        >
                          ★
                        </button>
                      </td>
                      <td className="dim hide-mobile">{i + 1}</td>
                      <td className="protocol">
                        <div className="protocol-cell">
                          <ProtocolLogo project={pool.project} />
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
                      <td className="apy hide-mobile">{(pool.apy ?? 0).toFixed(2)}%</td>
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
                      <td className="hide-mobile" style={{ width: 80 }}>
                        <ReasonBar components={breakdown} />
                      </td>
                      <td className="hide-mobile">
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
