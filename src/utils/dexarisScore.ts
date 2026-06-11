import type { Pool } from '../types';

interface SubScores {
  consistencySubScore: number;
  apyLevelSubScore: number;
  tvlSizeSubScore: number;
  organicRatioSubScore: number;
  ageProxySubScore: number;
}

function computeSubScores(pool: Pool): SubScores {
  const tvl = pool.tvlUsd;
  const apy = pool.apy ?? 0;

  // APY Consistency (30%) — rewards stable yields; penalises pools whose current APY
  // has drifted far from their 30-day mean, which often signals incentive manipulation.
  const mean = pool.apyMean30d;
  let consistencySubScore: number;
  if (mean != null && mean > 0 && apy > 0) {
    const diff = Math.abs(apy - mean) / mean;
    if (diff <= 0.05)      consistencySubScore = 10;
    else if (diff <= 0.15) consistencySubScore = 8;
    else if (diff <= 0.30) consistencySubScore = 6;
    else if (diff <= 0.50) consistencySubScore = 4;
    else                    consistencySubScore = 2;
  } else {
    consistencySubScore = 5; // neutral when 30d mean unavailable
  }

  // APY Level (20%) — favours realistic yields in the 5–50% range with diminishing
  // returns above ~50% APY, since unsustainably high yields are a risk signal.
  let apyLevelSubScore: number;
  if (apy <= 0)        apyLevelSubScore = 0;
  else if (apy < 2)    apyLevelSubScore = 2;
  else if (apy < 5)    apyLevelSubScore = 5;
  else if (apy < 15)   apyLevelSubScore = 8;
  else if (apy <= 50)  apyLevelSubScore = 10;
  else if (apy <= 100) apyLevelSubScore = 7;
  else                  apyLevelSubScore = 4; // >100% APY is likely incentive-driven

  // TVL Size (20%) — log-scaled so each order of magnitude contributes equally;
  // avoids the large-pool over-reward of a linear threshold approach.
  // Maps log10($1M)=6 → 0 through log10($10B)=10 → 10.
  const logTvl = Math.log10(Math.max(tvl, 1));
  const tvlSizeSubScore = Math.min(10, Math.max(0, (logTvl - 6) * 2.5));

  // Organic Yield Ratio (20%) — apyBase/apy measures what fraction of yield comes from
  // real protocol fees vs. token incentives. Higher ratio = more sustainable yield.
  // Scored 0 if apy is zero or apyBase is missing, to avoid division-by-zero inflation.
  let organicRatioSubScore: number;
  const base = pool.apyBase;
  if (apy > 0 && base != null) {
    const ratio = base / apy;
    if (ratio >= 0.9)      organicRatioSubScore = 10;
    else if (ratio >= 0.7) organicRatioSubScore = 8;
    else if (ratio >= 0.5) organicRatioSubScore = 6;
    else if (ratio >= 0.3) organicRatioSubScore = 4;
    else if (ratio >= 0.1) organicRatioSubScore = 2;
    else                    organicRatioSubScore = 0; // almost entirely incentive yield
  } else {
    organicRatioSubScore = 0;
  }

  // Pool Age Proxy (10%) — uses DeFiLlama's ilRisk category and outlier flag as trust
  // signals. Neutral 5 when neither is present to avoid penalising pools with no data.
  const p = pool as unknown as { ilRisk?: string; outlier?: boolean };
  let ageProxySubScore: number;
  if (p.ilRisk != null) {
    const ilMap: Record<string, number> = {
      no: 10, low: 8, medium: 5, high: 3, 'very high': 1,
    };
    ageProxySubScore = ilMap[p.ilRisk] ?? 5;
    if (p.outlier) ageProxySubScore = Math.max(0, ageProxySubScore - 3);
  } else if (p.outlier != null) {
    ageProxySubScore = p.outlier ? 2 : 7;
  } else {
    ageProxySubScore = 5; // neutral when no trust signals available
  }

  return { consistencySubScore, apyLevelSubScore, tvlSizeSubScore, organicRatioSubScore, ageProxySubScore };
}

function totalFromSubScores(s: SubScores): number {
  return Math.round(Math.min(100, Math.max(0,
    s.consistencySubScore  * 3 +   // 30%
    s.apyLevelSubScore     * 2 +   // 20%
    s.tvlSizeSubScore      * 2 +   // 20%
    s.organicRatioSubScore * 2 +   // 20%
    s.ageProxySubScore     * 1     // 10%
  )));
}

export function calculateDexarisScore(pool: Pool): number {
  return totalFromSubScores(computeSubScores(pool));
}

export interface ScoreBreakdownResult {
  total: number;
  components: Array<{ label: string; weight: number; score: number }>;
}

export function calculateDexarisScoreBreakdown(pool: Pool): ScoreBreakdownResult {
  const s = computeSubScores(pool);
  return {
    total: totalFromSubScores(s),
    components: [
      { label: 'Consistency',   weight: 30, score: s.consistencySubScore },
      { label: 'APY Level',     weight: 20, score: s.apyLevelSubScore },
      { label: 'TVL Depth',     weight: 20, score: parseFloat(s.tvlSizeSubScore.toFixed(1)) },
      { label: 'Organic Yield', weight: 20, score: s.organicRatioSubScore },
      { label: 'Maturity',      weight: 10, score: s.ageProxySubScore },
    ],
  };
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
