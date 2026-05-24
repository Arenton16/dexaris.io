import { useMemo, useState, type FormEvent } from 'react';
import { usePools } from '../contexts/PoolsContext';
import DexarisLogo from './DexarisLogo';
import type { Pool } from '../types';
import {
  calculateDexarisScore,
  getDexarisScoreColour,
  getDexarisScoreTier,
} from '../utils/dexarisScore';

// ── Types ─────────────────────────────────────────────────────────────────

interface PoolEntry {
  pool: Pool;
  score: number;
  tier: string;
  colour: string;
}

interface ChainStat {
  chain: string;
  avg: number;
}

interface NewsletterStats {
  poolCount: number;
  topByApy: PoolEntry[];
  topByScore: PoolEntry[];
  avgApy: number;
  avgScore: number;
  totalTvl: number;
  bestChain: ChainStat;
  poolOfWeek: PoolEntry;
  biggestOpp: PoolEntry | null;
}

interface XPost {
  slot: 'Morning' | 'Afternoon' | 'Evening';
  time: string;
  type: string;
  text: string;
  chars: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SESSION_KEY = 'nlgen_unlocked';
const CORRECT     = 'DEXARIS2026';

const X_SYSTEM_PROMPT = `You are a content strategist for Dexaris (@DexarisHQ), a DeFi yield intelligence platform. Brand voice: analytical, sharp, no hype, no financial advice. Think Bloomberg for DeFi.

Generate three X posts from the live yield data provided:

POST 1 — The Stat (8–9am): One surprising number from the data. Short setup, the number, one-line implication. Under 240 characters.
POST 2 — The Insight (12–2pm): A pattern across multiple pools requiring the platform to spot. 2–3 sentences. Under 260 characters.
POST 3 — The Find (6–8pm): One specific pool — name it, give the stats, explain the Dexaris Score verdict in plain English. Under 280 characters.

Rules: never say "DYOR", end at least one post with "→ dexaris.io", no hashtag spam, no emojis.

Return valid JSON only, no markdown, no backticks:
{"posts":[{"slot":"Morning","time":"8–9am","type":"The Stat","text":"...","chars":0},{"slot":"Afternoon","time":"12–2pm","type":"The Insight","text":"...","chars":0},{"slot":"Evening","time":"6–8pm","type":"The Find","text":"...","chars":0}]}

Set chars to the actual character count of each text field.`;

const SLOT_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  Morning:   { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  color: '#F59E0B' },
  Afternoon: { bg: 'rgba(96,165,250,0.12)',   border: 'rgba(96,165,250,0.3)',  color: '#60A5FA' },
  Evening:   { bg: 'rgba(52,211,153,0.12)',   border: 'rgba(52,211,153,0.3)',  color: '#34D399' },
};

// ── Pure helpers ──────────────────────────────────────────────────────────

function getWeekStart(): string {
  const today = new Date();
  const day = today.getDay();
  const daysToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMonday);
  return monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function fmtTvl(val: number): string {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  return `$${(val / 1e3).toFixed(0)}K`;
}

function fmtApy(apy: number | null): string {
  return `${(apy ?? 0).toFixed(2)}%`;
}

function toEntry(pool: Pool, scoreMap: Map<string, number>): PoolEntry {
  const score = scoreMap.get(pool.pool) ?? calculateDexarisScore(pool);
  return { pool, score, tier: getDexarisScoreTier(score), colour: getDexarisScoreColour(score) };
}

function generatePotWReason(pool: Pool, score: number): string {
  const apy = pool.apy ?? 0;
  const tier = getDexarisScoreTier(score);
  const highlights: string[] = [];

  const mean = pool.apyMean30d;
  if (mean != null && mean > 0 && apy > 0) {
    const diff = Math.abs(apy - mean) / mean;
    if (diff <= 0.10) highlights.push('highly consistent 30-day APY');
    else if (diff <= 0.25) highlights.push('stable yield history');
  }

  if (pool.tvlUsd >= 500_000_000) highlights.push('exceptional TVL depth ($500M+)');
  else if (pool.tvlUsd >= 100_000_000) highlights.push('deep TVL backing ($100M+)');
  else if (pool.tvlUsd >= 10_000_000) highlights.push('solid TVL size');

  if (pool.apyBase != null && apy > 0 && pool.apyBase / apy >= 0.7) {
    highlights.push('strong organic yield ratio');
  }

  const tierDesc = `${tier.toLowerCase()} Dexaris Score of ${score}`;

  if (highlights.length === 0) {
    return `A ${tierDesc} combined with ${fmtApy(pool.apy)} APY makes this the best balance of quality and return this week.`;
  }

  const last = highlights.pop()!;
  const body = highlights.length > 0 ? `${highlights.join(', ')}, ${last}` : last;
  return `${body.charAt(0).toUpperCase()}${body.slice(1)} and a ${tierDesc} make this one of the most trustworthy opportunities tracked this week.`;
}

