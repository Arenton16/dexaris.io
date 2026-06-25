import { useState } from 'react';
import { CHAIN_LOGOS, type Pool } from '../types';
import PoolDetail from './PoolDetail';
import { ProtocolLogo } from './ProtocolLogo';

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
  watchlistedIds: Set<string>;
  onToggleWatchlist: (id: string) => void;
  onNavigateToYields: () => void;
}

export default function Watchlist({ allPools, watchlistedIds, onToggleWatchlist, onNavigateToYields }: Props) {
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);

  const watchlistPools = allPools
    .filter(p => watchlistedIds.has(p.pool))
    .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0));

  const highestApy = watchlistPools.length > 0
    ? Math.max(...watchlistPools.map(p => p.apy ?? 0))
    : 0;

  return (
    <div className={`watchlist-page${watchlistPools.length === 0 ? ' watchlist-page--empty' : ''}`} style={{ padding: '24px' }}>
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
                  <th className="show-mobile">APY / TVL</th>
                </tr>
              </thead>
              <tbody>
                {watchlistPools.map((pool, i) => (
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
                    <td className="show-mobile">
                      <div className="mobile-apy-tvl">
                        <span className="mobile-apy">{(pool.apy ?? 0).toFixed(2)}%</span>
                        <span className="mobile-tvl">${formatTvl(pool.tvlUsd)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
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
