import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import DexarisLogo from './DexarisLogo';
import { usePools } from '../contexts/PoolsContext';
import { BackgroundPaths } from './ui/BackgroundPaths';
import { calculateDexarisScore } from '../utils/dexarisScore';

interface TickerPool {
  project: string;
  symbol: string;
  apy: number;
  tvlUsd: number;
  chain: string;
  score: number;
}

function quickScore(p: { apy: number; tvlUsd: number }): number {
  const tvlScore = Math.min(p.tvlUsd / 1_000_000, 100) * 0.4;
  const apyScore = Math.min(p.apy, 80) * 0.6;
  return Math.round(tvlScore + apyScore);
}

function LiveTicker() {
  const [pools, setPools] = useState<TickerPool[]>([]);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('https://yields.llama.fi/pools')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const top: TickerPool[] = (data.data as Array<{
          project: string; symbol: string; apy: number | null;
          tvlUsd: number; chain: string;
        }>)
          .filter(p => p.tvlUsd > 10_000_000 && (p.apy ?? 0) > 0 && (p.apy ?? 0) <= 80)
          .map(p => ({ ...p, apy: p.apy!, score: quickScore({ apy: p.apy!, tvlUsd: p.tvlUsd }) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 6);
        setPools(top);
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (status !== 'ready' || pools.length === 0) return;
    intervalRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % pools.length);
        setVisible(true);
      }, 400);
    }, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [status, pools.length]);

  if (status === 'error') return null;

  if (status === 'loading') {
    return (
      <div style={{
        maxWidth: '480px', height: '40px', borderRadius: '40px',
        background: 'rgba(107,79,255,0.08)', border: '1px solid rgba(107,79,255,0.15)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }} />
    );
  }

  const pool = pools[idx];
  if (!pool) return null;

  return (
    <div style={{
      maxWidth: '480px',
      background: 'rgba(107,79,255,0.08)',
      border: '1px solid rgba(107,79,255,0.25)',
      borderRadius: '40px',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.4s ease',
      userSelect: 'none',
    }}>
      <span style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: '#4ECDA4', flexShrink: 0,
        animation: 'pulse 2s ease-in-out infinite',
        display: 'inline-block',
      }} />
      <span style={{ color: '#E8E6FF', fontWeight: 500, whiteSpace: 'nowrap' }}>{pool.project}</span>
      <span style={{ color: 'rgba(232,230,255,0.35)' }}>·</span>
      <span style={{ color: 'rgba(232,230,255,0.55)', whiteSpace: 'nowrap' }}>{pool.symbol}</span>
      <span style={{ color: 'rgba(232,230,255,0.35)' }}>·</span>
      <span style={{ color: '#4ECDA4', fontWeight: 700, whiteSpace: 'nowrap' }}>{pool.apy.toFixed(2)}%</span>
      <span style={{ color: 'rgba(232,230,255,0.35)' }}>·</span>
      <span style={{ color: 'rgba(232,230,255,0.35)', whiteSpace: 'nowrap' }}>
        Score <span style={{ color: '#8B73FF', fontWeight: 700 }}>{pool.score}</span>
      </span>
      <span style={{ color: 'rgba(232,230,255,0.35)' }}>·</span>
      <span style={{ color: 'rgba(232,230,255,0.35)', whiteSpace: 'nowrap' }}>{pool.chain}</span>
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
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="#6B4FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="#6B4FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#6B4FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function D4Icon() {
  return (
    <svg width="24" height="24" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="4,42 10,26 16,26 10,42" fill="rgba(107,79,255,0.5)" />
      <polygon points="16,42 22,16 28,16 22,42" fill="rgba(107,79,255,0.75)" />
      <polygon points="28,42 34,5 40,5 34,42" fill="#6B4FFF" />
    </svg>
  );
}


