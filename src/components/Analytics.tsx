import { type ReactNode, useCallback, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
  ScatterChart, Scatter, ZAxis,
  usePlotArea, useXAxisScale, useYAxisScale,
} from 'recharts';
import type { Pool } from '../types';
import { CHAIN_LOGOS } from '../types';
import { calculateDexarisScore, getDexarisScoreColour, getDexarisScoreTier } from '../utils/dexarisScore';

interface Props {
  displayPools: Pool[];
}

const CHAIN_COLORS: Record<string, { bg: string; text: string }> = {
  Ethereum: { bg: '#1a3a5c', text: '#3B9EFF' },
  Base:     { bg: '#1a1a4a', text: '#6B7FFF' },
  Solana:   { bg: '#2d1a4a', text: '#9945FF' },
  Arbitrum: { bg: '#1a2d4a', text: '#2D9CDB' },
  Avalanche:{ bg: '#4a1a1a', text: '#E84142' },
  Polygon:  { bg: '#2d1a4a', text: '#8247E5' },
};

const SCATTER_CHAIN_COLORS: Record<string, string> = {
  Ethereum: '#6B4FFF',
  Solana:   '#4ECDA4',
  Arbitrum: '#3B9EFF',
  Base:     '#6AABFF',
  Avalanche:'#FF6B6B',
  Polygon:  '#A855F7',
};

const APY_THRESHOLD = 15;
const TVL_THRESHOLD = 50;
const SCORE_THRESHOLD = 50;

const AXIS_TICK = {
  fill: 'rgba(232,230,255,0.3)',
  fontFamily: 'Space Grotesk, sans-serif',
  fontSize: 9,
} as const;

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#111028',
    border: '0.5px solid rgba(107,79,255,0.25)',
    borderRadius: 6,
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 12,
  },
  labelStyle:  { color: '#8B73FF', fontFamily: 'Space Grotesk, sans-serif' },
  itemStyle:   { color: '#E8E6FF', fontFamily: 'Space Grotesk, sans-serif' },
  cursor:      { fill: 'rgba(107,79,255,0.06)' },
};

const CHART_INFO: Record<string, string> = {
  riskReward: 'This chart plots every pool by TVL (trust proxy, X axis) against APY (reward, Y axis). High TVL + high APY is the sweet spot; low TVL + high APY is high risk. Click a chain in the legend to hide it.',
  topApy:     "The top 10 highest APY pools right now, coloured by their Dexaris Score. The ghost bar shows the 30-day mean APY — when it's shorter than the live bar, yield has recently spiked.",
  chainPerf:  'Compares the average APY and average Dexaris Score across each chain. Use this to identify which ecosystems are currently offering the best risk-adjusted yield.',
  scoreDist:  'Shows how many pools fall into each Dexaris Score tier across all tracked pools. A heavy Weak skew indicates most current yields are low-confidence or high-risk.',
  apyVsScore: 'Each dot is a pool plotted by its Dexaris Score (X axis) and current APY (Y axis). Strong pools (top-right) offer both high APY and high confidence. High-APY/low-score pools deserve extra scrutiny.',
  topScore:   'The 10 highest-scoring pools on Dexaris right now. Unlike the main yield table, these are ranked by overall quality — not just raw APY — combining TVL, consistency, and organic yield signals.',
};

// ── Types ──────────────────────────────────────────────────────

interface ScatterPoint extends Pool {
  tvlM: number;
}

interface ScoreScatterPoint {
  score: number;
  apy: number;
  chain: string;
  project: string;
  symbol: string;
}

interface BarEntry {
  name: string;
  apy: number;
  mean30d: number | null;
  scoreColour: string;
  score: number;
  scoreTier: string;
}

interface ChainPerfEntry {
  chain: string;
  avgApy: number;
  avgScore: number;
}

interface ScoreDistEntry {
  tier: string;
  count: number;
  colour: string;
}

interface StatCardData {
  id: string;
  label: string;
  value: string;
  sub?: string;
  valueColour?: string;
  logo?: string;
  accent: string;
}

// ── Sub-components ─────────────────────────────────────────────

interface ChartCardProps {
  id: string;
  title: string;
  info: string;
  openInfo: string | null;
  onInfo: (id: string | null) => void;
  children: ReactNode;
}

