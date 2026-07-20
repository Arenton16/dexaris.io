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

const SCATTER_CHAIN_COLORS: Record<string, string> = {
  Ethereum: '#8B73FF',
  Solana:   '#4ECDA4',
  Arbitrum: '#3B9EFF',
  Base:     '#FFFFFF',
  Avalanche:'#FF6B6B',
  Polygon:  '#FFB347',
};

const APY_THRESHOLD = 15;
const TVL_THRESHOLD = 50;
const SCORE_THRESHOLD = 50;

const AXIS_TICK = {
  fill: 'rgba(232,230,255,0.45)',
  fontFamily: 'Space Grotesk, sans-serif',
  fontSize: 11,
} as const;

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#111028',
    border: '0.5px solid rgba(107,79,255,0.3)',
    borderRadius: 6,
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 11,
  },
  labelStyle:  { color: '#8B73FF', fontFamily: 'Space Grotesk, sans-serif' },
  itemStyle:   { color: '#E8E6FF', fontFamily: 'Space Grotesk, sans-serif' },
  cursor:      { fill: 'rgba(107,79,255,0.06)' },
};

const CHART_INFO: Record<string, string> = {
  riskReward: 'Every pool with TVL ≥ $10M plotted by TVL (trust proxy, X) vs APY (reward, Y). High TVL + high APY is the sweet spot; low TVL + high APY is high risk. Click a chain legend item to hide it.',
  topScore:   'The 10 highest-scoring protocol·asset pairs right now, ranked by overall quality — combining APY, TVL, consistency, and organic yield signals. Duplicate protocol/asset pairs are deduplicated; only the highest score is shown.',
  scoreDist:  'Distribution of all scored pools across 10-point score bands (0–9 through 90–100). A right-skewed distribution indicates fewer high-confidence yield opportunities in the current market.',
  apyVsScore: 'Each dot is a pool plotted by its Dexaris Score (X axis) and current APY (Y axis). Strong pools (top-right) offer both high APY and high confidence. High-APY/low-score pools deserve extra scrutiny.',
};

const HIST_COLOURS = [
  'rgba(255,107,107,0.7)',  // 0–9
  'rgba(255,107,107,0.7)',  // 10–19
  '#FF6B6B',                 // 20–29
  '#FF6B6B',                 // 30–39
  '#FFB347',                 // 40–49
  '#FFB347',                 // 50–59
  'rgba(78,205,164,0.7)',   // 60–69
  'rgba(78,205,164,0.7)',   // 70–79
  '#4ECDA4',                 // 80–89
  '#4ECDA4',                 // 90–100
];

const TIER_SEGMENTS = [
  getDexarisScoreColour(10),
  getDexarisScoreColour(30),
  getDexarisScoreColour(50),
  getDexarisScoreColour(70),
  getDexarisScoreColour(90),
];

// ── Types ──────────────────────────────────────────────────────

interface ScatterPoint extends Pool {
  tvlM: number;
  score: number;
}

interface ScoreScatterPoint {
  score: number;
  apy: number;
  chain: string;
  project: string;
  symbol: string;
}

interface ScoreBarEntry {
  label: string;
  score: number;
  colour: string;
}

interface ScoreHistEntry {
  band: string;
  count: number;
  colour: string;
}

interface InsightData {
  avgApy: number;
  avgApyDelta: number | null;
  avgScore: number;
  poolCount: number;
  protocolCount: number;
  chainCount: number;
  strongCount: number;
  bestChain: { chain: string; avg: number } | null;
}

// ── Sub-components ─────────────────────────────────────────────

interface ChartCardProps {
  id: string;
  title: string;
  subtitle?: string;
  info: string;
  openInfo: string | null;
  onInfo: (id: string | null) => void;
  style?: React.CSSProperties;
  children: ReactNode;
}

const CARD_STYLE: React.CSSProperties = {
  background: 'rgba(17,16,40,0.7)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(107,79,255,0.18)',
  borderRadius: 12,
  padding: 24,
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
};

const CARD_HOVER_STYLE: React.CSSProperties = {
  borderColor: 'rgba(107,79,255,0.4)',
  boxShadow: '0 0 24px rgba(107,79,255,0.12)',
};

