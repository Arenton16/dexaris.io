import { useState } from 'react';
import DexarisIcon from './DexarisIcon';
import DexarisLogo from './DexarisLogo';
import type { Page } from '../App';

interface NavItem {
  id: Page | null;
  icon: string;
  label: string;
  comingSoon: boolean;
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

  const handleToggleCollapse = () => {
    setTooltip(null);
    onToggleCollapse();
  };

  const navItems: NavItem[] = [
    { id: 'yields',    icon: '◈', label: 'Yields',    comingSoon: false },
    { id: 'watchlist', icon: watchlistCount > 0 ? '★' : '☆', label: 'Watchlist', comingSoon: false },
    { id: null,        icon: '◉', label: 'Portfolio', comingSoon: true  },
    { id: null,        icon: '◎', label: 'Analytics', comingSoon: true  },
    { id: null,        icon: '◇', label: 'Alerts',    comingSoon: true  },
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

        {tooltip && (
          <div className="nav-tooltip" style={{ top: tooltip.y, left: 76 }}>
            {tooltip.label}
          </div>
        )}
      </aside>
    </>
  );
}
