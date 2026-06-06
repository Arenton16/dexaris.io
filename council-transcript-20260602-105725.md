# Dexaris Platform Council — Full Transcript
**Date:** 2 June 2026
**Session type:** Platform analysis — strengths, weaknesses, scaling strategy

---

## The Original Question

> "Please analyse the full Dexaris platform and perform surgical analysis on what we are doing well, doing wrong and what we need to improve. In order to scale this correctly and most importantly, beneficially; we need to understand the platform's strengths and weaknesses."

---

## The Framed Question

Platform: Dexaris — a DeFi yield intelligence platform, Vite + React + TypeScript SPA on Vercel. Solo-founder (Antony), recently launched MVP.

Core features: (1) Live yield table — DeFiLlama API, 6 chains (ETH/SOL/ARB/BASE/AVAX/POLY), sortable, searchable, 60s auto-refresh. (2) Dexaris Score — proprietary 0–100 pool rating using TVL size, APY level, APY consistency vs 30d mean, organic yield ratio (apyBase/apy), pool maturity. (3) Analytics dashboard — 6 Recharts charts in glassmorphism UI. (4) Watchlist — localStorage. (5) Portfolio — manual position entry, matched to live DeFiLlama pools, pie chart, localStorage. (6) Alerts — email waitlist UI only, not functional. (7) Newsletter/X generator — password-gated, calls Claude API.

Data: Single source (DeFiLlama /pools). All client-side, no backend, no database, no user accounts, no historical data stored.

Audience: DeFi yield farmers, analysts, investors seeking quality yield opportunities with an intelligence layer above raw data.

Stakes: Scaling correctly from MVP. No monetisation currently visible in the codebase.

**Question:** What are Dexaris's genuine strengths worth doubling down on, what are its critical weaknesses that will limit growth, and what is the most important thing to build or change to scale this platform correctly and beneficially?

---

## Advisor Responses

### The Contrarian

The scoring function and data model tell me everything I need to know. The score is defensible, but not defensible enough. TVL appears twice — once as "TVL Size" (20%) and again as "Pool Maturity / Trust" (15%). That's 35% of the score derived from a single metric, just rebadged. A $1B Curve pool scores near-maximum before APY is even considered. You're not scoring quality — you're scoring size with extra steps. A competitor or a sophisticated user will spot this in five minutes and dismiss the whole intelligence layer.

The single fatal structural weakness: no data moat. Everything runs against DeFiLlama's public API. DeFiLlama could add a similar scoring layer, rate-limit the endpoint, or restructure their data, and Dexaris loses its value proposition overnight. There is no proprietary data, no historical storage, no user behaviour signals. The "intelligence" is a pure transform on someone else's feed.

Portfolio is localStorage-only and asks users to trust you with investment tracking. That's not a temporary inconvenience — it's a ceiling. The moment a user clears their browser or switches device, their portfolio is gone. They'll churn before they ever convert to a paying customer.

What to actually fix first: Stop building features and fix the score's double-counting of TVL. If the score is wrong, every feature built on top of it is wrong. That's the load-bearing wall. Everything else is furniture.

---

### The First Principles Thinker

The question being asked is "what should we build?" The actual question is "what problem does Dexaris solve that no one else solves?"

Strip it back: DeFiLlama already shows yields. Coingecko shows yields. Every yield aggregator shows yields. Dexaris adds a score on top of someone else's data from a single API endpoint. That is not a moat. That is a feature on top of a free service.

The Dexaris Score is the only thing worth examining closely. Ask the real question: is the scoring methodology actually predictive of anything? Does a high Dexaris Score correlate with better risk-adjusted returns over 30, 60, 90 days? Nobody knows, because there is no historical data stored anywhere. The "proprietary intelligence layer" is unvalidated. It is an algorithm, not intelligence.

This is the critical weakness: you cannot claim to be a yield intelligence platform when you have no memory. Every session is amnesiac. You cannot show users whether your score actually worked. You cannot build trust. You cannot differentiate.

The most important thing to build is not another feature. It is a data store. Start logging pool snapshots daily — score, APY, TVL. Even 90 days of that data transforms everything. Suddenly the Dexaris Score becomes testable. Backtestable. Publishable. That is the thing no solo DeFi dashboard has: a validated, transparent scoring methodology with a track record.

The wrong question is "what UI features should I add?" The right question is "what would make the Dexaris Score credible enough that a serious yield farmer would trust it over their own spreadsheet?"

Answer that, and monetisation follows naturally.

---

### The Expansionist

The Dexaris Score is the only thing that matters. Everything else is a wrapper around data anyone can get for free.

Here is what you are undervaluing: a proprietary scoring system, if trusted, becomes a financial primitive. Bloomberg has the Bloomberg Score. Morningstar has star ratings. These are not features — they are the product. Funds pay for them. They get embedded in screeners, aggregators, third-party tools. They become cited in research. That is the trajectory hiding inside your current MVP.

