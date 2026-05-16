import { useCallback, useEffect, useRef, useState } from 'react';
import NavSidebar from './components/NavSidebar';
import Navbar from './components/Navbar';
import NewsBanner from './components/NewsBanner';
import Sidebar from './components/Sidebar';
import YieldTable from './components/YieldTable';
import Watchlist from './components/Watchlist';
import { useWatchlist } from './hooks/useWatchlist';
import { CHAIN_LABELS, type ChainKey, type Pool } from './types';

export type Page = 'yields' | 'watchlist';

function isValidApy(apy: number | null | undefined): boolean {
  return apy != null && Number.isFinite(apy) && apy >= 0.005;
}

export default function App() {
  const [selectedChains, setSelectedChains] = useState<ChainKey[]>(
    Object.keys(CHAIN_LABELS) as ChainKey[]
  );
  const [minApy, setMinApy] = useState(1);
  const [sortKey, setSortKey] = useState<'apy' | 'tvlUsd'>('apy');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [countdown, setCountdown] = useState(60);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(true);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('yields');

  // Pool data (lifted from YieldTable so Watchlist can share it)
  const [allPools, setAllPools] = useState<Pool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [apyDelta, setApyDelta] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const hasLoadedOnce = useRef(false);
  const prevApyRef = useRef<number | null>(null);

  const { ids: watchlistedIds, toggle: toggleWatchlist } = useWatchlist();

  useEffect(() => {
    const supportedChains = new Set(Object.values(CHAIN_LABELS));
    const isBackground = hasLoadedOnce.current;
    if (!isBackground) setIsLoading(true);
    setError(null);

    fetch('https://yields.llama.fi/pools')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ data: Pool[] }>;
      })
      .then(({ data }) => {
        const filtered = data
          .filter(p =>
            supportedChains.has(p.chain) &&
            p.tvlUsd >= 1_000_000 &&
            isValidApy(p.apy) &&
            (p.apy ?? 0) <= 200
          )
          .sort((a, b) => b.tvlUsd - a.tvlUsd);
        const wasLoaded = hasLoadedOnce.current;
        hasLoadedOnce.current = true;
        setAllPools(filtered);
        setFetchedAt(new Date());
        setIsLoading(false);
        if (wasLoaded) {
          setIsFlashing(true);
          setTimeout(() => setIsFlashing(false), 1800);
        }
      })
      .catch(() => {
        if (!hasLoadedOnce.current) setError('fetch_failed');
        setIsLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount, refreshTick]);

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
    setRefreshTick(t => t + 1);
    setCountdown(60);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (countdown <= 0) triggerRefresh();
  }, [countdown, triggerRefresh]);

  const handleSortChange = (key: 'apy' | 'tvlUsd') => {
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
              />
              <main className="content">
                <YieldTable
                  allPools={allPools}
                  loading={isLoading}
                  error={error}
                  fetchedAt={fetchedAt}
                  isFlashing={isFlashing}
                  apyDelta={apyDelta}
                  onRetry={() => setRetryCount(c => c + 1)}
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
