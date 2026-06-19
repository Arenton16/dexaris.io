import { useEffect, useRef, useState } from 'react';

const PAGE_TITLES: Record<string, string> = {
  yields: 'Yield Explorer',
  watchlist: 'Watchlist',
  analytics: 'Analytics',
  portfolio: 'Portfolio',
  alerts: 'Alerts',
};

interface Props {
  countdown: number;
  isLoading: boolean;
  onManualRefresh: () => void;
  onToggleNav: () => void;
  onToggleFilters: () => void;
  currentPage: string;
}

export default function TopBar({
  countdown,
  isLoading,
  onManualRefresh,
  onToggleNav,
  onToggleFilters,
  currentPage,
}: Props) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const wasLoading = useRef(false);

  useEffect(() => {
    if (wasLoading.current && !isLoading) {
      setLastUpdated(new Date());
    }
    wasLoading.current = isLoading;
  }, [isLoading]);

  const lastUpdatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div className="topbar">
      <button className="topbar-hamburger" onClick={onToggleNav} aria-label="Toggle menu">
        <span /><span /><span />
      </button>

      <h1 className="topbar-title">{PAGE_TITLES[currentPage] ?? 'Yield Explorer'}</h1>

      <div className="topbar-right">
        <button className="topbar-filter-btn" onClick={onToggleFilters} aria-label="Toggle filters">
          ⊟ Filters
        </button>

        <div
          className="topbar-refresh"
          onClick={onManualRefresh}
          title="Refresh now"
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onManualRefresh()}
        >
          {isLoading
            ? <span className="nav-spinner" />
            : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span className="topbar-countdown">↻ {Math.max(countdown, 1)}s</span>
                {lastUpdatedStr && (
                  <>
                    <span style={{ fontSize: '11px', color: 'rgba(232,230,255,0.3)' }}>·</span>
                    <span style={{ fontSize: '11px', color: 'rgba(232,230,255,0.3)' }}>Last updated: {lastUpdatedStr}</span>
                  </>
                )}
              </span>
            )
          }
        </div>

        <span className="coming-soon-wrap">
          <button className="connect-wallet-btn" disabled>Connect Wallet</button>
        </span>
      </div>
    </div>
  );
}