The adjacent opportunity no one is talking about: institutional DeFi allocation is nascent and desperate for exactly this kind of normalized scoring layer. A treasury manager at a mid-size DAO cannot evaluate 6,000 pools. You can collapse that problem to a number. That is worth a subscription, a data license, or an API product — not just a consumer web app.

Double down on: making the Score methodology public enough to be trusted but proprietary enough to be defensible. Publish the formula broadly. Let people argue with it. That argument is marketing. Every protocol that disputes their score becomes a distribution channel.

The hidden multiplier: if the Score gets accurate enough that protocols optimize toward it — the way companies optimize for credit ratings — you become infrastructure. That is a fundamentally different business than a yield dashboard.

What to build next is not alerts or portfolio tracking. It is a Score API with documented methodology, a paid tier, and outreach to three DAO treasuries. One institutional customer validates the entire thesis. That single customer is worth more strategically than ten thousand free users.

The ceiling on this is not a yield dashboard. The ceiling is becoming the Moody's of DeFi.

---

### The Outsider

The Dexaris Score is a number between 0 and 100. I have no idea what a "good" score means in practice, and neither would a first-time visitor. The tooltip says "TVL size, APY level, yield consistency, and organic yield ratio" — but that tells me nothing about whether a score of 62 should make me excited or worried. There is no benchmark, no explanation of why those four factors were chosen, no guidance on how to act on it. You have invented a metric and then asked people to trust it without showing your work.

The second problem: the entire platform is read-only with no memory. A user finds a pool, thinks "I should come back to this" — and closes the tab. The Watchlist exists but it's localStorage, so it disappears if they clear their browser. There is nothing pulling them back tomorrow.

The critical weakness is the same one that kills most DeFi dashboards: there is no reason to return. The data refreshes every 60 seconds but the user gets nothing from having been here yesterday. No "this pool's APY dropped 40% since you last checked." No "three pools you watched hit your threshold." No history. No delta. The platform is a snapshot with no memory of the past.

The single most important thing to build: APY change alerts that actually fire. Not an email waitlist. Actual notifications — even just a browser push or a weekly email digest showing movement in watched pools. That creates the habit loop the platform currently cannot form.

---

### The Executor

The Dexaris Score algorithm and the client-side-only architecture tell me everything I need.

What's real and worth building on: The Dexaris Score is the only thing that differentiates this from a DeFiLlama reskin. The algorithm is already sound — TVL weight, consistency vs 30d mean, organic yield ratio. That scoring logic, applied at scale, is the actual product. The X content generator is the one feature that converts data into distribution. Those two together are the core loop.

The critical blocker: Everything is ephemeral. No backend, no database, no user accounts. The Portfolio and Watchlist data lives in localStorage and disappears on device switch. You cannot build a recurring-user product on localStorage. Users who lose their watchlist don't come back. This is the ceiling.

The one thing to build Monday morning: Wire up a Supabase free tier. Two tables: users (email/auth) and watchlist_items (user_id, pool_id). Add email/password auth to the existing Alerts email capture — the waitlist form is already there, it already calls /api/subscribe. Turn that into real auth. Persist watchlist server-side. That single change converts a tool people visit into a service people return to, and gives you an email list you actually own.

Don't touch the scoring algorithm. Don't build historical data storage yet. Don't polish the UI. Ship persistent state first — everything else scales from there.

---

## Peer Reviews

*Anonymisation mapping: A = Expansionist, B = Executor, C = Contrarian, D = First Principles Thinker, E = Outsider*

---

### Reviewer 1

**Strongest: D** — asks the epistemically prior question: is the score predictive? Recommending historical data as foundation unlocks validation, backtesting, trust simultaneously.

**Biggest blind spot: A** — makes the Moody's pitch while the score double-counts TVL. Selling the ceiling without acknowledging the floor is cracked.

**Missed by all:** Regulatory/liability exposure. A solo founder publishing investment-relevant scores for DeFi assets without disclaimers or jurisdiction analysis faces "is this financial advice?" the moment any institutional customer engages.

---

### Reviewer 2

**Strongest: D** — score is unvalidated and therefore the entire "intelligence platform" claim is unfounded. Daily snapshots make it backtestable — concrete, foundational, unlocks everything else.

**Biggest blind spot: A** — assumes score is already credible, recommends paid API before methodology is audited.

**Missed by all:** Competitive substitution from user's own tools. Serious yield farmers already have Dune dashboards, Notion trackers, spreadsheets. None of the responses ask why that person switches to Dexaris and stays.

---

### Reviewer 3

**Strongest: D** — most rigorous. Identifies the core epistemic problem.

