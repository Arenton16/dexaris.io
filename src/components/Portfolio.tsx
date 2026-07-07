import { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { usePools } from '../contexts/PoolsContext';
import type { Pool } from '../types';
import { supabase } from '../lib/supabase';
import { getAnonymousId } from '../lib/anonymousId';
import { ProtocolLogo } from './ProtocolLogo';

// ── Shared style tokens ──────────────────────────────────────────────────────

const FONT = 'Inter, sans-serif';

const CARD_STYLE: React.CSSProperties = {
  background: '#111028',
  borderRadius: 12,
  border: '1px solid rgba(107,79,255,0.15)',
  padding: 20,
  fontFamily: FONT,
  boxSizing: 'border-box',
};

const AXIS_TICK = {
  fill: 'rgba(232,230,255,0.45)',
  fontFamily: 'Inter, sans-serif',
  fontSize: 11,
};

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#111028',
    border: '0.5px solid rgba(107,79,255,0.3)',
    borderRadius: 6,
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
  },
  labelStyle: { color: '#8B73FF', fontFamily: 'Inter, sans-serif' },
};

// ── Types ─────────────────────────────────────────────────────────────────

interface PortfolioPosition {
  poolId: string;
  protocol: string | null;
  chain: string | null;
  entryApy: number | null;
  amountUsd: number | null;
}

interface SnapshotRow {
  poolId: string;
  apy: number | null;
  timestamp: string;
}

interface DailyPoint {
  date: string;
  apy: number;
}

