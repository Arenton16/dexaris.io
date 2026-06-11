import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Pool } from '../types';
import { CHAIN_LOGOS } from '../types';
import { calculateDexarisScoreBreakdown, getDexarisScoreColour, getDexarisScoreTier } from '../utils/dexarisScore';
import { useTokenPrices, parsePoolSymbols } from '../hooks/useTokenPrices';

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

// ── Token Prices Section ───────────────────────────────────────────────────

function SparklineChart({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return <span style={{ color: 'rgba(232,230,255,0.25)' }}>—</span>;

  const width = 56;
  const height = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChangeLabel({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: 'rgba(232,230,255,0.3)' }}>—</span>;
  const color = value >= 0 ? '#4ECDA4' : '#FF6B6B';
  return (
    <span style={{ color, fontWeight: 500 }}>
      {value >= 0 ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
}

function TokenPricesSection({
  poolSymbol, poolApy, prices, loading,
}: {
  poolSymbol: string;
  poolApy: number;
  prices: ReturnType<typeof import('../hooks/useTokenPrices').useTokenPrices>['prices'];
  loading: boolean;
}) {
  const symbols = parsePoolSymbols(poolSymbol);
  if (!symbols.length) return null;

  // Depreciation warnings: token down >10% in 7d and pool APY <50%
  const warnings = !loading
    ? symbols.filter(sym => {
        const p = prices[sym];
        return p && !p.isStable && p.change7d !== null && p.change7d < -10 && poolApy < 50;
      })
    : [];

  return (
    <div style={{
      margin: '16px 0',
      background: 'rgba(107,79,255,0.07)',
      border: '1px solid rgba(107,79,255,0.2)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: '1px solid rgba(107,79,255,0.1)',
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(232,230,255,0.4)',
        }}>
          Token Prices
        </span>
      </div>

      <div style={{ padding: '6px 0' }}>
        {!loading && !symbols.some(s => prices[s]) ? (
          <p style={{
            margin: 0,
            padding: '14px 14px',
            fontSize: 12,
            color: 'rgba(232,230,255,0.35)',
            fontStyle: 'italic',
          }}>
            Price data unavailable for this pool's tokens.
          </p>
        ) : loading ? (
          // Skeleton rows
          symbols.map(sym => (
            <div key={sym} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
            }}>
              <div style={{ width: 36, height: 11, borderRadius: 4, background: 'rgba(232,230,255,0.07)', flex: 'none' }} />
              <div style={{ flex: 1, height: 11, borderRadius: 4, background: 'rgba(232,230,255,0.05)' }} />
              <div style={{ width: 56, height: 24, borderRadius: 4, background: 'rgba(232,230,255,0.05)' }} />
            </div>
          ))
        ) : (
          symbols.map(sym => {
            const p = prices[sym];
            if (!p) return null;
            const positive7d = (p.change7d ?? 0) >= 0;
            return (
              <div key={sym} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 14px',
                borderBottom: '1px solid rgba(107,79,255,0.06)',
              }}>
                {/* Symbol */}
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#E8E6FF',
                  minWidth: 48,
                  flex: 'none',
                }}>
                  {sym}
                </span>

                {/* Price */}
                <span style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#E8E6FF',
                  flex: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {p.price !== null
                    ? p.isStable
                      ? `$${p.price.toFixed(4)}`
                      : p.price >= 1000
                        ? `$${p.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                        : `$${p.price.toFixed(2)}`
                    : '—'
                  }
                </span>

                {p.isStable ? (
                  <span style={{
                    fontSize: 10,
                    color: 'rgba(232,230,255,0.3)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    flex: 'none',
                  }}>
                    Stablecoin
                  </span>
                ) : (
                  <>
                    {/* 24h */}
                    <span style={{ fontSize: 11, flex: 'none', minWidth: 52, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ fontSize: 9, color: 'rgba(232,230,255,0.3)', display: 'block', marginBottom: 1 }}>24h</span>
                      <ChangeLabel value={p.change24h} />
                    </span>

                    {/* 7d */}
                    <span style={{ fontSize: 11, flex: 'none', minWidth: 52, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ fontSize: 9, color: 'rgba(232,230,255,0.3)', display: 'block', marginBottom: 1 }}>7d</span>
                      <ChangeLabel value={p.change7d} />
                    </span>

                    {/* Sparkline */}
                    <SparklineChart data={p.sparkline} color={positive7d ? '#4ECDA4' : '#FF6B6B'} />
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Depreciation warnings */}
      {warnings.map(sym => {
        const p = prices[sym];
        return (
          <div key={sym} style={{
            margin: '0 10px 10px',
            background: 'rgba(255,107,107,0.08)',
            border: '1px solid rgba(255,107,107,0.25)',
            borderRadius: 7,
            padding: '10px 12px',
          }}>
            <span style={{ fontSize: 11, color: '#FF6B6B', lineHeight: 1.5 }}>
              ⚠ <strong>{sym}</strong> is down {Math.abs(p.change7d!).toFixed(1)}% in 7 days.
              The {poolApy.toFixed(2)}% APY may not offset token depreciation — review before entering.
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function PoolDetail({ pool, onClose }: Props) {
  const isOpen = pool !== null;
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const { prices, loading: pricesLoading } = useTokenPrices(pool?.symbol ?? '');

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
          const breakdown = calculateDexarisScoreBreakdown(pool);
          const score = breakdown.total;
          const scoreColour = getDexarisScoreColour(score);
          const scoreTier = getDexarisScoreTier(score);
          const apyDiff = pool.apyMean30d != null ? apy - pool.apyMean30d : null;
          const extPool = pool as Pool & {
            apyReward?: number | null;
            stablecoin?: boolean | null;
            ilRisk?: string | null;
            exposure?: string | null;
          };
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
                  {apyDiff != null && (
                    <span style={{ fontSize: 11, color: apyDiff >= 0 ? '#4ECDA4' : '#FF6B6B', marginTop: 2, display: 'block' }}>
                      vs 30d avg: {apyDiff >= 0 ? '+' : ''}{apyDiff.toFixed(2)}%
                    </span>
                  )}
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

              {/* Token Prices */}
              <TokenPricesSection
                poolSymbol={pool.symbol}
                poolApy={apy}
                prices={prices}
                loading={pricesLoading}
              />

              {/* Score Breakdown */}
              <div style={{ margin: '16px 0', background: 'rgba(107,79,255,0.07)', border: '1px solid rgba(107,79,255,0.2)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid rgba(107,79,255,0.1)' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(232,230,255,0.4)' }}>Score Breakdown</span>
                </div>
                <div style={{ padding: '14px 14px 10px' }}>
                  <div className="detail-score-main" style={{ marginBottom: 10 }}>
                    <span className="detail-score-num" style={{ color: scoreColour }}>{score}</span>
                    <span className="score-badge" style={{ background: `${scoreColour}1a`, color: scoreColour, border: `1px solid ${scoreColour}40`, fontSize: 12, padding: '2px 10px' }}>{scoreTier}</span>
                  </div>
                  <div className="score-bar-track" style={{ marginBottom: 16 }}>
                    <div className="score-bar-fill" style={{ width: `${score}%`, background: scoreColour }} />
                  </div>
                  {breakdown.components.map(comp => (
                    <div key={comp.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: 'rgba(232,230,255,0.45)', minWidth: 92, flex: 'none' }}>{comp.label}</span>
                      <div style={{ flex: 1, height: 4, background: 'rgba(232,230,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${(comp.score / 10) * 100}%`, height: '100%', background: scoreColour, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'rgba(232,230,255,0.45)', minWidth: 36, textAlign: 'right', flex: 'none', fontVariantNumeric: 'tabular-nums' }}>{comp.score.toFixed(1)}/10</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Yield Composition */}
              <div style={{ margin: '16px 0', background: 'rgba(107,79,255,0.07)', border: '1px solid rgba(107,79,255,0.2)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid rgba(107,79,255,0.1)' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(232,230,255,0.4)' }}>Yield Composition</span>
                </div>
                <div style={{ padding: '14px 14px 12px' }}>
                  {pool.apyBase == null ? (
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(232,230,255,0.35)', fontStyle: 'italic' }}>Composition data unavailable</p>
                  ) : (!extPool.apyReward) ? (
                    <>
                      <div style={{ height: 8, background: '#4ECDA4', borderRadius: 4, marginBottom: 10 }} />
                      <p style={{ margin: 0, fontSize: 11, color: 'rgba(232,230,255,0.45)' }}>100% organic yield</p>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                        <div style={{ width: `${(pool.apyBase / Math.max(apy, 0.001)) * 100}%`, background: '#4ECDA4' }} />
                        <div style={{ flex: 1, background: '#FFB347' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#4ECDA4', flex: 'none', display: 'inline-block' }} />
                          <span style={{ fontSize: 11, color: 'rgba(232,230,255,0.45)' }}>Organic {pool.apyBase.toFixed(2)}%</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#FFB347', flex: 'none', display: 'inline-block' }} />
                          <span style={{ fontSize: 11, color: 'rgba(232,230,255,0.45)' }}>Incentive {extPool.apyReward.toFixed(2)}%</span>
                        </div>
                      </div>
                    </>
                  )}
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

              {/* Pool Facts */}
              <div style={{ margin: '16px 0 0', background: 'rgba(107,79,255,0.07)', border: '1px solid rgba(107,79,255,0.2)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid rgba(107,79,255,0.1)' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(232,230,255,0.4)' }}>Pool Facts</span>
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {extPool.stablecoin != null && (
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(232,230,255,0.06)', border: '0.5px solid rgba(232,230,255,0.15)', color: 'rgba(232,230,255,0.55)' }}>
                      {extPool.stablecoin ? 'Stablecoin pool' : 'Volatile pair'}
                    </span>
                  )}
                  {extPool.ilRisk != null && (
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(232,230,255,0.06)', border: '0.5px solid rgba(232,230,255,0.15)', color: 'rgba(232,230,255,0.55)' }}>
                      IL risk: {extPool.ilRisk}
                    </span>
                  )}
                  {extPool.exposure != null && (
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(232,230,255,0.06)', border: '0.5px solid rgba(232,230,255,0.15)', color: 'rgba(232,230,255,0.55)' }}>
                      {extPool.exposure === 'single' ? 'Single asset' : extPool.exposure === 'multi' ? 'Multi asset' : extPool.exposure}
                    </span>
                  )}
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: chain.bg, border: `0.5px solid ${chain.text}40`, color: chain.text }}>
                    {pool.chain}
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