function ChartCard({ id, title, info, openInfo, onInfo, children }: ChartCardProps) {
  const isOpen = openInfo === id;
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h3 className="chart-title">{title}</h3>
        <button
          className="chart-info-btn"
          onClick={() => onInfo(isOpen ? null : id)}
          aria-label="About this chart"
        >ⓘ</button>
      </div>
      <div className="chart-card-body">{children}</div>
      {isOpen && (
        <div className="chart-info-overlay" onClick={() => onInfo(null)}>
          <div className="chart-info-panel" onClick={e => e.stopPropagation()}>
            <button className="chart-info-close" onClick={() => onInfo(null)}>×</button>
            <p className="chart-info-text">{info}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterPoint }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const tvl = d.tvlM >= 1000
    ? `$${(d.tvlM / 1000).toFixed(1)}B`
    : `$${d.tvlM.toFixed(1)}M`;
  const row = (label: string, value: string) => (
    <p style={{ margin: 0, display: 'flex', gap: 6 }}>
      <span style={{ color: '#8B73FF', minWidth: 40 }}>{label}</span>
      <span>{value}</span>
    </p>
  );
  return (
    <div style={{ background: '#111028', border: '1px solid rgba(107,79,255,0.3)', borderRadius: 6, padding: '10px 12px', fontFamily: 'Space Grotesk, sans-serif', fontSize: 12, color: '#E8E6FF', lineHeight: 1.75, minWidth: 148, pointerEvents: 'none' }}>
      <p style={{ margin: '0 0 5px', fontWeight: 600 }}>{d.project}</p>
      {row('Chain', d.chain)}
      {row('APY', `${(d.apy ?? 0).toFixed(2)}%`)}
      {row('TVL', tvl)}
    </div>
  );
}

function ScoreScatterTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScoreScatterPoint }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const row = (label: string, value: string) => (
    <p style={{ margin: 0, display: 'flex', gap: 6 }}>
      <span style={{ color: '#8B73FF', minWidth: 50 }}>{label}</span>
      <span>{value}</span>
    </p>
  );
  return (
    <div style={{ background: '#111028', border: '1px solid rgba(107,79,255,0.3)', borderRadius: 6, padding: '10px 12px', fontFamily: 'Space Grotesk, sans-serif', fontSize: 12, color: '#E8E6FF', lineHeight: 1.75, minWidth: 148, pointerEvents: 'none' }}>
      <p style={{ margin: '0 0 5px', fontWeight: 600 }}>{d.project}</p>
      {row('Chain', d.chain)}
      {row('APY', `${d.apy.toFixed(2)}%`)}
      {row('Score', String(d.score))}
    </div>
  );
}

function ScatterDot({ cx, cy, fill }: { cx?: number; cy?: number; fill?: string }) {
  return <circle cx={cx ?? 0} cy={cy ?? 0} r={4} fill={fill ?? 'rgba(232,230,255,0.3)'} fillOpacity={0.65} />;
}

