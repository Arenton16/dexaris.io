interface Props {
  highestApy: number;
  totalTvl: number;
  protocolCount: number;
  chainCount: number;
  apyDelta: number | null;
}

function formatTvl(val: number): string {
  if (val >= 1e9) return '$' + (val / 1e9).toFixed(2) + 'B';
  if (val >= 1e6) return '$' + (val / 1e6).toFixed(2) + 'M';
  if (val >= 1e3) return '$' + (val / 1e3).toFixed(2) + 'K';
  return '$' + val.toFixed(0);
}

export default function StatsBar({ highestApy, totalTvl, protocolCount, chainCount, apyDelta }: Props) {
  const cells = [
    {
      label: 'Highest Yield Today',
      value: `${highestApy.toFixed(2)}%`,
      color: '#6B4FFF',
      delta: apyDelta !== null && apyDelta > 0 ? `+${apyDelta.toFixed(2)}%` : null,
    },
    {
      label: 'Total TVL Tracked',
      value: formatTvl(totalTvl),
      color: '#E8E6FF',
      delta: null,
    },
    {
      label: 'Protocols Tracked',
      value: String(protocolCount),
      color: '#E8E6FF',
      delta: null,
    },
    {
      label: 'Chains Covered',
      value: String(chainCount),
      color: '#E8E6FF',
      delta: null,
    },
  ];

  return (
    <div className="stats-bar">
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          className="stats-cell"
          style={{ background: i % 2 === 0 ? '#111028' : 'transparent' }}
        >
          <span className="stats-label">{cell.label}</span>
          <span className="stats-value" style={{ color: cell.color }}>{cell.value}</span>
          {cell.delta && <span className="stats-delta">{cell.delta}</span>}
        </div>
      ))}
    </div>
  );
}
