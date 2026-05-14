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
      <span className="navbar-logo">DEXARIS<span className="navbar-dot">.</span></span>
      <span className="navbar-tagline">DeFi Yield Intelligence</span>
      {isLoading && <span className="nav-spinner" />}
    </header>
  );
}
