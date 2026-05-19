export interface Pool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number | null;
  logo?: string;
}

export const CHAIN_LOGOS: Record<string, string> = {
  Ethereum: '/logos/chains/ethereum.png',
  Solana:   '/logos/chains/solana.png',
  Arbitrum: '/logos/chains/arbitrum.png',
  Base:     '/logos/chains/base.png',
  Avalanche:'/logos/chains/avalanche.png',
  Polygon:  '/logos/chains/polygon.png',
};

export type ChainKey = 'ETH' | 'SOL' | 'ARB' | 'BASE' | 'AVAX' | 'POLY';

export const CHAIN_LABELS: Record<ChainKey, string> = {
  ETH: 'Ethereum',
  SOL: 'Solana',
  ARB: 'Arbitrum',
  BASE: 'Base',
  AVAX: 'Avalanche',
  POLY: 'Polygon',
};