function QuadrantOverlay() {
  const plot   = usePlotArea();
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (!plot || !xScale || !yScale) return null;
  const { x: left, y: top, width: w, height: h } = plot;
  const thresholdX = xScale(TVL_THRESHOLD);
  const thresholdY = yScale(APY_THRESHOLD);
  if (thresholdX == null || thresholdY == null) return null;
  const lp = { fontSize: 11, fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.08em' } as const;
  const ap = { fontSize: 8, fontFamily: 'Space Grotesk, sans-serif', fill: 'rgba(232,230,255,0.25)' } as const;
  return (
    <g>
      <line x1={thresholdX} y1={top}       x2={thresholdX} y2={top + h}   stroke="rgba(107,79,255,0.15)" strokeDasharray="4 4" strokeWidth={1} />
      <line x1={left}       y1={thresholdY} x2={left + w}   y2={thresholdY} stroke="rgba(107,79,255,0.15)" strokeDasharray="4 4" strokeWidth={1} />
      <text x={left + 3}    y={thresholdY - 3} textAnchor="start"  {...ap}>15% APY</text>
      <text x={thresholdX}  y={top + h - 4}    textAnchor="middle" {...ap}>$50M TVL</text>
      <text x={left + 12}     y={top + 20}        fill="rgba(232,230,255,0.35)" textAnchor="start" {...lp}>HIGH RISK</text>
      <text x={left + w - 12} y={top + 20}        fill="rgba(232,230,255,0.35)" textAnchor="end"   {...lp}>SWEET SPOT</text>
      <text x={left + 12}     y={thresholdY - 12} fill="rgba(232,230,255,0.35)" textAnchor="start" {...lp}>AVOID</text>
      <text x={left + w - 12} y={thresholdY - 12} fill="rgba(232,230,255,0.35)" textAnchor="end"   {...lp}>SAFE HAVEN</text>
    </g>
  );
}

function ApyScoreQuadrant() {
  const plot   = usePlotArea();
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (!plot || !xScale || !yScale) return null;
  const { x: left, y: top, width: w, height: h } = plot;
  const thresholdX = xScale(SCORE_THRESHOLD);
  const thresholdY = yScale(APY_THRESHOLD);
  if (thresholdX == null || thresholdY == null) return null;
  const lp = { fontSize: 11, fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.08em' } as const;
  const ap = { fontSize: 8, fontFamily: 'Space Grotesk, sans-serif', fill: 'rgba(232,230,255,0.25)' } as const;
  return (
    <g>
      <line x1={thresholdX} y1={top}       x2={thresholdX} y2={top + h}   stroke="rgba(107,79,255,0.15)" strokeDasharray="4 4" strokeWidth={1} />
      <line x1={left}       y1={thresholdY} x2={left + w}   y2={thresholdY} stroke="rgba(107,79,255,0.15)" strokeDasharray="4 4" strokeWidth={1} />
      <text x={left + 3}    y={thresholdY - 3} textAnchor="start"  {...ap}>15% APY</text>
      <text x={thresholdX}  y={top + h - 4}    textAnchor="middle" {...ap}>Score 50</text>
      <text x={left + 12}     y={top + 20}        fill="rgba(232,230,255,0.35)" textAnchor="start" {...lp}>LOW QUALITY</text>
      <text x={left + w - 12} y={top + 20}        fill="rgba(232,230,255,0.35)" textAnchor="end"   {...lp}>SWEET SPOT</text>
      <text x={left + 12}     y={thresholdY - 12} fill="rgba(232,230,255,0.35)" textAnchor="start" {...lp}>UNDERPERFORM</text>
      <text x={left + w - 12} y={thresholdY - 12} fill="rgba(232,230,255,0.35)" textAnchor="end"   {...lp}>STRONG</text>
    </g>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ScoreDistBar(props: any) {
  const { x, y, width, height, payload } = props;
  return <rect x={x} y={y} width={width} height={height} rx={3} fill={payload?.colour ?? '#8B73FF'} />;
}

function ProtocolLogo({ logo, name }: { logo?: string; name: string }) {
  const [err, setErr] = useState(false);
  if (!logo || err) return <span className="protocol-logo-placeholder">{name[0]}</span>;
  return <img src={logo} alt={name} width={20} height={20} className="protocol-logo" onError={() => setErr(true)} />;
}

function formatTvl(val: number): string {
  if (val >= 1e9) return (val / 1e9).toFixed(2) + 'B';
  if (val >= 1e6) return (val / 1e6).toFixed(2) + 'M';
  if (val >= 1e3) return (val / 1e3).toFixed(2) + 'K';
  return val.toFixed(0);
}

function formatTvlLog(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}B`;
  if (v >= 1)    return `$${v.toFixed(0)}M`;
  return `$${v.toFixed(1)}M`;
}

// ── Main component ─────────────────────────────────────────────

export default function Analytics({ displayPools }: Props) {
  const [hiddenChains, setHiddenChains] = useState<Set<string>>(new Set());
  const [openInfo, setOpenInfo] = useState<string | null>(null);

  const toggleChain = useCallback((chain: string) => {
    setHiddenChains(prev => {
      const next = new Set(prev);
      if (next.has(chain)) next.delete(chain); else next.add(chain);
      return next;
    });
  }, []);

  const scoreMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of displayPools) map.set(p.pool, calculateDexarisScore(p));
    return map;
  }, [displayPools]);

  const stats = useMemo<StatCardData[]>(() => {
    if (displayPools.length === 0) return [];
    const avgApy = displayPools.reduce((s, p) => s + (p.apy ?? 0), 0) / displayPools.length;
    const scoreVals = [...scoreMap.values()];
    const avgScore = scoreVals.length > 0 ? Math.round(scoreVals.reduce((s, n) => s + n, 0) / scoreVals.length) : 0;
    const protocolCount = new Set(displayPools.map(p => p.project)).size;
    const chainApyMap: Record<string, { sum: number; count: number }> = {};
    for (const p of displayPools) {
      if (!chainApyMap[p.chain]) chainApyMap[p.chain] = { sum: 0, count: 0 };
      chainApyMap[p.chain].sum += (p.apy ?? 0);
      chainApyMap[p.chain].count++;
    }
    const bestChain = Object.entries(chainApyMap)
      .map(([chain, { sum, count }]) => ({ chain, avg: sum / count }))
      .sort((a, b) => b.avg - a.avg)[0];
    return [
      {
        id: 'avg-apy',
        label: 'Average APY',
        value: `${avgApy.toFixed(2)}%`,
        sub: `${displayPools.length.toLocaleString()} pools`,
        accent: '#4ECDA4',
      },
      {
        id: 'avg-score',
        label: 'Avg Dexaris Score',
        value: String(avgScore),
        sub: getDexarisScoreTier(avgScore),
        valueColour: getDexarisScoreColour(avgScore),
        accent: '#8B73FF',
      },
      {
        id: 'protocols',
        label: 'Protocols Tracked',
        value: String(protocolCount),
        sub: `${new Set(displayPools.map(p => p.chain)).size} chains`,
        accent: '#3B9EFF',
      },
      {
        id: 'best-chain',
        label: 'Best Performing Chain',
        value: bestChain?.chain ?? '—',
        sub: bestChain ? `${bestChain.avg.toFixed(2)}% avg APY` : '',
        logo: CHAIN_LOGOS[bestChain?.chain ?? ''],
        accent: '#FFB347',
      },
    ];
  }, [displayPools, scoreMap]);

  const topByApy = useMemo<BarEntry[]>(() =>
    [...displayPools]
      .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))
      .slice(0, 10)
      .map(p => {
        const score = calculateDexarisScore(p);
        return {
          name: p.project,
          apy: parseFloat((p.apy ?? 0).toFixed(2)),
          mean30d: p.apyMean30d != null ? parseFloat(p.apyMean30d.toFixed(2)) : null,
          scoreColour: getDexarisScoreColour(score),
          score,
          scoreTier: getDexarisScoreTier(score),
        };
      }),
  [displayPools]);

  const { chainGroups, legendChains } = useMemo(() => {
    const groups: Record<string, ScatterPoint[]> = {};
    for (const p of displayPools) {
      if (!groups[p.chain]) groups[p.chain] = [];
      groups[p.chain].push({ ...p, tvlM: p.tvlUsd / 1_000_000 });
    }
    return { chainGroups: groups, legendChains: Object.keys(groups).sort() };
  }, [displayPools]);

  const chainPerformance = useMemo<ChainPerfEntry[]>(() => {
    const groups: Record<string, { apySum: number; scoreSum: number; count: number }> = {};
    for (const p of displayPools) {
      if (!groups[p.chain]) groups[p.chain] = { apySum: 0, scoreSum: 0, count: 0 };
      groups[p.chain].apySum += (p.apy ?? 0);
      groups[p.chain].scoreSum += scoreMap.get(p.pool) ?? 0;
      groups[p.chain].count++;
    }
    return Object.entries(groups)
      .map(([chain, { apySum, scoreSum, count }]) => ({
        chain,
        avgApy: parseFloat((apySum / count).toFixed(2)),
        avgScore: Math.round(scoreSum / count),
      }))
      .sort((a, b) => b.avgApy - a.avgApy);
  }, [displayPools, scoreMap]);

  const scoreDistribution = useMemo<ScoreDistEntry[]>(() => {
    const tiers = { Weak: 0, Moderate: 0, Solid: 0, Strong: 0 };
    for (const score of scoreMap.values()) {
      const tier = getDexarisScoreTier(score) as keyof typeof tiers;
      tiers[tier]++;
    }
    return [
      { tier: 'Weak',     count: tiers.Weak,     colour: 'rgba(107,79,255,0.25)' },
      { tier: 'Moderate', count: tiers.Moderate, colour: 'rgba(107,79,255,0.45)' },
      { tier: 'Solid',    count: tiers.Solid,    colour: 'rgba(107,79,255,0.7)'  },
      { tier: 'Strong',   count: tiers.Strong,   colour: '#6B4FFF'               },
    ];
  }, [scoreMap]);

  const { apyVsScoreGroups, apyScoreLegendChains } = useMemo(() => {
    const groups: Record<string, ScoreScatterPoint[]> = {};
    for (const p of displayPools) {
      const score = scoreMap.get(p.pool) ?? 0;
      if (!groups[p.chain]) groups[p.chain] = [];
      groups[p.chain].push({ score, apy: p.apy ?? 0, chain: p.chain, project: p.project, symbol: p.symbol });
    }
    return { apyVsScoreGroups: groups, apyScoreLegendChains: Object.keys(groups).sort() };
  }, [displayPools, scoreMap]);

  const topByScore = useMemo(() =>
    [...displayPools]
      .sort((a, b) => (scoreMap.get(b.pool) ?? 0) - (scoreMap.get(a.pool) ?? 0))
      .slice(0, 10),
  [displayPools, scoreMap]);

  const barShape = useCallback((props: {
    x?: number; y?: number; width?: number; height?: number; index?: number;
  }) => {
    const { x = 0, y = 0, width = 0, height = 0, index } = props;
    const entry = index != null ? topByApy[index] : null;
    if (!entry) return <g />;
    const n = topByApy.length > 1 ? topByApy.length - 1 : 1;
    const opacity = 1 - ((index ?? 0) / n) * 0.55;
    const fill = `rgba(107,79,255,${opacity.toFixed(2)})`;
    const meanWidth = entry.mean30d != null && entry.apy > 0
      ? Math.max(0, (entry.mean30d / entry.apy) * width)
      : null;
    return (
      <g>
        {meanWidth != null && (
          <rect
            x={x} y={y + height * 0.15}
            width={meanWidth} height={height * 0.7}
            rx={3}
            fill="rgba(255,255,255,0.08)"
          />
        )}
        <rect x={x} y={y} width={width} height={height} rx={3} fill={fill} />
        <text
          x={x + width + 6} y={y + height / 2}
          dominantBaseline="middle"
          fill="rgba(232,230,255,0.6)"
          fontSize={10}
          fontFamily="Space Grotesk, sans-serif"
        >
          {entry.score}
        </text>
      </g>
    );
  }, [topByApy]);

  const header = (
    <div className="analytics-header">
      <h2 className="analytics-title">Analytics</h2>
      <p className="analytics-subtitle">Macro yield intelligence across DeFi</p>
    </div>
  );

  if (topByApy.length === 0) {
    return (
      <div className="analytics-page">
        {header}
        <div className="empty-state">
          <p className="empty-state-main">No pool data available</p>
          <p className="empty-state-sub">Charts will appear once yield data loads</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {header}

      <div className="analytics-dashboard">
        {/* Row 1 — Stat cards */}
        <div className="analytics-stat-row">
          {stats.map(s => (
            <div key={s.id} className="stat-card" style={{ borderLeft: `3px solid ${s.accent}` }}>
              <span className="stat-card-label">{s.label}</span>
              <div className="stat-card-value-row">
                {s.logo && (
                  <img src={s.logo} alt={s.value} width={22} height={22} className="stat-card-chain-logo" />
                )}
                <span className="stat-card-value" style={{ color: s.valueColour ?? s.accent }}>
                  {s.value}
                </span>
              </div>
              {s.sub && <span className="stat-card-sub">{s.sub}</span>}
            </div>
          ))}
        </div>

        {/* Row 2 — Risk vs Reward + Top 10 APY */}
        <div className="analytics-chart-row">
          <ChartCard id="riskReward" title="Risk vs Reward" info={CHART_INFO.riskReward} openInfo={openInfo} onInfo={setOpenInfo}>
            <ResponsiveContainer width="100%" height={360}>
              <ScatterChart margin={{ top: 4, right: 16, bottom: 24, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,79,255,0.08)" />
                <XAxis
                  type="number" dataKey="tvlM" name="TVL" scale="log"
                  domain={['auto', 'auto']} ticks={[1, 10, 100, 1000, 10000]}
                  tickFormatter={formatTvlLog} tick={AXIS_TICK} tickLine={false} axisLine={false}
                  label={{ value: 'TVL', position: 'insideBottom', offset: -14, fill: 'rgba(232,230,255,0.3)', fontSize: 9, fontFamily: 'Space Grotesk, sans-serif' }}
                />
                <YAxis
                  type="number" dataKey="apy" name="APY"
                  tickFormatter={v => `${v}%`} tick={AXIS_TICK} tickLine={false} axisLine={false}
                  label={{ value: 'APY %', angle: -90, position: 'insideLeft', offset: 10, fill: 'rgba(232,230,255,0.3)', fontSize: 9, fontFamily: 'Space Grotesk, sans-serif' }}
                />
                <ZAxis range={[1, 1]} />
                <QuadrantOverlay />
                <Tooltip content={<ScatterTooltip />} wrapperStyle={{ overflow: 'visible', zIndex: 100 }} />
                {Object.entries(chainGroups)
                  .filter(([chain]) => !hiddenChains.has(chain))
                  .map(([chain, points]) => (
                    <Scatter key={chain} name={chain} data={points} fill={SCATTER_CHAIN_COLORS[chain] ?? 'rgba(232,230,255,0.3)'} shape={ScatterDot} />
                  ))}
              </ScatterChart>
            </ResponsiveContainer>
            <div className="scatter-legend">
              {legendChains.map(chain => {
                const active = !hiddenChains.has(chain);
                return (
                  <span key={chain} className="scatter-legend-item" onClick={() => toggleChain(chain)}
                    style={{ cursor: 'pointer', opacity: active ? 1 : 0.3, textDecoration: active ? 'none' : 'line-through', transition: 'opacity 0.15s ease', userSelect: 'none' }}>
                    <span className="scatter-legend-dot" style={{ background: SCATTER_CHAIN_COLORS[chain] ?? 'rgba(232,230,255,0.3)' }} />
                    {chain}
                  </span>
                );
              })}
            </div>
          </ChartCard>

          <ChartCard id="topApy" title="Top 10 by APY" info={CHART_INFO.topApy} openInfo={openInfo} onInfo={setOpenInfo}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topByApy} layout="vertical" margin={{ top: 4, right: 90, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,79,255,0.08)" horizontal={false} />
                <XAxis type="number" domain={[0, 'auto']} tickFormatter={v => `${v}%`} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} width={140} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [`${value}%`, 'APY']} />
                <Bar
                  dataKey="apy"
                  maxBarSize={22}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  shape={barShape as any}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Row 3 — Chain Performance + Score Distribution */}
        <div className="analytics-chart-row">
          <ChartCard id="chainPerf" title="Chain Performance" info={CHART_INFO.chainPerf} openInfo={openInfo} onInfo={setOpenInfo}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chainPerformance} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,79,255,0.08)" vertical={false} />
                <XAxis dataKey="chain" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" orientation="left" tickFormatter={v => `${v}%`} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value, name) => [
                    name === 'Avg APY' ? `${value}%` : value,
                    name,
                  ]}
                />
                <Bar yAxisId="left"  dataKey="avgApy"   name="Avg APY"   fill="#6B4FFF"               maxBarSize={18} />
                <Bar yAxisId="right" dataKey="avgScore" name="Avg Score" fill="rgba(107,79,255,0.35)" maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
            <div className="chain-perf-legend">
              <span className="chain-perf-legend-item"><span className="chain-perf-dot" style={{ background: '#6B4FFF' }} />Avg APY</span>
              <span className="chain-perf-legend-item"><span className="chain-perf-dot" style={{ background: 'rgba(107,79,255,0.35)' }} />Avg Score</span>
            </div>
          </ChartCard>

          <ChartCard id="scoreDist" title="Score Distribution" info={CHART_INFO.scoreDist} openInfo={openInfo} onInfo={setOpenInfo}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={scoreDistribution} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,79,255,0.08)" vertical={false} />
                <XAxis dataKey="tier" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [value, 'Pools']} />
                <Bar
                  dataKey="count"
                  maxBarSize={56}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  shape={ScoreDistBar as any}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Row 4 — APY vs Score scatter + Top 10 by Score table */}
        <div className="analytics-chart-row">
          <ChartCard id="apyVsScore" title="APY vs Dexaris Score" info={CHART_INFO.apyVsScore} openInfo={openInfo} onInfo={setOpenInfo}>
            <ResponsiveContainer width="100%" height={340}>
              <ScatterChart margin={{ top: 4, right: 16, bottom: 24, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,79,255,0.08)" />
                <XAxis
                  type="number" dataKey="score" name="Score" domain={[0, 100]}
                  tick={AXIS_TICK} tickLine={false} axisLine={false}
                  label={{ value: 'Dexaris Score', position: 'insideBottom', offset: -14, fill: 'rgba(232,230,255,0.3)', fontSize: 9, fontFamily: 'Space Grotesk, sans-serif' }}
                />
                <YAxis
                  type="number" dataKey="apy" name="APY"
                  tickFormatter={v => `${v}%`} tick={AXIS_TICK} tickLine={false} axisLine={false}
                  label={{ value: 'APY %', angle: -90, position: 'insideLeft', offset: 10, fill: 'rgba(232,230,255,0.3)', fontSize: 9, fontFamily: 'Space Grotesk, sans-serif' }}
                />
                <ZAxis range={[1, 1]} />
                <ApyScoreQuadrant />
                <Tooltip content={<ScoreScatterTooltip />} wrapperStyle={{ overflow: 'visible', zIndex: 100 }} />
                {Object.entries(apyVsScoreGroups)
                  .filter(([chain]) => !hiddenChains.has(chain))
                  .map(([chain, points]) => (
                    <Scatter key={chain} name={chain} data={points} fill={SCATTER_CHAIN_COLORS[chain] ?? 'rgba(232,230,255,0.3)'} shape={ScatterDot} />
                  ))}
              </ScatterChart>
            </ResponsiveContainer>
            <div className="scatter-legend">
              {apyScoreLegendChains.map(chain => {
                const active = !hiddenChains.has(chain);
                return (
                  <span key={chain} className="scatter-legend-item" onClick={() => toggleChain(chain)}
                    style={{ cursor: 'pointer', opacity: active ? 1 : 0.3, textDecoration: active ? 'none' : 'line-through', transition: 'opacity 0.15s ease', userSelect: 'none' }}>
                    <span className="scatter-legend-dot" style={{ background: SCATTER_CHAIN_COLORS[chain] ?? 'rgba(232,230,255,0.3)' }} />
                    {chain}
                  </span>
                );
              })}
            </div>
          </ChartCard>

          <ChartCard id="topScore" title="Top 10 by Dexaris Score" info={CHART_INFO.topScore} openInfo={openInfo} onInfo={setOpenInfo}>
            <div className="score-table">
              {topByScore.map((pool, i) => {
                const score = scoreMap.get(pool.pool) ?? 0;
                const scoreTier = getDexarisScoreTier(score);
                return (
                  <div key={pool.pool} className="score-table-row">
                    <span className="score-table-rank">{i + 1}</span>
                    <ProtocolLogo logo={pool.logo} name={pool.project} />
                    <div className="score-table-info">
                      <span className="score-table-name">{pool.project}</span>
                      <span className="score-table-symbol">{pool.symbol}</span>
                    </div>
                    <span
                      className="chain-badge"
                      style={{
                        backgroundColor: CHAIN_COLORS[pool.chain]?.bg ?? 'rgba(107,79,255,0.1)',
                        color: CHAIN_COLORS[pool.chain]?.text ?? 'rgba(232,230,255,0.45)',
                        fontSize: 9,
                        padding: '2px 5px',
                      }}
                    >
                      {CHAIN_LOGOS[pool.chain] && (
                        <img src={CHAIN_LOGOS[pool.chain]} alt={pool.chain} width={12} height={12} className="chain-logo" onError={e => { e.currentTarget.style.display = 'none'; }} />
                      )}
                      {pool.chain}
                    </span>
                    <span className="score-table-apy">{(pool.apy ?? 0).toFixed(2)}%</span>
                    <span className="score-table-tvl">${formatTvl(pool.tvlUsd)}</span>
                    <span className="score-table-score-num">{score}</span>
                    <span className="score-table-score-tier">{scoreTier}</span>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
