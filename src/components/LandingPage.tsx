import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ZAxis,
} from 'recharts';
import DexarisLogo from './DexarisLogo';
import { usePools } from '../contexts/PoolsContext';
import { calculateDexarisScore, getDexarisScoreColour } from '../utils/dexarisScore';

interface HeroScatterPoint {
  project: string;
  symbol: string;
  chain: string;
  apy: number;
  tvlM: number;
  score: number;
}

const HERO_TIERS = [
  { key: 'strong',   label: '80–100 Strong',  min: 80, colour: '#4ECDA4' },
  { key: 'solid',    label: '60–79 Solid',    min: 60, colour: '#6B5FD4' },
  { key: 'moderate', label: '40–59 Moderate', min: 40, colour: '#FFB347' },
  { key: 'weak',     label: '0–39 Weak',      min: 0,  colour: '#FF6B6B' },
] as const;

function tierForScore(score: number) {
  return HERO_TIERS.find(t => score >= t.min) ?? HERO_TIERS[HERO_TIERS.length - 1];
}

function formatTvlLog(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}B`;
  return `$${v.toFixed(0)}M`;
}

function HeroScatterDot({ cx, cy, fill }: { cx?: number; cy?: number; fill?: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <circle
      cx={cx ?? 0}
      cy={cy ?? 0}
      r={hovered ? 6 : 4}
      fill={fill ?? 'rgba(232,230,255,0.3)'}
      fillOpacity={hovered ? 1 : 0.8}
      stroke="rgba(10,9,16,0.6)"
      strokeWidth={1}
      style={{ transition: 'r 0.1s ease, fill-opacity 0.1s ease' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    />
  );
}

function HeroScatterTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: HeroScatterPoint }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const tvl = d.tvlM >= 1000 ? `$${(d.tvlM / 1000).toFixed(1)}B` : `$${d.tvlM.toFixed(1)}M`;
  const row = (label: string, value: string, color?: string) => (
    <p style={{ margin: 0, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
      <span style={{ color: 'rgba(232,230,255,0.4)' }}>{label}</span>
      <span style={{ color: color ?? '#E8E6FF' }}>{value}</span>
    </p>
  );
  return (
    <div style={{
      background: '#0A0910',
      border: '1px solid rgba(74,56,184,0.35)',
      borderRadius: 6,
      padding: '10px 12px',
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 11,
      color: '#E8E6FF',
      lineHeight: 1.75,
      minWidth: 150,
      pointerEvents: 'none',
    }}>
      <p style={{ margin: '0 0 4px', fontWeight: 500 }}>{d.project} <span style={{ color: 'rgba(232,230,255,0.4)', fontWeight: 400 }}>{d.symbol}</span></p>
      {row('Chain', d.chain)}
      {row('APY', `${d.apy.toFixed(2)}%`, '#4ECDA4')}
      {row('TVL', tvl)}
      {row('Score', String(d.score), getDexarisScoreColour(d.score))}
    </div>
  );
}

function formatTvl(tvl: number): string {
  if (tvl >= 1_000_000_000) return `$${(tvl / 1_000_000_000).toFixed(1)}B`;
  if (tvl >= 1_000_000) return `$${(tvl / 1_000_000).toFixed(1)}M`;
  return `$${(tvl / 1_000).toFixed(0)}K`;
}

function ChainIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="#4A38B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="#4A38B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#4A38B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function D4Icon() {
  return (
    <svg width="24" height="24" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="4,42 10,26 16,26 10,42" fill="rgba(74,56,184,0.5)" />
      <polygon points="16,42 22,16 28,16 22,42" fill="rgba(74,56,184,0.75)" />
      <polygon points="28,42 34,5 40,5 34,42" fill="#4A38B8" />
    </svg>
  );
}


function ProtocolLogoStrip() {
  const chains = [
    { name: 'Ethereum', logo: '/logos/chains/ethereum.png' },
    { name: 'Solana',   logo: '/logos/chains/solana.png' },
    { name: 'Arbitrum', logo: '/logos/chains/arbitrum.png' },
    { name: 'Base',     logo: '/logos/chains/base.png' },
    { name: 'Avalanche',logo: '/logos/chains/avalanche.png' },
    { name: 'Polygon',  logo: '/logos/chains/polygon.png' },
  ];
  // 4 copies + a CSS keyframe translating by exactly one set's width (-25%
  // of the 4-copy track) is a seamless loop by construction (the browser
  // computes the percentage against the track's own live width every frame,
  // unlike the old rAF version's JS-measured reset, which drifted by
  // sub-pixel rounding). 4 copies specifically — not 2 — because the panel
  // is wide enough to show more than one full set of 6 icons at once; with
  // only 2 copies the track ran out of rendered icons before the loop could
  // wrap, showing empty space just before the reset.
  const repeated = [...chains, ...chains, ...chains, ...chains];

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true, amount: 0.01 }}
      style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', padding: '40px' }}
    >
      <div className="data-panel">
        <p style={{
          textAlign: 'center',
          fontSize: '10.5px',
          fontFamily: "'Space Grotesk', sans-serif",
          color: 'rgba(232,230,255,0.4)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: 0,
          padding: '12px 16px',
          borderBottom: '0.5px solid rgba(74,56,184,0.2)',
        }}>
          Live yield data across 6 chains and 140+ protocols
        </p>
        <div style={{ position: 'relative', overflow: 'hidden', width: '100%' }}>
          {/* Edge scrims — a solid gradient overlay fades logos out cleanly
              regardless of icon size, unlike a mask-image against a hard
              overflow:hidden clip (which slices icons mid-shape). */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '80px', background: 'linear-gradient(to right, #100F22, transparent)', zIndex: 1, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '80px', background: 'linear-gradient(to left, #100F22, transparent)', zIndex: 1, pointerEvents: 'none' }} />
          <div
            className="chain-marquee-track"
            style={{
              display: 'flex',
              gap: '40px',
              width: 'max-content',
              padding: '20px 0',
            }}
          >
            {repeated.map((chain, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '6px',
                  border: '0.5px solid rgba(74,56,184,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <img src={chain.logo} alt={chain.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'contain' }} />
                </div>
                <span style={{ fontSize: '11px', color: 'rgba(232,230,255,0.4)', whiteSpace: 'nowrap' }}>{chain.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function ScoreIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="#4A38B8" strokeWidth="1.5" />
      <path d="M8 12l3 3 5-5" stroke="#4A38B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function scoreColour(score: number): string {
  if (score >= 80) return '#4ECDA4';
  if (score >= 60) return '#6B5FD4';
  if (score >= 40) return '#FFB347';
  return '#FF6B6B';
}

const BG_DOT_COLOURS = ['#4ECDA4', '#6B5FD4', '#FFB347', '#FF6B6B'];

function HeroDataBackground() {
  // Fixed once on mount (not re-rolled on re-render) — random positions/timings
  // for an ambient field that echoes the score-tier colours used in the real
  // chart, deliberately kept faint so it reads as texture, not a second chart.
  const dots = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 2 + Math.random() * 2.5,
    colour: BG_DOT_COLOURS[i % BG_DOT_COLOURS.length],
    dx: (Math.random() - 0.5) * 50,
    dy: (Math.random() - 0.5) * 36,
    driftDuration: 10 + Math.random() * 10,
    pulseDuration: 4 + Math.random() * 4,
    delay: Math.random() * -10,
  })), []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <div className="bg-grid" />
      <div className="bg-scan" />
      {dots.map(d => (
        <span
          key={d.id}
          className="bg-drift-dot"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.size,
            height: d.size,
            background: d.colour,
            ['--dx' as string]: `${d.dx}px`,
            ['--dy' as string]: `${d.dy}px`,
            animationDuration: `${d.driftDuration}s, ${d.pulseDuration}s`,
            animationDelay: `${d.delay}s, ${d.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function HeroRiskRewardPanel() {
  const { allPools, isLoading } = usePools();

  const { tierGroups, stats } = useMemo(() => {
    const groups: Record<string, HeroScatterPoint[]> = { strong: [], solid: [], moderate: [], weak: [] };
    // Bounded to TVL >= $10M (keeps the log axis well-behaved) and APY <= 60%
    // (keeps a single outlier from flattening every other point on the linear
    // y-axis) — a curated display range, not a claim about the full dataset.
    const eligible = allPools.filter(p => p.tvlUsd >= 10_000_000 && (p.apy ?? 0) > 0 && (p.apy ?? 0) <= 60);
    for (const p of eligible) {
      const score = calculateDexarisScore(p);
      const tier = tierForScore(score);
      groups[tier.key].push({ project: p.project, symbol: p.symbol, chain: p.chain, apy: p.apy!, tvlM: p.tvlUsd / 1_000_000, score });
    }
    const protocols = new Set(allPools.map(p => p.project)).size;
    const totalTvl = allPools.reduce((sum, p) => sum + p.tvlUsd, 0);
    return {
      tierGroups: groups,
      stats: { pools: allPools.length, protocols, totalTvl },
    };
  }, [allPools]);

  const statItems: { value: string; label: string }[] = [
    { value: isLoading ? '—' : `${stats.pools.toLocaleString()}+`, label: 'Pools' },
    { value: isLoading ? '—' : `${stats.protocols}+`, label: 'Protocols' },
    { value: isLoading ? '—' : formatTvl(stats.totalTvl), label: 'Tracked TVL' },
    { value: '6', label: 'Chains' },
  ];

  return (
    <div style={{
      background: '#100F22',
      border: '0.5px solid rgba(74,56,184,0.22)',
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '0.5px solid rgba(74,56,184,0.2)',
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '11px',
        color: 'rgba(232,230,255,0.45)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}>
        <span>Risk / Reward — All chains</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ECDA4', textTransform: 'none' }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ECDA4', boxShadow: '0 0 5px #4ECDA4', animation: 'pulse 1.6s ease-in-out infinite', display: 'inline-block' }} />
          Live
        </span>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {isLoading ? (
          <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(232,230,255,0.3)', fontSize: '13px', fontFamily: "'Space Grotesk', sans-serif" }}>
            Loading live pool data…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(232,230,255,0.05)" />
              <XAxis
                type="number" dataKey="tvlM" name="TVL" scale="log"
                domain={['auto', 'auto']} ticks={[10, 50, 100, 500, 1000, 10000]}
                tickFormatter={formatTvlLog}
                tick={{ fill: 'rgba(232,230,255,0.4)', fontFamily: "'Space Grotesk', sans-serif", fontSize: 10 }}
                tickLine={false} axisLine={false}
              />
              <YAxis
                type="number" dataKey="apy" name="APY"
                tickFormatter={v => `${v}%`}
                tick={{ fill: 'rgba(232,230,255,0.4)', fontFamily: "'Space Grotesk', sans-serif", fontSize: 10 }}
                tickLine={false} axisLine={false}
                width={34}
              />
              <ZAxis range={[1, 1]} />
              <Tooltip content={<HeroScatterTooltip />} wrapperStyle={{ overflow: 'visible', zIndex: 100 }} cursor={{ fill: 'rgba(74,56,184,0.06)' }} />
              {HERO_TIERS.map(tier => (
                <Scatter key={tier.key} name={tier.label} data={tierGroups[tier.key]} fill={tier.colour} shape={HeroScatterDot} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ display: 'flex', gap: '16px', padding: '4px 16px 16px', flexWrap: 'wrap', fontFamily: "'Space Grotesk', sans-serif", fontSize: '10.5px', color: 'rgba(232,230,255,0.4)' }}>
        {HERO_TIERS.map(tier => (
          <span key={tier.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tier.colour, display: 'inline-block' }} />
            {tier.label}
          </span>
        ))}
      </div>

      <div className="hero-stat-strip">
        {statItems.map(({ value, label }) => (
          <div key={label}>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 500, color: '#E8E6FF', margin: 0 }}>{value}</p>
            <p style={{ fontSize: '10.5px', color: 'rgba(232,230,255,0.3)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</p>
          </div>
        ))}
      </div>
      <p style={{
        textAlign: 'center',
        fontSize: '11px',
        color: 'rgba(232,230,255,0.3)',
        borderTop: '0.5px solid rgba(74,56,184,0.12)',
        padding: '10px 16px',
        margin: 0,
      }}>
        Live figures, pulled straight from DeFiLlama — no manual curation, no sponsored placements.
      </p>
    </div>
  );
}

function scrollToId(id: string) {
  return (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const { allPools, isLoading: loadingPools } = usePools();
  // Sorted by the real Dexaris Score (not raw APY) so the landing page's own
  // preview backs up the pitch above it — a high-APY, weak-scored pool at
  // the top here would directly contradict "don't chase headline APY."
  const pools = allPools
    .filter(p => (p.apy ?? 0) > 0)
    .map(p => ({ ...p, previewScore: calculateDexarisScore(p) }))
    .filter(p => p.previewScore >= 60)
    .sort((a, b) => b.previewScore - a.previewScore)
    .slice(0, 5);

  return (
    <div style={{ background: '#080714', minHeight: '100vh', fontFamily: "'Inter', sans-serif", color: '#E8E6FF' }}>

      {/* ─── Navbar ─────────────────────────────────────────────── */}
      <nav className="landing-nav" style={{
        height: '64px',
        background: 'rgba(8,7,20,0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '0.5px solid rgba(74,56,184,0.12)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <DexarisLogo iconSize={24} fontSize={16} />

        <div className="landing-nav-links" style={{ display: 'flex', gap: '32px' }}>
          {['Features', 'About', 'Newsletter'].map(label => (
            <a
              key={label}
              href={`#${label.toLowerCase()}`}
              className="nav-link"
              style={{ fontSize: '13px', textDecoration: 'none' }}
              onClick={scrollToId(label.toLowerCase())}
            >
              {label}
            </a>
          ))}
        </div>

        <button
          onClick={() => navigate('/app')}
          className="nav-cta"
          style={{
            color: '#fff',
            fontSize: '13px',
            padding: '8px 20px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Launch app →
        </button>
      </nav>

      {/* ─── Hero ───────────────────────────────────────────────── */}
      <section className="hero-section" style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#06050F',
      }}>
        <HeroDataBackground />

        {/* Content sits above HeroDataBackground */}
        <div className="hero-grid" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '24px', textAlign: 'left' }}>
            {/* Pill badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(74,56,184,0.12)',
              border: '0.5px solid rgba(74,56,184,0.3)',
              borderRadius: '4px',
              padding: '5px 14px',
              fontSize: '11px',
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: '0.02em',
              color: 'rgba(74,56,184,0.9)',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4A38B8', animation: 'pulse 2s ease-in-out infinite', display: 'inline-block' }} />
              Live DeFi yield data — updated every 60 seconds
            </div>

            {/* Headline */}
            <h1 className="hero-headline" style={{
              fontWeight: 500,
              color: '#E8E6FF',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              margin: 0,
            }}>
              Find the yield<br />
              <span style={{ color: '#6B5FD4' }}>worth chasing.</span>
            </h1>

            {/* Subtitle */}
            <p className="hero-subtitle" style={{
              color: 'rgba(232,230,255,0.45)',
              maxWidth: '440px',
              lineHeight: 1.6,
              margin: 0,
            }}>
              Every pool scored on TVL size, APY sustainability and organic yield ratio — plotted so you can see risk vs. reward at a glance, not buried in a spreadsheet.
            </p>

            {/* CTA buttons */}
            <div className="hero-cta-row">
              <button
                onClick={() => navigate('/app')}
                className="btn-primary hero-cta-btn"
                style={{
                  color: '#fff',
                  fontSize: '14px',
                  padding: '12px 28px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Explore yields →
              </button>
              <a
                href="#features"
                className="btn-secondary hero-cta-btn"
                style={{
                  fontSize: '14px',
                  padding: '12px 28px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Learn more
              </a>
            </div>

            {/* Trust line */}
            <p style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'rgba(232,230,255,0.35)',
              fontSize: '12.5px',
              margin: 0,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2 4 5v6c0 5.25 3.4 9.74 8 11 4.6-1.26 8-5.75 8-11V5z" />
              </svg>
              Non-custodial. We never hold your funds or ask for a wallet connection to browse data.
            </p>
          </div>

          <HeroRiskRewardPanel />
        </div>
      </section>

      {/* ─── Protocol logo strip ────────────────────────────────── */}
      <ProtocolLogoStrip />

      {/* ─── Features ───────────────────────────────────────────── */}
      <section id="features" className="features-section" style={{
        borderTop: '0.5px solid rgba(74,56,184,0.1)',
        maxWidth: '1100px',
        margin: '0 auto',
        width: '100%',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, amount: 0.01 }}
          style={{ textAlign: 'center', marginBottom: '48px' }}
        >
          <p style={{
            fontSize: '13px',
            letterSpacing: '0.08em',
            color: 'rgba(232,230,255,0.4)',
            textTransform: 'uppercase',
            fontFamily: "'Space Grotesk', sans-serif",
            marginBottom: '16px',
            margin: '0 0 16px',
          }}>
            What makes Dexaris different
          </p>
          <h2 style={{ fontSize: '36px', fontWeight: 600, color: '#E8E6FF', margin: 0 }}>
            Built for yield intelligence.
          </h2>
        </motion.div>

        {/* Row 1: wide + narrow */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px', marginBottom: '16px' }}>
          {[
            {
              icon: <D4Icon />,
              title: 'Risk vs Reward intelligence',
              desc: 'Our unique scatter chart plots every pool by APY and TVL so you can instantly see which yields are worth the risk and which to avoid.',
              delay: 0,
            },
            {
              icon: <ChainIcon />,
              title: 'Every major chain covered',
              desc: 'Track yields across Ethereum, Solana, Arbitrum, Base, Avalanche and Polygon in one unified platform. No switching between tools.',
              delay: 0.12,
            },
          ].map(({ icon, title, desc, delay }) => (
            <motion.div
              key={title}
              className="feature-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay }}
              viewport={{ once: true, amount: 0.01 }}
              style={{ borderRadius: '8px', padding: '28px' }}
            >
              <div style={{
                width: '40px', height: '40px',
                border: '0.5px solid rgba(74,56,184,0.3)',
                borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px',
              }}>
                {icon}
              </div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#E8E6FF', marginBottom: '8px' }}>{title}</p>
              <p style={{ fontSize: '12px', color: 'rgba(232,230,255,0.4)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Row 2: narrow + wide */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '16px' }}>
          {[
            {
              icon: <StarIcon />,
              title: 'Personal watchlist',
              desc: 'Save pools you care about and track their APY, TVL and Dexaris Score in real time, all in one place. Price alerts are coming soon.',
              delay: 0.24,
            },
            {
              icon: <ScoreIcon />,
              title: 'The Dexaris Score',
              desc: 'Every pool is rated 0–100 based on TVL size, APY sustainability, and organic yield ratio — so you can instantly compare pools across chains and protocols.',
              delay: 0.36,
            },
          ].map(({ icon, title, desc, delay }) => (
            <motion.div
              key={title}
              className="feature-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay }}
              viewport={{ once: true, amount: 0.01 }}
              style={{ borderRadius: '8px', padding: '28px' }}
            >
              <div style={{
                width: '40px', height: '40px',
                border: '0.5px solid rgba(74,56,184,0.3)',
                borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px',
              }}>
                {icon}
              </div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#E8E6FF', marginBottom: '8px' }}>{title}</p>
              <p style={{ fontSize: '12px', color: 'rgba(232,230,255,0.4)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Live data preview ──────────────────────────────────── */}
      <motion.section
        className="preview-section"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, amount: 0.01 }}
        style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}
      >
        <div className="data-panel">
          <div className="data-panel-header">
            <span>Live Yield Data</span>
            <span className="live"><span className="dot" />Live</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Protocol', 'Chain', 'APY', 'TVL', 'Score'].map(col => (
                  <th key={col} className={col === 'TVL' ? 'preview-tvl-col' : undefined} style={{
                    padding: '12px 16px',
                    textAlign: col === 'APY' || col === 'TVL' || col === 'Score' ? 'right' : 'left',
                    fontSize: '10.5px',
                    fontWeight: 500,
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: 'rgba(232,230,255,0.3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '0.5px solid rgba(74,56,184,0.2)',
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingPools
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '0.5px solid rgba(74,56,184,0.06)' }}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} style={{ padding: '14px 16px' }}>
                          <div style={{
                            height: '12px',
                            borderRadius: '4px',
                            background: 'rgba(74,56,184,0.1)',
                            width: j === 0 ? '120px' : j === 1 ? '80px' : '60px',
                            animation: 'pulse 1.5s ease-in-out infinite',
                          }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : pools.map((pool, i) => {
                    const score = pool.previewScore;
                    return (
                    <tr key={i} className="preview-row" style={{ borderBottom: i < pools.length - 1 ? '0.5px solid rgba(74,56,184,0.06)' : 'none' }}>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#E8E6FF' }}>
                        <span style={{ textTransform: 'capitalize' }}>{pool.project}</span>
                        <span style={{ fontSize: '11px', color: 'rgba(232,230,255,0.35)', marginLeft: '8px' }}>{pool.symbol}</span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: 'rgba(232,230,255,0.5)' }}>{pool.chain}</td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontFamily: "'Space Grotesk', sans-serif", color: '#4ECDA4', textAlign: 'right', fontWeight: 500 }}>
                        {(pool.apy ?? 0).toFixed(2)}%
                      </td>
                      <td className="preview-tvl-col" style={{ padding: '14px 16px', fontSize: '13px', fontFamily: "'Space Grotesk', sans-serif", color: 'rgba(232,230,255,0.6)', textAlign: 'right' }}>
                        {formatTvl(pool.tvlUsd)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontFamily: "'Space Grotesk', sans-serif", color: scoreColour(score), textAlign: 'right', fontWeight: 600 }}>
                        {score}
                      </td>
                    </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            onClick={() => navigate('/app')}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(74,56,184,0.15)';
              e.currentTarget.style.borderColor = 'rgba(74,56,184,0.6)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(74,56,184,0.08)';
              e.currentTarget.style.borderColor = 'rgba(74,56,184,0.4)';
            }}
            style={{
              background: 'rgba(74,56,184,0.08)',
              border: '0.5px solid rgba(74,56,184,0.4)',
              borderRadius: '6px',
              padding: '10px 24px',
              color: '#6B5FD4',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              transition: 'background 0.2s, border-color 0.2s',
            }}
          >
            View all 140+ protocols →
          </button>
        </div>
      </motion.section>

      {/* ─── Newsletter ─────────────────────────────────────────── */}
      <section id="newsletter" className="newsletter-section" style={{
        borderTop: '0.5px solid rgba(74,56,184,0.1)',
      }}>
        <motion.div
          className="newsletter-inner"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, amount: 0.01 }}
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
          }}
        >
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 500, color: '#E8E6FF', marginBottom: '8px' }}>
              Stay ahead of the market
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(232,230,255,0.4)' }}>
              Get the best DeFi yields delivered to your inbox every week.
            </p>
          </div>

          {subStatus === 'success' ? (
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6B5FD4', fontWeight: 500, margin: 0 }}>
              <span style={{
                width: '16px', height: '16px', borderRadius: '50%',
                background: 'rgba(78,205,164,0.15)', border: '1px solid #4ECDA4',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', color: '#4ECDA4', flexShrink: 0,
              }}>✓</span>
              You're in — welcome to the list.
            </p>
          ) : (
            <form
              onSubmit={async e => {
                e.preventDefault();
                const trimmed = email.trim();
                if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                  setSubStatus('error');
                  return;
                }
                setSubStatus('loading');
                try {
                  const res = await fetch('/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: trimmed }),
                  });
                  setSubStatus(res.ok ? 'success' : 'error');
                } catch {
                  setSubStatus('error');
                }
              }}
              className="newsletter-form"
              noValidate
            >
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (subStatus === 'error') setSubStatus('idle');
                }}
                disabled={subStatus === 'loading'}
                className="newsletter-input"
                autoComplete="email"
                style={{
                  background: 'rgba(74,56,184,0.08)',
                  border: '0.5px solid rgba(74,56,184,0.2)',
                  borderRadius: '6px',
                  padding: '10px 18px',
                  fontSize: '13px',
                  color: '#E8E6FF',
                  outline: 'none',
                  fontFamily: "'Inter', sans-serif",
                }}
              />
              <button
                type="submit"
                disabled={subStatus === 'loading'}
                className="newsletter-btn"
                style={{
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: subStatus === 'loading' ? 'default' : 'pointer',
                  opacity: subStatus === 'loading' ? 0.65 : 1,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {subStatus === 'loading' ? 'Subscribing...' : 'Subscribe'}
              </button>
              {subStatus === 'error' && (
                <p style={{ fontSize: '11px', color: '#FF6B6B', margin: '6px 0 0', width: '100%' }}>
                  Something went wrong, please try again
                </p>
              )}
            </form>
          )}
        </motion.div>
      </section>

      {/* ─── About ──────────────────────────────────────────────── */}
      <motion.section
        id="about"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true, amount: 0.01 }}
        style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}
      >
        <div className="data-panel">
          <div className="data-panel-header" style={{ justifyContent: 'center' }}>
            <span>About</span>
          </div>
          <p style={{
            fontSize: '14px',
            color: 'rgba(232,230,255,0.5)',
            lineHeight: 1.8,
            textAlign: 'center',
            maxWidth: '640px',
            margin: '0 auto',
            padding: '24px 16px',
          }}>
            Dexaris is a free DeFi yield intelligence platform built on data from DeFiLlama. It tracks hundreds of liquidity pools across every major chain and updates every 60 seconds — so you always know where the best yields are, and which ones carry the most risk.
          </p>
        </div>
      </motion.section>

      {/* ─── Legal disclaimer ───────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid rgba(232,230,255,0.06)',
        padding: '24px 20px',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: '12px',
          color: 'rgba(232,230,255,0.35)',
          maxWidth: '800px',
          margin: '0 auto',
          lineHeight: 1.7,
        }}>
          Dexaris is an informational platform only and does not constitute financial advice. The Dexaris Score is a proprietary data metric and should not be interpreted as a recommendation to invest. DeFi investments carry significant risk including the total loss of capital. Past yield performance does not guarantee future returns. Always conduct your own research before making any financial decisions. Dexaris is not regulated by the FCA or any other financial authority.
        </p>
      </div>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="landing-footer" style={{
        borderTop: '0.5px solid rgba(74,56,184,0.1)',
      }}>
        <DexarisLogo iconSize={20} fontSize={13} />

        <span style={{ fontSize: '11px', color: 'rgba(232,230,255,0.2)', flex: 1, textAlign: 'center' }}>
          Built on DeFiLlama data
        </span>

        <div style={{ display: 'flex', gap: '20px' }}>
          {[
            { label: 'Twitter',    href: 'https://x.com/DexarisHQ',                        external: true },
            { label: 'LinkedIn',   href: 'https://www.linkedin.com/company/Dexaris',       external: true },
            { label: 'Newsletter', href: '#newsletter',                                     external: false },
            { label: 'dexaris.io', href: 'https://dexaris.io',             external: true },
          ].map(({ label, href, external }) => (
            <a
              key={label}
              href={href}
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              {...(!external ? { onClick: scrollToId(href.slice(1)) } : {})}
              className="footer-link"
              style={{ fontSize: '12px', textDecoration: 'none' }}
            >
              {label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
