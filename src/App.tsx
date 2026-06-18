import { useCallback, useEffect, useRef, useState } from 'react';
import NavSidebar from './components/NavSidebar';
import Navbar from './components/Navbar';
import NewsBanner from './components/NewsBanner';
import Sidebar from './components/Sidebar';
import YieldTable from './components/YieldTable';
import Watchlist from './components/Watchlist';
import Analytics from './components/Analytics';
import Portfolio from './components/Portfolio';
import Alerts from './components/Alerts';
import { usePools } from './contexts/PoolsContext';
import { useWatchlist } from './hooks/useWatchlist';
import { CHAIN_LABELS, type ChainKey } from './types';

export type Page = 'yields' | 'watchlist' | 'analytics' | 'portfolio' | 'alerts';

export default function App() {
  const [selectedChains, setSelectedChains] = useState<ChainKey[]>(
    Object.keys(CHAIN_LABELS) as ChainKey[]
  );
  const [minApy, setMinApy] = useState(1);
  const [sortKey, setSortKey] = useState<'apy' | 'tvlUsd' | 'score'>('score');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([]);
  const [countdown, setCountdown] = useState(60);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(true);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('yields');
  const [isFlashing, setIsFlashing] = useState(false);
  const [apyDelta, setApyDelta] = useState<number | null>(null);

  const { allPools, isLoading, error, fetchedAt, refresh } = usePools();
  const { ids: watchlistedIds, toggle: toggleWatchlist } = useWatchlist();

  const prevFetchedAt = useRef<Date | null>(null);
  const prevApyRef = useRef<number | null>(null);

  // Flash timestamp on background refresh (not on the very first load)
  useEffect(() => {
    if (fetchedAt && prevFetchedAt.current) {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 1800);
    }
    prevFetchedAt.current = fetchedAt;
  }, [fetchedAt]);

  // Track max-APY delta between refreshes
  useEffect(() => {
    if (allPools.length === 0) return;
    const current = allPools.reduce((max, p) => Math.max(max, p.apy ?? 0), 0);
    if (prevApyRef.current !== null) {
      const d = parseFloat((current - prevApyRef.current).toFixed(2));
      setApyDelta(d !== 0 ? d : null);
    }
    prevApyRef.current = current;
  }, [allPools]);

  const triggerRefresh = useCallback(() => {
    refresh();
    setCountdown(60);
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (countdown <= 0) triggerRefresh();
  }, [countdown, triggerRefresh]);

  const handleSortChange = useCallback((key: 'apy' | 'tvlUsd' | 'score') => {
    if (sortKey === key) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }, [sortKey]);

  const handleSortKeyChange = useCallback((key: 'apy' | 'tvlUsd' | 'score') => {
    setSortKey(key);
    setSortDir('desc');
  }, []);

  const handleNavigate = useCallback((page: Page) => {
    setCurrentPage(page);
    setIsNavOpen(false);
    if (page !== 'yields') setIsSidebarOpen(false);
  }, []);

  const toggleNav = useCallback(() => {
    setIsNavOpen(o => !o);
    setIsSidebarOpen(false);
  }, []);

  const toggleFilters = useCallback(() => {
    setIsSidebarOpen(o => !o);
    setIsNavOpen(false);
  }, []);

  const closeNav = useCallback(() => setIsNavOpen(false), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const toggleNavCollapse = useCallback(() => setNavCollapsed(c => !c), []);
  const dismissBanner = useCallback(() => setBannerVisible(false), []);
  const navigateToYields = useCallback(() => handleNavigate('yields'), [handleNavigate]);
  const navigateToAnalytics = useCallback(() => handleNavigate('analytics'), [handleNavigate]);

  return (
    <div className="app">
      <NavSidebar
        isOpen={isNavOpen}
        onClose={closeNav}
        isCollapsed={navCollapsed}
        onToggleCollapse={toggleNavCollapse}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        watchlistCount={watchlistedIds.size}
      />

      <div className={`main-wrapper${navCollapsed ? ' nav-collapsed' : ''}`}>
        <Navbar
          countdown={countdown}
          isLoading={isLoading}
          onManualRefresh={triggerRefresh}
          onToggleNav={toggleNav}
          onToggleFilters={toggleFilters}
        />

        {bannerVisible && <NewsBanner onDismiss={dismissBanner} />}

        <div className="layout">
          {currentPage === 'analytics' ? (
            <main className="content">
              <Analytics displayPools={allPools} />
            </main>
          ) : currentPage === 'portfolio' ? (
            <main className="content">
              <Portfolio />
            </main>
          ) : currentPage === 'alerts' ? (
            <main className="content">
              <Alerts />
            </main>
          ) : currentPage === 'yields' ? (
            <>
              {isSidebarOpen && (
                <div className="sidebar-backdrop" onClick={closeSidebar} />
              )}
              <div style={{
                flexShrink: 0,
                width: sidebarOpen ? '190px' : '36px',
                minWidth: sidebarOpen ? '190px' : '36px',
                overflow: 'hidden',
                transition: 'width 0.2s ease, min-width 0.2s ease',
              }}>
                <button
                  onClick={() => setSidebarOpen(o => !o)}
                  aria-label={sidebarOpen ? 'Collapse filters' : 'Expand filters'}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: 'rgba(232,230,255,0.04)',
                    border: '0.5px solid rgba(232,230,255,0.1)',
                    color: 'rgba(232,230,255,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginBottom: '10px',
                    flexShrink: 0,
                  }}
                >
                  {sidebarOpen ? '‹' : '›'}
                </button>
                <div style={{
                  opacity: sidebarOpen ? 1 : 0,
                  pointerEvents: sidebarOpen ? 'auto' : 'none',
                  transition: 'opacity 0.15s ease',
                  width: '190px',
                }}>
                  <Sidebar
                    selected={selectedChains}
                    onChange={setSelectedChains}
                    minApy={minApy}
                    onMinApyChange={setMinApy}
                    sortKey={sortKey}
                    onSortKeyChange={handleSortKeyChange}
                    isOpen={isSidebarOpen}
                    onClose={closeSidebar}
                    allPools={allPools}
                    selectedProtocols={selectedProtocols}
                    onProtocolsChange={setSelectedProtocols}
                  />
                </div>
              </div>
              <main className="content">
                <YieldTable
                  allPools={allPools}
                  loading={isLoading}
                  error={error}
                  fetchedAt={fetchedAt}
                  isFlashing={isFlashing}
                  apyDelta={apyDelta}
                  onRetry={triggerRefresh}
                  selectedChains={selectedChains}
                  selectedProtocols={selectedProtocols}
                  minApy={minApy}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSortChange={handleSortChange}
                  watchlistedIds={watchlistedIds}
                  onToggleWatchlist={toggleWatchlist}
                  onNavigateToAnalytics={navigateToAnalytics}
                />
              </main>
            </>
          ) : (
            <main className="content">
              <Watchlist
                allPools={allPools}
                watchlistedIds={watchlistedIds}
                onToggleWatchlist={toggleWatchlist}
                onNavigateToYields={navigateToYields}
              />
            </main>
          )}
        </div>
        <footer className="app-disclaimer-bar">
          Dexaris is for informational purposes only and does not constitute financial advice. The Dexaris Score is a data metric, not an investment recommendation. DeFi investments carry significant risk. Always do your own research.
        </footer>
      </div>
    </div>
  );
}