function ChartCard({ id, title, subtitle, info, openInfo, onInfo, style, children }: ChartCardProps) {
  const isOpen = openInfo === id;
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="chart-card"
      style={{ ...CARD_STYLE, ...(hovered ? CARD_HOVER_STYLE : null), ...style }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="chart-card-header">
        <div>
          <h3 className="chart-title" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(232,230,255,0.45)', margin: 0 }}>{title}</h3>
          {subtitle && <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'rgba(232,230,255,0.3)', fontWeight: 400 }}>{subtitle}</p>}
        </div>
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
      <span style={{ color: 'rgba(232,230,255,0.4)', minWidth: 40 }}>{label}</span>
      <span>{value}</span>
    </p>
  );
  return (
    <div style={{ background: '#111028', border: '1px solid rgba(107,79,255,0.3)', borderRadius: 6, padding: '10px 12px', fontFamily: 'Space Grotesk, sans-serif', fontSize: 11, color: '#E8E6FF', lineHeight: 1.75, minWidth: 160, pointerEvents: 'none' }}>
      <p style={{ margin: '0 0 4px', fontWeight: 500 }}>{d.project} <span style={{ color: 'rgba(232,230,255,0.4)', fontWeight: 400 }}>{d.symbol}</span></p>
      {row('Chain', d.chain)}
      {row('APY', `${(d.apy ?? 0).toFixed(2)}%`)}
      {row('TVL', tvl)}
      {row('Score', String(d.score))}
    </div>
  );
}

function ScoreScatterTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScoreScatterPoint }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const row = (label: string, value: string) => (
    <p style={{ margin: 0, display: 'flex', gap: 6 }}>
      <span style={{ color: 'rgba(232,230,255,0.4)', minWidth: 50 }}>{label}</span>
      <span>{value}</span>
    </p>
  );
  return (
    <div style={{ background: '#111028', border: '1px solid rgba(107,79,255,0.3)', borderRadius: 6, padding: '10px 12px', fontFamily: 'Space Grotesk, sans-serif', fontSize: 11, color: '#E8E6FF', lineHeight: 1.75, minWidth: 140, pointerEvents: 'none' }}>
      <p style={{ margin: '0 0 4px', fontWeight: 500 }}>{d.project}</p>
      {row('Chain', d.chain)}
      {row('APY', `${d.apy.toFixed(2)}%`)}
      {row('Score', String(d.score))}
    </div>
  );
}

