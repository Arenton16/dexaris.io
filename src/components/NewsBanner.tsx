import { useState, type FormEvent } from 'react';

interface Props {
  onDismiss: () => void;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NewsBanner({ onDismiss }: Props) {
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
    <div className="news-banner">
      <p className="news-banner-text">
        Stay ahead of the market — get the best DeFi yields delivered to your inbox
      </p>
      {status === 'success' ? (
        <span className="news-banner-success">You're in — welcome to the list! 🟣</span>
      ) : (
        <form className="news-banner-form" onSubmit={handleSubmit} noValidate>
          <input
            className="news-banner-input"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              if (status === 'error') setStatus('idle');
            }}
            disabled={status === 'loading'}
            autoComplete="email"
          />
          <button
            className="news-banner-btn"
            type="submit"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Subscribing...' : 'Subscribe free'}
          </button>
          {status === 'error' && (
            <span className="news-banner-error">Something went wrong, please try again</span>
          )}
        </form>
      )}
      <button className="news-banner-close" onClick={onDismiss} aria-label="Dismiss banner">
        ×
      </button>
    </div>
  );
}
