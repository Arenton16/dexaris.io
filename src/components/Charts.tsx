import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
  ScatterChart, Scatter, ZAxis,
  usePlotArea, useXAxisTicks, useYAxisTicks,
} from 'recharts';
import type { Pool } from '../types';

interface Props {
  displayPools: Pool[];
}

// Fixed DeFi thresholds
const APY_THRESHOLD = 15;  // 15% APY
const TVL_THRESHOLD = 50;  // $50M TVL (in tvlM units)

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

function getQuadrant(apy: number, tvlM: number): { label: string; color: string; icon: string } {
  const highApy = apy > APY_THRESHOLD;
  const highTvl = tvlM > TVL_THRESHOLD;
  if (highApy && !highTvl)  return { label: 'High Risk',  color: 'rgba(255,107,107,0.8)', icon: '⚠' };
  if (highApy && highTvl)   return { label: 'Sweet Spot', color: 'rgba(78,205,164,0.8)',  icon: '✦' };
  if (!highApy && !highTvl) return { label: 'Avoid',      color: 'rgba(232,230,255,0.4)', icon: '✕' };
  return                           { label: 'Safe Haven', color: 'rgba(107,79,255,0.8)',  icon: '◈' };
}

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterPoint }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const tvl = d.tvlM >= 1000
    ? `$${(d.tvlM / 1000).toFixed(1)}B`
    : `$${d.tvlM.toFixed(1)}M`;
  const q = getQuadrant(d.apy ?? 0, d.tvlM);
  return (
    <div style={{
      background: '#111028',
      border: '0.5px solid rgba(107,79,255,0.25)',
      borderRadius: 6,
      padding: '10px 12px',
      fontFamily: 'Space Grotesk, sans-serif',
      fontSize: 12,
      color: '#E8E6FF',
      lineHeight: 1.7,
    }}>
      <p style={{ fontWeight: 500 }}>{d.project}</p>
      <p style={{ color: 'rgba(232,230,255,0.5)', fontSize: 11 }}>{d.symbol}</p>
      <p style={{ color: 'rgba(232,230,255,0.6)' }}>{d.chain}</p>
      <p style={{ color: '#8B73FF' }}>{(d.apy ?? 0).toFixed(2)}% APY</p>
      <p style={{ color: 'rgba(232,230,255,0.5)' }}>{tvl} TVL</p>
      <div style={{ borderTop: '0.5px solid rgba(107,79,255,0.15)', marginTop: 6, paddingTop: 6 }}>
        <p style={{ color: q.color, fontSize: 11 }}>{q.icon} {q.label}</p>
      </div>
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

// Interpolate a pixel coordinate for `target` value between two adjacent ticks.
// logScale=true uses log-linear interpolation (for the TVL log axis).
function interpolateTick(
  ticks: ReadonlyArray<{ value: unknown; coordinate: number }>,
  target: number,
  logScale: boolean,
): number | null {
  const sorted = [...ticks]
    .map(t => ({ v: Number(t.value), px: t.coordinate }))
    .sort((a, b) => a.v - b.v);

  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i];
    const hi = sorted[i + 1];
    if (target >= lo.v && target <= hi.v) {
      const t = logScale
        ? (Math.log10(target) - Math.log10(lo.v)) / (Math.log10(hi.v) - Math.log10(lo.v))
        : (target - lo.v) / (hi.v - lo.v);
      return lo.px + t * (hi.px - lo.px);
    }
  }
  return null;
}

function QuadrantOverlay() {
  const plot   = usePlotArea();
  const xTicks = useXAxisTicks();
  const yTicks = useYAxisTicks();

  if (!plot || !xTicks?.length || !yTicks?.length) return null;

  const { x: left, y: top, width: w, height: h } = plot;

  // X axis: log scale, tvlM units. TVL_THRESHOLD = 50 = $50M.
  const thresholdX = interpolateTick(xTicks, TVL_THRESHOLD, true);
  // Y axis: linear scale. APY_THRESHOLD = 15%.
  const thresholdY = interpolateTick(yTicks, APY_THRESHOLD, false);

  if (thresholdX === null || thresholdY === null) return null;

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
      {/* Fixed threshold dividers */}
      <line x1={thresholdX} y1={top}        x2={thresholdX} y2={top + h}    stroke="rgba(107,79,255,0.15)" strokeDasharray="4 4" strokeWidth={1} />
      <line x1={left}       y1={thresholdY} x2={left + w}   y2={thresholdY} stroke="rgba(107,79,255,0.15)" strokeDasharray="4 4" strokeWidth={1} />

      {/* Axis threshold labels */}
      <text x={left + 3}    y={thresholdY - 3} textAnchor="start"  {...axisLabelProps}>15% APY</text>
      <text x={thresholdX}  y={top + h - 4}    textAnchor="middle" {...axisLabelProps}>$50M TVL</text>

      {/* Quadrant corner labels — AVOID and SAFE HAVEN anchor to the horizontal threshold */}
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

export default function Charts({ displayPools }: Props) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const topByApy = [...displayPools]
    .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))
    .slice(0, 10)
    .map(p => ({ name: p.project, apy: parseFloat((p.apy ?? 0).toFixed(2)) }));

  const scatterData = displayPools.map(p => ({ ...p, tvlM: p.tvlUsd / 1_000_000 }));

  const chainGroups = scatterData.reduce<Record<string, ScatterPoint[]>>((acc, p) => {
    if (!acc[p.chain]) acc[p.chain] = [];
    acc[p.chain].push(p);
    return acc;
  }, {});

  const legendChains = Object.keys(chainGroups).sort();

  if (topByApy.length === 0) return null;

  return (
    <div className="charts-section">
      {/* Bar chart — top 10 by APY */}
      <div className="chart-card">
        <h3 className="chart-title">Top 10 by APY</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={topByApy}
            layout="vertical"
            margin={{ top: 4, right: 52, bottom: 4, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(107,79,255,0.08)"
              horizontal={false}
            />
            <XAxis
              type="number"
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
              radius={[0, 3, 3, 0]}
              maxBarSize={18}
              onMouseEnter={(_: unknown, index: number) => setHoveredBar(index)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {topByApy.map((_, index) => {
                const isFirst = index === 0;
                const isHovered = hoveredBar === index;
                const fill = isFirst
                  ? (isHovered ? '#8B73FF' : '#6B4FFF')
                  : (isHovered ? 'rgba(107,79,255,0.6)' : 'rgba(107,79,255,0.35)');
                return <Cell key={`bar-${index}`} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Scatter chart — risk vs reward */}
      <div className="chart-card">
        <h3 className="chart-title">Risk vs Reward</h3>
        <ResponsiveContainer width="100%" height={248}>
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
            <Tooltip content={<ScatterTooltip />} />
            {Object.entries(chainGroups).map(([chain, points]) => (
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
          {legendChains.map(chain => (
            <span key={chain} className="scatter-legend-item">
              <span
                className="scatter-legend-dot"
                style={{ background: SCATTER_CHAIN_COLORS[chain] ?? 'rgba(232,230,255,0.3)' }}
              />
              {chain}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
