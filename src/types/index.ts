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
  Ethereum: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
  Solana:   'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png',
  Arbitrum: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
  Base:     'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png',
  Avalanche:'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png',
  Polygon:  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
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
