import { useEffect, useMemo, useState } from 'react';
import { usePools } from '../contexts/PoolsContext';
import { type Pool } from '../types';
import { calculateDexarisScore } from '../utils/dexarisScore';

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

type Segment = { text: string; color?: string };
type Insight = Segment[];

function generateLiveInsights(pools: Pool[]): Insight[] {
  if (pools.length === 0) return [[{ text: 'Computing insights across live pool data...' }]];

  const scored = pools.map(p => ({ pool: p, score: calculateDexarisScore(p) }));
  const avgScore = Math.round(scored.reduce((sum, { score }) => sum + score, 0) / scored.length);

  const byChain: Record<string, Array<{ pool: Pool; score: number }>> = {};
  scored.forEach(({ pool, score }) => {
    if (!byChain[pool.chain]) byChain[pool.chain] = [];
    byChain[pool.chain].push({ pool, score });
  });
  let bestChain = '';
  let bestPct = 0;
  Object.entries(byChain).forEach(([chain, list]) => {
    const strongPct = Math.round((list.filter(({ score }) => score >= 60).length / list.length) * 100);
    if (strongPct > bestPct) { bestPct = strongPct; bestChain = chain; }
  });

  const highIncentiveCount = pools.filter(p => {
    const ext = p as Pool & { apyReward?: number };
    const ratio = (p.apy ?? 0) > 0 ? (ext.apyReward ?? 0) / (p.apy ?? 1) : 0;
    return ratio > 0.7;
  }).length;

  return [
    [
      { text: 'Right now, ' },
      { text: `${bestPct}%`, color: '#4ECDA4' },
      { text: ` of ${bestChain} pools score Strong or higher — the highest of any chain tracked.` },
    ],
    [
      { text: `${avgScore}`, color: '#FFB347' },
      { text: ` is the average Dexaris Score across all ${scored.length} pools tracked today.` },
    ],
    [
      { text: `${highIncentiveCount}`, color: '#FF6B6B' },
      { text: ' pools are flagged as primarily incentive-driven right now — treat their APY with caution.' },
    ],
  ];
}

export default function StatsBar({ highestApy, totalTvl, protocolCount, chainCount, apyDelta }: Props) {
  const { allPools } = usePools();
  const [insightIndex, setInsightIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const insights = useMemo(() => generateLiveInsights(allPools), [allPools]);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setInsightIndex(i => (i + 1) % insights.length);
        setVisible(true);
      }, 250);
    }, 5000);
    return () => clearInterval(interval);
  }, [insights.length]);

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
    <>
      <style>{`
        @keyframes pulseBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
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
      <div style={{
        background: '#111028',
        border: '0.5px solid rgba(232,230,255,0.08)',
        borderRadius: '10px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginTop: '14px',
        marginBottom: '14px',
        fontSize: '13px',
        color: '#E8E6FF',
      }}>
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#4ECDA4',
          flexShrink: 0,
          animation: 'pulseBlink 2s ease-in-out infinite',
        }} />
        <span style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}>
          {insights[insightIndex].map((seg, i) => (
            seg.color
              ? <span key={i} style={{ color: seg.color, fontWeight: 600 }}>{seg.text}</span>
              : <span key={i}>{seg.text}</span>
          ))}
        </span>
      </div>
    </>
  );
}
