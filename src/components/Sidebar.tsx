import { CHAIN_LABELS, CHAIN_LOGOS, type ChainKey } from '../types';

interface Props {
  selected: ChainKey[];
  onChange: (chains: ChainKey[]) => void;
  minApy: number;
  onMinApyChange: (val: number) => void;
  sortKey: 'apy' | 'tvlUsd' | 'score';
  onSortKeyChange: (key: 'apy' | 'tvlUsd' | 'score') => void;
  isOpen: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  selected, onChange,
  minApy, onMinApyChange,
  sortKey, onSortKeyChange,
  isOpen, onClose,
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
      {chains.map(chain => {
        const chainName = CHAIN_LABELS[chain];
        const logo = CHAIN_LOGOS[chainName];
        return (
          <button
            key={chain}
            className={`chain-btn${selected.includes(chain) ? ' active' : ''}`}
            onClick={() => toggle(chain)}
          >
            {logo && (
              <img
                src={logo}
                alt={chainName}
                width={12}
                height={12}
                className="chain-logo"
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            {chain}
          </button>
        );
      })}

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
      <button
        className={`chain-btn${sortKey === 'score' ? ' active' : ''}`}
        onClick={() => onSortKeyChange('score')}
      >
        Dexaris Score
      </button>

      {onClose && (
        <button className="sidebar-apply-btn" onClick={onClose}>
          Apply filters
        </button>
      )}
    </aside>
  );
}
