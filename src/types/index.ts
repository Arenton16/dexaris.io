export interface Pool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number | null;
}

export type ChainKey = 'ETH' | 'SOL' | 'ARB' | 'BASE' | 'AVAX' | 'POLY';

export const CHAIN_LABELS: Record<ChainKey, string> = {
  ETH: 'Ethereum',
  SOL: 'Solana',
  ARB: 'Arbitrum',
  BASE: 'Base',
  AVAX: 'Avalanche',
  POLY: 'Polygon',
};
