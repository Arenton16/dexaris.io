import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { usePools } from '../contexts/PoolsContext';
import type { Pool } from '../types';
import { CHAIN_LABELS, CHAIN_LOGOS } from '../types';
import {
  calculateDexarisScore,
  getDexarisScoreColour,
  getDexarisScoreTier,
} from '../utils/dexarisScore';
import { supabase } from '../lib/supabase';
import { getAnonymousId } from '../lib/anonymousId';

interface Position {
  id: string;
  protocol: string;
  asset: string;
  chain: string;
  amountInvested: number;
  dateAdded: string;
}

const CHAIN_PIE_COLORS: Record<string, string> = {
  Ethereum: '#627EEA',
  Solana:   '#9945FF',
  Arbitrum: '#12AAFF',
  Base:     '#0052FF',
  Avalanche:'#E84142',
  Polygon:  '#8247E5',
};

const CHAIN_NAMES = Object.values(CHAIN_LABELS);
const EMPTY_FORM  = { protocol: '', asset: '', chain: '', amount: '' };

function fmtUsd(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000)     return `$${(val / 1_000).toFixed(1)}k`;
  return `$${val.toFixed(0)}`;
}

function matchPool(position: Position, allPools: Pool[]): Pool | null {
  const prot  = position.protocol.toLowerCase().replace(/\s/g, '-');
  const chain = position.chain.toLowerCase();
  return (
    allPools.find(p =>
      p.project?.toLowerCase().includes(prot) &&
      p.chain?.toLowerCase().includes(chain)
    ) ||
    allPools.find(p => p.project?.toLowerCase().includes(prot)) ||
    null
  );
}

function MiniSparkline({ from, to }: { from: number; to: number }) {
  const max   = Math.max(from, to, 0.01);
  const y1    = 16 - (from / max) * 12;
  const y2    = 16 - (to   / max) * 12;
  const color = to >= from ? '#4ECDA4' : '#FF6B6B';
  return (
    <svg width="40" height="20" viewBox="0 0 40 20" className="pf-stat-spark">
      <line x1="2" y1={y1} x2="38" y2={y2} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="38" cy={y2} r="2.5" fill={color} />
    </svg>
  );
}