function generateOppNote(pool: Pool, score: number): string {
  const tier = getDexarisScoreTier(score);
  const tvlNote = pool.tvlUsd >= 50_000_000 ? 'backed by substantial TVL' : 'an emerging yield opportunity';
  return `${fmtApy(pool.apy)} APY with a ${tier} Dexaris Score of ${score} — ${tvlNote}. Only pools scoring above 50 qualify.`;
}

function buildNewsletterText(stats: NewsletterStats, weekStart: string, subjectLine: string): string {
  const { topByApy, topByScore, avgApy, avgScore, totalTvl, bestChain, poolOfWeek, biggestOpp, poolCount } = stats;
  const potWScore = poolOfWeek.score;

  const lines: string[] = [
    `Subject: ${subjectLine}`,
    '',
    '─────────────────────────────',
    '🟣 DEXARIS WEEKLY YIELD REPORT',
    `Week of ${weekStart}`,
    '─────────────────────────────',
    '',
    'THIS WEEK IN DEFI',
    `Average APY across ${poolCount.toLocaleString()} pools: ${avgApy.toFixed(2)}%`,
    `Average Dexaris Score: ${avgScore} (${getDexarisScoreTier(avgScore)})`,
    `Total TVL tracked: ${fmtTvl(totalTvl)}`,
    `Best performing chain: ${bestChain.chain} (${bestChain.avg.toFixed(2)}% avg APY)`,
    '',
    '─────────────────────────────',
    'POOL OF THE WEEK',
    `${poolOfWeek.pool.project} — ${poolOfWeek.pool.symbol} on ${poolOfWeek.pool.chain}`,
    `APY: ${fmtApy(poolOfWeek.pool.apy)} | TVL: ${fmtTvl(poolOfWeek.pool.tvlUsd)} | Dexaris Score: ${potWScore} ${getDexarisScoreTier(potWScore)}`,
    `Why it stands out: ${generatePotWReason(poolOfWeek.pool, potWScore)}`,
    '',
    '─────────────────────────────',
    'TOP 5 BY APY THIS WEEK',
    ...topByApy.map((e, i) =>
      `${i + 1}. ${e.pool.project} (${e.pool.symbol}, ${e.pool.chain}) — ${fmtApy(e.pool.apy)} | Score: ${e.score}`
    ),
    '',
    '─────────────────────────────',
    'TOP 5 BY DEXARIS SCORE',
    ...topByScore.map((e, i) =>
      `${i + 1}. ${e.pool.project} (${e.pool.symbol}, ${e.pool.chain}) — Score: ${e.score} ${e.tier} | APY: ${fmtApy(e.pool.apy)}`
    ),
  ];

  if (biggestOpp) {
    lines.push(
      '',
      '─────────────────────────────',
      'BEST OPPORTUNITY THIS WEEK',
      `${biggestOpp.pool.project} — ${biggestOpp.pool.symbol} on ${biggestOpp.pool.chain}`,
      `APY: ${fmtApy(biggestOpp.pool.apy)} | TVL: ${fmtTvl(biggestOpp.pool.tvlUsd)} | Dexaris Score: ${biggestOpp.score}`,
      generateOppNote(biggestOpp.pool, biggestOpp.score),
    );
  }

  lines.push(
    '',
    '─────────────────────────────',
    'Track all of this live at dexaris.io — free, no signup required.',
  );

  return lines.join('\n');
}

