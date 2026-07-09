import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { usePools } from '../contexts/PoolsContext';
import type { Pool } from '../types';
import { CHAIN_LABELS, CHAIN_LOGOS } from '../types';
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

// Add Position form state shape — recovered verbatim from the pre-rebuild
// Portfolio.tsx (commit e0e7b89), used by ChainSelect/AddPositionForm below.
const CHAIN_NAMES = Object.values(CHAIN_LABELS);
const EMPTY_FORM  = { protocol: '', asset: '', chain: '', amount: '' };

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtUsd(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}k`;
  return `$${val.toFixed(0)}`;
}

// Resolves the exact live Pool a submitted (protocol, chain, asset) combo
// refers to, so the insert can populate the real pool_id/entry_apy instead
// of the placeholder values the pre-rebuild form used.
function resolveMatchedPool(protocol: string, chain: string, asset: string, allPools: Pool[]): Pool | null {
  const exact = allPools.find(p =>
    p.project === protocol &&
    p.chain?.toLowerCase() === chain.toLowerCase() &&
    p.symbol === asset
  );
  if (exact) return exact;
  const protQ = protocol.toLowerCase();
  const assetQ = asset.toLowerCase();
  return allPools.find(p =>
    p.project?.toLowerCase().includes(protQ) &&
    p.chain?.toLowerCase() === chain.toLowerCase() &&
    p.symbol?.toLowerCase().includes(assetQ)
  ) ?? null;
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

// ── Add Position form ────────────────────────────────────────────────────
// Recovered verbatim from the pre-rebuild Portfolio.tsx (commit e0e7b89) —
// same combobox/dropdown interactions, same CSS classes (still present in
// src/styles/index.css, never removed by the Hill-style rebuild). Only the
// onAdd data shape below is inlined instead of referencing the old
// Position interface, which this file no longer defines.

function ChainSelect({
  value,
  onChange,
  availableChains,
  disabled,
}: {
  value: string;
  onChange: (chain: string) => void;
  availableChains: string[];
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const canOpen = !disabled && availableChains.length > 1;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  let triggerClass = 'pf-chain-select-trigger';
  if (open)     triggerClass += ' pf-chain-select-trigger--open';
  if (disabled || availableChains.length <= 1) triggerClass += ' pf-chain-select-trigger--readonly';

  return (
    <div className="pf-chain-select" ref={ref}>
      <button
        type="button"
        className={triggerClass}
        onClick={() => canOpen && setOpen(o => !o)}
        disabled={disabled}
      >
        {disabled ? (
          <span className="pf-chain-sel-placeholder">Select protocol first</span>
        ) : value ? (
          <>
            {CHAIN_LOGOS[value] && (
              <img src={CHAIN_LOGOS[value]} alt="" width={16} height={16} className="pf-chain-sel-logo" />
            )}
            <span className="pf-chain-sel-name">{value}</span>
          </>
        ) : (
          <span className="pf-chain-sel-placeholder">Select chain</span>
        )}
        {canOpen && <span className="pf-chain-sel-arrow">{open ? '▴' : '▾'}</span>}
      </button>
      {open && canOpen && (
        <div className="pf-dropdown">
          {availableChains.map(chain => (
            <div
              key={chain}
              className={`pf-dd-item${value === chain ? ' pf-dd-item--active' : ''}`}
              onMouseDown={e => {
                e.preventDefault();
                onChange(chain);
                setOpen(false);
              }}
            >
              {CHAIN_LOGOS[chain] && (
                <img src={CHAIN_LOGOS[chain]} alt="" width={16} height={16} className="pf-chain-sel-logo" />
              )}
              <span className="pf-dd-name">{chain}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddPositionForm({
  allPools,
  onAdd,
}: {
  allPools: Pool[];
  onAdd: (data: { protocol: string; asset: string; chain: string; amountInvested: number }) => void;
}) {
  const [form, setForm]                         = useState(EMPTY_FORM);
  const [formError, setFormError]               = useState('');
  const [protocolFromList, setProtocolFromList] = useState(false);
  const [assetFromList, setAssetFromList]       = useState(false);
  const [protocolOpen, setProtocolOpen]         = useState(false);
  const [assetOpen, setAssetOpen]               = useState(false);
  const protocolRef = useRef<HTMLDivElement>(null);
  const assetRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!protocolRef.current?.contains(e.target as Node)) setProtocolOpen(false);
      if (!assetRef.current?.contains(e.target as Node))    setAssetOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') { setProtocolOpen(false); setAssetOpen(false); }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const protocolOptions = useMemo(() => {
    const q = form.protocol.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set<string>();
    const results: string[] = [];
    for (const p of allPools) {
      if (p.project?.toLowerCase().includes(q) && !seen.has(p.project)) {
        seen.add(p.project);
        results.push(p.project);
        if (results.length >= 8) break;
      }
    }
    return results;
  }, [form.protocol, allPools]);

  // Chains where the selected protocol actually exists, normalised to CHAIN_NAMES
  const availableChains = useMemo(() => {
    const protQ = form.protocol.trim().toLowerCase();
    if (!protQ) return [];
    const seen = new Set<string>();
    const chains: string[] = [];
    for (const p of allPools) {
      const matchProto = protocolFromList
        ? p.project === form.protocol
        : p.project?.toLowerCase().includes(protQ);
      if (!matchProto) continue;
      const normalised = CHAIN_NAMES.find(n => n.toLowerCase() === p.chain?.toLowerCase());
      if (normalised && !seen.has(normalised)) {
        seen.add(normalised);
        chains.push(normalised);
      }
    }
    return chains;
  }, [form.protocol, protocolFromList, allPools]);

  // Auto-select chain when protocol maps to exactly one chain
  useEffect(() => {
    if (availableChains.length === 1) {
      setForm(f => {
        if (f.chain === availableChains[0]) return f;
        return { ...f, chain: availableChains[0], asset: '' };
      });
      setAssetFromList(false);
    }
  }, [availableChains]);

  const assetOptions = useMemo(() => {
    const protQ  = form.protocol.trim().toLowerCase();
    if (!protQ || !form.chain) return [];
    const assetQ = form.asset.trim().toLowerCase();
    const seen   = new Set<string>();
    const results: { symbol: string; tvl: number }[] = [];
    for (const p of allPools) {
      const matchProto = protocolFromList
        ? p.project === form.protocol
        : p.project?.toLowerCase().includes(protQ);
      const matchChain = p.chain?.toLowerCase() === form.chain.toLowerCase();
      const matchAsset = !assetQ || p.symbol.toLowerCase().includes(assetQ);
      if (matchProto && matchChain && matchAsset && !seen.has(p.symbol)) {
        seen.add(p.symbol);
        results.push({ symbol: p.symbol, tvl: p.tvlUsd });
        if (results.length >= 8) break;
      }
    }
    return results;
  }, [form.protocol, form.chain, form.asset, protocolFromList, allPools]);

  function selectProtocol(name: string, fromList: boolean) {
    setForm(f => ({ ...f, protocol: name, asset: '', chain: '' }));
    setProtocolFromList(fromList);
    setAssetFromList(false);
    setProtocolOpen(false);
    setFormError('');
  }

  function selectAsset(symbol: string, fromList: boolean) {
    setForm(f => ({ ...f, asset: symbol }));
    setAssetFromList(fromList);
    setAssetOpen(false);
    setFormError('');
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    const valid =
      form.protocol.trim() &&
      form.chain &&
      form.asset.trim() &&
      form.amount && !isNaN(amount) && amount > 0;
    if (!valid) { setFormError('Please fill in all fields'); return; }
    onAdd({ protocol: form.protocol.trim(), asset: form.asset.trim(), chain: form.chain, amountInvested: amount });
    setForm(EMPTY_FORM);
    setFormError('');
    setProtocolFromList(false);
    setAssetFromList(false);
  }

  const isManualEntry = form.protocol.trim() !== '' && form.asset.trim() !== '' && (!protocolFromList || !assetFromList);
  const assetDisabled = !form.protocol.trim() || !form.chain;

  return (
    <>
      <div className="pf-form-section-label">Add New Position</div>
      <div className="pf-card pf-add-card">
        <form className="pf-form" onSubmit={handleSubmit} noValidate>
          <div className="pf-form-row">

            {/* Protocol combobox */}
            <div className="pf-combobox" ref={protocolRef}>
              <input
                className="pf-input"
                placeholder="Protocol (e.g. Uniswap-V4)"
                value={form.protocol}
                autoComplete="off"
                onChange={e => {
                  setForm(f => ({ ...f, protocol: e.target.value, asset: '', chain: '' }));
                  setProtocolFromList(false);
                  setAssetFromList(false);
                  setProtocolOpen(e.target.value.trim().length > 0);
                  setFormError('');
                }}
                onFocus={() => {
                  if (form.protocol.trim().length > 0) setProtocolOpen(true);
                }}
              />
              {protocolOpen && (protocolOptions.length > 0 || form.protocol.trim()) && (
                <div className="pf-dropdown">
                  {protocolOptions.map(name => (
                    <div
                      key={name}
                      className="pf-dd-item"
                      onMouseDown={e => { e.preventDefault(); selectProtocol(name, true); }}
                    >
                      <span className="pf-dd-avatar">{name[0]?.toUpperCase()}</span>
                      <span className="pf-dd-name">{name}</span>
                    </div>
                  ))}
                  {form.protocol.trim() && (
                    <div
                      className="pf-dd-item pf-dd-item--manual"
                      onMouseDown={e => { e.preventDefault(); selectProtocol(form.protocol.trim(), false); }}
                    >
                      + Add &ldquo;{form.protocol.trim()}&rdquo; manually
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chain select — only shows chains this protocol exists on */}
            <ChainSelect
              value={form.chain}
              onChange={chain => {
                setForm(f => ({ ...f, chain, asset: '' }));
                setAssetFromList(false);
                setFormError('');
              }}
              availableChains={availableChains}
              disabled={!form.protocol.trim()}
            />

            {/* Asset combobox — enabled only once protocol + chain are set */}
            <div className="pf-combobox" ref={assetRef}>
              <input
                className="pf-input"
                placeholder={assetDisabled ? 'Select protocol and chain first' : 'Asset / symbol (e.g. ETH-USDC)'}
                value={form.asset}
                disabled={assetDisabled}
                autoComplete="off"
                onChange={e => {
                  setForm(f => ({ ...f, asset: e.target.value }));
                  setAssetFromList(false);
                  setAssetOpen(true);
                  setFormError('');
                }}
                onFocus={() => {
                  if (!assetDisabled) setAssetOpen(true);
                }}
              />
              {assetOpen && !assetDisabled && (assetOptions.length > 0 || form.asset.trim()) && (
                <div className="pf-dropdown">
                  {assetOptions.map(({ symbol, tvl }) => (
                    <div
                      key={symbol}
                      className="pf-dd-item"
                      onMouseDown={e => { e.preventDefault(); selectAsset(symbol, true); }}
                    >
                      <span className="pf-dd-avatar">{symbol[0]?.toUpperCase()}</span>
                      <div className="pf-dd-asset">
                        <span className="pf-dd-name">{symbol}</span>
                        <span className="pf-dd-tvl">{fmtUsd(tvl)} TVL</span>
                      </div>
                    </div>
                  ))}
                  {form.asset.trim() && (
                    <div
                      className="pf-dd-item pf-dd-item--manual"
                      onMouseDown={e => { e.preventDefault(); selectAsset(form.asset.trim(), false); }}
                    >
                      + Add &ldquo;{form.asset.trim()}&rdquo; manually
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="pf-amount-wrap">
              <span className="pf-amount-prefix">$</span>
              <input
                className="pf-input pf-amount-input"
                placeholder="Amount invested"
                type="number"
                min="0"
                step="any"
                value={form.amount}
                onChange={e => { setForm(f => ({ ...f, amount: e.target.value })); setFormError(''); }}
              />
            </div>

            <button type="submit" className="pf-add-btn">Add Position</button>
          </div>

          {isManualEntry && (
            <div className="pf-manual-warning">
              <span className="pf-manual-warning-icon">⚠</span>
              Live data matching may be limited for manual entries
            </div>
          )}

          {formError && <span className="pf-form-error">{formError}</span>}
        </form>
      </div>
    </>
  );
}

// ── Section 2 — Holdings ──────────────────────────────────────────────────

function HoldingsSection({
  positions,
  loading,
  error,
  allPools,
  showAddForm,
  onToggleAddForm,
  onAddPosition,
  addError,
}: {
  positions: PortfolioPosition[] | null;
  loading: boolean;
  error: string | null;
  allPools: Pool[];
  showAddForm: boolean;
  onToggleAddForm: () => void;
  onAddPosition: (data: { protocol: string; asset: string; chain: string; amountInvested: number }) => void;
  addError: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const rows = positions ?? [];
  const visibleRows = expanded ? rows : rows.slice(0, 5);

  return (
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#E8E6FF' }}>
          Holdings
        </h2>
        <button
          onClick={onToggleAddForm}
          style={{
            background: '#6B4FFF',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: FONT,
          }}
        >
          {showAddForm ? 'Cancel' : '+ Add Position'}
        </button>
      </div>

      {showAddForm && (
        <div style={{ marginBottom: 16 }}>
          <AddPositionForm allPools={allPools} onAdd={onAddPosition} />
          {addError && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#FF6B6B', fontFamily: FONT }}>
              Couldn&apos;t add position: {addError}
            </p>
          )}
        </div>
      )}

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

  const [showAddForm, setShowAddForm] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

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
  // Extracted as a callback (not just an effect body) so a successful Add
  // Position insert can re-run it and refresh Holdings in place.
  const loadPositions = useCallback(async () => {
    try {
      const anonId = getAnonymousId();
      const { data, error } = await supabase
        .from('portfolio_positions')
        .select('pool_id, protocol, chain, entry_apy, amount_usd')
        .eq('anonymous_id', anonId);
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
    } catch (err) {
      setPositionsError(err instanceof Error ? err.message : 'Failed to load positions');
      setPositions([]);
    }
  }, []);

  useEffect(() => { loadPositions(); }, [loadPositions]);

  // Add Position — resolves the exact live pool (if any) from the submitted
  // protocol/chain/asset combo so pool_id/entry_apy are real values instead
  // of placeholders, inserts, then refreshes Holdings (and, via the
  // positions effect dependency below, the performance chart) in place.
  const handleAddPosition = useCallback(async (data: {
    protocol: string; asset: string; chain: string; amountInvested: number;
  }) => {
    setAddError(null);
    const anonId = getAnonymousId();
    const matched = resolveMatchedPool(data.protocol, data.chain, data.asset, allPools);
    const poolId = matched?.pool ?? crypto.randomUUID();
    const entryApy = matched?.apy ?? null;
    const entryDate = new Date().toISOString();

    try {
      const { error } = await supabase.from('portfolio_positions').insert({
        anonymous_id: anonId,
        pool_id: poolId,
        protocol: data.protocol,
        chain: data.chain,
        entry_apy: entryApy,
        amount_usd: data.amountInvested,
        entry_date: entryDate,
      });
      if (error) {
        setAddError(error.message);
        return;
      }
      setShowAddForm(false);
      await loadPositions();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add position');
    }
  }, [allPools, loadPositions]);

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
    async function load() {
      try {
        const { data, error } = await supabase
          .from('pool_snapshots')
          .select('pool_id, apy, timestamp')
          .in('pool_id', poolIds)
          .order('timestamp', { ascending: true });
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
      } catch (err) {
        setChartError(err instanceof Error ? err.message : 'Failed to load snapshots');
        setChartSnapshots([]);
        setChartSnapshotsLoading(false);
      }
    }
    load();
  }, [positions]);

  // watchlists — scoped to this anonymous user.
  useEffect(() => {
    async function load() {
      try {
        const anonId = getAnonymousId();
        const { data, error } = await supabase
          .from('watchlists')
          .select('pool_id')
          .eq('anonymous_id', anonId);
        if (error) {
          setWatchlistError(error.message);
          setWatchlistIds([]);
          return;
        }
        setWatchlistIds((data ?? []).map((r: { pool_id: string }) => r.pool_id));
      } catch (err) {
        setWatchlistError(err instanceof Error ? err.message : 'Failed to load watchlist');
        setWatchlistIds([]);
      }
    }
    load();
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
    const ids = watchlistIds;
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    setWatchlistSnapshotsLoading(true);
    async function load() {
      try {
        const { data, error } = await supabase
          .from('pool_snapshots')
          .select('pool_id, apy, timestamp')
          .in('pool_id', ids)
          .gte('timestamp', eightDaysAgo)
          .order('timestamp', { ascending: false });
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
      } catch (err) {
        setWatchlistError(err instanceof Error ? err.message : 'Failed to load watchlist snapshots');
        setWatchlistSnapshots([]);
        setWatchlistSnapshotsLoading(false);
      }
    }
    load();
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
            showAddForm={showAddForm}
            onToggleAddForm={() => { setAddError(null); setShowAddForm(v => !v); }}
            onAddPosition={handleAddPosition}
            addError={addError}
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
