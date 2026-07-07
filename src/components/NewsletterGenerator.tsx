import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import html2canvas from 'html2canvas';
import { usePools } from '../contexts/PoolsContext';
import DexarisLogo from './DexarisLogo';
import type { Pool } from '../types';
import {
  calculateDexarisScore,
  calculateDexarisScoreBreakdown,
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

interface HistoricalPoint {
  timestamp: string;
  apy: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SESSION_KEY = 'nlgen_unlocked';
const CORRECT     = 'DEXARIS2026';

const X_VOICE_CONTRACT = `You are writing X posts for @DexarisHQ — a DeFi yield intelligence platform run by a sharp, opinionated founder who knows the data cold.

VOICE:
- Direct and confident. Never hedging, never vague.
- Human and occasionally dry — not robotic, not corporate
- Writes like someone who spotted something interesting and wants to share it, not like someone filing a report
- Short sentences. No filler. No fluff.
- Has opinions. "This pool looks interesting" is weak. "This is the best risk-adjusted yield on Base right now" is strong.
- Never uses: "interesting to note", "it's worth mentioning", "data shows", "according to", "this week we saw", "notably", "it should be noted"
- Never starts a sentence with "The data" or "According to"
- Never sounds like a press release or a bot

GOOD POST EXAMPLES (tone/energy reference — today's actual format and angle are assigned below, don't default to these shapes):
"Uniswap V3 WETH-USDC on Base. 8.4% APY. Dexaris Score: 84. Organic yield, stable 30d mean, $2.1B TVL. This is what boring and good looks like. → dexaris.io"

"Most people chasing 180% APY right now are chasing incentives that disappear in 30 days. The pools scoring above 80 on Dexaris average 11% — and they're still there next month."

"Solana is quietly dominating yield quality this week. 4 of the top 10 Dexaris Score pools are SOL-based. ETH maxis look away. → dexaris.io"

BAD POST EXAMPLES (never write like this):
"According to our data, this week we saw interesting yield opportunities across multiple chains. It's worth noting that several pools showed strong performance metrics."

"Data shows that DeFi yields are currently presenting some noteworthy opportunities for investors looking to optimize their returns."

GLOBAL RULES:
- No hashtags unless genuinely necessary (avoid #DeFi #crypto spam)
- No emojis
- No financial advice framing — describe patterns and risks, never tell someone to buy or sell
- The opening line of every post must be strong enough to make someone stop scrolling — if it wouldn't make you pause, rewrite it`;

// ── Content type taxonomy & tone palette ────────────────────────────────────
// The account was over-indexed on "data drop" style stat/ranking posts, all
// in the same flat tone. These two lists are rotated together per generation
// so consecutive batches — and consecutive generations — don't converge on
// the same shape. Selection happens in code (not left to the model) so
// variation is guaranteed rather than hoped for.

type ContentTypeId =
  | 'data_drop' | 'myth_bust' | 'score_explainer' | 'market_observation'
  | 'red_flag_callout' | 'behind_the_build' | 'community_question' | 'contrarian_take';

interface ContentTypeDef {
  id: ContentTypeId;
  label: string;
  needsDataPoint: boolean;
  guidance: string;
}

const CONTENT_TYPES: ContentTypeDef[] = [
  {
    id: 'data_drop', needsDataPoint: true, label: 'Data Drop',
    guidance: 'A specific stat or ranking pulled straight from live platform data. Set it up in one line, drop the number, say what it means. Example shape: "The highest organic-yield pool right now is X at Y% — Score 87. Here\'s why that matters."',
  },
  {
    id: 'myth_bust', needsDataPoint: true, label: 'Myth Bust',
    guidance: 'Correct a common DeFi misconception directly, backed by a real number. Example shape: "High APY ≠ safe yield. Here\'s what to actually look at." State the myth, state the correction, back it with the data point — all in one tweet.',
  },
  {
    id: 'score_explainer', needsDataPoint: true, label: 'Score Explainer',
    guidance: 'Explain what\'s actually driving one specific pool\'s Dexaris Score. Pick the one or two components (Consistency, APY Level, TVL Depth, Organic Yield, Maturity) that matter most for this pool — not an exhaustive breakdown of all five. Make the scoring model legible in one tweet, not a lecture.',
  },
  {
    id: 'market_observation', needsDataPoint: true, label: 'Market Observation',
    guidance: 'A trend visible in the current data that required the platform to spot. Example shape: "14 of the top 20 pools by score are on Ethereum right now. That\'s unusually concentrated."',
  },
  {
    id: 'red_flag_callout', needsDataPoint: true, label: 'Red Flag Callout',
    guidance: 'Call out a specific incentive-heavy pool and explain the risk in plain terms (yield mostly from token incentives rather than organic fees). Do NOT frame this as a buy or sell recommendation — describe the risk pattern, not an instruction.',
  },
  {
    id: 'behind_the_build', needsDataPoint: false, label: 'Behind the Build',
    guidance: 'A brief, first-person insight into how Dexaris works or why a product decision was made — e.g. why the scoring model is weighted the way it is, a tradeoff made while building it, something learned from watching the data every day. Builds founder credibility, not a product pitch.',
  },
  {
    id: 'community_question', needsDataPoint: true, label: 'Community Question',
    guidance: 'Pose a genuine, open question to the audience prompted by something specific in the current data. Should invite real replies, not be rhetorical.',
  },
  {
    id: 'contrarian_take', needsDataPoint: true, label: 'Contrarian Take',
    guidance: 'A data-backed opinion that pushes against conventional DeFi wisdom. Take a real position, back it with a number, don\'t hedge.',
  },
];

type ToneId = 'analytical' | 'direct' | 'educational' | 'founder';

interface ToneDef {
  id: ToneId;
  label: string;
  guidance: string;
}

const TONES: ToneDef[] = [
  { id: 'analytical', label: 'Analytical', guidance: 'Data-led and precise. Let the numbers carry the weight — no hype, no exclamation marks, no adjectives doing work the data should do.' },
  { id: 'direct', label: 'Direct / Blunt', guidance: 'Short and punchy. No padding, no throat-clearing, no softening. Say the thing in as few words as possible.' },
  { id: 'educational', label: 'Educational', guidance: 'Explain a concept clearly, assuming the reader is smart but doesn\'t know DeFi jargon. Define terms in plain language as you go.' },
  { id: 'founder', label: 'Founder Voice', guidance: 'First person. "I noticed…", "I\'m thinking…", "I built this because…" — not "Dexaris does X". This is Antony talking, not the product.' },
];

const SLOT_META: Array<{ slot: XPost['slot']; time: string }> = [
  { slot: 'Morning', time: '8–9am' },
  { slot: 'Afternoon', time: '12–2pm' },
  { slot: 'Evening', time: '6–8pm' },
];

interface ScoredPool {
  pool: Pool;
  score: number;
}

interface LiveSnapshot {
  topScore: ScoredPool;
  topApy: ScoredPool;
  avgScore: number;
  avgApy: number;
  domChain: string;
  domCount: number;
  top20Count: number;
  flaggedPool: ScoredPool | null;
  flaggedCount: number;
}

interface SlotPlan {
  slot: XPost['slot'];
  time: string;
  type: ContentTypeDef;
  tone: ToneDef;
  dataHint: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Picks `count` distinct entries, preferring ones not in `recentIds` — falls
// back to recent ones only if excluding them all would leave too few to pick.
function pickDistinct<T extends { id: string }>(all: T[], recentIds: string[], count: number): T[] {
  const fresh = shuffle(all.filter(t => !recentIds.includes(t.id)));
  const stale = shuffle(all.filter(t => recentIds.includes(t.id)));
  return [...fresh, ...stale].slice(0, count);
}

function buildLiveSnapshot(pools: Pool[]): LiveSnapshot {
  const scored: ScoredPool[] = pools.map(p => ({ pool: p, score: calculateDexarisScore(p) }));
  const byScore = [...scored].sort((a, b) => b.score - a.score);
  const byApy = [...scored].sort((a, b) => (b.pool.apy ?? 0) - (a.pool.apy ?? 0));

  const avgScore = Math.round(scored.reduce((s, e) => s + e.score, 0) / scored.length);
  const avgApy = scored.reduce((s, e) => s + (e.pool.apy ?? 0), 0) / scored.length;

  const top20 = byScore.slice(0, 20);
  const chainCounts: Record<string, number> = {};
  for (const e of top20) chainCounts[e.pool.chain] = (chainCounts[e.pool.chain] ?? 0) + 1;
  const [domChain, domCount] = Object.entries(chainCounts).sort((a, b) => b[1] - a[1])[0] ?? ['—', 0];

  const flagged = scored
    .filter(e => {
      const apy = e.pool.apy ?? 0;
      const base = e.pool.apyBase;
      return apy > 50 && base != null && apy > 0 && base / apy < 0.3;
    })
    .sort((a, b) => (b.pool.apy ?? 0) - (a.pool.apy ?? 0));

  return {
    topScore: byScore[0],
    topApy: byApy[0],
    avgScore,
    avgApy,
    domChain,
    domCount,
    top20Count: top20.length,
    flaggedPool: flagged[0] ?? null,
    flaggedCount: flagged.length,
  };
}

function buildDataHint(typeId: ContentTypeId, snap: LiveSnapshot): string {
  switch (typeId) {
    case 'data_drop':
      return `Live data point: ${snap.topScore.pool.project} (${snap.topScore.pool.symbol} on ${snap.topScore.pool.chain}) is the highest-scoring pool right now — Dexaris Score ${snap.topScore.score}, APY ${fmtApy(snap.topScore.pool.apy)}, TVL ${fmtTvl(snap.topScore.pool.tvlUsd)}.`;
    case 'myth_bust':
      return `Live data point: the average Dexaris Score across today's tracked pools is ${snap.avgScore} with average APY ${snap.avgApy.toFixed(2)}%. The single highest-APY pool right now, ${snap.topApy.pool.project} (${fmtApy(snap.topApy.pool.apy)}), only scores ${snap.topApy.score} on Dexaris. Use that gap to bust the "high APY = safe yield" myth.`;
    case 'score_explainer': {
      const breakdown = calculateDexarisScoreBreakdown(snap.topScore.pool);
      const parts = breakdown.components.map(c => `${c.label} ${c.score}/10 (${c.weight}% weight)`).join(', ');
      return `Live data point: ${snap.topScore.pool.project} (${snap.topScore.pool.symbol} on ${snap.topScore.pool.chain}) scored ${breakdown.total} overall. Component breakdown — ${parts}.`;
    }
    case 'market_observation':
      return `Live data point: ${snap.domCount} of the top ${snap.top20Count} pools by Dexaris Score right now are on ${snap.domChain}.`;
    case 'red_flag_callout':
      return snap.flaggedPool
        ? `Live data point: ${snap.flaggedPool.pool.project} (${snap.flaggedPool.pool.symbol} on ${snap.flaggedPool.pool.chain}) is showing ${fmtApy(snap.flaggedPool.pool.apy)} APY that's mostly incentive-driven rather than organic fees. ${snap.flaggedCount} pool(s) in today's tracked set show this same pattern.`
        : `Live data point: ${snap.flaggedCount} pools in today's tracked set show incentive-heavy yield patterns (APY far above what organic fees support). Speak to the pattern generally rather than naming one.`;
    case 'community_question':
      return `Live data point to prompt the question: average Dexaris Score is ${snap.avgScore}, the top pool right now is ${snap.topScore.pool.project} at Score ${snap.topScore.score}, and ${snap.domCount}/${snap.top20Count} top pools are on ${snap.domChain}.`;
    case 'contrarian_take':
      return `Live data point: average Dexaris Score across tracked pools is ${snap.avgScore} while average APY is ${snap.avgApy.toFixed(2)}% — ground the contrarian angle in numbers like this.`;
    case 'behind_the_build':
      return '';
  }
}

function formatConstraint(): string {
  return 'FORMAT: a single tweet. Under 280 characters, hard limit. No numbering, no thread markers.';
}

// A thread is numbered beats ("1/", "2/", etc.) separated by blank lines —
// detected from the text itself, mirroring the same check in
// api/generate-content.mjs, so the UI's character count matches what the API
// actually validated against.
function splitThreadBeats(text: string): string[] | null {
  const segments = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  const beatCount = segments.filter(s => /^\d+\//.test(s)).length;
  return beatCount >= 2 ? segments : null;
}

// For a thread, the relevant "character count" is the longest individual
// tweet, not the combined length of every beat — a 3-beat thread at ~250
// characters each is not a "750/280" violation.
function displayChars(text: string): number {
  const beats = splitThreadBeats(text);
  return beats ? Math.max(...beats.map(b => b.length)) : text.length;
}

function buildXSystemPrompt(plans: SlotPlan[]): string {
  const taxonomyBlock = CONTENT_TYPES.map(t => `- ${t.label}: ${t.guidance}`).join('\n');
  const toneBlock = TONES.map(t => `- ${t.label}: ${t.guidance}`).join('\n');
  const assignmentBlock = plans.map(p => [
    `${p.slot} (${p.time}):`,
    `- Content type: ${p.type.label} — ${p.type.guidance}`,
    `- Tone: ${p.tone.label} — ${p.tone.guidance}`,
    `- ${formatConstraint()}`,
    p.dataHint ? `- ${p.dataHint}` : null,
  ].filter(Boolean).join('\n')).join('\n\n');

  return `${X_VOICE_CONTRACT}

CONTENT TYPE TAXONOMY (for reference — today's per-slot assignment is below):
${taxonomyBlock}

TONE PALETTE (for reference — today's per-slot assignment is below):
${toneBlock}

TODAY'S ASSIGNMENT — one post per slot, each using its assigned content type AND tone. Do not swap them between slots, and do not blend two types into one post.

${assignmentBlock}

RULES:
- Every post must reference a specific number from the live data provided in the user message.
- Follow each slot's assigned content type, tone, and format exactly — the point is that these three posts read differently from each other.
- No hashtags unless genuinely necessary. No emojis. No financial advice framing.

Return valid JSON only, no markdown, no backticks:
{"posts":[{"slot":"Morning","time":"...","type":"...","text":"...","chars":0},{"slot":"Afternoon","time":"...","type":"...","text":"...","chars":0},{"slot":"Evening","time":"...","type":"...","text":"...","chars":0}]}

Set each "type" field to "<Content Type Label> · <Tone Label>" (e.g. "Data Drop · Analytical"). Set "chars" to the actual character count of that post's "text" field.`;
}

const NEWSLETTER_SYSTEM_PROMPT = `You are writing The Dexaris Brief — a weekly DeFi yield intelligence newsletter written by Antony, founder of Dexaris.

VOICE AND TONE:
- Authoritative but human — like a sharp analyst writing to a community he respects, not filing a report
- Has a point of view. Never neutral for the sake of it. If something looks good, say it looks good. If something looks risky, say so.
- Concise and precise. Every sentence earns its place. No filler, no waffle.
- Occasionally dry wit is fine — this isn't a corporate publication
- Writes like a founder who lives in this data every day and wants to share what he's seeing
- Never uses: "it is worth noting", "this week saw", "interesting to note", "it should be noted", "notably", "according to the data", "as we can see"
- Never sounds like a press release, a bot, or a compliance document

STRUCTURE — follow this exactly:

1. SUBJECT LINE
Sharp, specific, curiosity-driven. References a real number or observation from the data. Not generic ("This week in DeFi"). Examples of good subject lines:
- "The pool with a Score of 89 most people haven't heard of"
- "Why Solana is winning on yield quality right now"
- "8.4% APY, Score 84 — this is what boring and good looks like"

2. OPENING (2-3 sentences max)
A sharp observation about the current yield landscape that sets the tone for the whole issue. This is the columnist's lede — it should make the reader want to keep going. Not a summary of what's in the newsletter. A point of view.

3. THIS WEEK'S YIELD LANDSCAPE (2-3 sentences)
One macro observation about what the data is showing across all pools this week — chain trends, score distributions, APY patterns. Something that required the platform to spot.

4. THREE FEATURED POOLS
For each pool, write:
- Pool name and asset pair in bold
- Stats on one line: APY · TVL · Dexaris Score · Chain
- 2 sentences max: what the score tells you about this pool and why it's worth attention. Be specific. Have an opinion.

5. ONE TO WATCH
One pool or trend that isn't ready to feature yet but is worth monitoring. 2-3 sentences. Could be a pool with improving score, a chain gaining momentum, or an anomaly in the data worth tracking.

6. CLOSING LINE
One sentence. Forward-looking or reflective. Signs off as: — Antony, Dexaris

RULES:
- Every claim must reference real numbers from the live data provided
- Never give financial advice or recommend buying anything
- Keep total length under 450 words
- The Dexaris Score must be mentioned by name at least twice
- At least one pool must have its score tier explained (Strong/Solid/Moderate/Weak)
- End with "→ dexaris.io" on the last line before the sign-off

Return the newsletter as plain text, no markdown formatting, no backticks, ready to paste directly into Beehiiv.`;

// Referenced here so TypeScript noUnusedLocals is satisfied; wired into AI call when newsletter tab uses live generation
void NEWSLETTER_SYSTEM_PROMPT;

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

// ── Chart Export section ───────────────────────────────────────────────────

function ChartExportSection({ pools }: { pools: Pool[] }) {
  const [selectedIdx, setSelectedIdx]       = useState(0);
  const [allChartData, setAllChartData]     = useState<HistoricalPoint[]>([]);
  const [chartLoading, setChartLoading]     = useState(false);
  const [chartError, setChartError]         = useState('');
  const [timeRange, setTimeRange]           = useState<'30d' | '7d'>('30d');
  const [exporting, setExporting]           = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const selectedPool = pools[selectedIdx];

  useEffect(() => {
    if (!selectedPool) return;
    setChartLoading(true);
    setChartError('');
    setAllChartData([]);

    fetch(`https://yields.llama.fi/chart/${selectedPool.pool}`)
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(json => {
        const raw = (json.data as Array<{ timestamp: string; apy: number }>)
          .filter(d => d.apy != null);
        setAllChartData(raw);
      })
      .catch(() => setChartError('Failed to load historical data — the pool may not have chart data.'))
      .finally(() => setChartLoading(false));
  }, [selectedPool?.pool]);

  const displayData = useMemo(() => {
    const days = timeRange === '7d' ? 7 : 30;
    return allChartData.slice(-days).map(d => ({
      date: new Date(d.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      apy: parseFloat((d.apy ?? 0).toFixed(2)),
    }));
  }, [allChartData, timeRange]);

  async function exportPNG() {
    if (!chartRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(chartRef.current, {
        background: '#0C0B1A',
        useCORS: true,
        scale: 2,
      } as Parameters<typeof html2canvas>[1]);
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      const name = selectedPool.project.replace(/\s+/g, '-').toLowerCase();
      link.download = `dexaris-chart-${name}-${date}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch { /* silent */ } finally {
      setExporting(false);
    }
  }

  const S: React.CSSProperties = { fontFamily: "'Inter', sans-serif" };
  const score = selectedPool ? calculateDexarisScore(selectedPool) : 0;
  const colour = getDexarisScoreColour(score);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <p style={{ ...S, margin: 0, fontSize: '14px', fontWeight: 600, color: '#E8E6FF' }}>
            Chart Export
          </p>
          <p style={{ ...S, margin: '2px 0 0', fontSize: '12px', color: 'rgba(232,230,255,0.4)' }}>
            Export APY charts to attach to your X posts
          </p>
        </div>
        <button
          onClick={exportPNG}
          disabled={exporting || chartLoading || displayData.length === 0}
          style={{
            ...S,
            background: (exporting || chartLoading || displayData.length === 0)
              ? 'rgba(107,79,255,0.2)'
              : 'rgba(107,79,255,0.15)',
            border: '1px solid rgba(107,79,255,0.3)',
            borderRadius: '8px',
            padding: '8px 18px',
            fontSize: '13px',
            fontWeight: 500,
            color: (exporting || chartLoading || displayData.length === 0)
              ? 'rgba(139,115,255,0.4)'
              : '#8B73FF',
            cursor: (exporting || chartLoading || displayData.length === 0) ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {exporting ? 'Exporting…' : '↓ Export PNG'}
        </button>
      </div>

      {/* Pool selector cards */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {pools.map((pool, idx) => {
          const s = calculateDexarisScore(pool);
          const c = getDexarisScoreColour(s);
          const selected = idx === selectedIdx;
          return (
            <button
              key={pool.pool}
              onClick={() => setSelectedIdx(idx)}
              style={{
                ...S,
                flex: '1 1 160px',
                background: selected ? 'rgba(107,79,255,0.12)' : '#111028',
                border: `1px solid ${selected ? 'rgba(107,79,255,0.5)' : 'rgba(107,79,255,0.15)'}`,
                borderRadius: '10px',
                padding: '12px 14px',
                cursor: 'pointer',
                textAlign: 'left' as const,
                transition: 'all 0.15s',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span style={{ ...S, fontSize: '13px', fontWeight: 600, color: '#E8E6FF', lineHeight: 1.2 }}>
                {pool.project}
              </span>
              <span style={{ ...S, fontSize: '11px', color: 'rgba(232,230,255,0.45)' }}>
                {pool.symbol} · {pool.chain}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ ...S, fontSize: '12px', fontWeight: 600, color: '#8B73FF' }}>
                  {fmtApy(pool.apy)}
                </span>
                <span style={{
                  ...S,
                  fontSize: '11px',
                  fontWeight: 600,
                  color: c,
                  background: `${c}1a`,
                  border: `1px solid ${c}40`,
                  borderRadius: '4px',
                  padding: '1px 6px',
                }}>
                  {s}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Chart card (captured by html2canvas) */}
      <div
        ref={chartRef}
        style={{
          background: '#0C0B1A',
          border: '1px solid rgba(107,79,255,0.2)',
          borderRadius: '12px',
          padding: '24px',
          position: 'relative',
        }}
      >
        {/* Chart header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <p style={{ ...S, margin: 0, fontSize: '15px', fontWeight: 700, color: '#E8E6FF' }}>
              {selectedPool?.project} — {selectedPool?.symbol}
            </p>
            <p style={{ ...S, margin: '3px 0 0', fontSize: '12px', color: 'rgba(232,230,255,0.4)' }}>
              {selectedPool?.chain} · APY history · TVL {fmtTvl(selectedPool?.tvlUsd ?? 0)}
            </p>
          </div>
          <div style={{
            ...S,
            fontSize: '12px',
            fontWeight: 600,
            color: colour,
            background: `${colour}1a`,
            border: `1px solid ${colour}40`,
            borderRadius: '6px',
            padding: '4px 10px',
          }}>
            Score {score} {getDexarisScoreTier(score)}
          </div>
        </div>

        {/* Time range tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
          {(['30d', '7d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                ...S,
                background: timeRange === range ? 'rgba(107,79,255,0.18)' : 'transparent',
                border: `1px solid ${timeRange === range ? 'rgba(107,79,255,0.4)' : 'rgba(107,79,255,0.15)'}`,
                borderRadius: '6px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: timeRange === range ? 600 : 400,
                color: timeRange === range ? '#8B73FF' : 'rgba(232,230,255,0.4)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Chart body */}
        {chartLoading && (
          <div style={{ height: 240, display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'flex-end' }}>
            {[60, 80, 50, 90, 70, 85, 55].map((h, i) => (
              <div key={i} style={{
                height: `${h}%`,
                background: 'linear-gradient(90deg, rgba(107,79,255,0.06) 0%, rgba(107,79,255,0.12) 50%, rgba(107,79,255,0.06) 100%)',
                borderRadius: '4px',
                animation: 'nlgen-spin 1.4s ease-in-out infinite',
              }} />
            ))}
          </div>
        )}

        {chartError && !chartLoading && (
          <div style={{
            ...S,
            height: 240,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            color: 'rgba(255,107,107,0.7)',
          }}>
            {chartError}
          </div>
        )}

        {!chartLoading && !chartError && displayData.length === 0 && (
          <div style={{
            ...S,
            height: 240,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            color: 'rgba(232,230,255,0.3)',
          }}>
            No historical data available for this pool
          </div>
        )}

        {!chartLoading && !chartError && displayData.length > 0 && (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={displayData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="apyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6B4FFF" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6B4FFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,79,255,0.1)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'rgba(232,230,255,0.35)', fontFamily: 'Inter, sans-serif' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'rgba(232,230,255,0.35)', fontFamily: 'Inter, sans-serif' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}%`}
                width={42}
              />
              <Tooltip
                contentStyle={{
                  background: '#111028',
                  border: '1px solid rgba(107,79,255,0.3)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#E8E6FF',
                  fontFamily: 'Inter, sans-serif',
                }}
                formatter={(value) => [`${Number(value).toFixed(2)}%`, 'APY']}
                labelStyle={{ color: 'rgba(232,230,255,0.5)', marginBottom: '2px' }}
                cursor={{ stroke: 'rgba(107,79,255,0.4)', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="apy"
                stroke="#8B73FF"
                strokeWidth={2}
                fill="url(#apyGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#8B73FF', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* Watermark */}
        <p style={{
          ...S,
          position: 'absolute',
          bottom: '10px',
          right: '16px',
          margin: 0,
          fontSize: '11px',
          fontWeight: 600,
          color: 'rgba(107,79,255,0.4)',
          letterSpacing: '0.04em',
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          dexaris.io
        </p>
      </div>
    </div>
  );
}

// ── X Content tab ─────────────────────────────────────────────────────────

const RECENT_TYPES_KEY = 'nlgen_recent_post_types';
const RECENT_TONES_KEY = 'nlgen_recent_post_tones';

function loadRecentIds(key: string): string[] {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function XContentTab() {
  const [posts, setPosts]         = useState<XPost[]>([]);
  const [topPools, setTopPools]   = useState<Pool[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);

  // Last-used content types/tones, persisted across generations (and page
  // reloads within the session) so the next generation automatically avoids
  // repeating them — no manual input required.
  const [recentTypeIds, setRecentTypeIds] = useState<string[]>(() => loadRecentIds(RECENT_TYPES_KEY));
  const [recentToneIds, setRecentToneIds] = useState<string[]>(() => loadRecentIds(RECENT_TONES_KEY));

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

      setTopPools(filtered.slice(0, 5));

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

      // 4. Pick a distinct content type + tone per slot, avoiding whatever
      // was used in recent generations, and pull the live data point each
      // assigned type actually needs.
      const chosenTypes = pickDistinct(CONTENT_TYPES, recentTypeIds, 3);
      const chosenTones = pickDistinct(TONES, recentToneIds, 3);
      const snapshot = buildLiveSnapshot(filtered);
      const plans: SlotPlan[] = SLOT_META.map((meta, i) => ({
        slot: meta.slot,
        time: meta.time,
        type: chosenTypes[i],
        tone: chosenTones[i],
        dataHint: chosenTypes[i].needsDataPoint ? buildDataHint(chosenTypes[i].id, snapshot) : '',
      }));

      const recentPostTypes = [
        ...recentTypeIds.map(id => CONTENT_TYPES.find(t => t.id === id)?.label ?? id),
        ...recentToneIds.map(id => TONES.find(t => t.id === id)?.label ?? id),
      ];

      // 5. Call Anthropic via serverless proxy
      const aiRes = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: buildXSystemPrompt(plans),
          userMessage: `Here is today's live DeFi yield data — top 30 pools by TVL (TVL > $1M, APY > 0):\n\n${poolSummary}\n\nGenerate the three X posts following today's assignment above.`,
          recentPostTypes,
        }),
      });

      if (!aiRes.ok) {
        const errorText = await aiRes.text();
        setError(`Generation failed: ${aiRes.status} — ${errorText}`);
        return;
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

      // Recompute chars from actual text — for a thread this is the longest
      // individual tweet, not the combined length of every beat.
      setPosts(parsed.posts.map(p => ({ ...p, chars: displayChars(p.text) })));

      // Remember what was just used so the next generation rotates away from it
      const updatedTypeIds = Array.from(new Set([...chosenTypes.map(t => t.id), ...recentTypeIds])).slice(0, 4);
      const updatedToneIds = Array.from(new Set([...chosenTones.map(t => t.id), ...recentToneIds])).slice(0, 4);
      setRecentTypeIds(updatedTypeIds);
      setRecentToneIds(updatedToneIds);
      sessionStorage.setItem(RECENT_TYPES_KEY, JSON.stringify(updatedTypeIds));
      sessionStorage.setItem(RECENT_TONES_KEY, JSON.stringify(updatedToneIds));

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
            const isThread = splitThreadBeats(post.text) !== null;
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
                      {isThread ? `Longest tweet: ${post.chars} / 280` : `${post.chars} / 280`}
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

          {/* Chart export */}
          {topPools.length > 0 && (
            <>
              <div style={{ height: '1px', background: 'rgba(107,79,255,0.12)', margin: '4px 0' }} />
              <ChartExportSection pools={topPools} />
            </>
          )}
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
