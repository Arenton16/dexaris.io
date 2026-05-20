import { useCallback, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
  ScatterChart, Scatter, ZAxis,
  usePlotArea, useXAxisScale, useYAxisScale,
} from 'recharts';
import type { Pool } from '../types';
import { calculateDexarisScore, getDexarisScoreColour, getDexarisScoreTier } from '../utils/dexarisScore';

interface Props {
  displayPools: Pool[];
}

const APY_THRESHOLD = 15;
const TVL_THRESHOLD = 50;

const SCATTER_CHAIN_COLORS: Record<string, string> = {
  Ethereum: '#6B4FFF',
  Solana:   '#4ECDA4',
  Arbitrum: '#3B9EFF',
  Base:     '#6AABFF',
  Avalanche:'#FF6B6B',
  Polygon:  '#A855F7',
};

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

interface ScatterPoint extends Pool {
  tvlM: number;
}

interface BarEntry {
  name: string;
  apy: number;
  mean30d: number | null;
  scoreColour: string;
  score: number;
  scoreTier: string;
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
    <div style={{
      background: '#111028',
      border: '1px solid rgba(107,79,255,0.3)',
      borderRadius: 6,
      padding: '10px 12px',
      fontFamily: 'Space Grotesk, sans-serif',
      fontSize: 12,
      color: '#E8E6FF',
      lineHeight: 1.75,
      minWidth: 148,
      pointerEvents: 'none',
    }}>
      <p style={{ margin: '0 0 5px', fontWeight: 600 }}>{d.project}</p>
      {row('Chain', d.chain)}
      {row('APY', `${(d.apy ?? 0).toFixed(2)}%`)}
      {row('TVL', tvl)}
    </div>
  );
}

