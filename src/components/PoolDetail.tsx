import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Pool } from '../types';
import { CHAIN_LOGOS } from '../types';
import { calculateDexarisScore, getDexarisScoreColour, getDexarisScoreTier } from '../utils/dexarisScore';

interface Props {
  pool: Pool | null;
  onClose: () => void;
}

interface HistoryPoint {
  date: string;
  apy: number;
}

const CHAIN_COLORS: Record<string, { bg: string; text: string }> = {
  Ethereum: { bg: '#1a3a5c', text: '#3B9EFF' },
  Base:     { bg: '#1a1a4a', text: '#6B7FFF' },
  Solana:   { bg: '#2d1a4a', text: '#9945FF' },
  Arbitrum: { bg: '#1a2d4a', text: '#2D9CDB' },
  Avalanche:{ bg: '#4a1a1a', text: '#E84142' },
  Polygon:  { bg: '#2d1a4a', text: '#8247E5' },
};

const AXIS_TICK = {
  fill: 'rgba(232,230,255,0.3)',
  fontFamily: 'Space Grotesk, sans-serif',
  fontSize: 9,
} as const;

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
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);

  useEffect(() => {
    if (!pool) {
      setHistoryData([]);
      setHistoryLoading(false);
      setHistoryError(false);
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(false);
    setHistoryData([]);

    fetch(`https://yields.llama.fi/chart/${pool.pool}`)
      .then(r => r.json())
      .then(({ data }: { data: Array<{ timestamp: string; apy: number }> }) => {
        if (cancelled) return;
        if (!data?.length) {
          setHistoryError(true);
          setHistoryLoading(false);
          return;
        }
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const last30 = data
          .filter(d => new Date(d.timestamp).getTime() >= cutoff)
          .map(d => ({
            date: new Date(d.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
            apy: parseFloat((d.apy ?? 0).toFixed(2)),
          }));
        if (!last30.length) {
          setHistoryError(true);
        } else {
          setHistoryData(last30);
        }
        setHistoryLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryError(true);
          setHistoryLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [pool?.pool]);

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
          const score = calculateDexarisScore(pool);
          const scoreColour = getDexarisScoreColour(score);
          const scoreTier = getDexarisScoreTier(score);
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

              {/* Dexaris Score */}
              <div className="detail-score-section">
                <span className="detail-label">Dexaris Score</span>
                <div className="detail-score-main">
                  <span className="detail-score-num" style={{ color: scoreColour }}>{score}</span>
                  <span className="score-badge" style={{
                    background: `${scoreColour}1a`,
                    color: scoreColour,
                    border: `1px solid ${scoreColour}40`,
                    fontSize: 12,
                    padding: '2px 10px',
                  }}>{scoreTier}</span>
                </div>
                <div className="score-bar-track">
                  <div className="score-bar-fill" style={{ width: `${score}%`, background: scoreColour }} />
                </div>
              </div>

              {/* 30-day APY history */}
              <div className="detail-history">
                <p className="detail-history-title">30 Day APY History</p>
                {historyLoading && (
                  <div className="history-skeleton-chart skeleton-bar" />
                )}
                {!historyLoading && historyError && (
                  <p className="history-no-data">Historical data unavailable</p>
                )}
                {!historyLoading && !historyError && historyData.length > 0 && (
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={historyData} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                      <defs>
                        <linearGradient id="apyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6B4FFF" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#6B4FFF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,79,255,0.08)" />
                      <XAxis
                        dataKey="date"
                        tick={AXIS_TICK}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tickFormatter={v => `${v}%`}
                        tick={AXIS_TICK}
                        tickLine={false}
                        axisLine={false}
                        width={36}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#111028',
                          border: '0.5px solid rgba(107,79,255,0.25)',
                          borderRadius: 6,
                          fontFamily: 'Space Grotesk, sans-serif',
                          fontSize: 12,
                        }}
                        labelStyle={{ color: '#8B73FF', fontFamily: 'Space Grotesk, sans-serif' }}
                        itemStyle={{ color: '#E8E6FF' }}
                        formatter={(v) => [`${Number(v).toFixed(2)}%`, 'APY']}
                      />
                      <Area
                        type="monotone"
                        dataKey="apy"
                        stroke="#6B4FFF"
                        strokeWidth={1.5}
                        fill="url(#apyGrad)"
                        dot={false}
                        activeDot={{ r: 3, fill: '#6B4FFF' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          );
        })()}
      </aside>
    </>
  );
}
