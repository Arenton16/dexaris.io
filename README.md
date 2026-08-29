<div align="center">

<br/>

# DEXARIS

### DeFi Yield Intelligence

**Find the yield worth chasing.**

[![Website](https://img.shields.io/badge/Website-dexaris.io-14B8B8?style=for-the-badge&labelColor=050505)](https://dexaris.io)
[![Status](https://img.shields.io/badge/Status-Live-4ECDA4?style=for-the-badge&labelColor=050505)](https://dexaris.io)

</div>

---

## What is Dexaris?

Dexaris is a free DeFi yield intelligence platform. It aggregates live yield and staking data from DeFiLlama across 6 chains and 200+ protocols, then scores every pool 0–100 with the **Dexaris Score** — a weighted measure of APY consistency, TVL depth, and organic (vs incentive-driven) yield, so users can see which yields are worth the risk and which aren't.

Not custodial, no wallet connection required to browse.

---

## Features

- **Yield Explorer** — live, filterable, sortable table of every tracked pool, with the Dexaris Score, chain/score/organic-only filters, and search.
- **Analytics** — score distribution, average APY, risk-vs-reward scatter, and best-performing chain, computed live across all tracked pools.
- **Watchlist** — save pools and track their APY, TVL and Score over time (browser-local).
- **Portfolio** — log real holdings and track their performance, backed by Supabase.
- **Alerts** — waitlist for APY-target, score-drop, and TVL-movement notifications (not yet live).
- **Methodology page** — full public breakdown of how the Dexaris Score is calculated, including its known limitations.
- **Newsletter** — Beehiiv-powered weekly digest, with an internal (non-public) Claude-assisted content generator for drafting issues.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Routing | React Router |
| Charts | Recharts |
| Animation | Framer Motion |
| Data | Supabase (Portfolio, pool snapshot history) |
| Hosting | Vercel — auto-deploy from `main`, daily cron snapshot |
| Yield data | [DeFiLlama](https://defillama.com) API |
| Token prices | CoinGecko API (proxied via `/api/token-prices`) |
| Newsletter | Beehiiv (`/api/subscribe`) |
| Content generation | Anthropic API (`/api/generate-content`, internal tool) |

---

## Project Structure

```
dexaris/
├── index.html               # Vite entry point
├── src/
│   ├── components/          # LandingPage, YieldTable, Analytics, Portfolio, Watchlist, Alerts, Methodology, ...
│   ├── contexts/            # PoolsContext (live DeFiLlama pool data)
│   ├── hooks/                # useWatchlist, etc.
│   ├── lib/                  # Supabase client
│   ├── styles/               # index.css — single shared stylesheet
│   ├── types/                 # Pool, ChainKey, CHAIN_LABELS
│   └── utils/                 # dexarisScore.ts — scoring algorithm
├── api/                      # Vercel serverless functions
│   ├── subscribe.mjs          # Beehiiv newsletter signup
│   ├── snapshot.mjs           # Daily cron — writes pool_snapshots to Supabase
│   ├── token-prices.mjs       # CoinGecko price proxy
│   └── generate-content.mjs   # Internal newsletter content generator
├── public/                    # Static assets, favicon, OG image, robots.txt, sitemap.xml
└── vercel.json                # SPA rewrite + cron config
```

---

## Getting Started

```bash
git clone https://github.com/Arenton16/dexaris.io.git
cd dexaris.io
npm install

# Requires a .env.local with:
#   VITE_SUPABASE_URL=...
#   VITE_SUPABASE_ANON_KEY=...

npm run dev       # start dev server
npm run build     # typecheck + production build
npm run preview   # preview the production build
```

Deployment is automatic via Vercel — every push to `main` triggers a production deploy to `dexaris.io`, and the daily snapshot cron (`/api/snapshot`) runs at 00:00 UTC.

---

## Brand

| Token | Value |
|---|---|
| Background | `#050505` |
| Panel / Surface | `#0A0A0A` |
| Accent (teal) | `#0E7C7C` |
| Accent text | `#14B8B8` |
| Score — Strong / Positive | `#4ECDA4` |
| Score — Moderate | `#FFB347` |
| Score — Weak / Danger | `#FF6B6B` |
| Primary text | `#F2F2F2` |
| Font | Inter |

---

<div align="center">

**DEXARIS** &nbsp;·&nbsp; DeFi Yield Intelligence &nbsp;·&nbsp; [dexaris.io](https://dexaris.io)

</div>