function ScatterDot({ cx, cy, fill }: { cx?: number; cy?: number; fill?: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <circle
      cx={cx ?? 0}
      cy={cy ?? 0}
      r={hovered ? 7 : 5}
      fill={fill ?? 'rgba(232,230,255,0.3)'}
      fillOpacity={hovered ? 1 : 0.75}
      stroke="rgba(12,11,26,0.6)"
      strokeWidth={1}
      style={{ transition: 'r 0.1s ease, fill-opacity 0.1s ease' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    />
  );
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
  const ap = { fontSize: 9, fontFamily: 'Space Grotesk, sans-serif', fill: 'rgba(232,230,255,0.3)' } as const;
  return (
    <g>
      <line x1={thresholdX} y1={top}       x2={thresholdX} y2={top + h}   stroke="rgba(107,79,255,0.2)"  strokeDasharray="4 4" strokeWidth={1} />
      <line x1={left}       y1={thresholdY} x2={left + w}   y2={thresholdY} stroke="rgba(107,79,255,0.3)" strokeDasharray="4 4" strokeWidth={1} />
      <text x={left + w - 4} y={thresholdY - 4} textAnchor="end" {...ap}>15% APY</text>
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
  const ap = { fontSize: 8, fontFamily: 'Space Grotesk, sans-serif', fill: 'rgba(232,230,255,0.2)' } as const;
  return (
    <g>
      <line x1={thresholdX} y1={top}       x2={thresholdX} y2={top + h}   stroke="rgba(107,79,255,0.15)" strokeDasharray="4 4" strokeWidth={1} />
      <line x1={left}       y1={thresholdY} x2={left + w}   y2={thresholdY} stroke="rgba(107,79,255,0.15)" strokeDasharray="4 4" strokeWidth={1} />
      <text x={left + w - 4} y={thresholdY - 4} textAnchor="end" {...ap}>15% APY</text>
      <text x={thresholdX}   y={top + h - 4}    textAnchor="middle" {...ap}>Score 50</text>
    </g>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ColourBar(props: any) {
  const { x, y, width, height, payload } = props;
  return <rect x={x} y={y} width={width} height={height} rx={3} fill={payload?.colour ?? '#8B73FF'} fillOpacity={0.85} />;
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
  const [heroLeftHovered, setHeroLeftHovered] = useState(false);
  const [heroRightHovered, setHeroRightHovered] = useState(false);

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

  const insightData = useMemo<InsightData | null>(() => {
    if (displayPools.length === 0) return null;
    const avgApy = displayPools.reduce((s, p) => s + (p.apy ?? 0), 0) / displayPools.length;
    // apyPct1D is present on the raw DeFiLlama pool objects (confirmed live
    // against yields.llama.fi/pools) but isn't part of the typed Pool
    // interface yet — same pattern used for the Watchlist 24h column.
    // It can carry extreme outlier values on illiquid pools (confirmed live
    // — e.g. a single Balancer pool reporting -857,900% in one day), which
    // are data artifacts rather than real signal. Clamping each pool's
    // contribution to +/-100 points keeps every pool's direction in the
    // average without letting a handful of broken values dominate it.
    const APY_DELTA_CLAMP = 100;
    const apyDeltas = displayPools
      .map(p => (p as unknown as { apyPct1D?: number | null }).apyPct1D)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
      .map(v => Math.max(-APY_DELTA_CLAMP, Math.min(APY_DELTA_CLAMP, v)));
    const avgApyDelta = apyDeltas.length > 0 ? apyDeltas.reduce((s, v) => s + v, 0) / apyDeltas.length : null;
    const scoreVals = [...scoreMap.values()];
    const avgScore = scoreVals.length > 0 ? Math.round(scoreVals.reduce((s, n) => s + n, 0) / scoreVals.length) : 0;
    const strongCount = scoreVals.filter(s => s >= 85).length;
    const protocolCount = new Set(displayPools.map(p => p.project)).size;
    const chainCount = new Set(displayPools.map(p => p.chain)).size;
    const chainApyMap: Record<string, { sum: number; count: number }> = {};
    for (const p of displayPools) {
      if (!chainApyMap[p.chain]) chainApyMap[p.chain] = { sum: 0, count: 0 };
      chainApyMap[p.chain].sum += (p.apy ?? 0);
      chainApyMap[p.chain].count++;
    }
    const bestChain = Object.entries(chainApyMap)
      .map(([chain, { sum, count }]) => ({ chain, avg: sum / count }))
      .sort((a, b) => b.avg - a.avg)[0] ?? null;
    return { avgApy, avgApyDelta, avgScore, poolCount: displayPools.length, protocolCount, chainCount, strongCount, bestChain };
  }, [displayPools, scoreMap]);

  const { chainGroups, legendChains } = useMemo(() => {
    const groups: Record<string, ScatterPoint[]> = {};
    for (const p of displayPools) {
      if (p.tvlUsd < 10_000_000) continue;
      if (!groups[p.chain]) groups[p.chain] = [];
      groups[p.chain].push({ ...p, tvlM: p.tvlUsd / 1_000_000, score: scoreMap.get(p.pool) ?? 0 });
    }
    return { chainGroups: groups, legendChains: Object.keys(groups).sort() };
  }, [displayPools, scoreMap]);

  const topByScoreDeduped = useMemo<ScoreBarEntry[]>(() => {
    const best = new Map<string, { score: number; label: string; colour: string }>();
    for (const p of displayPools) {
      const score = scoreMap.get(p.pool) ?? 0;
      const key = `${p.project}|${p.symbol}`;
      const existing = best.get(key);
      if (!existing || score > existing.score) {
        best.set(key, { score, label: `${p.project} · ${p.symbol}`, colour: getDexarisScoreColour(score) });
      }
    }
    return [...best.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(v => ({ label: v.label, score: v.score, colour: v.colour }));
  }, [displayPools, scoreMap]);

  const scoreHistogram = useMemo<ScoreHistEntry[]>(() => {
    const bands: ScoreHistEntry[] = Array.from({ length: 10 }, (_, i) => ({
      band: `${i * 10}–${i === 9 ? 100 : i * 10 + 9}`,
      count: 0,
      colour: HIST_COLOURS[i],
    }));
    for (const score of scoreMap.values()) {
      const idx = Math.min(Math.floor(score / 10), 9);
      bands[idx].count++;
    }
    return bands;
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

  const scoreBarShape = useCallback((props: {
    x?: number; y?: number; width?: number; height?: number; index?: number;
  }) => {
    const { x = 0, y = 0, width = 0, height = 0, index } = props;
    const entry = index != null ? topByScoreDeduped[index] : null;
    if (!entry) return <g />;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} rx={3} fill={entry.colour} fillOpacity={0.8} />
        <text
          x={x + width + 6} y={y + height / 2}
          dominantBaseline="middle"
          fill={entry.colour}
          fontSize={10}
          fontFamily="Space Grotesk, sans-serif"
        >
          {entry.score}
        </text>
      </g>
    );
  }, [topByScoreDeduped]);

  if (displayPools.length === 0) {
    return (
      <div className="analytics-page">
        <div className="analytics-header" style={{ marginBottom: '32px' }}>
          <h2 className="analytics-title">Analytics</h2>
          <p className="analytics-subtitle">Macro yield intelligence across DeFi</p>
        </div>
        <div className="empty-state">
          <p className="empty-state-main">No pool data available</p>
          <p className="empty-state-sub">Charts will appear once yield data loads</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* Row 1 — Header */}
      <div className="analytics-header" style={{ marginBottom: '32px' }}>
        <h2 className="analytics-title">Analytics</h2>
        <p className="analytics-subtitle">Macro yield intelligence across DeFi</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Row 2 — Hero stats strip */}
        {insightData && (() => {
          const scoreColor = getDexarisScoreColour(insightData.avgScore);
          const scoreTier  = getDexarisScoreTier(insightData.avgScore);
          const maxHistCount = Math.max(...scoreHistogram.map(e => e.count), 1);
          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'stretch' }}>
              {/* Left hero card — three horizontal zones */}
              <div
                style={{
                  ...CARD_STYLE,
                  flex: '1.4 1 280px',
                  borderLeft: '2px solid #6B4FFF',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'stretch',
                  minHeight: '200px',
                  boxSizing: 'border-box',
                  boxShadow: heroLeftHovered
                    ? '0 0 40px rgba(107,79,255,0.15), 0 0 24px rgba(107,79,255,0.12)'
                    : '0 0 40px rgba(107,79,255,0.15)',
                }}
                onMouseEnter={() => setHeroLeftHovered(true)}
                onMouseLeave={() => setHeroLeftHovered(false)}
              >
                {/* Zone 1 — score */}
                <div style={{ flex: '0 0 30%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(232,230,255,0.35)', display: 'block', marginBottom: '14px' }}>Avg Dexaris Score</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: '52px', fontWeight: 600, lineHeight: 1, color: '#6B4FFF' }}>{insightData.avgScore}</span>
                    <span style={{ fontSize: '13px', color: scoreColor, opacity: 0.7, marginTop: '4px', display: 'block' }}>{scoreTier}</span>
                    <span style={{ fontSize: '12px', color: 'rgba(232,230,255,0.3)', marginTop: '10px', display: 'block' }}>Across {insightData.poolCount.toLocaleString()} scored pools</span>
                  </div>
                </div>
                {/* Zone 2 — tier gauge */}
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingLeft: '20px', paddingRight: '20px', borderLeft: '1px solid rgba(232,230,255,0.06)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(232,230,255,0.35)', display: 'block', marginBottom: '14px' }}>Score Gauge</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', height: '14px', marginBottom: '2px', width: '100%' }}>
                      <span style={{ position: 'absolute', left: `${insightData.avgScore}%`, bottom: 0, transform: 'translateX(-50%)', fontSize: '9px', color: scoreColor, lineHeight: 1 }}>▼</span>
                    </div>
                    <div style={{ display: 'flex', width: '100%', height: '6px', borderRadius: '3px', overflow: 'hidden', gap: '1px' }}>
                      {TIER_SEGMENTS.map((colour, i) => (
                        <div key={i} style={{ flex: '1 1 0', background: colour, height: '100%' }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'rgba(232,230,255,0.3)' }}>0</span>
                      <span style={{ fontSize: '10px', color: 'rgba(232,230,255,0.3)' }}>100</span>
                    </div>
                  </div>
                </div>
                {/* Zone 3 — mini distribution */}
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingLeft: '20px', borderLeft: '1px solid rgba(232,230,255,0.06)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(232,230,255,0.35)', display: 'block', marginBottom: '14px' }}>Distribution</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%', height: '70px' }}>
                      {scoreHistogram.map((entry, i) => (
                        <div
                          key={i}
                          style={{ flex: '1 1 0', height: `${Math.max(2, (entry.count / maxHistCount) * 70)}px`, background: entry.colour, borderRadius: '2px 2px 0 0', opacity: 0.85, margin: '0 1.5px' }}
                          title={`${entry.band}: ${entry.count} pools`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* Right stats card — three dense rows */}
              <div
                style={{
                  ...CARD_STYLE,
                  ...(heroRightHovered ? CARD_HOVER_STYLE : null),
                  flex: '1 1 200px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '200px',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={() => setHeroRightHovered(true)}
                onMouseLeave={() => setHeroRightHovered(false)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '0.5px solid rgba(232,230,255,0.06)' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(232,230,255,0.35)' }}>Average APY</span>
                    <span style={{ fontSize: '12px', color: 'rgba(232,230,255,0.3)' }}>across all pools</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '22px', fontWeight: 600, color: '#E8E6FF' }}>{insightData.avgApy.toFixed(2)}%</span>
                    {insightData.avgApyDelta !== null && (
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: insightData.avgApyDelta >= 0 ? '#4ECDA4' : '#FF6B6B', marginTop: '2px' }}>
                        {insightData.avgApyDelta >= 0 ? '+' : ''}{insightData.avgApyDelta.toFixed(2)}% <span style={{ color: 'rgba(232,230,255,0.3)' }}>24h</span>
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', paddingBottom: '14px', borderBottom: '0.5px solid rgba(232,230,255,0.06)' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(232,230,255,0.35)' }}>Protocols Tracked</span>
                    <span style={{ fontSize: '12px', color: 'rgba(232,230,255,0.3)' }}>{insightData.chainCount} chains</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '22px', fontWeight: 600, color: '#E8E6FF' }}>{insightData.protocolCount}</span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(232,230,255,0.45)', marginTop: '2px' }}>{insightData.strongCount} scoring Strong</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(232,230,255,0.35)' }}>Best Performing Chain</span>
                  </div>
                  {insightData.bestChain && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {CHAIN_LOGOS[insightData.bestChain.chain] && (
                          <img src={CHAIN_LOGOS[insightData.bestChain.chain]} alt={insightData.bestChain.chain} width={20} height={20} onError={e => { e.currentTarget.style.display = 'none'; }} />
                        )}
                        <span style={{ fontSize: '18px', fontWeight: 600, color: '#E8E6FF' }}>{insightData.bestChain.chain}</span>
                      </div>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#4ECDA4', marginTop: '2px' }}>{insightData.bestChain.avg.toFixed(2)}% avg APY</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Row 3 — Risk vs Reward (full width) */}
        <ChartCard
          id="riskReward"
          title="Risk vs Reward"
          subtitle="Every pool above $10M TVL, plotted by yield against pool depth"
          info={CHART_INFO.riskReward}
          openInfo={openInfo}
          onInfo={setOpenInfo}
        >
          <ResponsiveContainer width="100%" height={420} style={{ marginLeft: -8 }}>
            <ScatterChart margin={{ top: 4, right: 16, bottom: 24, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(232,230,255,0.06)" />
              <XAxis
                type="number" dataKey="tvlM" name="TVL" scale="log"
                domain={['auto', 'auto']} ticks={[10, 50, 100, 500, 1000, 10000]}
                tickFormatter={formatTvlLog} tick={AXIS_TICK} tickLine={false} axisLine={false}
                label={{ value: 'TVL', position: 'insideBottom', offset: -14, fill: 'rgba(232,230,255,0.45)', fontSize: 9, fontFamily: 'Space Grotesk, sans-serif' }}
              />
              <YAxis
                type="number" dataKey="apy" name="APY"
                tickFormatter={v => `${v}%`} tick={AXIS_TICK} tickLine={false} axisLine={false}
                label={{ value: 'APY %', angle: -90, position: 'insideLeft', offset: 10, fill: 'rgba(232,230,255,0.45)', fontSize: 9, fontFamily: 'Space Grotesk, sans-serif' }}
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
                  style={{
                    cursor: 'pointer',
                    opacity: active ? 1 : 0.3,
                    textDecoration: active ? 'none' : 'line-through',
                    background: active ? 'rgba(107,79,255,0.12)' : 'transparent',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    transition: 'opacity 0.15s ease, background 0.15s ease',
                    userSelect: 'none',
                  }}>
                  <span className="scatter-legend-dot" style={{ background: SCATTER_CHAIN_COLORS[chain] ?? 'rgba(232,230,255,0.3)' }} />
                  {chain}
                </span>
              );
            })}
          </div>
        </ChartCard>

        {/* Row 4 — 50/50 grid */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
          {/* Left: Top 10 by Dexaris Score */}
          <ChartCard
            id="topScore"
            title="Top 10 by Dexaris Score"
            subtitle="The highest quality yield opportunities right now"
            info={CHART_INFO.topScore}
            openInfo={openInfo}
            onInfo={setOpenInfo}
            style={{ flex: '1 1 400px', minWidth: 0 }}
          >
            <ResponsiveContainer width="100%" height={380} style={{ marginLeft: -8 }}>
              <BarChart data={topByScoreDeduped} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(232,230,255,0.06)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="label" tick={{ ...AXIS_TICK, fontSize: 10 }} tickLine={false} axisLine={false} width={170} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [value, 'Score']} />
                <Bar
                  dataKey="score"
                  maxBarSize={22}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  shape={scoreBarShape as any}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Right: Score Distribution histogram */}
          <ChartCard
            id="scoreDist"
            title="Score Distribution"
            subtitle="How yield quality is distributed across every scored pool"
            info={CHART_INFO.scoreDist}
            openInfo={openInfo}
            onInfo={setOpenInfo}
            style={{ flex: '1 1 400px', minWidth: 0 }}
          >
            <ResponsiveContainer width="100%" height={380} style={{ marginLeft: -8 }}>
              <BarChart data={scoreHistogram} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(232,230,255,0.06)" vertical={false} />
                <XAxis dataKey="band" tick={{ ...AXIS_TICK, fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [value, 'Pools']} />
                <Bar
                  dataKey="count"
                  maxBarSize={48}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  shape={ColourBar as any}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Row 5 — APY vs Dexaris Score (full width) */}
        <ChartCard
          id="apyVsScore"
          title="APY vs Dexaris Score"
          subtitle="High score + high APY is the target zone — high APY alone is not enough"
          info={CHART_INFO.apyVsScore}
          openInfo={openInfo}
          onInfo={setOpenInfo}
        >
          <ResponsiveContainer width="100%" height={420} style={{ marginLeft: -8 }}>
            <ScatterChart margin={{ top: 4, right: 16, bottom: 24, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(232,230,255,0.06)" />
              <XAxis
                type="number" dataKey="score" name="Score" domain={[0, 100]}
                tick={AXIS_TICK} tickLine={false} axisLine={false}
                label={{ value: 'Dexaris Score', position: 'insideBottom', offset: -14, fill: 'rgba(232,230,255,0.45)', fontSize: 9, fontFamily: 'Space Grotesk, sans-serif' }}
              />
              <YAxis
                type="number" dataKey="apy" name="APY"
                tickFormatter={v => `${v}%`} tick={AXIS_TICK} tickLine={false} axisLine={false}
                label={{ value: 'APY %', angle: -90, position: 'insideLeft', offset: 10, fill: 'rgba(232,230,255,0.45)', fontSize: 9, fontFamily: 'Space Grotesk, sans-serif' }}
              />
              <ZAxis range={[1, 1]} />
              <ApyScoreQuadrant />
              <Tooltip content={<ScoreScatterTooltip />} wrapperStyle={{ overflow: 'visible', zIndex: 100 }} cursor={{ stroke: 'rgba(232,230,255,0.2)', strokeWidth: 1 }} />
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
                  style={{
                    cursor: 'pointer',
                    opacity: active ? 1 : 0.3,
                    textDecoration: active ? 'none' : 'line-through',
                    background: active ? 'rgba(107,79,255,0.12)' : 'transparent',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    transition: 'opacity 0.15s ease, background 0.15s ease',
                    userSelect: 'none',
                  }}>
                  <span className="scatter-legend-dot" style={{ background: SCATTER_CHAIN_COLORS[chain] ?? 'rgba(232,230,255,0.3)' }} />
                  {chain}
                </span>
              );
            })}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
