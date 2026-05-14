export type Chain = 'ethereum' | 'bnb' | 'polygon' | 'avalanche' | 'arbitrum' | 'optimism' | 'solana' | 'base';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface Protocol {
  id: string;
  name: string;
  logoEmoji: string;
  chain: Chain;
  token: string;
  apy: number;
  tvl: number;
  risk: RiskLevel;
  category: string;
  description: string;
  minStake: number;
  rewards: string[];
  audited: boolean;
  trending?: boolean;
}

export interface Position {
  id: string;
  protocolId: string;
  protocol: string;
  logoEmoji: string;
  chain: Chain;
  token: string;
  staked: number;
  stakedUsd: number;
  rewards: number;
  rewardsUsd: number;
  apy: number;
  entryDate: string;
}

export const protocols: Protocol[] = [
  {
    id: 'lido',
    name: 'Lido',
    logoEmoji: '🔷',
    chain: 'ethereum',
    token: 'stETH',
    apy: 4.2,
    tvl: 32800000000,
    risk: 'low',
    category: 'Liquid Staking',
    description: 'Stake ETH and receive stETH, a liquid token representing your staked position. Earn staking rewards while keeping liquidity.',
    minStake: 0.01,
    rewards: ['stETH', 'LDO'],
    audited: true,
    trending: false,
  },
  {
    id: 'aave-v3',
    name: 'Aave V3',
    logoEmoji: '👻',
    chain: 'ethereum',
    token: 'USDC',
    apy: 8.7,
    tvl: 9400000000,
    risk: 'low',
    category: 'Lending',
    description: 'Supply USDC to Aave V3 and earn yield from borrowers. One of the most trusted lending protocols in DeFi.',
    minStake: 1,
    rewards: ['aUSDC', 'AAVE'],
    audited: true,
    trending: true,
  },
  {
    id: 'convex',
    name: 'Convex Finance',
    logoEmoji: '🔺',
    chain: 'ethereum',
    token: 'CRV/ETH LP',
    apy: 14.3,
    tvl: 4100000000,
    risk: 'medium',
    category: 'Yield Optimizer',
    description: 'Boost your Curve LP rewards with Convex. Earn CRV, CVX, and additional incentives without locking tokens yourself.',
    minStake: 100,
    rewards: ['CRV', 'CVX', 'FXS'],
    audited: true,
    trending: true,
  },
  {
    id: 'gmx',
    name: 'GMX',
    logoEmoji: '🌀',
    chain: 'arbitrum',
    token: 'GLP',
    apy: 22.6,
    tvl: 890000000,
    risk: 'medium',
    category: 'Perpetuals',
    description: 'Provide liquidity to GMX and earn 70% of platform fees in ETH/AVAX, plus esGMX rewards.',
    minStake: 50,
    rewards: ['ETH', 'esGMX'],
    audited: true,
    trending: true,
  },
  {
    id: 'pendle',
    name: 'Pendle',
    logoEmoji: '⏳',
    chain: 'arbitrum',
    token: 'weETH',
    apy: 31.4,
    tvl: 780000000,
    risk: 'medium',
    category: 'Yield Trading',
    description: 'Tokenize and trade future yield. Fix your yield or speculate on rate movements with Pendle\'s PT/YT mechanism.',
    minStake: 10,
    rewards: ['PENDLE', 'weETH'],
    audited: true,
    trending: true,
  },
  {
    id: 'pancake',
    name: 'PancakeSwap',
    logoEmoji: '🥞',
    chain: 'bnb',
    token: 'CAKE',
    apy: 41.2,
    tvl: 1700000000,
    risk: 'medium',
    category: 'DEX',
    description: 'Stake CAKE in syrup pools or provide liquidity to earn CAKE and partner tokens.',
    minStake: 5,
    rewards: ['CAKE'],
    audited: true,
    trending: false,
  },
  {
    id: 'stargate',
    name: 'Stargate',
    logoEmoji: '⭐',
    chain: 'polygon',
    token: 'USDT',
    apy: 11.8,
    tvl: 420000000,
    risk: 'low',
    category: 'Bridge',
    description: 'Provide liquidity to Stargate\'s omnichain bridge pools and earn STG rewards plus trading fees.',
    minStake: 10,
    rewards: ['STG', 'USDT'],
    audited: true,
    trending: false,
  },
  {
    id: 'radiant',
    name: 'Radiant Capital',
    logoEmoji: '✨',
    chain: 'arbitrum',
    token: 'USDC',
    apy: 18.9,
    tvl: 310000000,
    risk: 'high',
    category: 'Lending',
    description: 'Cross-chain money market. Borrow and lend across chains. High yields from platform fee distribution.',
    minStake: 50,
    rewards: ['RDNT', 'USDC'],
    audited: false,
    trending: false,
  },
  {
    id: 'benqi',
    name: 'BENQI',
    logoEmoji: '🧊',
    chain: 'avalanche',
    token: 'sAVAX',
    apy: 7.1,
    tvl: 560000000,
    risk: 'low',
    category: 'Liquid Staking',
    description: 'Stake AVAX and receive sAVAX, a liquid staking token that accrues AVAX staking rewards.',
    minStake: 0.1,
    rewards: ['sAVAX', 'QI'],
    audited: true,
    trending: false,
  },
  {
    id: 'synthetix',
    name: 'Synthetix',
    logoEmoji: '🔵',
    chain: 'optimism',
    token: 'SNX',
    apy: 27.3,
    tvl: 320000000,
    risk: 'high',
    category: 'Derivatives',
    description: 'Stake SNX to collateralize synthetic assets. Earn fees from Kwenta and other Synthetix integrators.',
    minStake: 100,
    rewards: ['SNX', 'sUSD'],
    audited: true,
    trending: false,
  },
  {
    id: 'jito',
    name: 'Jito',
    logoEmoji: '🎯',
    chain: 'solana',
    token: 'jitoSOL',
    apy: 8.4,
    tvl: 2100000000,
    risk: 'low',
    category: 'Liquid Staking',
    description: 'Liquid stake SOL with Jito and earn MEV-boosted rewards on top of standard Solana staking yield.',
    minStake: 0.01,
    rewards: ['jitoSOL', 'JTO'],
    audited: true,
    trending: true,
  },
  {
    id: 'aerodrome',
    name: 'Aerodrome',
    logoEmoji: '✈️',
    chain: 'base',
    token: 'USDC/ETH LP',
    apy: 38.7,
    tvl: 890000000,
    risk: 'medium',
    category: 'DEX',
    description: 'The central trading and liquidity hub on Base. Earn AERO emissions and trading fees as an LP.',
    minStake: 10,
    rewards: ['AERO'],
    audited: true,
    trending: true,
  },
];

