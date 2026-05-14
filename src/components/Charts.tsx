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
    background: '#080E1A',
    border: '1px solid #1a2540',
    borderRadius: 4,
    fontFamily: 'Mulish, sans-serif',
    fontSize: 12,
  },
  labelStyle:  { color: '#C9A84C', fontFamily: 'Mulish, sans-serif' },
  itemStyle:   { color: '#dce6f5', fontFamily: 'Mulish, sans-serif' },
  cursor:      { fill: 'rgba(59, 158, 255, 0.05)' },
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
      fill: CHAIN_COLORS[name] ?? '#4a5a78',
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
              stroke="rgba(26, 37, 64, 0.9)"
              horizontal={false}
            />
            <XAxis
              type="number"
              tickFormatter={v => `${v}%`}
              tick={{ fill: '#4a5a78', fontFamily: 'Mulish, sans-serif', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#8892a4', fontFamily: 'Mulish, sans-serif', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={140}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value) => [`${value}%`, 'APY']}
            />
            <Bar dataKey="apy" fill="#3B9EFF" radius={[0, 3, 3, 0]} maxBarSize={18} />
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
                <span style={{ color: '#8892a4', fontFamily: 'Mulish, sans-serif', fontSize: 11 }}>
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