// ── Password gate ─────────────────────────────────────────────────────────

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState('');
  const [error, setError]  = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (value === CORRECT) {
      sessionStorage.setItem(SESSION_KEY, '1');
      onUnlock();
    } else {
      setError(true);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0C0B1A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        background: '#111028',
        border: '1px solid rgba(107,79,255,0.3)',
        borderRadius: '16px',
        padding: '40px 36px',
        width: '100%',
        maxWidth: '360px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
      }}>
        <DexarisLogo iconSize={28} fontSize={17} />

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '16px', fontWeight: 500, color: '#E8E6FF', margin: '0 0 6px' }}>
            Internal Tool
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(232,230,255,0.4)', margin: 0, lineHeight: 1.5 }}>
            This page is restricted to Dexaris team members
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }} noValidate>
          <input
            type="password"
            placeholder="Enter password"
            value={value}
            autoFocus
            onChange={e => { setValue(e.target.value); setError(false); }}
            style={{
              width: '100%',
              background: 'rgba(107,79,255,0.08)',
              border: `0.5px solid ${error ? '#FF6B6B' : 'rgba(107,79,255,0.25)'}`,
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '14px',
              color: '#E8E6FF',
              outline: 'none',
              fontFamily: "'Inter', sans-serif",
              boxSizing: 'border-box',
            }}
          />
          {error && (
            <span style={{ fontSize: '12px', color: '#FF6B6B' }}>Incorrect password</span>
          )}
          <button
            type="submit"
            style={{
              background: '#6B4FFF',
              border: 'none',
              borderRadius: '10px',
              padding: '10px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#fff',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              marginTop: '2px',
            }}
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}

// ── X Content tab ─────────────────────────────────────────────────────────