function ScatterDot({ cx, cy, fill }: { cx?: number; cy?: number; fill?: string }) {
  return (
    <circle
      cx={cx ?? 0}
      cy={cy ?? 0}
      r={4}
      fill={fill ?? 'rgba(232,230,255,0.3)'}
      fillOpacity={0.75}
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

  const labelProps = {
    fontSize: 9,
    fontFamily: 'Space Grotesk, sans-serif',
    letterSpacing: '0.08em',
  } as const;

  const axisLabelProps = {
    fontSize: 8,
    fontFamily: 'Space Grotesk, sans-serif',
    fill: 'rgba(232,230,255,0.25)',
  } as const;

  return (
    <g>
      <line x1={thresholdX} y1={top}        x2={thresholdX} y2={top + h}    stroke="rgba(107,79,255,0.15)" strokeDasharray="4 4" strokeWidth={1} />
      <line x1={left}       y1={thresholdY} x2={left + w}   y2={thresholdY} stroke="rgba(107,79,255,0.15)" strokeDasharray="4 4" strokeWidth={1} />
      <text x={left + 3}    y={thresholdY - 3} textAnchor="start"  {...axisLabelProps}>15% APY</text>
      <text x={thresholdX}  y={top + h - 4}    textAnchor="middle" {...axisLabelProps}>$50M TVL</text>
      <text x={left + 12}     y={top + 20}         fill="rgba(255,107,107,0.6)"  textAnchor="start" {...labelProps}>HIGH RISK</text>
      <text x={left + w - 12} y={top + 20}         fill="rgba(78,205,164,0.6)"   textAnchor="end"   {...labelProps}>SWEET SPOT</text>
      <text x={left + 12}     y={thresholdY - 12}  fill="rgba(232,230,255,0.25)" textAnchor="start" {...labelProps}>AVOID</text>
      <text x={left + w - 12} y={thresholdY - 12}  fill="rgba(107,79,255,0.5)"   textAnchor="end"   {...labelProps}>SAFE HAVEN</text>
    </g>
  );
}

function formatTvlLog(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}B`;
  if (v >= 1)    return `$${v.toFixed(0)}M`;
  return `$${v.toFixed(1)}M`;
}

export default function Analytics({ displayPools }: Props) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [hiddenChains, setHiddenChains] = useState<Set<string>>(new Set());

  const toggleChain = (chain: string) => {
    setHiddenChains(prev => {
      const next = new Set(prev);
      if (next.has(chain)) next.delete(chain); else next.add(chain);
      return next;
    });
  };

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

  const barShape = useCallback((props: {
    x?: number; y?: number; width?: number; height?: number; index?: number;
  }) => {
    const { x = 0, y = 0, width = 0, height = 0, index } = props;
    const entry = index != null ? topByApy[index] : null;
    if (!entry) return <g />;
    const fill = hoveredBar === index ? entry.scoreColour : entry.scoreColour + 'B3';
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
            fill="rgba(232,230,255,0.06)"
            stroke="rgba(232,230,255,0.2)"
            strokeWidth={1}
            strokeDasharray="3 2"
          />
        )}
        <rect x={x} y={y} width={width} height={height} rx={3} fill={fill} />
        <text
          x={x + width + 6} y={y + height / 2}
          dominantBaseline="middle"
          fill={entry.scoreColour}
          fontSize={10}
          fontFamily="Space Grotesk, sans-serif"
          fontWeight={500}
        >
          {entry.score} {entry.scoreTier}
        </text>
      </g>
    );
  }, [topByApy, hoveredBar]);

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
      <div className="analytics-charts">

        {/* Bar chart — top 10 by APY */}
        <div className="chart-card">
          <h3 className="chart-title">Top 10 by APY</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={topByApy}
              layout="vertical"
              margin={{ top: 4, right: 90, bottom: 4, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(107,79,255,0.08)"
                horizontal={false}
              />
              <XAxis
                type="number"
                domain={[0, 'auto']}
                tickFormatter={v => `${v}%`}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={140}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value) => [`${value}%`, 'APY']}
              />
              <Bar
                dataKey="apy"
                maxBarSize={22}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                shape={barShape as any}
                onMouseEnter={(_: unknown, index: number) => setHoveredBar(index)}
                onMouseLeave={() => setHoveredBar(null)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Scatter chart — risk vs reward */}
        <div className="chart-card">
          <h3 className="chart-title">Risk vs Reward</h3>
          <ResponsiveContainer width="100%" height={420}>
            <ScatterChart margin={{ top: 4, right: 16, bottom: 24, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,79,255,0.08)" />
              <XAxis
                type="number"
                dataKey="tvlM"
                name="TVL"
                scale="log"
                domain={['auto', 'auto']}
                ticks={[1, 10, 100, 1000, 10000]}
                tickFormatter={formatTvlLog}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                label={{
                  value: 'TVL',
                  position: 'insideBottom',
                  offset: -14,
                  fill: 'rgba(232,230,255,0.3)',
                  fontSize: 9,
                  fontFamily: 'Space Grotesk, sans-serif',
                }}
              />
              <YAxis
                type="number"
                dataKey="apy"
                name="APY"
                tickFormatter={v => `${v}%`}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                label={{
                  value: 'APY %',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  fill: 'rgba(232,230,255,0.3)',
                  fontSize: 9,
                  fontFamily: 'Space Grotesk, sans-serif',
                }}
              />
              <ZAxis range={[1, 1]} />
              <QuadrantOverlay />
              <Tooltip
                content={<ScatterTooltip />}
                wrapperStyle={{ overflow: 'visible', zIndex: 100 }}
              />
              {Object.entries(chainGroups)
                .filter(([chain]) => !hiddenChains.has(chain))
                .map(([chain, points]) => (
                  <Scatter
                    key={chain}
                    name={chain}
                    data={points}
                    fill={SCATTER_CHAIN_COLORS[chain] ?? 'rgba(232,230,255,0.3)'}
                    shape={ScatterDot}
                  />
                ))}
            </ScatterChart>
          </ResponsiveContainer>
          <div className="scatter-legend">
            {legendChains.map(chain => {
              const active = !hiddenChains.has(chain);
              return (
                <span
                  key={chain}
                  className="scatter-legend-item"
                  onClick={() => toggleChain(chain)}
                  style={{
                    cursor: 'pointer',
                    opacity: active ? 1 : 0.3,
                    textDecoration: active ? 'none' : 'line-through',
                    transition: 'opacity 0.15s ease',
                    userSelect: 'none',
                  }}
                >
                  <span
                    className="scatter-legend-dot"
                    style={{ background: SCATTER_CHAIN_COLORS[chain] ?? 'rgba(232,230,255,0.3)' }}
                  />
                  {chain}
                </span>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
