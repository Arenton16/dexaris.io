import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DexarisLogo from './DexarisLogo';
import { usePools } from '../contexts/PoolsContext';

function formatTvl(tvl: number): string {
  if (tvl >= 1_000_000_000) return `$${(tvl / 1_000_000_000).toFixed(1)}B`;
  if (tvl >= 1_000_000) return `$${(tvl / 1_000_000).toFixed(1)}M`;
  return `$${(tvl / 1_000).toFixed(0)}K`;
}

function ChainIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="#6B4FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="#6B4FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#6B4FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function D4Icon() {
  return (
    <svg width="20" height="20" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="4,42 10,26 16,26 10,42" fill="rgba(107,79,255,0.5)" />
      <polygon points="16,42 22,16 28,16 22,42" fill="rgba(107,79,255,0.75)" />
      <polygon points="28,42 34,5 40,5 34,42" fill="#6B4FFF" />
    </svg>
  );
}

const auroraColumns = [
  { left: '5%',  width: '6%',  animation: 'aurora1',  duration: '8s',  delay: '0s',    color: 'rgba(107,79,255,0.25)' },
  { left: '13%', width: '5%',  animation: 'aurora2',  duration: '11s', delay: '-2.3s', color: 'rgba(139,115,255,0.2)' },
  { left: '21%', width: '7%',  animation: 'aurora3',  duration: '9s',  delay: '-4.1s', color: 'rgba(78,205,164,0.08)' },
  { left: '30%', width: '5%',  animation: 'aurora4',  duration: '7s',  delay: '-1.7s', color: 'rgba(107,79,255,0.2)' },
  { left: '38%', width: '8%',  animation: 'aurora5',  duration: '12s', delay: '-3.5s', color: 'rgba(139,115,255,0.18)' },
  { left: '48%', width: '5%',  animation: 'aurora6',  duration: '10s', delay: '-5.2s', color: 'rgba(107,79,255,0.22)' },
  { left: '56%', width: '7%',  animation: 'aurora7',  duration: '8s',  delay: '-0.8s', color: 'rgba(78,205,164,0.07)' },
  { left: '65%', width: '6%',  animation: 'aurora8',  duration: '11s', delay: '-4.6s', color: 'rgba(107,79,255,0.25)' },
  { left: '74%', width: '5%',  animation: 'aurora9',  duration: '9s',  delay: '-2.9s', color: 'rgba(139,115,255,0.2)' },
  { left: '83%', width: '6%',  animation: 'aurora10', duration: '7s',  delay: '-1.4s', color: 'rgba(107,79,255,0.18)' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const { allPools, isLoading: loadingPools } = usePools();
  const pools = allPools
    .filter(p => (p.apy ?? 0) > 0)
    .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))
    .slice(0, 5);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.2 }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

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
      }}>
        {/* Aurora background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          animation: 'auroraShift 8s ease-in-out infinite',
          pointerEvents: 'none',
        }}>
          {auroraColumns.map((col, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                bottom: 0,
                left: col.left,
                width: col.width,
                borderRadius: '40px 40px 0 0',
                background: `linear-gradient(to top, ${col.color}, transparent)`,
                animation: `${col.animation} ${col.duration} ease-in-out infinite`,
                animationDelay: col.delay,
              }}
            />
          ))}
        </div>

        {/* Content sits above aurora */}
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
            Find the yield <span style={{ color: '#8B73FF' }}>worth chasing.</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle" style={{
            color: 'rgba(232,230,255,0.45)',
            maxWidth: '480px',
            lineHeight: 1.6,
            margin: 0,
          }}>
            Dexaris is the DeFi yield intelligence platform — the Dexaris Score ranks 140+ protocols across ETH, SOL, ARB, BASE and more. Free, no signup required.
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

      {/* ─── Features ───────────────────────────────────────────── */}
      <section id="features" className="features-section reveal" style={{
        borderTop: '0.5px solid rgba(107,79,255,0.1)',
        maxWidth: '1100px',
        margin: '0 auto',
        width: '100%',
      }}>
        <p style={{
          fontSize: '9px',
          textTransform: 'uppercase',
          color: 'rgba(232,230,255,0.25)',
          letterSpacing: '0.1em',
          textAlign: 'center',
          marginBottom: '40px',
        }}>
          Why Dexaris
        </p>

        <div className="features-grid">
          {[
            {
              icon: <D4Icon />,
              title: 'Risk vs Reward intelligence',
              desc: 'Our unique scatter chart plots every pool by APY and TVL so you can instantly see which yields are worth the risk and which to avoid.',
            },
            {
              icon: <ChainIcon />,
              title: 'Every major chain covered',
              desc: 'Track yields across Ethereum, Solana, Arbitrum, Base, Avalanche and Polygon in one unified platform. No switching between tools.',
            },
            {
              icon: <StarIcon />,
              title: 'Watchlist and alerts',
              desc: 'Save pools you care about to your personal watchlist. Set APY targets and get notified when a yield hits your threshold.',
            },
          ].map(({ icon, title, desc }, idx) => (
            <div key={title} className={`reveal reveal-delay-${idx + 1} feature-card`} style={{
              borderRadius: '12px',
              padding: '24px',
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                background: 'rgba(107,79,255,0.12)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
              }}>
                {icon}
              </div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#E8E6FF', marginBottom: '6px' }}>{title}</p>
              <p style={{ fontSize: '12px', color: 'rgba(232,230,255,0.4)', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Live data preview ──────────────────────────────────── */}
      <section className="preview-section reveal" style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
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
          background: 'rgba(107,79,255,0.04)',
          border: '0.5px solid rgba(107,79,255,0.12)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid rgba(107,79,255,0.12)' }}>
                {['Protocol', 'Chain', 'APY', 'TVL'].map(col => (
                  <th key={col} className={col === 'TVL' ? 'preview-tvl-col' : undefined} style={{
                    padding: '12px 16px',
                    textAlign: col === 'APY' || col === 'TVL' ? 'right' : 'left',
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
                      {Array.from({ length: 4 }).map((_, j) => (
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
                : pools.map((pool, i) => (
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
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => navigate('/app')}
            style={{
              background: 'none',
              border: 'none',
              color: '#6B4FFF',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            View all 140+ protocols →
          </button>
        </div>
      </section>

      {/* ─── Newsletter ─────────────────────────────────────────── */}
      <section id="newsletter" className="newsletter-section reveal" style={{
        borderTop: '0.5px solid rgba(107,79,255,0.1)',
      }}>
        <div className="newsletter-inner" style={{
          maxWidth: '1100px',
          margin: '0 auto',
        }}>
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
        </div>
      </section>

      {/* ─── About ──────────────────────────────────────────────── */}
      <section id="about" style={{
        padding: '64px 40px',
        borderTop: '0.5px solid rgba(107,79,255,0.1)',
        maxWidth: '1100px',
        margin: '0 auto',
        width: '100%',
      }}>
        <p style={{
          fontSize: '9px',
          textTransform: 'uppercase',
          color: 'rgba(232,230,255,0.25)',
          letterSpacing: '0.1em',
          marginBottom: '20px',
        }}>
          About
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(232,230,255,0.5)', lineHeight: 1.8, maxWidth: '640px' }}>
          Dexaris is a free DeFi yield intelligence platform built on data from DeFiLlama. It tracks hundreds of liquidity pools across every major chain and updates every 60 seconds — so you always know where the best yields are, and which ones carry the most risk.
        </p>
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
      <footer className="landing-footer reveal" style={{
        borderTop: '0.5px solid rgba(107,79,255,0.1)',
      }}>
        <DexarisLogo iconSize={20} fontSize={13} />

        <span style={{ fontSize: '11px', color: 'rgba(232,230,255,0.2)' }}>
          Built on DeFiLlama data
        </span>

        <div style={{ display: 'flex', gap: '20px' }}>
          {[
            { label: 'Twitter',    href: 'https://twitter.com/dexaris_io', external: true },
            { label: 'Newsletter', href: '#newsletter',                    external: false },
            { label: 'dexaris.io', href: 'https://dexaris.io',             external: true },
          ].map(({ label, href, external }) => (
            <a
              key={label}
              href={href}
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
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