function XContentTab() {
  const [posts, setPosts]         = useState<XPost[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError('');
    setPosts([]);

    try {
      // 1. Fetch live pool data directly from DeFiLlama
      const poolRes = await fetch('https://yields.llama.fi/pools');
      if (!poolRes.ok) throw new Error(`DeFiLlama fetch failed: ${poolRes.status}`);
      const poolJson = await poolRes.json();

      // 2. Filter: TVL > $1M, APY > 0 — take top 30 by TVL
      const filtered = (poolJson.data as Pool[])
        .filter(p => p.tvlUsd > 1_000_000 && (p.apy ?? 0) > 0)
        .sort((a, b) => b.tvlUsd - a.tvlUsd)
        .slice(0, 30);

      // 3. Enrich with Dexaris scores
      const enriched = filtered.map(p => ({
        project:   p.project ?? '—',
        symbol:    p.symbol  ?? '—',
        chain:     p.chain   ?? '—',
        apy:       (p.apy ?? 0).toFixed(2),
        tvlM:      (p.tvlUsd / 1e6).toFixed(1),
        score:     calculateDexarisScore(p),
        scoreTier: getDexarisScoreTier(calculateDexarisScore(p)),
      }));

      const poolSummary = enriched.map((p, i) =>
        `${i + 1}. ${p.project} | ${p.symbol} | ${p.chain} | APY: ${p.apy}% | TVL: $${p.tvlM}M | DexarisScore: ${p.score} (${p.scoreTier})`
      ).join('\n');

      // 4. Call Anthropic via serverless proxy
      const aiRes = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: X_SYSTEM_PROMPT,
          userMessage: `Here is today's live DeFi yield data — top 30 pools by TVL (TVL > $1M, APY > 0):\n\n${poolSummary}\n\nGenerate the three X posts.`,
        }),
      });

      if (!aiRes.ok) {
        const body = await aiRes.json().catch(() => ({}));
        throw new Error(`Generation failed: ${(body as { error?: string }).error ?? aiRes.status}`);
      }

      const aiData = await aiRes.json();
      const rawText: string = (aiData as { result: string }).result ?? '';

      // Extract JSON robustly — strip any surrounding markdown/prose
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse JSON from AI response');
      const parsed: { posts: XPost[] } = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed.posts) || parsed.posts.length === 0) {
        throw new Error('AI returned an unexpected response shape');
      }

      // Recompute chars from actual text
      setPosts(parsed.posts.map(p => ({ ...p, chars: p.text.length })));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed — please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function copyPost(idx: number) {
    try {
      await navigator.clipboard.writeText(posts[idx].text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch { /* clipboard unavailable */ }
  }

  async function copyAll() {
    try {
      const text = posts
        .map(p => `[${p.slot} — ${p.type}, ${p.time}]\n${p.text}`)
        .join('\n\n');
      await navigator.clipboard.writeText(text);
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }

  const S: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          ...S,
          alignSelf: 'flex-start',
          background: loading ? 'rgba(107,79,255,0.4)' : '#6B4FFF',
          border: 'none',
          borderRadius: '10px',
          padding: '12px 28px',
          fontSize: '14px',
          fontWeight: 600,
          color: '#fff',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        {loading ? (
          <>
            <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'nlgen-spin 0.7s linear infinite' }} />
            Fetching data &amp; generating…
          </>
        ) : (
          "Generate Today's Posts"
        )}
      </button>

      {/* Error */}
      {error && (
        <div style={{
          ...S,
          background: 'rgba(255,107,107,0.08)',
          border: '1px solid rgba(255,107,107,0.25)',
          borderRadius: '10px',
          padding: '12px 16px',
          fontSize: '13px',
          color: '#FF8A8A',
          lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      {/* Scheduling note */}
      {posts.length === 0 && !loading && !error && (
        <div style={{
          ...S,
          background: 'rgba(107,79,255,0.06)',
          border: '0.5px solid rgba(107,79,255,0.2)',
          borderRadius: '10px',
          padding: '14px 16px',
          fontSize: '13px',
          color: 'rgba(232,230,255,0.45)',
          lineHeight: 1.6,
        }}>
          Posts are generated from live DeFi yield data and scored with the Dexaris algorithm.
          Scheduling requires a third-party tool —{' '}
          <a href="https://typefully.com" target="_blank" rel="noopener noreferrer" style={{ color: '#8B73FF', textDecoration: 'none' }}>Typefully</a>
          {' '}or{' '}
          <a href="https://buffer.com" target="_blank" rel="noopener noreferrer" style={{ color: '#8B73FF', textDecoration: 'none' }}>Buffer</a>
          {' '}recommended.
        </div>
      )}

      {/* Generated posts */}
      {posts.length > 0 && (
        <>
          {/* Copy all */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <button
              onClick={copyAll}
              style={{
                ...S,
                background: 'rgba(107,79,255,0.15)',
                border: '1px solid rgba(107,79,255,0.3)',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 500,
                color: allCopied ? '#34D399' : '#8B73FF',
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
            >
              {allCopied ? '✓ All 3 copied!' : 'Copy all 3'}
            </button>
            <span style={{ ...S, fontSize: '12px', color: 'rgba(232,230,255,0.3)' }}>
              Click any post to edit before scheduling
            </span>
          </div>

          {/* Post cards */}
          {posts.map((post, idx) => {
            const slotStyle = SLOT_STYLE[post.slot] ?? SLOT_STYLE.Morning;
            const overLimit = post.chars > 280;
            return (
              <div key={post.slot} style={{
                background: '#111028',
                border: '1px solid rgba(107,79,255,0.18)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{
                    ...S,
                    background: slotStyle.bg,
                    border: `1px solid ${slotStyle.border}`,
                    borderRadius: '6px',
                    padding: '3px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: slotStyle.color,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase' as const,
                  }}>
                    {post.slot}
                  </span>
                  <span style={{ ...S, fontSize: '13px', fontWeight: 500, color: '#E8E6FF' }}>
                    {post.type}
                  </span>
                  <span style={{ ...S, fontSize: '12px', color: 'rgba(232,230,255,0.35)' }}>
                    {post.time}
                  </span>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      ...S,
                      fontSize: '12px',
                      fontWeight: 500,
                      color: overLimit ? '#FF6B6B' : 'rgba(232,230,255,0.35)',
                      transition: 'color 0.15s',
                    }}>
                      {post.chars} / 280
                    </span>
                    <button
                      onClick={() => copyPost(idx)}
                      style={{
                        ...S,
                        background: copiedIdx === idx ? 'rgba(52,211,153,0.12)' : 'rgba(107,79,255,0.1)',
                        border: `1px solid ${copiedIdx === idx ? 'rgba(52,211,153,0.3)' : 'rgba(107,79,255,0.25)'}`,
                        borderRadius: '6px',
                        padding: '4px 12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: copiedIdx === idx ? '#34D399' : '#8B73FF',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {copiedIdx === idx ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Post text */}
                <p style={{
                  ...S,
                  margin: 0,
                  fontSize: '14px',
                  lineHeight: 1.65,
                  color: '#E8E6FF',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {post.text}
                </p>
              </div>
            );
          })}

          {/* Scheduler CTA */}
          <div style={{
            ...S,
            background: 'rgba(107,79,255,0.06)',
            border: '0.5px solid rgba(107,79,255,0.2)',
            borderRadius: '10px',
            padding: '14px 16px',
            fontSize: '13px',
            color: 'rgba(232,230,255,0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
          }}>
            <span>Ready to schedule?</span>
            <a href="https://typefully.com" target="_blank" rel="noopener noreferrer"
              style={{ color: '#8B73FF', textDecoration: 'none', fontWeight: 500 }}>Typefully</a>
            <span>or</span>
            <a href="https://buffer.com" target="_blank" rel="noopener noreferrer"
              style={{ color: '#8B73FF', textDecoration: 'none', fontWeight: 500 }}>Buffer</a>
            <span>can schedule all three at the suggested times.</span>
          </div>
        </>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────

export default function NewsletterGenerator() {
  // All hooks unconditionally at the top
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [activeTab, setActiveTab] = useState<'newsletter' | 'xcontent'>('newsletter');
  const { allPools, isLoading } = usePools();
  const [bodyCopied, setBodyCopied] = useState(false);
  const [subCopied, setSubCopied]  = useState(false);

  const weekStart = useMemo(() => getWeekStart(), []);

  const scoreMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of allPools) map.set(p.pool, calculateDexarisScore(p));
    return map;
  }, [allPools]);

  const stats = useMemo<NewsletterStats | null>(() => {
    if (allPools.length === 0) return null;

    const topByApy = [...allPools]
      .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))
      .slice(0, 5)
      .map(p => toEntry(p, scoreMap));

    const topByScore = [...allPools]
      .sort((a, b) => (scoreMap.get(b.pool) ?? 0) - (scoreMap.get(a.pool) ?? 0))
      .slice(0, 5)
      .map(p => toEntry(p, scoreMap));

    const avgApy = allPools.reduce((s, p) => s + (p.apy ?? 0), 0) / allPools.length;

    const scoreVals = [...scoreMap.values()];
    const avgScore = scoreVals.length > 0
      ? Math.round(scoreVals.reduce((s, n) => s + n, 0) / scoreVals.length)
      : 0;

    const totalTvl = allPools.reduce((s, p) => s + p.tvlUsd, 0);

    const chainMap: Record<string, { sum: number; count: number }> = {};
    for (const p of allPools) {
      if (!chainMap[p.chain]) chainMap[p.chain] = { sum: 0, count: 0 };
      chainMap[p.chain].sum += (p.apy ?? 0);
      chainMap[p.chain].count++;
    }
    const bestChain = Object.entries(chainMap)
      .map(([chain, { sum, count }]) => ({ chain, avg: sum / count }))
      .sort((a, b) => b.avg - a.avg)[0] ?? { chain: '—', avg: 0 };

    const potWPool = [...allPools].sort((a, b) => {
      const sa = (scoreMap.get(a.pool) ?? 0) + Math.min(a.apy ?? 0, 30);
      const sb = (scoreMap.get(b.pool) ?? 0) + Math.min(b.apy ?? 0, 30);
      return sb - sa;
    })[0];
    if (!potWPool) return null;

    const oppPool = [...allPools]
      .filter(p => (scoreMap.get(p.pool) ?? 0) > 50)
      .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))[0] ?? null;

    return {
      poolCount: allPools.length,
      topByApy,
      topByScore,
      avgApy,
      avgScore,
      totalTvl,
      bestChain,
      poolOfWeek: toEntry(potWPool, scoreMap),
      biggestOpp: oppPool ? toEntry(oppPool, scoreMap) : null,
    };
  }, [allPools, scoreMap]);

  const subjectLine = stats
    ? `DeFi Yield Report — w/c ${weekStart} | Pool of the Week: ${stats.poolOfWeek.pool.project} ${stats.poolOfWeek.pool.symbol} (Score: ${stats.poolOfWeek.score})`
    : '';

  const newsletterText = stats ? buildNewsletterText(stats, weekStart, subjectLine) : '';

  // Conditional returns after all hooks
  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;

  async function copyBody() {
    try {
      await navigator.clipboard.writeText(newsletterText);
      setBodyCopied(true);
      setTimeout(() => setBodyCopied(false), 2000);
    } catch { /* silent */ }
  }

  async function copySub() {
    try {
      await navigator.clipboard.writeText(subjectLine);
      setSubCopied(true);
      setTimeout(() => setSubCopied(false), 2000);
    } catch { /* silent */ }
  }

  // Tab button style helper
  function tabStyle(tab: 'newsletter' | 'xcontent'): React.CSSProperties {
    const active = activeTab === tab;
    return {
      fontFamily: "'Inter', sans-serif",
      background: active ? 'rgba(107,79,255,0.15)' : 'transparent',
      border: active ? '1px solid rgba(107,79,255,0.35)' : '1px solid transparent',
      borderRadius: '8px',
      padding: '8px 20px',
      fontSize: '13px',
      fontWeight: active ? 600 : 400,
      color: active ? '#8B73FF' : 'rgba(232,230,255,0.45)',
      cursor: 'pointer',
      transition: 'all 0.15s',
    };
  }

  return (
    <div className="nlgen-page">
      {/* ── Header ── */}
      <div className="nlgen-header">
        <h1 className="nlgen-title">Newsletter Generator</h1>
        <p className="nlgen-subtitle">Internal tool — generate your weekly Beehiiv draft in one click.</p>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex',
        gap: '6px',
        padding: '4px',
        background: 'rgba(107,79,255,0.05)',
        border: '1px solid rgba(107,79,255,0.12)',
        borderRadius: '10px',
        width: 'fit-content',
        marginBottom: '4px',
      }}>
        <button style={tabStyle('newsletter')} onClick={() => setActiveTab('newsletter')}>
          Newsletter
        </button>
        <button style={tabStyle('xcontent')} onClick={() => setActiveTab('xcontent')}>
          X Content
        </button>
      </div>

      {/* ── Newsletter tab ── */}
      {activeTab === 'newsletter' && (
        <>
          {(isLoading || !stats) ? (
            <div className="nlgen-loading">
              {isLoading ? 'Loading yield data…' : 'No pool data available yet.'}
            </div>
          ) : (
            <>
              {/* Subject line card */}
              <div className="nlgen-card">
                <div className="nlgen-card-header">
                  <span className="nlgen-card-label">Subject Line</span>
                  <button className="nlgen-copy-btn" onClick={copySub}>
                    {subCopied ? '✓ Copied!' : 'Copy subject'}
                  </button>
                </div>
                <p className="nlgen-subject-text">{subjectLine}</p>
              </div>

              {/* Newsletter body card */}
              <div className="nlgen-card">
                <div className="nlgen-card-header">
                  <span className="nlgen-card-label">Newsletter Body</span>
                  <button className="nlgen-copy-btn nlgen-copy-btn--primary" onClick={copyBody}>
                    {bodyCopied ? '✓ Copied!' : 'Copy to clipboard'}
                  </button>
                </div>

                <div className="nlgen-preview">

                  {/* Masthead */}
                  <div className="nlgen-masthead">
                    <span className="nlgen-masthead-emoji">🟣</span>
                    <div>
                      <div className="nlgen-masthead-title">DEXARIS WEEKLY YIELD REPORT</div>
                      <div className="nlgen-masthead-week">Week of {weekStart}</div>
                    </div>
                  </div>

                  <div className="nlgen-divider" />

                  {/* This Week in DeFi */}
                  <div className="nlgen-section">
                    <div className="nlgen-section-title">This Week in DeFi</div>
                    <div className="nlgen-stat-grid">
                      <div className="nlgen-stat">
                        <span className="nlgen-stat-label">Avg APY ({stats.poolCount.toLocaleString()} pools)</span>
                        <span className="nlgen-stat-value">{stats.avgApy.toFixed(2)}%</span>
                      </div>
                      <div className="nlgen-stat">
                        <span className="nlgen-stat-label">Avg Dexaris Score</span>
                        <span className="nlgen-stat-value" style={{ color: getDexarisScoreColour(stats.avgScore) }}>
                          {stats.avgScore}
                          <span className="nlgen-tier"> {getDexarisScoreTier(stats.avgScore)}</span>
                        </span>
                      </div>
                      <div className="nlgen-stat">
                        <span className="nlgen-stat-label">Total TVL Tracked</span>
                        <span className="nlgen-stat-value">{fmtTvl(stats.totalTvl)}</span>
                      </div>
                      <div className="nlgen-stat">
                        <span className="nlgen-stat-label">Best Performing Chain</span>
                        <span className="nlgen-stat-value">
                          {stats.bestChain.chain}
                          <span className="nlgen-dim"> ({stats.bestChain.avg.toFixed(2)}%)</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="nlgen-divider" />

                  {/* Pool of the Week */}
                  <div className="nlgen-section">
                    <div className="nlgen-section-title">Pool of the Week</div>
                    <div className="nlgen-potw">
                      <div className="nlgen-potw-name">
                        {stats.poolOfWeek.pool.project} — {stats.poolOfWeek.pool.symbol}
                        <span className="nlgen-dim"> on {stats.poolOfWeek.pool.chain}</span>
                      </div>
                      <div className="nlgen-potw-stats">
                        <span className="nlgen-apy">{fmtApy(stats.poolOfWeek.pool.apy)}</span>
                        <span className="nlgen-dim">TVL {fmtTvl(stats.poolOfWeek.pool.tvlUsd)}</span>
                        <span
                          className="nlgen-score-badge"
                          style={{ color: stats.poolOfWeek.colour, border: `1px solid ${stats.poolOfWeek.colour}40`, background: `${stats.poolOfWeek.colour}1a` }}
                        >
                          {stats.poolOfWeek.score} {stats.poolOfWeek.tier}
                        </span>
                      </div>
                      <div className="nlgen-reason">
                        <span className="nlgen-reason-label">Why it stands out: </span>
                        {generatePotWReason(stats.poolOfWeek.pool, stats.poolOfWeek.score)}
                      </div>
                    </div>
                  </div>

                  <div className="nlgen-divider" />

                  {/* Top 5 by APY */}
                  <div className="nlgen-section">
                    <div className="nlgen-section-title">Top 5 by APY This Week</div>
                    {stats.topByApy.map((e, i) => (
                      <div key={e.pool.pool} className="nlgen-pool-row">
                        <span className="nlgen-rank">{i + 1}</span>
                        <div className="nlgen-pool-info">
                          <span className="nlgen-pool-name">{e.pool.project}</span>
                          <span className="nlgen-pool-meta">{e.pool.symbol} · {e.pool.chain}</span>
                        </div>
                        <span className="nlgen-apy">{fmtApy(e.pool.apy)}</span>
                        <span
                          className="nlgen-score-badge"
                          style={{ color: e.colour, border: `1px solid ${e.colour}40`, background: `${e.colour}1a` }}
                        >
                          {e.score}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="nlgen-divider" />

                  {/* Top 5 by Score */}
                  <div className="nlgen-section">
                    <div className="nlgen-section-title">Top 5 by Dexaris Score</div>
                    {stats.topByScore.map((e, i) => (
                      <div key={e.pool.pool} className="nlgen-pool-row">
                        <span className="nlgen-rank">{i + 1}</span>
                        <div className="nlgen-pool-info">
                          <span className="nlgen-pool-name">{e.pool.project}</span>
                          <span className="nlgen-pool-meta">{e.pool.symbol} · {e.pool.chain}</span>
                        </div>
                        <span className="nlgen-apy">{fmtApy(e.pool.apy)}</span>
                        <span
                          className="nlgen-score-badge"
                          style={{ color: e.colour, border: `1px solid ${e.colour}40`, background: `${e.colour}1a` }}
                        >
                          {e.score} {e.tier}
                        </span>
                      </div>
                    ))}
                  </div>

                  {stats.biggestOpp && (
                    <>
                      <div className="nlgen-divider" />
                      <div className="nlgen-section">
                        <div className="nlgen-section-title">Best Opportunity This Week</div>
                        <div className="nlgen-potw">
                          <div className="nlgen-potw-name">
                            {stats.biggestOpp.pool.project} — {stats.biggestOpp.pool.symbol}
                            <span className="nlgen-dim"> on {stats.biggestOpp.pool.chain}</span>
                          </div>
                          <div className="nlgen-potw-stats">
                            <span className="nlgen-apy">{fmtApy(stats.biggestOpp.pool.apy)}</span>
                            <span className="nlgen-dim">TVL {fmtTvl(stats.biggestOpp.pool.tvlUsd)}</span>
                            <span
                              className="nlgen-score-badge"
                              style={{ color: stats.biggestOpp.colour, border: `1px solid ${stats.biggestOpp.colour}40`, background: `${stats.biggestOpp.colour}1a` }}
                            >
                              {stats.biggestOpp.score} {stats.biggestOpp.tier}
                            </span>
                          </div>
                          <div className="nlgen-reason">
                            {generateOppNote(stats.biggestOpp.pool, stats.biggestOpp.score)}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="nlgen-divider" />
                  <div className="nlgen-footer-line">
                    Track all of this live at <strong>dexaris.io</strong> — free, no signup required.
                  </div>

                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── X Content tab ── */}
      {activeTab === 'xcontent' && <XContentTab />}
    </div>
  );
}
