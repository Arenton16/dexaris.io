import { useMemo, useState, type FormEvent } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { usePools } from '../contexts/PoolsContext';
import DexarisIcon from './DexarisIcon';
import type { Pool } from '../types';
import { CHAIN_LABELS } from '../types';
import {
  calculateDexarisScore,
  getDexarisScoreColour,
  getDexarisScoreTier,
} from '../utils/dexarisScore';

const STORAGE_KEY = 'dexaris_portfolio';

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

const EMPTY_FORM = { protocol: '', asset: '', chain: '', amount: '' };

function fmtUsd(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000)     return `$${(val / 1_000).toFixed(1)}k`;
  return `$${val.toFixed(0)}`;
}

function loadPositions(): Position[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); }
  catch { return []; }
}

function savePositions(positions: Position[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
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

export default function Portfolio() {
  const { allPools } = usePools();
  const [positions, setPositions] = useState<Position[]>(loadPositions);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

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

    const matchedInvested = matched.reduce((s, e) => s + e.pos.amountInvested, 0);
    const portfolioScore = matched.length && matchedInvested > 0
      ? Math.round(matched.reduce((s, e) => s + e.pos.amountInvested * e.score!, 0) / matchedInvested)
      : null;

    const bestPosition = matched.length
      ? matched.reduce((best, e) =>
          (e.pool!.apy ?? 0) > (best.pool!.apy ?? 0) ? e : best
        )
      : null;

    return { totalInvested, estYield, avgApy, portfolioScore, activePositions: positions.length, bestPosition };
  }, [enriched, positions]);

  const pieData = useMemo(() => {
    const byChain: Record<string, number> = {};
    for (const pos of positions) {
      byChain[pos.chain] = (byChain[pos.chain] ?? 0) + pos.amountInvested;
    }
    return Object.entries(byChain).map(([name, value]) => ({ name, value }));
  }, [positions]);

  function addPosition(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.protocol.trim())                  { setFormError('Protocol is required'); return; }
    if (!form.asset.trim())                     { setFormError('Asset is required'); return; }
    if (!form.chain)                            { setFormError('Select a chain'); return; }
    if (!form.amount || isNaN(amount) || amount <= 0) { setFormError('Enter a valid positive amount'); return; }

    const next: Position = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      protocol: form.protocol.trim(),
      asset:    form.asset.trim(),
      chain:    form.chain,
      amountInvested: amount,
      dateAdded: new Date().toISOString(),
    };
    const updated = [...positions, next];
    setPositions(updated);
    savePositions(updated);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  function removePosition(id: string) {
    const updated = positions.filter(p => p.id !== id);
    setPositions(updated);
    savePositions(updated);
  }

  const addForm = (
    <div className="pf-card pf-add-card">
      <h3 className="pf-card-title">Add Position</h3>
      <form className="pf-form" onSubmit={addPosition} noValidate>
        <div className="pf-form-fields">
          <input
            className="pf-input"
            placeholder="Protocol (e.g. Uniswap-V4)"
            value={form.protocol}
            onChange={e => { setForm(f => ({ ...f, protocol: e.target.value })); setFormError(''); }}
          />
          <input
            className="pf-input"
            placeholder="Asset (e.g. ETH-USDC)"
            value={form.asset}
            onChange={e => { setForm(f => ({ ...f, asset: e.target.value })); setFormError(''); }}
          />
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
        </div>
        <div className="pf-chain-pills">
          {CHAIN_NAMES.map(chain => (
            <button
              key={chain}
              type="button"
              className={`pf-chain-pill${form.chain === chain ? ' pf-chain-pill--active' : ''}`}
              style={form.chain === chain
                ? { borderColor: CHAIN_PIE_COLORS[chain] ?? '#6B4FFF', color: CHAIN_PIE_COLORS[chain] ?? '#6B4FFF', background: `${CHAIN_PIE_COLORS[chain] ?? '#6B4FFF'}22` }
                : undefined}
              onClick={() => { setForm(f => ({ ...f, chain })); setFormError(''); }}
            >
              {chain}
            </button>
          ))}
        </div>
        {formError && <span className="pf-form-error">{formError}</span>}
        <button type="submit" className="pf-add-btn">Add Position</button>
      </form>
    </div>
  );

  if (positions.length === 0) {
    return (
      <div className="pf-page">
        <div className="pf-page-header">
          <h1 className="pf-page-title">Portfolio</h1>
          <p className="pf-page-subtitle">Track your DeFi positions with live Dexaris intelligence</p>
        </div>
        <div className="pf-empty-state">
          <DexarisIcon size={48} />
          <h2 className="pf-empty-heading">Your portfolio is empty</h2>
          <p className="pf-empty-sub">Add your first position to start tracking live APY and Dexaris Scores</p>
        </div>
        {addForm}
      </div>
    );
  }

  return (
    <div className="pf-page">
      <div className="pf-page-header">
        <h1 className="pf-page-title">Portfolio</h1>
        <p className="pf-page-subtitle">Track your DeFi positions with live Dexaris intelligence</p>
      </div>

      {/* Row 1 — Hero cards */}
      <div className="pf-hero-row">
        <div className="pf-card pf-hero-card">
          <span className="pf-hero-label">Total Invested</span>
          <span className="pf-hero-value">{fmtUsd(stats.totalInvested)}</span>
        </div>
        <div className="pf-card pf-hero-card">
          <span className="pf-hero-label">Estimated Annual Yield</span>
          <span className="pf-hero-value pf-hero-value--green">
            {fmtUsd(stats.estYield)}<span className="pf-hero-suffix">/yr</span>
          </span>
        </div>
      </div>

      {/* Row 2 — Stat cards */}
      <div className="pf-stat-row">
        <div className="pf-card pf-stat-card">
          <span className="pf-stat-label">Average APY</span>
          <span className="pf-stat-value">
            {stats.avgApy !== null ? `${stats.avgApy.toFixed(2)}%` : '—'}
          </span>
        </div>
        <div className="pf-card pf-stat-card">
          <span className="pf-stat-label">Portfolio Score</span>
          <span
            className="pf-stat-value"
            style={stats.portfolioScore !== null ? { color: getDexarisScoreColour(stats.portfolioScore) } : undefined}
          >
            {stats.portfolioScore !== null
              ? `${stats.portfolioScore} ${getDexarisScoreTier(stats.portfolioScore)}`
              : '—'}
          </span>
        </div>
        <div className="pf-card pf-stat-card">
          <span className="pf-stat-label">Active Positions</span>
          <span className="pf-stat-value">{stats.activePositions}</span>
        </div>
        <div className="pf-card pf-stat-card">
          <span className="pf-stat-label">Best Position</span>
          {stats.bestPosition ? (
            <span className="pf-stat-value pf-stat-best">
              <span className="pf-stat-best-name">{stats.bestPosition.pos.protocol}</span>
              <span className="pf-stat-best-apy">{(stats.bestPosition.pool!.apy ?? 0).toFixed(2)}%</span>
            </span>
          ) : (
            <span className="pf-stat-value">—</span>
          )}
        </div>
      </div>

      {/* Row 3 — Donut chart + Positions table */}
      <div className="pf-main-row">

        {/* Donut chart */}
        <div className="pf-card pf-chart-card">
          <h3 className="pf-card-title">Allocation by Chain</h3>
          <div className="pf-donut-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={84}
                  dataKey="value"
                  stroke="#111028"
                  strokeWidth={2}
                >
                  {pieData.map(entry => (
                    <Cell key={entry.name} fill={CHAIN_PIE_COLORS[entry.name] ?? '#6B4FFF'} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    background: '#111028',
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
                  const estYield = apy !== null ? pos.amountInvested * apy / 100 : null;
                  const colour   = score !== null ? getDexarisScoreColour(score) : null;
                  return (
                    <tr key={pos.id} className="pf-tr">
                      <td className="pf-td pf-td-protocol">{pos.protocol}</td>
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
                          {pos.chain}
                        </span>
                      </td>
                      <td className="pf-td pf-td-r">{fmtUsd(pos.amountInvested)}</td>
                      <td className="pf-td pf-td-r pf-td-apy">
                        {apy !== null ? `${apy.toFixed(2)}%` : <span className="pf-td-na">—</span>}
                      </td>
                      <td className="pf-td pf-td-r">
                        {colour && score !== null ? (
                          <span
                            className="pf-score-badge"
                            style={{ color: colour, borderColor: `${colour}40`, background: `${colour}1a` }}
                          >
                            {score}
                          </span>
                        ) : <span className="pf-td-na">—</span>}
                      </td>
                      <td className="pf-td pf-td-r pf-td-green">
                        {estYield !== null ? fmtUsd(estYield) : <span className="pf-td-na">—</span>}
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
      {addForm}
    </div>
  );
}
