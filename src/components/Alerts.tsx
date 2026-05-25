import { useState, type FormEvent } from 'react';

type Status = 'idle' | 'loading' | 'success' | 'error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ApyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="#6B4FFF" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="#6B4FFF" strokeWidth="1.8" />
      <line x1="12" y1="3" x2="12" y2="6" stroke="#6B4FFF" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="21" stroke="#6B4FFF" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="3" y1="12" x2="6" y2="12" stroke="#6B4FFF" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="18" y1="12" x2="21" y2="12" stroke="#6B4FFF" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ScoreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline points="2,7 8,13 13,8 22,17" stroke="#6B4FFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16,17 22,17 22,11" stroke="#6B4FFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TvlIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="14" width="4" height="8" rx="1" stroke="#6B4FFF" strokeWidth="1.8" />
      <rect x="9" y="9" width="4" height="13" rx="1" stroke="#6B4FFF" strokeWidth="1.8" />
      <rect x="16" y="4" width="4" height="18" rx="1" stroke="#6B4FFF" strokeWidth="1.8" />
    </svg>
  );
}

const FEATURE_CARDS = [
  {
    Icon: ApyIcon,
    title: 'APY Target',
    description: 'Alert when a pool crosses your target yield',
  },
  {
    Icon: ScoreIcon,
    title: 'Score Drop',
    description: 'Alert when a Dexaris Score falls below your threshold',
  },
  {
    Icon: TvlIcon,
    title: 'TVL Movement',
    description: 'Alert when TVL shifts significantly in 24h',
  },
];

export default function Alerts() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div style={{
      minHeight: '100%',
      background: '#0C0B1A',
      fontFamily: "'Inter', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      boxSizing: 'border-box',
    }}>
      <div style={{ maxWidth: 580, width: '100%' }}>

        {/* Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(107,79,255,0.12)',
          border: '1px solid rgba(107,79,255,0.3)',
          borderRadius: 20,
          padding: '5px 14px',
          marginBottom: 24,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6B4FFF', display: 'inline-block' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#8B73FF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Coming Soon
          </span>
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: 32,
          fontWeight: 700,
          color: '#E8E6FF',
          margin: '0 0 12px',
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
        }}>
          Alerts
        </h1>

        {/* Description */}
        <p style={{
          fontSize: 15,
          color: '#9B97C0',
          margin: '0 0 40px',
          lineHeight: 1.6,
          maxWidth: 480,
        }}>
          Get notified when a pool hits your target APY, drops below a score threshold, or sees unusual TVL movement.
        </p>

        {/* Feature preview cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
          {FEATURE_CARDS.map(({ Icon, title, description }) => (
            <div key={title} style={{
              background: '#111028',
              border: '1px solid rgba(107,79,255,0.15)',
              borderRadius: 12,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(107,79,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#E8E6FF', marginBottom: 2 }}>
                  {title}
                </div>
                <div style={{ fontSize: 13, color: '#9B97C0' }}>
                  {description}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Email capture */}
        <div style={{
          background: '#111028',
          border: '1px solid rgba(107,79,255,0.2)',
          borderRadius: 14,
          padding: '24px',
        }}>
          {status === 'success' ? (
            <p style={{ margin: 0, fontSize: 14, color: '#8B73FF', fontWeight: 500 }}>
              You're on the list — we'll let you know when Alerts goes live.
            </p>
          ) : (
            <>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: '#9B97C0' }}>
                Be the first to know when Alerts launches.
              </p>
              <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (status === 'error') setStatus('idle');
                  }}
                  disabled={status === 'loading'}
                  autoComplete="email"
                  style={{
                    flex: '1 1 200px',
                    background: 'rgba(255,255,255,0.05)',
                    border: status === 'error' ? '1px solid #FF6B6B' : '1px solid rgba(107,79,255,0.25)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 14,
                    color: '#E8E6FF',
                    outline: 'none',
                    fontFamily: "'Inter', sans-serif",
                  }}
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  style={{
                    background: '#6B4FFF',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 18px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                    opacity: status === 'loading' ? 0.7 : 1,
                    fontFamily: "'Inter', sans-serif",
                    whiteSpace: 'nowrap',
                  }}
                >
                  {status === 'loading' ? 'Submitting...' : 'Notify me when it launches'}
                </button>
              </form>
              {status === 'error' && (
                <p style={{ margin: '10px 0 0', fontSize: 13, color: '#FF6B6B' }}>
                  Something went wrong — please check your email and try again.
                </p>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
