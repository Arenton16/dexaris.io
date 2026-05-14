import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import type { Pool } from '../types';

interface Props {
  displayPools: Pool[];
  allPools: Pool[];
}

const CHAIN_COLORS: Record<string, string> = {
  Ethereum: '#3B9EFF',
  Base:     '#6B7FFF',
  Solana:   '#9945FF',
  Arbitrum: '#2D9CDB',
  Avalanche:'#E84142',
  Polygon:  '#8247E5',
};

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#0C0B1A',
    border: '1px solid rgba(107,79,255,0.15)',
    borderRadius: 4,
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 12,
  },
  labelStyle:  { color: '#8B73FF', fontFamily: 'Space Grotesk, sans-serif' },
  itemStyle:   { color: '#E8E6FF', fontFamily: 'Space Grotesk, sans-serif' },
  cursor:      { fill: 'rgba(107,79,255,0.06)' },
};

export default function Charts({ displayPools, allPools }: Props) {
  const topByApy = [...displayPools]
    .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))
    .slice(0, 10)
    .map(p => ({ name: p.project, apy: parseFloat((p.apy ?? 0).toFixed(2)) }));

  const chainCounts = allPools.reduce<Record<string, number>>((acc, p) => {
    acc[p.chain] = (acc[p.chain] ?? 0) + 1;
    return acc;
  }, {});
  const donutData = Object.entries(chainCounts)
    .map(([name, value]) => ({
      name,
      value,
      fill: CHAIN_COLORS[name] ?? 'rgba(232,230,255,0.25)',
    }))
    .sort((a, b) => b.value - a.value);

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
              stroke="rgba(107,79,255,0.15)"
              horizontal={false}
            />
            <XAxis
              type="number"
              tickFormatter={v => `${v}%`}
              tick={{ fill: 'rgba(232,230,255,0.25)', fontFamily: 'Space Grotesk, sans-serif', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: 'rgba(232,230,255,0.45)', fontFamily: 'Space Grotesk, sans-serif', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={140}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value) => [`${value}%`, 'APY']}
            />
            <Bar dataKey="apy" fill="#8B73FF" radius={[0, 3, 3, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Donut chart — pools by chain */}
      <div className="chart-card">
        <h3 className="chart-title">Pools by Chain</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="45%"
              innerRadius={70}
              outerRadius={110}
              dataKey="value"
              paddingAngle={2}
            >
              {donutData.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value, name) => [`${value} pools`, String(name)]}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span style={{ color: 'rgba(232,230,255,0.45)', fontFamily: 'Space Grotesk, sans-serif', fontSize: 11 }}>
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
