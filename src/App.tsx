import { useCallback, useEffect, useRef, useState } from 'react';
import NavSidebar from './components/NavSidebar';
import Navbar from './components/Navbar';
import NewsBanner from './components/NewsBanner';
import YieldTable, { type ScoreTier } from './components/YieldTable';
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
  const [scoreTier, setScoreTier] = useState<ScoreTier>(0);
  const [organicOnly, setOrganicOnly] = useState(false);
  const [sortKey, setSortKey] = useState<'apy' | 'tvlUsd' | 'score'>('score');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [countdown, setCountdown] = useState(60);
  const [isNavOpen, setIsNavOpen] = useState(false);
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

  const handleNavigate = useCallback((page: Page) => {
    setCurrentPage(page);
    setIsNavOpen(false);
  }, []);

  const toggleNav = useCallback(() => {
    setIsNavOpen(o => !o);
  }, []);

  const closeNav = useCallback(() => setIsNavOpen(false), []);
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
          currentPage={currentPage}
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
                onSelectedChainsChange={setSelectedChains}
                scoreTier={scoreTier}
                onScoreTierChange={setScoreTier}
                organicOnly={organicOnly}
                onOrganicOnlyChange={setOrganicOnly}
                sortKey={sortKey}
                sortDir={sortDir}
                onSortChange={handleSortChange}
                watchlistedIds={watchlistedIds}
                onToggleWatchlist={toggleWatchlist}
                onNavigateToAnalytics={navigateToAnalytics}
              />
            </main>
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