function ProtocolLogoStrip() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const singleSetWidth = el.scrollWidth / 4;
    let raf: number;

    const step = () => {
      posRef.current += 0.5;
      if (posRef.current >= singleSetWidth) {
        posRef.current = posRef.current - singleSetWidth;
      }
      el.style.transform = `translateX(-${posRef.current}px)`;
      raf = requestAnimationFrame(step);
    };

    const imgs = el.querySelectorAll('img');
    let loaded = 0;
    const onLoad = () => {
      loaded++;
      if (loaded === imgs.length) raf = requestAnimationFrame(step);
    };
    imgs.forEach(img => {
      if (img.complete) onLoad();
      else img.addEventListener('load', onLoad);
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  const chains = [
    { name: 'Ethereum', logo: '/logos/chains/ethereum.png' },
    { name: 'Solana',   logo: '/logos/chains/solana.png' },
    { name: 'Arbitrum', logo: '/logos/chains/arbitrum.png' },
    { name: 'Base',     logo: '/logos/chains/base.png' },
    { name: 'Avalanche',logo: '/logos/chains/avalanche.png' },
    { name: 'Polygon',  logo: '/logos/chains/polygon.png' },
  ];
  const repeated = [...chains, ...chains, ...chains, ...chains];

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true, amount: 0.01 }}
      style={{ width: '100%' }}
    >
      <p style={{
        textAlign: 'center',
        fontSize: '13px',
        color: 'rgba(232,230,255,0.4)',
        fontFamily: "'Inter', sans-serif",
        margin: 0,
        padding: '48px 0 32px',
      }}>
        Live yield data across 6 chains and 140+ protocols
      </p>
      <div style={{
        overflow: 'hidden',
        width: '100%',
        maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      }}>
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            gap: '48px',
            width: 'max-content',
            willChange: 'transform',
          }}
        >
          {repeated.map((chain, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'rgba(107,79,255,0.08)',
                border: '1px solid rgba(107,79,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <img src={chain.logo} alt={chain.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'contain' }} />
              </div>
              <span style={{ fontSize: '11px', color: 'rgba(232,230,255,0.4)', whiteSpace: 'nowrap' }}>{chain.name}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function ScoreIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="#6B4FFF" strokeWidth="1.5" />
      <path d="M8 12l3 3 5-5" stroke="#6B4FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function scoreColour(score: number): string {
  if (score >= 80) return '#4ECDA4';
  if (score >= 60) return '#8B73FF';
  if (score >= 40) return '#FFB347';
  return '#FF6B6B';
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
  const pools = allPools
    .filter(p => (p.apy ?? 0) > 0)
    .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))
    .slice(0, 5);

  return (
    <div style={{ background: '#080714', minHeight: '100vh', fontFamily: "'Inter', sans-serif", color: '#E8E6FF' }}>

      {/* ─── Navbar ─────────────────────────────────────────────── */}
      <nav className="landing-nav" style={{
        height: '64px',
        background: 'rgba(8,7,20,0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '0.5px solid rgba(107,79,255,0.12)',
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
            borderRadius: '20px',
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
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
        background: '#06050F',
      }}>
        <BackgroundPaths />

        {/* Content sits above BackgroundPaths */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          {/* Pill badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(107,79,255,0.12)',
            border: '0.5px solid rgba(107,79,255,0.3)',
            borderRadius: '20px',
            padding: '5px 14px',
            fontSize: '11px',
            color: 'rgba(107,79,255,0.9)',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6B4FFF', animation: 'pulse 2s ease-in-out infinite', display: 'inline-block' }} />
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
            <span style={{ color: '#8B73FF' }}>worth chasing.</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle" style={{
            color: 'rgba(232,230,255,0.45)',
            maxWidth: '480px',
            lineHeight: 1.6,
            margin: 0,
          }}>
            Live APY and TVL intelligence across 140+ protocols on ETH, SOL, ARB, BASE and more. Free forever, no signup required.
          </p>

          <LiveTicker />

          {/* CTA buttons */}
          <div className="hero-cta-row">
            <button
              onClick={() => navigate('/app')}
              className="btn-primary hero-cta-btn"
              style={{
                color: '#fff',
                fontSize: '14px',
                padding: '12px 28px',
                borderRadius: '24px',
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
                borderRadius: '24px',
                cursor: 'pointer',
                fontWeight: 500,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Learn more
            </a>
          </div>
        </div>
      </section>

      {/* ─── Protocol logo strip ────────────────────────────────── */}
      <ProtocolLogoStrip />

      {/* ─── Features ───────────────────────────────────────────── */}
      <section id="features" className="features-section" style={{
        borderTop: '0.5px solid rgba(107,79,255,0.1)',
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
              style={{ borderRadius: '16px', padding: '28px' }}
            >
              <div style={{
                width: '48px', height: '48px',
                background: 'rgba(107,79,255,0.15)',
                border: '1px solid rgba(107,79,255,0.25)',
                borderRadius: '12px',
                boxShadow: '0 0 20px rgba(107,79,255,0.2)',
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
              title: 'Watchlist and alerts',
              desc: 'Save pools you care about to your personal watchlist. Set APY targets and get notified when a yield hits your threshold.',
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
              style={{ borderRadius: '16px', padding: '28px' }}
            >
              <div style={{
                width: '48px', height: '48px',
                background: 'rgba(107,79,255,0.15)',
                border: '1px solid rgba(107,79,255,0.25)',
                borderRadius: '12px',
                boxShadow: '0 0 20px rgba(107,79,255,0.2)',
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
        <p style={{
          fontSize: '9px',
          textTransform: 'uppercase',
          color: 'rgba(232,230,255,0.25)',
          letterSpacing: '0.1em',
          marginBottom: '20px',
        }}>
          Live Yield Data
        </p>

        <div style={{
          background: 'rgba(107, 79, 255, 0.06)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(107, 79, 255, 0.18)',
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(107, 79, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid rgba(107,79,255,0.12)' }}>
                {['Protocol', 'Chain', 'APY', 'TVL', 'Score'].map(col => (
                  <th key={col} className={col === 'TVL' ? 'preview-tvl-col' : undefined} style={{
                    padding: '12px 16px',
                    textAlign: col === 'APY' || col === 'TVL' || col === 'Score' ? 'right' : 'left',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'rgba(232,230,255,0.35)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingPools
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '0.5px solid rgba(107,79,255,0.06)' }}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} style={{ padding: '14px 16px' }}>
                          <div style={{
                            height: '12px',
                            borderRadius: '4px',
                            background: 'rgba(107,79,255,0.1)',
                            width: j === 0 ? '120px' : j === 1 ? '80px' : '60px',
                            animation: 'pulse 1.5s ease-in-out infinite',
                          }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : pools.map((pool, i) => {
                    const score = calculateDexarisScore(pool);
                    return (
                    <tr key={i} className="preview-row" style={{ borderBottom: i < pools.length - 1 ? '0.5px solid rgba(107,79,255,0.06)' : 'none' }}>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#E8E6FF' }}>
                        <span style={{ textTransform: 'capitalize' }}>{pool.project}</span>
                        <span style={{ fontSize: '11px', color: 'rgba(232,230,255,0.35)', marginLeft: '8px' }}>{pool.symbol}</span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: 'rgba(232,230,255,0.5)' }}>{pool.chain}</td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4ECDA4', textAlign: 'right', fontWeight: 500 }}>
                        {(pool.apy ?? 0).toFixed(2)}%
                      </td>
                      <td className="preview-tvl-col" style={{ padding: '14px 16px', fontSize: '13px', color: 'rgba(232,230,255,0.6)', textAlign: 'right' }}>
                        {formatTvl(pool.tvlUsd)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: scoreColour(score), textAlign: 'right', fontWeight: 600 }}>
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
              e.currentTarget.style.background = 'rgba(107,79,255,0.15)';
              e.currentTarget.style.borderColor = 'rgba(107,79,255,0.6)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(107,79,255,0.08)';
              e.currentTarget.style.borderColor = 'rgba(107,79,255,0.4)';
            }}
            style={{
              background: 'rgba(107,79,255,0.08)',
              border: '1px solid rgba(107,79,255,0.4)',
              borderRadius: '8px',
              padding: '10px 24px',
              color: '#8B73FF',
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
        borderTop: '0.5px solid rgba(107,79,255,0.1)',
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
            <p style={{ fontSize: '13px', color: '#8B73FF', fontWeight: 500 }}>
              You're in — welcome to the list! 🟣
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
                  background: 'rgba(107,79,255,0.08)',
                  border: '0.5px solid rgba(107,79,255,0.2)',
                  borderRadius: '20px',
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
                  borderRadius: '20px',
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
      <section id="about" style={{
        padding: '64px 40px',
        borderTop: '0.5px solid rgba(107,79,255,0.1)',
        maxWidth: '1100px',
        margin: '0 auto',
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <p style={{
          fontSize: '9px',
          textTransform: 'uppercase',
          color: 'rgba(232,230,255,0.25)',
          letterSpacing: '0.1em',
          marginBottom: '20px',
        }}>
          About
        </p>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, amount: 0.01 }}
          style={{ fontSize: '14px', color: 'rgba(232,230,255,0.5)', lineHeight: 1.8 }}
        >
          Dexaris is a free DeFi yield intelligence platform built on data from DeFiLlama. It tracks hundreds of liquidity pools across every major chain and updates every 60 seconds — so you always know where the best yields are, and which ones carry the most risk.
        </motion.p>
        </div>
      </section>

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
        borderTop: '0.5px solid rgba(107,79,255,0.1)',
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