function HeroSparkline() {
  return (
    <svg className="pf-hero-sparkline" viewBox="0 0 160 48" preserveAspectRatio="none" aria-hidden>
      <path
        d="M0,44 C20,42 30,36 50,30 S80,18 100,12 S130,4 160,2"
        fill="none"
        stroke="rgba(107,79,255,0.1)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

// ── Chain Select ───────────────────────────────────────────────────────────

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

// ── Add Position Form ──────────────────────────────────────────────────────

function AddPositionForm({
  allPools,
  onAdd,
}: {
  allPools: Pool[];
  onAdd: (data: Pick<Position, 'protocol' | 'asset' | 'chain' | 'amountInvested'>) => void;
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

// ── Main component ─────────────────────────────────────────────────────────

export default function Portfolio() {
  const { allPools } = usePools();
  const [positions, setPositions] = useState<Position[]>([]);

  // On mount: load this user's positions from Supabase.
  // Fails silently — if Supabase is unreachable the portfolio renders empty.
  // asset is stored in the notes column since the schema has no dedicated asset field.
  useEffect(() => {
    const anonId = getAnonymousId();
    supabase
      .from('portfolio_positions')
      .select('pool_id, protocol, chain, amount_usd, entry_date, notes')
      .eq('anonymous_id', anonId)
      .order('entry_date', { ascending: true })
      .then(({ data, error }) => {
        if (error || !data) return;
        setPositions(data.map(r => ({
          id:             r.pool_id,
          protocol:       r.protocol ?? '',
          asset:          r.notes    ?? '',
          chain:          r.chain    ?? '',
          amountInvested: r.amount_usd ?? 0,
          dateAdded:      r.entry_date ?? '',
        })));
      });
  }, []);

  const enriched = useMemo(() =>
    positions.map(pos => {
      const pool  = matchPool(pos, allPools);
      const score = pool ? calculateDexarisScore(pool) : null;
      return { pos, pool, score };
    }),
    [positions, allPools]
  );

  const stats = useMemo(() => {
    const totalInvested = positions.reduce((s, p) => s + p.amountInvested, 0);
    const matched = enriched.filter(e => e.pool !== null);

    const estYield = matched.reduce(
      (s, e) => s + e.pos.amountInvested * ((e.pool!.apy ?? 0) / 100), 0
    );
    const avgApy = matched.length
      ? matched.reduce((s, e) => s + (e.pool!.apy ?? 0), 0) / matched.length
      : null;
    const avgMean30d = matched.length
      ? matched.reduce((s, e) => s + (e.pool!.apyMean30d ?? e.pool!.apy ?? 0), 0) / matched.length
      : null;

    const matchedInvested = matched.reduce((s, e) => s + e.pos.amountInvested, 0);
    const portfolioScore = matched.length && matchedInvested > 0
      ? Math.round(matched.reduce((s, e) => s + e.pos.amountInvested * e.score!, 0) / matchedInvested)
      : null;

    const bestPosition = matched.length
      ? matched.reduce((best, e) =>
          (e.pool!.apy ?? 0) > (best.pool!.apy ?? 0) ? e : best
        )
      : null;

    const chainCount = new Set(positions.map(p => p.chain)).size;

    return {
      totalInvested, estYield, avgApy, avgMean30d,
      portfolioScore, activePositions: positions.length,
      bestPosition, chainCount,
    };
  }, [enriched, positions]);

  const pieData = useMemo(() => {
    const byChain: Record<string, number> = {};
    for (const pos of positions) {
      byChain[pos.chain] = (byChain[pos.chain] ?? 0) + pos.amountInvested;
    }
    return Object.entries(byChain).map(([name, value]) => ({ name, value }));
  }, [positions]);

  // Optimistic add: update local state immediately, write to Supabase in background.
  // asset is stored in notes — the only available free-text column in the schema.
  function handleAdd(data: Pick<Position, 'protocol' | 'asset' | 'chain' | 'amountInvested'>) {
    const positionId = crypto.randomUUID();
    const dateAdded  = new Date().toISOString();
    const next: Position = { id: positionId, ...data, dateAdded };
    setPositions(prev => [...prev, next]);
    const anonId = getAnonymousId();
    supabase
      .from('portfolio_positions')
      .insert({
        anonymous_id: anonId,
        pool_id:      positionId,
        protocol:     data.protocol,
        chain:        data.chain,
        amount_usd:   data.amountInvested,
        entry_date:   dateAdded,
        notes:        data.asset,
      })
      .then(() => {});
  }

  // Optimistic remove: update local state immediately, delete from Supabase in background.
  function removePosition(id: string) {
    setPositions(prev => prev.filter(p => p.id !== id));
    const anonId = getAnonymousId();
    supabase
      .from('portfolio_positions')
      .delete()
      .eq('anonymous_id', anonId)
      .eq('pool_id', id)
      .then(() => {});
  }

  if (positions.length === 0) {
    return (
      <div className="pf-page">
        <div className="pf-page-header">
          <h1 className="pf-page-title">Portfolio</h1>
          <p className="pf-page-subtitle">Track your DeFi positions with live Dexaris intelligence</p>
        </div>
        <div className="pf-empty-state" style={{ textAlign: 'center', padding: '48px 0 32px' }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(107,79,255,0.1)',
            border: '1px solid rgba(107,79,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: 28,
          }}>📊</div>
          <p style={{ color: '#E8E6FF', fontSize: 18, fontWeight: 500, margin: '0 0 8px' }}>Your portfolio is empty</p>
          <p style={{ color: 'rgba(232,230,255,0.45)', fontSize: 14, margin: '0 0 24px' }}>Add positions manually to track your DeFi holdings in one place</p>
        </div>
        <AddPositionForm allPools={allPools} onAdd={handleAdd} />
      </div>
    );
  }

  return (
    <div className="pf-page">
      <div className="pf-page-header">
        <h1 className="pf-page-title">Portfolio</h1>
        <p className="pf-page-subtitle">Track your DeFi positions with live Dexaris intelligence</p>
      </div>

      {/* Stats strip */}
      <div className="pf-stats-strip">
        <span>Tracking <strong>{stats.activePositions}</strong> position{stats.activePositions !== 1 ? 's' : ''} across <strong>{stats.chainCount}</strong> chain{stats.chainCount !== 1 ? 's' : ''}</span>
        <span className="pf-strip-sep">·</span>
        {stats.portfolioScore !== null && (
          <>
            <span>Portfolio Dexaris Score: <strong style={{ color: getDexarisScoreColour(stats.portfolioScore) }}>{stats.portfolioScore}</strong></span>
            <span className="pf-strip-sep">·</span>
          </>
        )}
        <span>Est. annual yield: <strong className="pf-strip-yield">{fmtUsd(stats.estYield)}</strong></span>
      </div>

      {/* Row 1 — Hero cards */}
      <div className="pf-hero-row">
        <div className="pf-card pf-hero-card">
          <HeroSparkline />
          <span className="pf-hero-label">Total Invested</span>
          <span className="pf-hero-value">{fmtUsd(stats.totalInvested)}</span>
        </div>
        <div className="pf-card pf-hero-card">
          <HeroSparkline />
          <span className="pf-hero-label">Estimated Annual Yield</span>
          <span className="pf-hero-value pf-hero-value--green">
            {fmtUsd(stats.estYield)}<span className="pf-hero-suffix">/yr</span>
          </span>
        </div>
      </div>

      {/* Row 2 — Stat cards */}
      <div className="pf-stat-row">
        <div className="pf-card pf-stat-card">
          {stats.avgApy !== null && stats.avgMean30d !== null && (
            <MiniSparkline from={stats.avgMean30d} to={stats.avgApy} />
          )}
          <span className="pf-stat-label">Average APY</span>
          <span className="pf-stat-value">
            {stats.avgApy !== null ? `${stats.avgApy.toFixed(2)}%` : '—'}
          </span>
        </div>
        <div className="pf-card pf-stat-card">
          <span className="pf-stat-label">Portfolio Score</span>
          {stats.portfolioScore !== null ? (
            <>
              <span className="pf-stat-value" style={{ color: getDexarisScoreColour(stats.portfolioScore) }}>
                {stats.portfolioScore}
              </span>
              <span className="pf-stat-sub">{getDexarisScoreTier(stats.portfolioScore)}</span>
            </>
          ) : (
            <span className="pf-stat-value pf-stat-na">—</span>
          )}
        </div>
        <div className="pf-card pf-stat-card">
          <span className="pf-stat-label">Active Positions</span>
          <span className="pf-stat-value">{stats.activePositions}</span>
        </div>
        <div className="pf-card pf-stat-card">
          {stats.bestPosition?.pool?.apyMean30d != null && stats.bestPosition.pool.apy != null && (
            <MiniSparkline from={stats.bestPosition.pool.apyMean30d} to={stats.bestPosition.pool.apy} />
          )}
          <span className="pf-stat-label">Best Position</span>
          {stats.bestPosition ? (
            <>
              <span className="pf-stat-value pf-stat-best-name">{stats.bestPosition.pos.protocol}</span>
              <span className="pf-stat-sub pf-stat-sub--green">{(stats.bestPosition.pool!.apy ?? 0).toFixed(2)}%</span>
            </>
          ) : (
            <span className="pf-stat-value pf-stat-na">—</span>
          )}
        </div>
      </div>

      {/* Row 3 — Donut chart + Positions table */}
      <div className="pf-main-row">

        {/* Donut chart */}
        <div className="pf-card pf-chart-card">
          <h3 className="pf-card-title">Allocation by Chain</h3>
          <div className="pf-donut-wrap">
            <div className="pf-donut-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={110}
                    dataKey="value"
                    stroke="none"
                    strokeWidth={0}
                    cornerRadius={4}
                  >
                    {pieData.map(entry => (
                      <Cell key={entry.name} fill={CHAIN_PIE_COLORS[entry.name] ?? '#6B4FFF'} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      background: 'rgba(15,14,34,0.95)',
                      border: '0.5px solid rgba(107,79,255,0.25)',
                      borderRadius: 6,
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 12,
                    }}
                    formatter={(value) => [fmtUsd(Number(value)), 'Invested']}
                    labelStyle={{ color: '#8B73FF' }}
                    itemStyle={{ color: '#E8E6FF' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="pf-donut-center" aria-hidden>
              <span className="pf-donut-label">Total Holdings</span>
              <span className="pf-donut-value">{fmtUsd(stats.totalInvested)}</span>
            </div>
          </div>
          <div className="pf-legend">
            {pieData.map(entry => {
              const pct = stats.totalInvested > 0
                ? ((entry.value / stats.totalInvested) * 100).toFixed(1)
                : '0';
              return (
                <div key={entry.name} className="pf-legend-row">
                  <span className="pf-legend-dot" style={{ background: CHAIN_PIE_COLORS[entry.name] ?? '#6B4FFF' }} />
                  <span className="pf-legend-name">{entry.name}</span>
                  <span className="pf-legend-pct">{pct}%</span>
                  <span className="pf-legend-usd">{fmtUsd(entry.value)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Positions table */}
        <div className="pf-card pf-table-card">
          <h3 className="pf-card-title">Open Positions</h3>
          <div className="pf-table-scroll">
            <table className="pf-table">
              <thead>
                <tr>
                  <th className="pf-th">Protocol</th>
                  <th className="pf-th">Asset</th>
                  <th className="pf-th">Chain</th>
                  <th className="pf-th pf-th-r">Invested</th>
                  <th className="pf-th pf-th-r">APY</th>
                  <th className="pf-th pf-th-r">Score</th>
                  <th className="pf-th pf-th-r">Est. Yield/yr</th>
                  <th className="pf-th" />
                </tr>
              </thead>
              <tbody>
                {enriched.map(({ pos, pool, score }) => {
                  const apy      = pool?.apy ?? null;
                  const mean     = pool?.apyMean30d ?? null;
                  const estYield = apy !== null ? pos.amountInvested * apy / 100 : null;
                  const colour   = score !== null ? getDexarisScoreColour(score) : null;
                  const apyDir   = (apy !== null && mean !== null)
                    ? (apy >= mean ? 'up' : 'down')
                    : null;
                  return (
                    <tr key={pos.id} className="pf-tr">
                      <td className="pf-td pf-td-protocol">
                        <div className="pf-proto-cell">
                          <span className="pf-proto-avatar">{pos.protocol[0]?.toUpperCase()}</span>
                          <span className="pf-proto-name">{pos.protocol}</span>
                          {!pool && (
                            <span className="pf-unmatched-dot" title="Live data unavailable for this protocol" />
                          )}
                        </div>
                      </td>
                      <td className="pf-td pf-td-muted">{pos.asset}</td>
                      <td className="pf-td">
                        <span
                          className="pf-chain-badge"
                          style={{
                            color:       CHAIN_PIE_COLORS[pos.chain] ?? '#E8E6FF',
                            borderColor: `${CHAIN_PIE_COLORS[pos.chain] ?? '#6B4FFF'}50`,
                            background:  `${CHAIN_PIE_COLORS[pos.chain] ?? '#6B4FFF'}18`,
                          }}
                        >
                          {CHAIN_LOGOS[pos.chain] && (
                            <img
                              src={CHAIN_LOGOS[pos.chain]}
                              alt=""
                              width={11}
                              height={11}
                              className="pf-badge-chain-logo"
                              onError={e => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}
                          {pos.chain}
                        </span>
                      </td>
                      <td className="pf-td pf-td-r">{fmtUsd(pos.amountInvested)}</td>
                      <td className="pf-td pf-td-r">
                        {apy !== null ? (
                          <span className="pf-apy-cell">
                            {apyDir && (
                              <span className={`pf-apy-arrow pf-apy-arrow--${apyDir}`}>
                                {apyDir === 'up' ? '↑' : '↓'}
                              </span>
                            )}
                            <span className="pf-td-apy">{apy.toFixed(2)}%</span>
                          </span>
                        ) : (
                          <span className="pf-td-na">—</span>
                        )}
                      </td>
                      <td className="pf-td pf-td-r">
                        {colour && score !== null ? (
                          <div className="pf-score-cell">
                            <span style={{ color: colour, fontWeight: 600, fontSize: 13 }}>{score}</span>
                            <span className="pf-score-tier">{getDexarisScoreTier(score)}</span>
                          </div>
                        ) : (
                          <span className="pf-td-na">—</span>
                        )}
                      </td>
                      <td className="pf-td pf-td-r">
                        {estYield !== null && estYield > 0 ? (
                          <span className="pf-td-green">{fmtUsd(estYield)}</span>
                        ) : (
                          <span className="pf-td-na">—</span>
                        )}
                      </td>
                      <td className="pf-td pf-td-remove">
                        <button
                          className="pf-remove-btn"
                          onClick={() => removePosition(pos.id)}
                          aria-label={`Remove ${pos.protocol}`}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Row 4 — Add Position */}
      <AddPositionForm allPools={allPools} onAdd={handleAdd} />
    </div>
  );
}