**Biggest blind spot: A** — builds institutional monetisation on a score C correctly identifies as structurally broken (TVL double-counted at 35%). Becoming the Moody's of DeFi requires the underlying rating to be credible.

**Missed by all:** Regulatory risk. SEC and FCA are actively litigating in territory exactly like this. For a solo founder with institutional ambitions, this is a potential existential constraint informing every architectural and go-to-market decision.

---

### Reviewer 4

**Strongest: D** — correctly identifies credibility problem, not just persistence problem.

**Biggest blind spot: A** — Moody's analogy skips foundation entirely. DAO treasury managers won't pay for a score nobody has verified.

**Missed by all:** Solo-founder execution risk. Every response prescribes significant infrastructure but none ask whether a single founder can maintain backend uptime, data integrity, and product development simultaneously. What is the minimum durable architecture that doesn't become a maintenance burden before revenue justifies it?

---

### Reviewer 5

**Strongest: D** — "You cannot claim to be a yield intelligence platform when you have no memory" cuts to the epistemological root.

**Biggest blind spot: A** — treats trust as a marketing problem when it is actually a data problem.

**Missed by all:** Competitive timing risk. DeFiLlama, Zapper, or any well-funded aggregator can clone the scoring layer in a sprint. None of the five responses address what makes Dexaris defensible if a larger platform copies the methodology verbatim tomorrow.

---

## Chairman's Synthesis

### Where the Council Agrees

The Dexaris Score is the only meaningful differentiator. Without it, this is a DeFiLlama reskin. Every advisor independently reached this conclusion.

The platform has no memory and therefore no retention mechanism. localStorage is not a product architecture — it is a prototype detail that got shipped. Users who lose their watchlist on device switch or browser clear do not return. This is the primary churn driver.

The Score is currently unvalidated. There is no historical data proving that a high Dexaris Score predicts better risk-adjusted outcomes over any time horizon. The "intelligence" label is a marketing claim, not a demonstrated capability.

The data dependency on DeFiLlama's public API is a structural vulnerability. A rate limit change, a schema restructure, or a competing scoring layer added by DeFiLlama itself removes the value proposition without warning.

### Where the Council Clashes

**Clash 1: Sequencing.** The Executor says ship Supabase auth Monday and persist the watchlist. The First Principles Thinker says none of that matters until the Score is validated. Both are correct about different users. A casual DeFi browser needs persistence to form a habit. A sophisticated yield farmer needs a validated score before taking the platform seriously. The question is which user Dexaris is trying to win first — that decision gates everything else.

**Clash 2: Institutional ambition.** The Expansionist says build a Score API and pitch DAO treasuries. All five peer reviewers said: not yet. The Moody's analogy is strategically correct and tactically premature. You cannot license a score that double-counts TVL at 35% to a DAO treasury manager whose quant will review it in the first meeting. Building toward it is correct. Pitching it now is reputationally damaging.

### Blind Spots the Council Caught

**Regulatory and liability exposure.** Three of five peer reviewers independently raised this — none of the original advisors addressed it. Add prominent methodology disclaimers now, before growth makes retroactive framing impossible.

**Solo-founder execution risk.** No advisor asked whether one person can maintain backend uptime, data pipeline integrity, scoring consistency, and product development simultaneously.

**Competitive timing risk.** DeFiLlama or Zapper can clone the scoring methodology in a sprint. Speed matters. A copied methodology without a track record is a clone. A copied methodology that lacks six months of documented predictive accuracy is not.

**Competitive substitution from user's own tools.** Serious yield farmers have Dune dashboards, Notion trackers, spreadsheets. The switching-cost problem was entirely unaddressed.

### The Recommendation

Fix the scoring algorithm first, then wire up persistence, then build the historical data pipeline. In that order.

1. **Fix TVL double-count in the score.** Document the revised methodology publicly. Add legal disclaimers. Takes two days and unlocks everything downstream.
2. **Supabase auth + server-side watchlist persistence.** Converts a stateless tool into a returnable service.
3. **Daily pool snapshots.** Score, APY, TVL, timestamp. Run for 90 days. At the end, you have a track record — the thing that makes institutional positioning viable, retention solvable, and Dexaris defensible against a well-funded clone.

The Expansionist's institutional thesis is the correct long-range target. It requires 12 months of foundation-building, not 12 days.

### The One Thing to Do First

Audit and rewrite the Dexaris Score to eliminate the TVL double-count, document the revised methodology in a public-facing page on the site, and add a clear disclaimer that the score is an analytical tool, not financial advice.

This takes one day to fix and one day to publish. It is the prerequisite for everything — persistence, backtesting, institutional trust, and competitive defensibility — because every one of those depends on the score being something you can stand behind without a quant dismantling it in five minutes.

---

*Council session: 2 June 2026 · Report: council-report-20260602-105725.html*
