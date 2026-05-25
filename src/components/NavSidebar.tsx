import { useState } from 'react';
import DexarisIcon from './DexarisIcon';
import DexarisLogo from './DexarisLogo';
import type { Page } from '../App';

interface NavItem {
  id: Page | null;
  icon: string;
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
    { id: 'yields',    icon: '◈', label: 'Yields',    comingSoon: false },
    { id: 'watchlist', icon: watchlistCount > 0 ? '★' : '☆', label: 'Watchlist', comingSoon: false },
    { id: 'portfolio', icon: '◉', label: 'Portfolio', comingSoon: false },
    { id: 'analytics', icon: '◎', label: 'Analytics', comingSoon: false, isNew: true },
    { id: 'alerts',    icon: '◇', label: 'Alerts',    comingSoon: false },
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
