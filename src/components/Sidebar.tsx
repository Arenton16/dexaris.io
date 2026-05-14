import { CHAIN_LABELS, type ChainKey } from '../types';

interface Props {
  selected: ChainKey[];
  onChange: (chains: ChainKey[]) => void;
  minApy: number;
  onMinApyChange: (val: number) => void;
  sortKey: 'apy' | 'tvlUsd';
  onSortKeyChange: (key: 'apy' | 'tvlUsd') => void;
  countdown: number;
  onManualRefresh: () => void;
  isOpen: boolean;
}

export default function Sidebar({
  selected, onChange,
  minApy, onMinApyChange,
  sortKey, onSortKeyChange,
  countdown, onManualRefresh,
  isOpen,
}: Props) {
  const chains = Object.keys(CHAIN_LABELS) as ChainKey[];
  const allSelected = selected.length === chains.length;

  const toggle = (chain: ChainKey) => {
    onChange(
      selected.includes(chain)
        ? selected.filter(c => c !== chain)
        : [...selected, chain]
    );
  };

  return (
    <aside className={`sidebar${isOpen ? ' mobile-open' : ''}`}>
      <h3 className="sidebar-title">Chains</h3>
      <button
        className={`chain-btn${allSelected ? ' active' : ''}`}
        onClick={() => onChange(allSelected ? [] : chains)}
      >
        All
      </button>
      {chains.map(chain => (
        <button
          key={chain}
          className={`chain-btn${selected.includes(chain) ? ' active' : ''}`}
          onClick={() => toggle(chain)}
        >
          {chain}
        </button>
      ))}

      <div className="sidebar-divider" />

      <h3 className="sidebar-title">Min APY</h3>
      <div className="apy-input-wrap">
        <input
          className="apy-input"
          type="number"
          min={0}
          max={500}
          step={1}
          value={minApy}
          onChange={e => onMinApyChange(Math.max(0, Number(e.target.value)))}
        />
        <span className="apy-input-suffix">%</span>
      </div>

      <div className="sidebar-divider" />

      <h3 className="sidebar-title">Sort By</h3>
      <button
        className={`chain-btn${sortKey === 'apy' ? ' active' : ''}`}
        onClick={() => onSortKeyChange('apy')}
      >
        Highest APY
      </button>
      <button
        className={`chain-btn${sortKey === 'tvlUsd' ? ' active' : ''}`}
        onClick={() => onSortKeyChange('tvlUsd')}
      >
        Highest TVL
      </button>

      <div className="sidebar-divider" />

      <div className="refresh-section">
        <span className="refresh-countdown">
          Refreshing in {Math.max(countdown, 1)}s
        </span>
        <button
          className="refresh-icon-btn"
          onClick={onManualRefresh}
          title="Refresh now"
        >
          ↻
        </button>
      </div>
    </aside>
  );
}