type Timeframe = '7D' | '30D' | 'All';

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtUsd(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}k`;
  return `$${val.toFixed(0)}`;
}

function fmtPct(val: number): string {
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
}

// One data point per calendar day, averaging APY across every held/watched
// pool that has a snapshot on that day.
function buildDailySeries(snapshots: SnapshotRow[]): DailyPoint[] {
  const byDate = new Map<string, { sum: number; count: number }>();
  for (const s of snapshots) {
    if (s.apy == null) continue;
    const date = s.timestamp.slice(0, 10);
    const entry = byDate.get(date) ?? { sum: 0, count: 0 };
    entry.sum += s.apy;
    entry.count += 1;
    byDate.set(date, entry);
  }
  return Array.from(byDate.entries())
    .map(([date, { sum, count }]) => ({ date, apy: sum / count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Groups snapshots by pool_id, each list sorted newest-first.
function groupSnapshotsByPool(snapshots: SnapshotRow[]): Map<string, SnapshotRow[]> {
  const byPool = new Map<string, SnapshotRow[]>();
  for (const s of snapshots) {
    const list = byPool.get(s.poolId) ?? [];
    list.push(s);
    byPool.set(s.poolId, list);
  }
  for (const list of byPool.values()) {
    list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
  return byPool;
}

// ── Small shared components ──────────────────────────────────────────────

function SkeletonRow({ height = 48 }: { height?: number }) {
  return (
    <div style={{
      height,
      borderRadius: 8,
      background: 'rgba(232,230,255,0.06)',
    }} />
  );
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 3) {
    return <span style={{ fontSize: 11, color: 'rgba(232,230,255,0.35)', fontFamily: FONT }}>Building...</span>;
  }
  const width = 80;
  const height = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={coords} fill="none" stroke="#6B4FFF" strokeWidth="1.5" />
    </svg>
  );
}

// ── Section 1 — Performance chart ────────────────────────────────────────

function PerformanceChartSection({
  positions,
  positionsLoading,
  positionsError,
  chartSnapshots,
  chartSnapshotsLoading,
  chartError,
  allPools,
  onNavigateToYields,
}: {
  positions: PortfolioPosition[] | null;
  positionsLoading: boolean;
  positionsError: string | null;
  chartSnapshots: SnapshotRow[] | null;
  chartSnapshotsLoading: boolean;
  chartError: string | null;
  allPools: Pool[];
  onNavigateToYields?: () => void;
}) {
  const [timeframe, setTimeframe] = useState<Timeframe>('All');

  const dailySeries = useMemo(
    () => buildDailySeries(chartSnapshots ?? []),
    [chartSnapshots]
  );

  const timeframeSeries = useMemo(() => {
    if (timeframe === '7D') return dailySeries.slice(-7);
    if (timeframe === '30D') return dailySeries.slice(-30);
    return dailySeries;
  }, [dailySeries, timeframe]);

  const avgApyLive = useMemo(() => {
    if (!positions || positions.length === 0) return null;
    const matched = positions
      .map(p => allPools.find(pool => pool.pool === p.poolId))
      .filter((p): p is Pool => p != null && p.apy != null);
    if (matched.length === 0) return null;
    return matched.reduce((s, p) => s + (p.apy ?? 0), 0) / matched.length;
  }, [positions, allPools]);

  const sevenDayChange = useMemo(() => {
    if (dailySeries.length < 7) return null;
    const latest = dailySeries[dailySeries.length - 1];
    const weekAgo = dailySeries[dailySeries.length - 7];
    return latest.apy - weekAgo.apy;
  }, [dailySeries]);

  const isLoading = positionsLoading || (positions !== null && positions.length > 0 && chartSnapshotsLoading);
  const error = positionsError ?? chartError;

  return (
    <div style={CARD_STYLE}>
      <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#E8E6FF' }}>
        Portfolio Performance
      </h2>

      {isLoading ? (
        <>
          <div style={{ display: 'flex', gap: 32, marginBottom: 20 }}>
            <SkeletonRow height={52} />
          </div>
          <SkeletonRow height={280} />
        </>
      ) : error ? (
        <p style={{ margin: 0, fontSize: 13, color: '#FF6B6B', fontFamily: FONT }}>
          Couldn&apos;t load portfolio performance: {error}
        </p>
      ) : !positions || positions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'rgba(232,230,255,0.45)', fontFamily: FONT }}>
            Add pools from the Yield Explorer to track your portfolio
          </p>
          {onNavigateToYields && (
            <button
              onClick={onNavigateToYields}
              style={{
                background: 'transparent',
                border: '1px solid #6B4FFF',
                color: '#8B73FF',
                borderRadius: 8,
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: FONT,
              }}
            >
              Go to Yield Explorer
            </button>
          )}
        </div>
      ) : timeframeSeries.length < 3 ? (
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(232,230,255,0.45)', fontFamily: FONT, padding: '24px 0', textAlign: 'center' }}>
          Portfolio history is still building — check back soon
        </p>
      ) : (
        <>
          {/* Headline stats */}
          <div style={{ display: 'flex', gap: 32, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#E8E6FF' }}>
                {avgApyLive !== null ? `${avgApyLive.toFixed(2)}%` : '—'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(232,230,255,0.45)', marginTop: 4 }}>Avg APY</div>
            </div>
            <div>
              <div style={{
                fontSize: 28,
                fontWeight: 700,
                color: sevenDayChange === null ? '#E8E6FF' : sevenDayChange >= 0 ? '#4ECDA4' : '#FF6B6B',
              }}>
                {sevenDayChange !== null ? fmtPct(sevenDayChange) : '—'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(232,230,255,0.45)', marginTop: 4 }}>7D Change</div>
            </div>

            {/* Timeframe toggle */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              {(['7D', '30D', 'All'] as const).map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: FONT,
                    background: timeframe === tf ? '#6B4FFF' : 'transparent',
                    border: timeframe === tf ? '1px solid #6B4FFF' : '1px solid rgba(232,230,255,0.2)',
                    color: timeframe === tf ? '#fff' : 'rgba(232,230,255,0.5)',
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={timeframeSeries} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(232,230,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Avg APY']} />
              <Area type="monotone" dataKey="apy" stroke="none" fill="rgba(107,79,255,0.08)" />
              <Line type="monotone" dataKey="apy" stroke="#6B4FFF" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}

// ── Section 2 — Holdings ──────────────────────────────────────────────────

function HoldingsSection({
  positions,
  loading,
  error,
  allPools,
}: {
  positions: PortfolioPosition[] | null;
  loading: boolean;
  error: string | null;
  allPools: Pool[];
}) {
  const [expanded, setExpanded] = useState(false);

  const rows = positions ?? [];
  const visibleRows = expanded ? rows : rows.slice(0, 5);

  return (
    <div style={CARD_STYLE}>
      <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#E8E6FF' }}>
        Holdings
      </h2>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}
        </div>
      ) : error ? (
        <p style={{ margin: 0, fontSize: 13, color: '#FF6B6B', fontFamily: FONT }}>
          Couldn&apos;t load holdings: {error}
        </p>
      ) : rows.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(232,230,255,0.45)', fontFamily: FONT }}>
          No positions yet.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visibleRows.map(pos => {
              const liveMatch = allPools.find(p => p.pool === pos.poolId);
              const name = liveMatch ? `${liveMatch.project} — ${liveMatch.symbol}` : (pos.protocol ?? 'Unknown pool');
              const currentApy = liveMatch?.apy ?? null;
              const delta = currentApy !== null && pos.entryApy !== null ? currentApy - pos.entryApy : null;

              return (
                <div
                  key={pos.poolId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(107,79,255,0.04)',
                    border: '1px solid rgba(107,79,255,0.08)',
                  }}
                >
                  <ProtocolLogo project={pos.protocol ?? ''} size={24} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#E8E6FF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {name}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(232,230,255,0.45)', marginTop: 2 }}>
                      {pos.chain ?? '—'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', minWidth: 70 }}>
                    <div style={{ fontSize: 9, color: 'rgba(232,230,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Entry APY
                    </div>
                    <div style={{ fontSize: 13, color: '#E8E6FF', marginTop: 2 }}>
                      {pos.entryApy !== null ? `${pos.entryApy.toFixed(2)}%` : '—'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', minWidth: 70 }}>
                    <div style={{ fontSize: 9, color: 'rgba(232,230,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Amount
                    </div>
                    <div style={{ fontSize: 13, color: '#E8E6FF', marginTop: 2 }}>
                      {pos.amountUsd !== null ? fmtUsd(pos.amountUsd) : '—'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', minWidth: 80 }}>
                    <div style={{ fontSize: 9, color: 'rgba(232,230,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Current
                    </div>
                    {currentApy !== null ? (
                      <div style={{ fontSize: 13, color: '#E8E6FF', marginTop: 2 }}>
                        {currentApy.toFixed(2)}%
                        {delta !== null && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: delta >= 0 ? '#4ECDA4' : '#FF6B6B' }}>
                            {fmtPct(delta)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: 'rgba(232,230,255,0.3)', marginTop: 2 }}>—</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {rows.length > 5 && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                marginTop: 12,
                background: 'transparent',
                border: 'none',
                color: '#8B73FF',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: FONT,
                padding: 0,
              }}
            >
              {expanded ? 'Show less' : `See All (${rows.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Section 3 — Watchlist with yield movement ────────────────────────────

function WatchlistSection({
  watchlistIds,
  watchlistLoading,
  watchlistError,
  watchlistSnapshots,
  snapshotsLoading,
  allPools,
  onNavigateToYields,
}: {
  watchlistIds: string[] | null;
  watchlistLoading: boolean;
  watchlistError: string | null;
  watchlistSnapshots: SnapshotRow[] | null;
  snapshotsLoading: boolean;
  allPools: Pool[];
  onNavigateToYields?: () => void;
}) {
  const byPool = useMemo(
    () => groupSnapshotsByPool(watchlistSnapshots ?? []),
    [watchlistSnapshots]
  );

  const rows = useMemo(() => {
    return (watchlistIds ?? []).map(poolId => {
      const liveMatch = allPools.find(p => p.pool === poolId);
      const snaps = byPool.get(poolId) ?? []; // newest-first
      const latest = snaps[0] ?? null;
      const yesterday = snaps[1] ?? null;
      const delta = latest?.apy != null && yesterday?.apy != null ? latest.apy - yesterday.apy : null;
      const sparklinePoints = snaps
        .slice(0, 7)
        .filter(s => s.apy != null)
        .map(s => s.apy as number)
        .reverse(); // oldest → newest for the sparkline

      return {
        poolId,
        name: liveMatch ? `${liveMatch.project} — ${liveMatch.symbol}` : poolId,
        chain: liveMatch?.chain ?? null,
        currentApy: liveMatch?.apy ?? null,
        delta,
        sparklinePoints,
      };
    });
  }, [watchlistIds, byPool, allPools]);

  const upToday = rows.filter(r => r.delta !== null && r.delta > 0).length;
  const isLoading = watchlistLoading || (watchlistIds !== null && watchlistIds.length > 0 && snapshotsLoading);

  return (
    <div style={CARD_STYLE}>
      <h2 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: '#E8E6FF' }}>
        Watchlist
      </h2>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {[0, 1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}
        </div>
      ) : watchlistError ? (
        <p style={{ margin: 0, fontSize: 13, color: '#FF6B6B', fontFamily: FONT }}>
          Couldn&apos;t load watchlist: {watchlistError}
        </p>
      ) : rows.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(232,230,255,0.45)', fontFamily: FONT }}>
          {onNavigateToYields ? (
            <>Save pools from the Yield Explorer to monitor yield changes</>
          ) : (
            'Save pools from the Yield Explorer to monitor yield changes'
          )}
        </p>
      ) : (
        <>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: 'rgba(232,230,255,0.45)', fontFamily: FONT }}>
            <strong style={{ color: '#E8E6FF' }}>{upToday}</strong> of <strong style={{ color: '#E8E6FF' }}>{rows.length}</strong> watched pools up today
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map(row => (
              <div
                key={row.poolId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'rgba(107,79,255,0.04)',
                  border: '1px solid rgba(107,79,255,0.08)',
                }}
              >
                <ProtocolLogo project={row.name.split(' — ')[0]} size={22} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#E8E6FF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(232,230,255,0.4)', marginTop: 2 }}>
                    {row.currentApy !== null ? `${row.currentApy.toFixed(2)}%` : '—'}
                    {row.delta !== null && (
                      <span style={{ marginLeft: 6, color: row.delta >= 0 ? '#4ECDA4' : '#FF6B6B' }}>
                        {fmtPct(row.delta)}
                      </span>
                    )}
                    {row.delta === null && (
                      <span style={{ marginLeft: 6, color: 'rgba(232,230,255,0.3)' }}>—</span>
                    )}
                  </div>
                </div>
                <Sparkline points={row.sparklinePoints} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface PortfolioProps {
  onNavigateToYields?: () => void;
}

export default function Portfolio({ onNavigateToYields }: PortfolioProps) {
  const { allPools } = usePools();

  const [positions, setPositions] = useState<PortfolioPosition[] | null>(null);
  const [positionsError, setPositionsError] = useState<string | null>(null);

  const [chartSnapshots, setChartSnapshots] = useState<SnapshotRow[] | null>(null);
  const [chartSnapshotsLoading, setChartSnapshotsLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);

  const [watchlistIds, setWatchlistIds] = useState<string[] | null>(null);
  const [watchlistError, setWatchlistError] = useState<string | null>(null);

  const [watchlistSnapshots, setWatchlistSnapshots] = useState<SnapshotRow[] | null>(null);
  const [watchlistSnapshotsLoading, setWatchlistSnapshotsLoading] = useState(true);

  const [isNarrow, setIsNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    function onResize() { setIsNarrow(window.innerWidth < 768); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // portfolio_positions — scoped to this anonymous user. Feeds both the
  // performance chart (pool_id list) and the holdings section (full rows).
  useEffect(() => {
    const anonId = getAnonymousId();
    Promise.resolve(
      supabase
        .from('portfolio_positions')
        .select('pool_id, protocol, chain, entry_apy, amount_usd')
        .eq('anonymous_id', anonId)
    )
      .then(({ data, error }) => {
        if (error) {
          setPositionsError(error.message);
          setPositions([]);
          return;
        }
        setPositions((data ?? []).map((r: {
          pool_id: string; protocol: string | null; chain: string | null;
          entry_apy: number | null; amount_usd: number | null;
        }) => ({
          poolId: r.pool_id,
          protocol: r.protocol,
          chain: r.chain,
          entryApy: r.entry_apy,
          amountUsd: r.amount_usd,
        })));
      })
      .catch((err: Error) => {
        setPositionsError(err.message);
        setPositions([]);
      });
  }, []);

  // pool_snapshots for the held pool_ids — never filtered by anonymous_id
  // (pool_snapshots has no such column); the anon-scoped positions query
  // above is what restricts this to the current user's pools.
  useEffect(() => {
    if (positions === null) return;
    if (positions.length === 0) {
      setChartSnapshots([]);
      setChartSnapshotsLoading(false);
      return;
    }
    const poolIds = Array.from(new Set(positions.map(p => p.poolId)));
    setChartSnapshotsLoading(true);
    Promise.resolve(
      supabase
        .from('pool_snapshots')
        .select('pool_id, apy, timestamp')
        .in('pool_id', poolIds)
        .order('timestamp', { ascending: true })
    )
      .then(({ data, error }) => {
        if (error) {
          setChartError(error.message);
          setChartSnapshots([]);
          setChartSnapshotsLoading(false);
          return;
        }
        setChartSnapshots((data ?? []).map((r: { pool_id: string; apy: number | null; timestamp: string }) => ({
          poolId: r.pool_id, apy: r.apy, timestamp: r.timestamp,
        })));
        setChartSnapshotsLoading(false);
      })
      .catch((err: Error) => {
        setChartError(err.message);
        setChartSnapshots([]);
        setChartSnapshotsLoading(false);
      });
  }, [positions]);

  // watchlists — scoped to this anonymous user.
  useEffect(() => {
    const anonId = getAnonymousId();
    Promise.resolve(
      supabase
        .from('watchlists')
        .select('pool_id')
        .eq('anonymous_id', anonId)
    )
      .then(({ data, error }) => {
        if (error) {
          setWatchlistError(error.message);
          setWatchlistIds([]);
          return;
        }
        setWatchlistIds((data ?? []).map((r: { pool_id: string }) => r.pool_id));
      })
      .catch((err: Error) => {
        setWatchlistError(err.message);
        setWatchlistIds([]);
      });
  }, []);

  // pool_snapshots for the watched pool_ids, last 8 days — again never
  // filtered by anonymous_id; the anon-scoped watchlists query above is
  // what restricts this to the current user's watched pools.
  useEffect(() => {
    if (watchlistIds === null) return;
    if (watchlistIds.length === 0) {
      setWatchlistSnapshots([]);
      setWatchlistSnapshotsLoading(false);
      return;
    }
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    setWatchlistSnapshotsLoading(true);
    Promise.resolve(
      supabase
        .from('pool_snapshots')
        .select('pool_id, apy, timestamp')
        .in('pool_id', watchlistIds)
        .gte('timestamp', eightDaysAgo)
        .order('timestamp', { ascending: false })
    )
      .then(({ data, error }) => {
        if (error) {
          setWatchlistError(error.message);
          setWatchlistSnapshots([]);
          setWatchlistSnapshotsLoading(false);
          return;
        }
        setWatchlistSnapshots((data ?? []).map((r: { pool_id: string; apy: number | null; timestamp: string }) => ({
          poolId: r.pool_id, apy: r.apy, timestamp: r.timestamp,
        })));
        setWatchlistSnapshotsLoading(false);
      })
      .catch((err: Error) => {
        setWatchlistError(err.message);
        setWatchlistSnapshots([]);
        setWatchlistSnapshotsLoading(false);
      });
  }, [watchlistIds]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: FONT }}>
      <div>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#E8E6FF' }}>Portfolio</h1>
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(232,230,255,0.45)' }}>
          Track your DeFi positions with live Dexaris intelligence
        </p>
      </div>

      <PerformanceChartSection
        positions={positions}
        positionsLoading={positions === null}
        positionsError={positionsError}
        chartSnapshots={chartSnapshots}
        chartSnapshotsLoading={chartSnapshotsLoading}
        chartError={chartError}
        allPools={allPools}
        onNavigateToYields={onNavigateToYields}
      />

      <div style={{ display: 'flex', flexDirection: isNarrow ? 'column' : 'row', gap: 20 }}>
        <div style={{ flex: isNarrow ? undefined : '55 1 0', minWidth: 0 }}>
          <HoldingsSection
            positions={positions}
            loading={positions === null}
            error={positionsError}
            allPools={allPools}
          />
        </div>
        <div style={{ flex: isNarrow ? undefined : '45 1 0', minWidth: 0 }}>
          <WatchlistSection
            watchlistIds={watchlistIds}
            watchlistLoading={watchlistIds === null}
            watchlistError={watchlistError}
            watchlistSnapshots={watchlistSnapshots}
            snapshotsLoading={watchlistSnapshotsLoading}
            allPools={allPools}
            onNavigateToYields={onNavigateToYields}
          />
        </div>
      </div>
    </div>
  );
}
