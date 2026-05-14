import DexarisLogo from './DexarisLogo';

interface Props {
  isLoading: boolean;
  onToggleSidebar: () => void;
}

export default function Navbar({ isLoading, onToggleSidebar }: Props) {
  return (
    <header className="navbar">
      <button
        className="hamburger"
        onClick={onToggleSidebar}
        aria-label="Toggle menu"
      >
        <span />
        <span />
        <span />
      </button>
      <DexarisLogo iconSize={28} fontSize={18} />
      <span className="navbar-tagline">DeFi Yield Intelligence</span>
      {isLoading && <span className="nav-spinner" />}
    </header>
  );
}