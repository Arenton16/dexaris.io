interface Props {
  countdown: number;
  isLoading: boolean;
  onManualRefresh: () => void;
  onToggleNav: () => void;
  onToggleFilters: () => void;
}

export default function TopBar({
  countdown,
  isLoading,
  onManualRefresh,
  onToggleNav,
  onToggleFilters,
}: Props) {
  return (
    <div className="topbar">
      <button className="topbar-hamburger" onClick={onToggleNav} aria-label="Toggle menu">
        <span /><span /><span />
      </button>

      <h1 className="topbar-title">Yield Explorer</h1>

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
            : <span className="topbar-countdown">↻ {Math.max(countdown, 1)}s</span>
          }
        </div>

        <span className="coming-soon-wrap">
          <button className="connect-wallet-btn" disabled>Connect Wallet</button>
        </span>
      </div>
    </div>
  );
}
