import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Pool } from '../types';
import { CHAIN_LOGOS } from '../types';
import { calculateDexarisScore, calculateDexarisScoreBreakdown, getDexarisScoreColour, getDexarisScoreTier, type ScoreBreakdownResult } from '../utils/dexarisScore';
import { useTokenPrices, parsePoolSymbols } from '../hooks/useTokenPrices';
import { usePools } from '../contexts/PoolsContext';
import { supabase } from '../lib/supabase';

interface Props {
  pool: Pool | null;
  onClose: () => void;
}

interface HistoryPoint {
  date: string;
  apy: number;
}

interface ScoreHistoryPoint {
  date: string;
  score: number;
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

const CARD = {
  background: 'rgba(232,230,255,0.03)',
  border: '0.5px solid rgba(232,230,255,0.08)',
  borderRadius: '10px',
  padding: '16px',
};

const SEC_LABEL = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'rgba(232,230,255,0.4)',
  display: 'block',
  marginBottom: 12,
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

const getYieldSource = (pool: any): { label: string; description: string } => {
  const { project, apy, apyBase, apyReward, stablecoin, exposure, symbol } = pool;

  const hasRewards = apyReward && apyReward > 0;
  const hasBase = apyBase && apyBase > 0;
  const rewardRatio = apy > 0 ? (apyReward ?? 0) / apy : 0;

  const stakingKeywords = ['staking', 'stake', 'lido', 'rocketpool', 'jito', 'binance-staked', 'marinade', 'frax-ether', 'ether.fi', 'kelp', 'renzo', 'sanctum', 'jupiter-staked', 'doublezero'];
  const isStaking = stakingKeywords.some((k: string) => project?.toLowerCase().includes(k)) || symbol?.toLowerCase().includes('sol') && exposure === 'single';

  if (isStaking) return {
    label: 'Staking reward',
    description: 'Yield comes from validator or protocol staking economics. Naturally capped by network conditions — generally the most reliable yield type.',
  };

  const lendingKeywords = ['aave', 'compound', 'morpho', 'spark', 'euler', 'maple', 'clearpool', 'sky-lending', 'radiant', 'benqi', 'venus'];
  const isLending = lendingKeywords.some((k: string) => project?.toLowerCase().includes(k));

  if (isLending) return {
    label: 'Lending spread',
    description: 'Yield comes from borrower demand. Rates fluctuate with utilisation — sustainable as long as borrow demand exists.',
  };

  if (stablecoin && hasBase && rewardRatio < 0.3) return {
    label: 'Stablecoin LP fees',
    description: 'Organic trading fees from stablecoin swaps. Low volatility, no IL risk, yield scales with swap volume.',
  };

  if (rewardRatio > 0.7) return {
    label: 'Token incentives',
    description: 'Majority of yield is reward token emissions. APY may compress when incentives reduce — treat headline figure with caution.',
  };

  if (hasBase && hasRewards && rewardRatio >= 0.3 && rewardRatio <= 0.7) return {
    label: 'Fees + incentives',
    description: 'Mix of organic trading fees and reward token emissions. Organic portion is sustainable; incentive portion may change.',
  };

  if (hasBase && !hasRewards) return {
    label: 'Trading fees',
    description: 'Yield comes entirely from LP trading fees. Sustainable as long as swap volume holds — no reliance on token emissions.',
  };

  return {
    label: 'Mixed sources',
    description: 'Yield comes from a combination of sources. Check the organic ratio below for a breakdown.',
  };
};

// ── Token Prices Section ───────────────────────────────────────────────────

function SparklineChart({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) {
    return (
      <span style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 56,
        height: 24,
        fontSize: 9,
        color: 'rgba(232,230,255,0.3)',
        letterSpacing: '0.02em',
        flex: 'none',
      }}>
        No data
      </span>
    );
  }

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
  poolSymbol, poolApy, prices, loading, noMargin,
}: {
  poolSymbol: string;
  poolApy: number;
  prices: ReturnType<typeof import('../hooks/useTokenPrices').useTokenPrices>['prices'];
  loading: boolean;
  noMargin?: boolean;
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
      margin: noMargin ? 0 : '16px 0',
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
                <span style={{ fontSize: 12, fontWeight: 600, color: '#E8E6FF', minWidth: 48, flex: 'none' }}>
                  {sym}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#E8E6FF', flex: 1, fontVariantNumeric: 'tabular-nums' }}>
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
                  <span style={{ fontSize: 10, color: 'rgba(232,230,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase', flex: 'none' }}>
                    Stablecoin
                  </span>
                ) : (
                  <>
                    <span style={{ fontSize: 11, flex: 'none', minWidth: 52, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ fontSize: 9, color: 'rgba(232,230,255,0.3)', display: 'block', marginBottom: 1 }}>24h</span>
                      <ChangeLabel value={p.change24h} />
                    </span>
                    <span style={{ fontSize: 11, flex: 'none', minWidth: 52, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ fontSize: 9, color: 'rgba(232,230,255,0.3)', display: 'block', marginBottom: 1 }}>7d</span>
                      <ChangeLabel value={p.change7d} />
                    </span>
                    <SparklineChart data={p.sparkline} color={positive7d ? '#4ECDA4' : '#FF6B6B'} />
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

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

function generateInsight(
  p: { apy?: number | null; apyBase?: number | null; apyReward?: number | null; stablecoin?: boolean | null; ilRisk?: string | null },
  breakdown: ScoreBreakdownResult,
): string {
  const consistency = breakdown.components.find(c => c.label === 'Consistency')?.score ?? 0;
  const organic = breakdown.components.find(c => c.label === 'Organic Yield')?.score ?? 0;
  const tvlScore = breakdown.components.find(c => c.label === 'TVL Depth')?.score ?? 0;
  const apy = p.apy ?? 0;
  const apyBase = p.apyBase ?? 0;
  // Use the same incentive proportion as the Yield Composition bar: (apy - apyBase) / apy.
  // Only non-zero when apyReward is truthy — the same condition the bar uses to enter its
  // incentive branch — so the warning never fires when Yield Composition shows 100% organic.
  const rewardRatio = apy > 0 && p.apyReward ? (apy - apyBase) / Math.max(apy, 0.001) : 0;
  console.log('[generateInsight]', { apy, apyReward: p.apyReward, apyBase, rewardRatio });
  const lines: string[] = [];
  if (consistency >= 9) lines.push('Highly consistent yield over 30 days.');
  else if (consistency >= 6) lines.push('Moderately stable yield with some variance.');
  else lines.push('APY has been volatile — treat the headline figure with caution.');
  if (organic >= 9) lines.push('Yield is fully organic, not reliant on token incentives.');
  else if (organic >= 5) lines.push('Mix of organic fees and token incentives.');
  else lines.push('Yield is primarily incentive-driven and may not persist.');
  if (rewardRatio > 0.7) {
    lines.push('More than ' + Math.min(100, Math.round(rewardRatio * 100)) + '% of this yield comes from token emissions. Check whether the reward token has a known unlock schedule or high inflation before assuming this return is durable — the real return after token price decline can be far lower than the headline APY.');
  }
  if (tvlScore >= 9) lines.push('Deep liquidity reduces slippage and exit risk.');
  else if (tvlScore >= 5) lines.push('Adequate liquidity for most position sizes.');
  else lines.push('Shallow pool — large positions may face slippage.');
  if (p.stablecoin) lines.push('Stablecoin pool eliminates price exposure.');
  else if (p.ilRisk === 'no') lines.push('No impermanent loss risk.');
  else if (p.ilRisk === 'yes') lines.push('Volatile pair — impermanent loss is a real risk here.');
  return lines.join(' ');
}

export default function PoolDetail({ pool, onClose }: Props) {
  const isOpen = pool !== null;
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [scoreHistoryData, setScoreHistoryData] = useState<ScoreHistoryPoint[]>([]);
  const { prices, loading: pricesLoading } = useTokenPrices(pool?.symbol ?? '');
  const [panelWide, setPanelWide] = useState(() => window.innerWidth >= 1100);

  const [nowTick, setNowTick] = useState(Date.now);
  const { allPools, fetchedAt } = usePools();

  useEffect(() => {
    const onResize = () => setPanelWide(window.innerWidth >= 1100);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const scoreMap = useMemo(
    () => new Map(allPools.map(p => [p.pool, calculateDexarisScore(p)])),
    [allPools],
  );
  const scoreRank = useMemo(() => {
    if (!pool) return null;
    const sorted = [...scoreMap.entries()].sort((a, b) => b[1] - a[1]);
    const idx = sorted.findIndex(([id]) => id === pool.pool);
    return idx >= 0 ? idx + 1 : null;
  }, [scoreMap, pool]);
  const totalPools = allPools.length;

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

  useEffect(() => {
    if (!pool) {
      setScoreHistoryData([]);
      return;
    }

    let cancelled = false;
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    supabase
      .from('pool_snapshots')
      .select('timestamp, dexaris_score')
      .eq('pool_id', pool.pool)
      .gte('timestamp', cutoff)
      .order('timestamp', { ascending: true })
      .then(({ data }) => {
        if (cancelled || !data) return;
        const points = data
          .filter(d => d.dexaris_score != null)
          .map(d => ({
            date: new Date(d.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
            score: Math.round(d.dexaris_score as number),
          }));
        setScoreHistoryData(points);
      });

    return () => { cancelled = true; };
  }, [pool?.pool]);

  return (
    <>
      <div
        className={`detail-overlay${isOpen ? ' visible' : ''}`}
        onClick={onClose}
      />
      <aside
        className={`detail-panel${isOpen ? ' open' : ''}`}
        style={panelWide ? { width: '640px' } : undefined}
      >
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

          // ── Shared render fragments ──────────────────────────────────────

          const headerEl = (
            <div className="detail-header">
              <h2 className="detail-protocol">{pool.project}</h2>
              <p className="detail-asset">{pool.symbol}</p>
              <span className="chain-badge" style={{ backgroundColor: chain.bg, color: chain.text }}>
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
          );

          const breakdownRows = breakdown.components.map(comp => (
            <div key={comp.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'rgba(232,230,255,0.45)', minWidth: 92, flex: 'none' }}>{comp.label}</span>
              <div style={{ flex: 1, height: 4, background: 'rgba(232,230,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${(comp.score / 10) * 100}%`, height: '100%', background: scoreColour, borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 11, color: 'rgba(232,230,255,0.45)', minWidth: 36, textAlign: 'right', flex: 'none', fontVariantNumeric: 'tabular-nums' }}>{comp.score.toFixed(1)}/10</span>
            </div>
          ));

          const MIN_SCORE_HISTORY = 5;
          const scoreSparklineEl = (() => {
            if (scoreHistoryData.length < MIN_SCORE_HISTORY) {
              return (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '0.5px solid rgba(232,230,255,0.07)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(232,230,255,0.25)' }}>Score (30d)</span>
                  <span style={{ fontSize: 10, color: 'rgba(232,230,255,0.25)', fontStyle: 'italic' }}>Building score history…</span>
                </div>
              );
            }
            const scores = scoreHistoryData.map(d => d.score);
            const delta = scores[scores.length - 1] - scores[0];
            const deltaColor = delta >= 0 ? '#4ECDA4' : '#FF6B6B';
            const sparkColor = delta >= 0 ? '#4ECDA4' : '#FF6B6B';
            return (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '0.5px solid rgba(232,230,255,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(232,230,255,0.4)' }}>Score (30d)</span>
                  <span style={{ fontSize: 11, color: deltaColor, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                    {delta >= 0 ? '+' : ''}{delta}
                  </span>
                </div>
                <SparklineChart data={scores} color={sparkColor} />
              </div>
            );
          })();

          const yieldSource = getYieldSource(extPool);
          const compositionFallback = (() => {
            const isWarning = yieldSource.label === 'Token incentives';
            const isOrganic = yieldSource.label === 'Staking reward' || yieldSource.label === 'Lending spread' || yieldSource.label === 'Trading fees';
            const text = isWarning
              ? 'Detailed breakdown unavailable, but this pool is classified as incentive-driven based on protocol type and reward structure.'
              : isOrganic
                ? 'Detailed breakdown unavailable, but this pool is classified as organic yield based on protocol type.'
                : 'Yield composition data is not available for this pool.';
            return { text, isWarning };
          })();

          const yieldCompBody = pool.apyBase == null ? (
            <p style={{
              margin: 0,
              fontSize: '12px',
              color: 'rgba(232,230,255,0.5)',
              ...(compositionFallback.isWarning ? { borderLeft: '2px solid #FFB347', paddingLeft: '10px' } : {}),
            }}>
              {compositionFallback.text}
            </p>
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
          );

          const historyChart = (chartHeight: number) => (
            <>
              {historyLoading && <div className="history-skeleton-chart skeleton-bar" />}
              {!historyLoading && historyError && <p className="history-no-data">Historical data unavailable</p>}
              {!historyLoading && !historyError && historyData.length > 0 && (
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <AreaChart data={historyData} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                    <defs>
                      <linearGradient id="apyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6B4FFF" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6B4FFF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,79,255,0.08)" />
                    <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tickFormatter={v => `${v}%`} tick={AXIS_TICK} tickLine={false} axisLine={false} width={36} />
                    <Tooltip
                      contentStyle={{ background: '#111028', border: '0.5px solid rgba(107,79,255,0.25)', borderRadius: 6, fontFamily: 'Space Grotesk, sans-serif', fontSize: 12 }}
                      labelStyle={{ color: '#8B73FF', fontFamily: 'Space Grotesk, sans-serif' }}
                      itemStyle={{ color: '#E8E6FF' }}
                      formatter={(v) => [`${Number(v).toFixed(2)}%`, 'APY']}
                    />
                    <Area type="monotone" dataKey="apy" stroke="#6B4FFF" strokeWidth={1.5} fill="url(#apyGrad)" dot={false} activeDot={{ r: 3, fill: '#6B4FFF' }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </>
          );

          const chipStyle = { fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(232,230,255,0.06)', border: '0.5px solid rgba(232,230,255,0.15)', color: 'rgba(232,230,255,0.55)' };
          const isSingle = extPool.exposure === 'single';
          const factsChips = (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {isSingle ? (
                <span style={chipStyle}>Single asset</span>
              ) : extPool.exposure != null ? (
                <span style={chipStyle}>{extPool.stablecoin ? 'Stablecoin pair' : 'Volatile pair'}</span>
              ) : null}
              {extPool.ilRisk != null && (
                <span style={chipStyle}>IL risk: {extPool.ilRisk}</span>
              )}
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: chain.bg, border: `0.5px solid ${chain.text}40`, color: chain.text }}>
                {pool.chain}
              </span>
            </div>
          );

          const yieldSourceEl = (
            <div style={{ background: 'rgba(232,230,255,0.03)', border: '0.5px solid rgba(232,230,255,0.08)', borderRadius: '10px', padding: '14px 16px' }}>
              <span style={SEC_LABEL}>Yield Source</span>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#E8E6FF', display: 'block', marginBottom: '6px' }}>{yieldSource.label}</span>
              <span style={{ fontSize: '12px', color: 'rgba(232,230,255,0.45)', lineHeight: 1.6, display: 'block' }}>{yieldSource.description}</span>
            </div>
          );

          const insightText = generateInsight(extPool, breakdown);

          let insightSynthesis: string;
          if (score >= 80) insightSynthesis = 'Overall this is one of the stronger yield opportunities in the current market. Suitable for allocators prioritising yield quality over headline APY.';
          else if (score >= 60) insightSynthesis = 'A solid yield opportunity with manageable risk. Worth monitoring APY consistency before committing a large position.';
          else if (score >= 40) insightSynthesis = 'Moderate quality — the yield exists but comes with trade-offs. Understand the incentive structure before entering.';
          else if (score >= 20) insightSynthesis = 'Below average yield quality. High APY here likely reflects elevated risk or unsustainable incentives.';
          else insightSynthesis = 'Poor quality signal across most metrics. Approach with significant caution regardless of the headline APY.';

          let yieldType: string;
          if (extPool.stablecoin) yieldType = 'Stablecoin LP';
          else if (extPool.ilRisk === 'no' && extPool.exposure === 'single') yieldType = 'Single asset staking';
          else if (extPool.exposure != null && extPool.exposure !== 'single') yieldType = 'Multi asset LP';
          else yieldType = 'Liquidity pool';

          const elapsedSec = fetchedAt != null ? Math.round((nowTick - fetchedAt.getTime()) / 1000) : null;

          // ── Wide layout (≥ 1100px viewport) ─────────────────────────────

          if (panelWide) {
            return (
              <div className="detail-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {headerEl}

                {/* Row 1 — Stats strip */}
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  {(() => {
                    const statCard = { flex: 1, background: 'rgba(232,230,255,0.03)', border: '0.5px solid rgba(232,230,255,0.08)', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column' as const, gap: '6px' };
                    const statLabel = { fontSize: '10px', fontWeight: 400, color: 'rgba(232,230,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' };
                    const statValue = { fontSize: '22px', fontWeight: 600, lineHeight: 1.2 };
                    return (
                      <>
                        <div style={statCard}>
                          <span style={statLabel}>APY</span>
                          <span style={{ ...statValue, color: 'var(--accent-text)' }}>{apy.toFixed(2)}%</span>
                          {apyDiff != null && (
                            <span style={{ fontSize: '11px', fontWeight: 400, marginTop: '2px', color: apyDiff >= 0 ? '#4ECDA4' : '#FF6B6B' }}>
                              vs 30d avg: {apyDiff >= 0 ? '+' : ''}{apyDiff.toFixed(2)}%
                            </span>
                          )}
                        </div>
                        <div style={statCard}>
                          <span style={statLabel}>TVL</span>
                          <span style={{ ...statValue, color: 'var(--accent-text)' }}>{formatTvl(pool.tvlUsd)}</span>
                        </div>
                        <div style={statCard}>
                          <span style={statLabel}>Risk Level</span>
                          <span style={{ ...statValue, color: risk.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: risk.color, flex: 'none', display: 'inline-block' }} />
                            {risk.label}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Row 2 — Two columns */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch' }}>
                  {/* Left: Score Breakdown + Yield Source */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ ...CARD, flex: 1 }}>
                      <span style={SEC_LABEL}>Score Breakdown</span>
                      <div className="detail-score-main">
                        <span className="detail-score-num" style={{ color: scoreColour }}>{score}</span>
                        <span className="score-badge" style={{ background: `${scoreColour}1a`, color: scoreColour, border: `1px solid ${scoreColour}40`, fontSize: 12, padding: '2px 10px' }}>{scoreTier}</span>
                      </div>
                      <div className="score-bar-track" style={{ marginBottom: 14 }}>
                        <div className="score-bar-fill" style={{ width: `${score}%`, background: scoreColour }} />
                      </div>
                      {breakdownRows}
                      {scoreSparklineEl}
                    </div>
                    {yieldSourceEl}
                  </div>
                  {/* Right: Yield Composition + Quick Stats */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={CARD}>
                      <span style={SEC_LABEL}>Yield Composition</span>
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        {yieldCompBody}
                      </div>
                    </div>
                    <div style={{ ...CARD, flex: 1 }}>
                      <span style={SEC_LABEL}>Quick Stats</span>
                      {(() => {
                        const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' };
                        const labelStyle = { fontSize: '11px', color: 'rgba(232,230,255,0.4)' };
                        const valueStyle = { fontSize: '11px', color: 'rgba(232,230,255,0.8)', fontWeight: 500 };
                        const divStyle = { height: '0.5px', background: 'rgba(232,230,255,0.06)' };
                        return (
                          <>
                            <div style={rowStyle}>
                              <span style={labelStyle}>Score Rank</span>
                              <span style={valueStyle}>{scoreRank != null ? `#${scoreRank} of ${totalPools}` : '—'}</span>
                            </div>
                            <div style={divStyle} />
                            <div style={rowStyle}>
                              <span style={labelStyle}>Yield Type</span>
                              <span style={valueStyle}>{yieldType}</span>
                            </div>
                            <div style={divStyle} />
                            <div style={rowStyle}>
                              <span style={labelStyle}>Last Refreshed</span>
                              <span style={valueStyle}>{elapsedSec != null ? `${elapsedSec}s ago` : '—'}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Row 3 — Pool Insight */}
                <div style={{ background: 'rgba(107,79,255,0.07)', border: '0.5px solid rgba(107,79,255,0.2)', borderRadius: '10px', padding: '16px' }}>
                  <span style={{ ...SEC_LABEL, color: 'rgba(139,115,255,0.7)' }}>Pool Insight</span>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.7, color: 'rgba(232,230,255,0.65)' }}>{insightText}</p>
                  <p style={{ margin: 0, marginTop: '10px', fontSize: '13px', lineHeight: 1.7, color: 'rgba(232,230,255,0.65)' }}>{insightSynthesis}</p>
                </div>

                {/* Row 4 — APY history */}
                <div style={CARD}>
                  <span style={SEC_LABEL}>30 Day APY History</span>
                  {historyChart(180)}
                </div>

                {/* Row 5 — Pool Facts */}
                <div style={CARD}>
                  <span style={SEC_LABEL}>Pool Facts</span>
                  {factsChips}
                </div>
              </div>
            );
          }

          // ── Narrow layout (< 1100px viewport, existing structure) ────────

          return (
            <div className="detail-content">
              {headerEl}

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
                  {breakdownRows}
                  {scoreSparklineEl}
                </div>
              </div>

              {/* Yield Composition */}
              <div style={{ margin: '16px 0', background: 'rgba(107,79,255,0.07)', border: '1px solid rgba(107,79,255,0.2)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid rgba(107,79,255,0.1)' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(232,230,255,0.4)' }}>Yield Composition</span>
                </div>
                <div style={{ padding: '14px 14px 12px' }}>
                  {yieldCompBody}
                </div>
              </div>

              {/* Yield Source */}
              <div style={{ margin: '0 0 16px' }}>
                {yieldSourceEl}
              </div>

              {/* 30-day APY history */}
              <div className="detail-history">
                <p className="detail-history-title">30 Day APY History</p>
                {historyChart(150)}
              </div>

              {/* Pool Facts */}
              <div style={{ margin: '16px 0 0', background: 'rgba(107,79,255,0.07)', border: '1px solid rgba(107,79,255,0.2)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid rgba(107,79,255,0.1)' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(232,230,255,0.4)' }}>Pool Facts</span>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  {factsChips}
                </div>
              </div>
            </div>
          );
        })()}
      </aside>
    </>
  );
}
