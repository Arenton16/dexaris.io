import { useMemo, useState } from 'react';
import { CHAIN_LABELS, CHAIN_LOGOS, type ChainKey, type Pool } from '../types';

interface Props {
  selected: ChainKey[];
  onChange: (chains: ChainKey[]) => void;
  minApy: number;
  onMinApyChange: (val: number) => void;
  sortKey: 'apy' | 'tvlUsd' | 'score';
  onSortKeyChange: (key: 'apy' | 'tvlUsd' | 'score') => void;
  isOpen: boolean;
  onClose?: () => void;
  allPools: Pool[];
  selectedProtocols: string[];
  onProtocolsChange: (protocols: string[]) => void;
}

export default function Sidebar({
  selected, onChange,
  minApy, onMinApyChange,
  sortKey, onSortKeyChange,
  isOpen, onClose,
  allPools, selectedProtocols, onProtocolsChange,
}: Props) {
  const chains = Object.keys(CHAIN_LABELS) as ChainKey[];
  const allSelected = selected.length === chains.length;
  const [protocolSearch, setProtocolSearch] = useState('');
  const [protocolInputFocused, setProtocolInputFocused] = useState(false);

  const toggle = (chain: ChainKey) => {
    onChange(
      selected.includes(chain)
        ? selected.filter(c => c !== chain)
        : [...selected, chain]
    );
  };

  const availableProtocols = useMemo(() => {
    const allowedChains = new Set(selected.map(c => CHAIN_LABELS[c]));
    const names = new Set<string>();
    for (const p of allPools) {
      if (allowedChains.has(p.chain)) names.add(p.project);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [allPools, selected]);

  const suggestions = useMemo(() => {
    const q = protocolSearch.trim();
    if (q.length < 2) return [];
    const lower = q.toLowerCase();
    return availableProtocols
      .filter(p => !selectedProtocols.includes(p) && p.toLowerCase().includes(lower))
      .slice(0, 6);
  }, [availableProtocols, protocolSearch, selectedProtocols]);

  const removeProtocol = (name: string) => onProtocolsChange(selectedProtocols.filter(p => p !== name));
  const addProtocol = (name: string) => { onProtocolsChange([...selectedProtocols, name]); setProtocolSearch(''); };

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

      <div className="sidebar-divider" />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h3 className="sidebar-title" style={{ margin: 0 }}>Protocol</h3>
        {selectedProtocols.length > 0 && (
          <button
            onClick={() => onProtocolsChange([])}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'rgba(232,230,255,0.4)', padding: 0 }}
          >
            Clear
          </button>
        )}
      </div>

      {selectedProtocols.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
          {selectedProtocols.map(name => (
            <span
              key={name}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'rgba(107,79,255,0.14)', border: '0.5px solid #6B4FFF', borderRadius: '20px', color: '#8B73FF', fontSize: '11px', fontFamily: 'Inter, sans-serif', cursor: 'pointer', margin: '2px' }}
            >
              {name}
              <button
                onClick={() => removeProtocol(name)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B73FF', padding: '0 0 0 2px', lineHeight: 1, fontSize: '13px', opacity: 0.7 }}
                aria-label={`Remove ${name}`}
              >×</button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        placeholder="Search protocol..."
        value={protocolSearch}
        onChange={e => setProtocolSearch(e.target.value)}
        onFocus={() => setProtocolInputFocused(true)}
        onBlur={() => setProtocolInputFocused(false)}
        style={{
          width: '100%',
          background: 'rgba(232,230,255,0.04)',
          border: protocolInputFocused ? '0.5px solid rgba(107,79,255,0.5)' : '0.5px solid rgba(232,230,255,0.1)',
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '12px',
          color: '#E8E6FF',
          outline: 'none',
          fontFamily: 'Inter, sans-serif',
        }}
      />

      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
          {suggestions.map(name => (
            <button
              key={name}
              onClick={() => addProtocol(name)}
              style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontFamily: 'Inter, sans-serif', cursor: 'pointer', background: 'rgba(232,230,255,0.04)', border: '0.5px solid rgba(232,230,255,0.15)', color: 'rgba(232,230,255,0.55)', margin: '2px' }}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {onClose && (
        <button className="sidebar-apply-btn" onClick={onClose}>
          Apply filters
        </button>
      )}
    </aside>
  );
}
