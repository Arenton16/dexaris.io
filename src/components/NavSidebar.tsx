import DexarisLogo from './DexarisLogo';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { icon: '◈', label: 'Yields',    active: true,  comingSoon: false },
  { icon: '◉', label: 'Portfolio', active: false, comingSoon: true  },
  { icon: '◎', label: 'Analytics', active: false, comingSoon: true  },
  { icon: '◇', label: 'Alerts',    active: false, comingSoon: true  },
] as const;

export default function NavSidebar({ isOpen, onClose }: Props) {
  return (
    <>
      {isOpen && <div className="nav-overlay" onClick={onClose} />}
      <aside className={`nav-sidebar${isOpen ? ' nav-open' : ''}`}>
        <div className="nav-logo-wrap">
          <DexarisLogo iconSize={24} fontSize={16} />
        </div>

        <nav className="nav-menu">
          <span className="nav-section-label">MAIN MENU</span>
          {NAV_ITEMS.map(item => (
            <div
              key={item.label}
              className={`nav-item${item.active ? ' nav-item--active' : ''}`}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <span className="nav-item-label">{item.label}</span>
              {item.comingSoon && <span className="nav-soon">soon</span>}
            </div>
          ))}
        </nav>

        <p className="nav-credit">Built on DeFiLlama data</p>
      </aside>
    </>
  );
}
