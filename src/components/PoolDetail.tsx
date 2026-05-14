import type { Pool } from '../types';
import { CHAIN_LOGOS } from '../types';

interface Props {
  pool: Pool | null;
  onClose: () => void;
}

const CHAIN_COLORS: Record<string, { bg: string; text: string }> = {
  Ethereum: { bg: '#1a3a5c', text: '#3B9EFF' },
  Base:     { bg: '#1a1a4a', text: '#6B7FFF' },
  Solana:   { bg: '#2d1a4a', text: '#9945FF' },
  Arbitrum: { bg: '#1a2d4a', text: '#2D9CDB' },
  Avalanche:{ bg: '#4a1a1a', text: '#E84142' },
  Polygon:  { bg: '#2d1a4a', text: '#8247E5' },
};

function getRisk(apy: number): { label: string; color: string } {
  if (apy < 10)  return { label: 'Low',    color: '#22c55e' };
  if (apy <= 50) return { label: 'Medium', color: '#f59e0b' };
  return             { label: 'High',   color: '#ef4444' };
}

function formatTvl(val: number): string {
  if (val >= 1e9) return '$' + (val / 1e9).toFixed(2) + 'B';
  if (val >= 1e6) return '$' + (val / 1e6).toFixed(2) + 'M';
  if (val >= 1e3) return '$' + (val / 1e3).toFixed(2) + 'K';
  return '$' + val.toFixed(0);
}

export default function PoolDetail({ pool, onClose }: Props) {
  const isOpen = pool !== null;

  return (
    <>
      <div
        className={`detail-overlay${isOpen ? ' visible' : ''}`}
        onClick={onClose}
      />
      <aside className={`detail-panel${isOpen ? ' open' : ''}`}>
        <button className="detail-close" onClick={onClose}>✕</button>

        {pool && (() => {
          const apy = pool.apy ?? 0;
          const risk = getRisk(apy);
          const chain = CHAIN_COLORS[pool.chain] ?? { bg: 'rgba(107,79,255,0.1)', text: 'rgba(232,230,255,0.45)' };
          return (
            <div className="detail-content">
              <div className="detail-header">
                <h2 className="detail-protocol">{pool.project}</h2>
                <p className="detail-asset">{pool.symbol}</p>
                <span
                  className="chain-badge"
                  style={{ backgroundColor: chain.bg, color: chain.text }}
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
              </div>

              <div className="detail-stats">
                <div className="detail-stat">
                  <span className="detail-label">APY</span>
                  <span className="detail-value detail-value--apy">{apy.toFixed(2)}%</span>
                </div>

                <div className="detail-stat">
                  <span className="detail-label">TVL</span>
                  <span className="detail-value detail-value--tvl">{formatTvl(pool.tvlUsd)}</span>
                </div>

                <div className="detail-stat">
                  <span className="detail-label">Risk Level</span>
                  <span className="detail-value" style={{ color: risk.color }}>
                    <span className="detail-risk-dot">●</span>
                    {risk.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </aside>
    </>
  );
}
