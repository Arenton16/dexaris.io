import { useState, type ReactNode } from 'react';
import DexarisIcon from './DexarisIcon';
import DexarisLogo from './DexarisLogo';
import type { Page } from '../App';

function IconYields() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1,12 5,7 9,10 15,3" />
      <polyline points="10,3 15,3 15,8" />
    </svg>
  );
}

function IconBookmark({ filled }: { filled: boolean }) {
  return filled ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 2a1 1 0 011-1h8a1 1 0 011 1v12l-5-2.8L3 14V2z" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2a1 1 0 011-1h8a1 1 0 011 1v12l-5-2.8L3 14V2z" />
    </svg>
  );
}

function IconPortfolio() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 1.5V8h6.5" />
    </svg>
  );
}

function IconAnalytics() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="8" width="3" height="5" rx="0.5" />
      <rect x="6.5" y="4.5" width="3" height="8.5" rx="0.5" />
      <rect x="11" y="2" width="3" height="11" rx="0.5" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1a4 4 0 014 4v3l1.5 1.5V11H2.5v-.5L4 9V5a4 4 0 014-4z" />
      <path d="M6.5 11a1.5 1.5 0 003 0" />
    </svg>
  );
}

interface NavItem {
  id: Page | null;
  icon: ReactNode;
  label: string;
  comingSoon: boolean;
  isNew?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  watchlistCount: number;
}

export default function NavSidebar({
  isOpen, onClose, isCollapsed, onToggleCollapse,
  currentPage, onNavigate, watchlistCount,
}: Props) {
  const [tooltip, setTooltip] = useState<{ label: string; y: number } | null>(null);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  const handleToggleCollapse = () => {
    setTooltip(null);
    onToggleCollapse();
  };

  const navItems: NavItem[] = [
    { id: 'yields',    icon: <IconYields />,                              label: 'Yields',    comingSoon: false },
    { id: 'watchlist', icon: <IconBookmark filled={watchlistCount > 0} />, label: 'Watchlist', comingSoon: false },
    { id: 'portfolio', icon: <IconPortfolio />,                           label: 'Portfolio', comingSoon: false },
    { id: 'analytics', icon: <IconAnalytics />,                           label: 'Analytics', comingSoon: false, isNew: true },
    { id: 'alerts',    icon: <IconBell />,                                label: 'Alerts',    comingSoon: false },
  ];

  return (
    <>
      {isOpen && <div className="nav-overlay" onClick={onClose} />}
      <aside className={`nav-sidebar${isOpen ? ' nav-open' : ''}${isCollapsed ? ' nav-collapsed' : ''}`}>
        <div className="nav-logo-wrap">
          {isCollapsed
            ? <DexarisIcon size={24} />
            : <DexarisLogo iconSize={24} fontSize={16} />
          }
          <button className="nav-close-btn" onClick={onClose} aria-label="Close menu">×</button>
        </div>

        <nav className="nav-menu">
          <span className="nav-section-label">MAIN MENU</span>
          {navItems.map(item => {
            const isActive = item.id !== null && currentPage === item.id;
            return (
              <div
                key={item.label}
                className={`nav-item${isActive ? ' nav-item--active' : ''}`}
                onClick={item.id !== null ? () => { onNavigate(item.id!); onClose(); } : undefined}
                onMouseEnter={isCollapsed ? (e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({ label: item.label, y: rect.top + rect.height / 2 });
                } : undefined}
                onMouseLeave={isCollapsed ? () => setTooltip(null) : undefined}
              >
                <span className="nav-item-icon">{item.icon}</span>
                <span className="nav-item-label">{item.label}</span>
                {item.id === 'watchlist' && watchlistCount > 0 && (
                  <span className="nav-badge">{watchlistCount}</span>
                )}
                {item.comingSoon && <span className="nav-soon">soon</span>}
                {item.isNew && <span className="nav-new">New</span>}
              </div>
            );
          })}
        </nav>

        <button
          className="nav-collapse-btn"
          onClick={handleToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '›' : '‹'}
        </button>

        <p className="nav-credit">Built on DeFiLlama data</p>
        <button className="nav-disclaimer-btn" onClick={() => setDisclaimerOpen(true)}>
          Disclaimer
        </button>

        {disclaimerOpen && (
          <div className="nav-disclaimer-overlay" onClick={() => setDisclaimerOpen(false)}>
            <div className="nav-disclaimer-modal" onClick={e => e.stopPropagation()}>
              <button className="nav-disclaimer-close" onClick={() => setDisclaimerOpen(false)}>×</button>
              <h3 className="nav-disclaimer-title">Legal Disclaimer</h3>
              <p className="nav-disclaimer-text">
                Dexaris is an informational platform only and does not constitute financial advice. The Dexaris Score is a proprietary data metric and should not be interpreted as a recommendation to invest. DeFi investments carry significant risk including the total loss of capital. Past yield performance does not guarantee future returns. Always conduct your own research before making any financial decisions. Dexaris is not regulated by the FCA or any other financial authority.
              </p>
            </div>
          </div>
        )}

        {tooltip && (
          <div className="nav-tooltip" style={{ top: tooltip.y, left: 76 }}>
            {tooltip.label}
          </div>
        )}
      </aside>
    </>
  );
}
