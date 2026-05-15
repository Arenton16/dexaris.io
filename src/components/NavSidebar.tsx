import { useState } from 'react';
import DexarisIcon from './DexarisIcon';
import DexarisLogo from './DexarisLogo';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const NAV_ITEMS = [
  { icon: '◈', label: 'Yields',    active: true,  comingSoon: false },
  { icon: '◉', label: 'Portfolio', active: false, comingSoon: true  },
  { icon: '◎', label: 'Analytics', active: false, comingSoon: true  },
  { icon: '◇', label: 'Alerts',    active: false, comingSoon: true  },
] as const;

export default function NavSidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: Props) {
  const [tooltip, setTooltip] = useState<{ label: string; y: number } | null>(null);

  const handleToggleCollapse = () => {
    setTooltip(null);
    onToggleCollapse();
  };

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
          {NAV_ITEMS.map(item => (
            <div
              key={item.label}
              className={`nav-item${item.active ? ' nav-item--active' : ''}`}
              onMouseEnter={isCollapsed ? (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({ label: item.label, y: rect.top + rect.height / 2 });
              } : undefined}
              onMouseLeave={isCollapsed ? () => setTooltip(null) : undefined}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <span className="nav-item-label">{item.label}</span>
              {item.comingSoon && <span className="nav-soon">soon</span>}
            </div>
          ))}
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
