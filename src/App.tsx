import { useCallback, useEffect, useRef, useState } from 'react';
import NavSidebar from './components/NavSidebar';
import Navbar from './components/Navbar';
import NewsBanner from './components/NewsBanner';
import Sidebar from './components/Sidebar';
import YieldTable from './components/YieldTable';
import Watchlist from './components/Watchlist';
import { usePools } from './contexts/PoolsContext';
import { useWatchlist } from './hooks/useWatchlist';
import { CHAIN_LABELS, type ChainKey } from './types';

export type Page = 'yields' | 'watchlist';

export default function App() {
  const [selectedChains, setSelectedChains] = useState<ChainKey[]>(
    Object.keys(CHAIN_LABELS) as ChainKey[]
  );
  const [minApy, setMinApy] = useState(1);
  const [sortKey, setSortKey] = useState<'apy' | 'tvlUsd' | 'score'>('apy');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [countdown, setCountdown] = useState(60);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  const handleSortChange = (key: 'apy' | 'tvlUsd' | 'score') => {
    if (sortKey === key) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    setIsNavOpen(false);
    if (page !== 'yields') setIsSidebarOpen(false);
  };

  const toggleNav = () => {
    setIsNavOpen(o => !o);
    setIsSidebarOpen(false);
  };

  const toggleFilters = () => {
    setIsSidebarOpen(o => !o);
    setIsNavOpen(false);
  };

  return (
    <div className="app">
      <NavSidebar
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        isCollapsed={navCollapsed}
        onToggleCollapse={() => setNavCollapsed(c => !c)}
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

        {bannerVisible && <NewsBanner onDismiss={() => setBannerVisible(false)} />}

        <div className="layout">
          {currentPage === 'yields' ? (
            <>
              {isSidebarOpen && (
                <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
              )}
              <Sidebar
                selected={selectedChains}
                onChange={setSelectedChains}
                minApy={minApy}
                onMinApyChange={setMinApy}
                sortKey={sortKey}
                onSortKeyChange={key => { setSortKey(key); setSortDir('desc'); }}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
              />
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
                  minApy={minApy}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSortChange={handleSortChange}
                  watchlistedIds={watchlistedIds}
                  onToggleWatchlist={toggleWatchlist}
                />
              </main>
            </>
          ) : (
            <main className="content">
              <Watchlist
                allPools={allPools}
                watchlistedIds={watchlistedIds}
                onToggleWatchlist={toggleWatchlist}
                onNavigateToYields={() => handleNavigate('yields')}
              />
            </main>
          )}
        </div>
      </div>
    </div>
  );
}
