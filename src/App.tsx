import { useCallback, useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import YieldTable from './components/YieldTable';
import { CHAIN_LABELS, type ChainKey } from './types';

export default function App() {
  const [selectedChains, setSelectedChains] = useState<ChainKey[]>(
    Object.keys(CHAIN_LABELS) as ChainKey[]
  );
  const [minApy, setMinApy] = useState(1);
  const [sortKey, setSortKey] = useState<'apy' | 'tvlUsd'>('apy');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(60);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  return (
    <div className="app">
      {isSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <Navbar
        isLoading={isLoading}
        onToggleSidebar={() => setIsSidebarOpen(o => !o)}
      />
      <div className="layout">
        <Sidebar
          selected={selectedChains}
          onChange={setSelectedChains}
          minApy={minApy}
          onMinApyChange={setMinApy}
          sortKey={sortKey}
          onSortKeyChange={key => { setSortKey(key); setSortDir('desc'); }}
          countdown={countdown}
          onManualRefresh={triggerRefresh}
          isOpen={isSidebarOpen}
        />
        <main className="content">
          <YieldTable
            selectedChains={selectedChains}
            minApy={minApy}
            sortKey={sortKey}
            sortDir={sortDir}
            onSortChange={handleSortChange}
            onLoadingChange={setIsLoading}
            refreshTick={refreshTick}
          />
        </main>
      </div>
    </div>
  );
}
