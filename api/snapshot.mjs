/**
 * Daily pool snapshot pipeline — called by Vercel Cron at 00:00 UTC.
 *
 * Fetches the top 500 pools from DeFiLlama, calculates a Dexaris Score for each,
 * and writes the records to the pool_snapshots table in Supabase. This accumulated
 * history is what makes the Dexaris Score backtestable and verifiable over time.
 *
 * The scoring logic is inlined here (not imported from src/) because Vercel
 * serverless functions run outside the Vite build and cannot resolve src/ paths.
 * Keep this in sync with src/utils/dexarisScore.ts whenever the algorithm changes.
 */

import { createClient } from '@supabase/supabase-js';

const LLAMA_URL = 'https://yields.llama.fi/pools';
const SNAPSHOT_LIMIT = 500;

// ── Dexaris Score — inlined from src/utils/dexarisScore.ts ───────────────────

function calculateDexarisScore(pool) {
  const tvl = pool.tvlUsd;
  const apy = pool.apy ?? 0;

  // APY Consistency (30%)
  const mean = pool.apyMean30d;
  let consistencySubScore;
  if (mean != null && mean > 0 && apy > 0) {
    const diff = Math.abs(apy - mean) / mean;
    if (diff <= 0.05)      consistencySubScore = 10;
    else if (diff <= 0.15) consistencySubScore = 8;
    else if (diff <= 0.30) consistencySubScore = 6;
    else if (diff <= 0.50) consistencySubScore = 4;
    else                    consistencySubScore = 2;
  } else {
    consistencySubScore = 5;
  }

  // APY Level (20%)
  let apyLevelSubScore;
  if (apy <= 0)        apyLevelSubScore = 0;
  else if (apy < 2)    apyLevelSubScore = 2;
  else if (apy < 5)    apyLevelSubScore = 5;
  else if (apy < 15)   apyLevelSubScore = 8;
  else if (apy <= 50)  apyLevelSubScore = 10;
  else if (apy <= 100) apyLevelSubScore = 7;
  else                  apyLevelSubScore = 4;

  // TVL Size (20%) — log-scaled
  const logTvl = Math.log10(Math.max(tvl, 1));
  const tvlSizeSubScore = Math.min(10, Math.max(0, (logTvl - 6) * 2.5));

  // Organic Yield Ratio (20%)
  let organicRatioSubScore;
  const base = pool.apyBase;
  if (apy > 0 && base != null) {
    const ratio = base / apy;
    if (ratio >= 0.9)      organicRatioSubScore = 10;
    else if (ratio >= 0.7) organicRatioSubScore = 8;
    else if (ratio >= 0.5) organicRatioSubScore = 6;
    else if (ratio >= 0.3) organicRatioSubScore = 4;
    else if (ratio >= 0.1) organicRatioSubScore = 2;
    else                    organicRatioSubScore = 0;
  } else {
    organicRatioSubScore = 0;
  }

  // Pool Age Proxy (10%) — ilRisk + outlier flag
  let ageProxySubScore;
  if (pool.ilRisk != null) {
    const ilMap = { no: 10, low: 8, medium: 5, high: 3, 'very high': 1 };
    ageProxySubScore = ilMap[pool.ilRisk] ?? 5;
    if (pool.outlier) ageProxySubScore = Math.max(0, ageProxySubScore - 3);
  } else if (pool.outlier != null) {
    ageProxySubScore = pool.outlier ? 2 : 7;
  } else {
    ageProxySubScore = 5;
  }

  return Math.round(Math.min(100, Math.max(0,
    consistencySubScore  * 3 +
    apyLevelSubScore     * 2 +
    tvlSizeSubScore      * 2 +
    organicRatioSubScore * 2 +
    ageProxySubScore     * 1,
  )));
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  try {
    // Validate env vars before doing anything — missing keys cause a module-level
    // crash if createClient is called at top level, hiding the real error.
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(`Missing env vars: SUPABASE_URL=${!!supabaseUrl} SUPABASE_SERVICE_ROLE_KEY=${!!supabaseKey}`);
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch pool data from DeFiLlama
    const llamaRes = await fetch(LLAMA_URL);
    if (!llamaRes.ok) {
      throw new Error(`DeFiLlama fetch failed: HTTP ${llamaRes.status}`);
    }
    const { data: allPools } = await llamaRes.json();

    // Apply same filters as the main app, then take top 500 by TVL
    const pools = allPools
      .filter(p =>
        p.tvlUsd >= 1_000_000 &&
        p.apy != null &&
        Number.isFinite(p.apy) &&
        p.apy >= 0.005 &&
        p.apy <= 200,
      )
      .sort((a, b) => b.tvlUsd - a.tvlUsd)
      .slice(0, SNAPSHOT_LIMIT);

    const timestamp = new Date().toISOString();

    const records = pools.map(p => ({
      pool_id:       p.pool,
      protocol:      p.project ?? null,
      chain:         p.chain ?? null,
      apy:           p.apy ?? null,
      apy_mean_30d:  p.apyMean30d ?? null,
      apy_base:      p.apyBase ?? null,
      tvl_usd:       p.tvlUsd ?? null,
      dexaris_score: calculateDexarisScore(p),
      timestamp,
    }));

    const { error } = await supabase
      .from('pool_snapshots')
      .insert(records);

    if (error) throw new Error(`Supabase insert failed: ${error.message}`);

    res.status(200).json({ written: records.length, timestamp });
  } catch (err) {
    console.error('[snapshot]', err);
    res.status(500).json({ error: err.message });
  }
}
