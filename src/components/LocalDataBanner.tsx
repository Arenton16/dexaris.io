import { useState } from 'react';

const DISMISSED_KEY = 'dexaris_local_data_banner_dismissed';

export default function LocalDataBanner() {
  const [dismissed, setDismissed] = useState(
    () => {
      try { return localStorage.getItem(DISMISSED_KEY) === '1'; } catch { return false; }
    }
  );

  if (dismissed) return null;

  function dismiss() {
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* ignore */ }
    setDismissed(true);
  }

  return (
    <div className="local-data-banner">
      <span className="local-data-banner-icon">⚠</span>
      <p className="local-data-banner-text">
        Your saved data lives in this browser only. Clearing your browser data or switching devices will lose your watchlist and portfolio.
      </p>
      <button className="local-data-banner-close" onClick={dismiss} aria-label="Dismiss notice">×</button>
    </div>
  );
}
