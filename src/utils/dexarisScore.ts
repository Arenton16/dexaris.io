import type { Pool } from '../types';

export function calculateDexarisScore(pool: Pool): number {
  const tvl = pool.tvlUsd;
  const apy = pool.apy ?? 0;

  // TVL Size (20%)
  let tvlScore: number;
  if (tvl < 1_000_000)        tvlScore = 0;
  else if (tvl < 10_000_000)  tvlScore = 5;
  else if (tvl < 50_000_000)  tvlScore = 10;
  else if (tvl < 500_000_000) tvlScore = 15;
  else                         tvlScore = 20;

  // APY Level (20%)
  let apyScore: number;
  if (apy <= 0)       apyScore = 0;
  else if (apy < 2)   apyScore = 5;
  else if (apy < 5)   apyScore = 10;
  else if (apy < 15)  apyScore = 15;
  else if (apy <= 50) apyScore = 12;
  else                 apyScore = 6;

  // APY Consistency (25%) — current vs 30d mean
  let consistencyScore: number;
  const mean = pool.apyMean30d;
  if (mean != null && mean > 0 && apy > 0) {
    const diff = Math.abs(apy - mean) / mean;
    if (diff <= 0.10)      consistencyScore = 25;
    else if (diff <= 0.25) consistencyScore = 18;
    else if (diff <= 0.50) consistencyScore = 10;
    else                    consistencyScore = 4;
  } else {
    consistencyScore = 10;
  }

  // TVL Trend (20%) — apyBase/apy ratio as organic yield proxy
  let trendScore: number;
  const base = pool.apyBase;
  if (base != null && apy > 0) {
    const ratio = base / apy;
    if (ratio >= 0.7)      trendScore = 20;
    else if (ratio >= 0.4) trendScore = 12;
    else                    trendScore = 6;
  } else {
    trendScore = 10;
  }

  // Pool Maturity / Trust (15%) — TVL as trust proxy
  let maturityScore: number;
  if (tvl >= 1_000_000_000)    maturityScore = 15;
  else if (tvl >= 100_000_000) maturityScore = 12;
  else if (tvl >= 10_000_000)  maturityScore = 8;
  else if (tvl >= 1_000_000)   maturityScore = 4;
  else                          maturityScore = 1;

  return Math.round(Math.min(100, Math.max(0,
    tvlScore + apyScore + consistencyScore + trendScore + maturityScore
  )));
}

export function getDexarisScoreTier(score: number): string {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Solid';
  if (score >= 40) return 'Moderate';
  return 'Weak';
}

export function getDexarisScoreColour(score: number): string {
  if (score >= 80) return '#4ECDA4';
  if (score >= 60) return '#8B73FF';
  if (score >= 40) return '#FFB347';
  return '#FF6B6B';
}