export const positions: Position[] = [
  {
    id: 'pos-1',
    protocolId: 'lido',
    protocol: 'Lido',
    logoEmoji: '🔷',
    chain: 'ethereum',
    token: 'stETH',
    staked: 2.45,
    stakedUsd: 8312.50,
    rewards: 0.0421,
    rewardsUsd: 142.77,
    apy: 4.2,
    entryDate: '2024-11-12',
  },
  {
    id: 'pos-2',
    protocolId: 'gmx',
    protocol: 'GMX',
    logoEmoji: '🌀',
    chain: 'arbitrum',
    token: 'GLP',
    staked: 1250,
    stakedUsd: 1250.00,
    rewards: 18.74,
    rewardsUsd: 18.74,
    apy: 22.6,
    entryDate: '2024-12-03',
  },
  {
    id: 'pos-3',
    protocolId: 'aave-v3',
    protocol: 'Aave V3',
    logoEmoji: '👻',
    chain: 'ethereum',
    token: 'USDC',
    staked: 5000,
    stakedUsd: 5000.00,
    rewards: 142.30,
    rewardsUsd: 142.30,
    apy: 8.7,
    entryDate: '2024-10-28',
  },
  {
    id: 'pos-4',
    protocolId: 'pendle',
    protocol: 'Pendle',
    logoEmoji: '⏳',
    chain: 'arbitrum',
    token: 'weETH',
    staked: 0.85,
    stakedUsd: 2882.35,
    rewards: 0.0234,
    rewardsUsd: 79.38,
    apy: 31.4,
    entryDate: '2025-01-08',
  },
];

export const portfolioStats = {
  totalValueUsd: 17444.85,
  totalRewardsUsd: 383.19,
  dailyYieldUsd: 7.23,
  weeklyYieldUsd: 50.61,
  avgApy: 16.7,
  change24h: 2.34,
};

export const chainNames: Record<Chain, string> = {
  ethereum: 'Ethereum',
  bnb: 'BNB Chain',
  polygon: 'Polygon',
  avalanche: 'Avalanche',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  solana: 'Solana',
  base: 'Base',
};
