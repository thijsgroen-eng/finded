# Finded → AI Visibility Monitoring Platform

**Repositioning review & implementation plan**
Status: proposal for approval — *no code beyond this document yet.*

From: "We audit your restaurant." → To: **"We continuously monitor how AI recommends your restaurant."**
The audit becomes *one event inside a monitoring platform.* Monitoring is the core product.

---

## 0. The most important finding: the engine already exists

This is a **repositioning, not a build**. Over the last work cycles we already shipped the
hard part — the deterministic monitoring engine — but we are still *marketing it as an audit*.
The gap is messaging, information hierarchy, pricing and a few connective surfaces, **not**
new analytics.

Already in place (reuse, don't rebuild):

| Capability | Where | Status |
|---|---|---|
| Observation Warehouse V2 (append-only facts, monthly partitions, MVs) | `supabase/migrations/029–034`, `lib/warehouse/write.ts` | ✅ live, dual-write + backfill |
| Deterministic stats (z-test, slope, stddev) — no LLM | `lib/warehouse/stats.ts` | ✅ |
| Per-restaurant monitoring intel (changes, opportunities, benchmarks, providers, industry, research, history) | `lib/warehouse/restaurant.ts` | ✅ |
| Customer dashboard monitoring sections (Hero deltas, What's Changed, Opportunities, Compare, Provider breakdown, Industry, annotated History) | `components/portal/restaurant-dashboard.tsx` | ✅ built, free/paid gated |
| Admin intelligence hub (discoveries, correlations, benchmarks, citations, research) | `app/admin/insights` + `/api/admin/warehouse/overview` | ✅ |
| Recommendation impact (verified before/after) | `lib/warehouse/impact.ts` | ✅ |
| Bilingual templated monitoring copy (incl. Saved-Questions stub) | `lib/portal-copy.ts` `mon.*` | ✅ |

**Implication:** ~70% of this brief is *surfacing and renaming* work. The remaining ~30% is
net-new: pricing model, an explicit monitoring run/cadence concept, the agencies experience,
and the Saved-Questions data model.

---

## 1. Surface-by-surface review

### 1.1 Landing page (`app/page.tsx`)

| Verdict | Item | Why |
|---|---|---|
| **Stay** | Warm palette, hero layout, framed product shot, evidence section, rigor stats band, feature cards (the "bijv. …" chips), founder, FAQ, lead form | Recently rebuilt; structurally sound. The bones already lead with the problem and show evidence. |
| **Rewrite** | Hero headline + sub; all body copy that says *audit / report / SEO / analysis* | Positioning is still "we audit you." Headline must lead with the **guest behaviour shift** ("more guests ask AI where to eat") and the sub must promise **continuous monitoring** of ChatGPT/Claude/Gemini/Perplexity. |
| **Rewrite** | Stats-band labels → platform-intelligence framing | "Audits completed" stays, but lead with *Restaurants monitored*, *AI interactions analysed*, *Provider responses*, *Warehouse updated daily*. |
| **Rewrite** | "What your audit actually measures" section title + the `dataTitle`/`dataBody` warehouse block | Reframe as *"What Finded monitors"* and make the warehouse block the explicit **moat** narrative. |
| **Move** | The `#data` warehouse section → promote it as a named **Observation Warehouse / moat** block, and add a tiny **Research feed** ("Latest discoveries") teaser sourced from the warehouse | It's our differentiator; today it's a quiet mid-page block. |
| **Move** | Secondary CTA → make it explicitly **"View a live dashboard"** pointing at the sample/`#sample` (or a public demo dashboard) | The dashboard is the product; let visitors feel it. |
| **Rewrite** | Dashboard **preview mock** content | Currently a static "report." Make it read *alive*: current visibility + weekly Δ + monthly Δ + provider arrows + latest discovery + top recommendation + "last monitoring run." |
| **Remove** | The unverifiable "Trusted by owners in Amsterdam · Rotterdam · Utrecht" remnants if still referenced; the word "Beta" on Trends | Replaced by warehouse-backed counters; "monitoring" should feel shipped, not beta. |
| **Rewrite** | "For Agencies" nav (currently just a mailto) | Should open a dedicated agencies story (measurement platform: white-label, before/after, multi-restaurant). |

### 1.2 Customer dashboard (`components/portal/restaurant-dashboard.tsx`, `app/dashboard/[id]`)

| Verdict | Item | Why |
|---|---|---|
| **Stay** | All cards/primitives (Ring, Bar, TrendChart, cardBox), and the already-built monitoring sections | Reorganization, not redesign. |
| **Stay** | Deterministic, no-LLM intel from `lib/warehouse/restaurant.ts` | Matches the "everything deterministic" requirement already. |
| **Move** | Ensure the **canonical order** answers the 5 questions: (1) What's Changed → (2) Why (provider/signal deltas) → (3) Recommendations → (4) Benchmarks → (5) Industry intelligence; operational cards (reliability) sit lowest | Today the monitoring sections exist but the legacy tabs still front operational metrics first for some states. |
| **Rewrite** | Recommendations card → full **evidence layout** (expected gain, confidence, restaurants measured, difficulty, est. time, evidence) everywhere it appears (not only the Opportunities section) | Recommendations elsewhere still read like generic advice. |
| **Rewrite** | Provider section → add citation sources + model-drift + ranking-change framing labels | Data exists in intel; presentation should name "model drift," "ranking change." |
| **Rewrite** | Competitors → gaining/losing/appearing-together framing | Intel has co-occurrence + frequency; reframe from a flat list. |
| **Add (small)** | A **"Monitoring" status strip**: last run + next run + cadence | Makes the platform feel live and recurring (retention driver). Requires a lightweight monitoring-run concept (see §4). |
| **Add (stub)** | **Saved Questions** placeholder card (copy stub already exists) | Architecture prep, no full feature. |

### 1.3 Free dashboard (free-plan customer view)

| Verdict | Item | Why |
|---|---|---|
| **Stay** | The free/paid gating + `LockedTeaser` already built | Conversion mechanic is in place. |
| **Rewrite** | Free view should crystallize the **one verdict**: "AI does / does not recommend you" — big, first | This is the emotional hook that drives the upgrade to monitoring. |
| **Move** | Locked teasers should explicitly sell **Monitoring** (continuous), not "the audit" | Aligns the upgrade with the flagship product. |

### 1.4 Pricing (`app/page.tsx` tiers)

| Verdict | Item | Why |
|---|---|---|
| **Rewrite** | Tier 2 from **"AI Visibility Audit (€49, one-time)"** → **"AI Visibility Monitoring (monthly)"**; fold the audit in as the first run | Monitoring must be the flagship and the recurring-revenue engine. |
| **Stay** | Free Check (tier 1) and Implementation (tier 3) | Bookends of the journey are correct. |
| **Rewrite** | Tier copy → outcome language ("know every month whether AI recommends you, and why") | Sell the recurring outcome, not a deliverable. |
| **Decision needed** | Price point + cadence for monitoring, and whether the €49 audit becomes "first month" or a separate one-off | Business decision — I'll need the number(s). |

### 1.5 Navigation & IA

| Verdict | Item | Why |
|---|---|---|
| **Rewrite** | Nav labels → *Product, How monitoring works, Pricing, Intelligence (warehouse/research), For Agencies* | Vocabulary alignment. |
| **Add** | A real **/agencies** route (or anchored section) instead of mailto | Dedicated agency story. |
| **Stay** | Login → portal; primary CTA → free check | Works. |

### 1.6 User journey

Current: Landing → Free Audit → Dashboard → Paid Audit → Implementation.
New: Landing → **Free AI Visibility Check** → Dashboard ("AI does/doesn't recommend me") → **Monthly Monitoring** → **Industry Intelligence** → Implementation.

The dashboard is the destination; monitoring is the recurring loop; implementation is the upsell when evidence shows a fixable gap.

---

## 2. Positioning & vocabulary (applies everywhere)

Replace → with:
- Audit → **Visibility / Monitoring** (audit = "your first monitoring run")
- Report → **Dashboard / Insights**
- SEO / Analysis → **Visibility / Evidence / Intelligence**
- "We audit" → "We continuously monitor"
- Findings → **Discoveries / Recommendations** (evidence-backed)

Copy rules (already partly enforced by `AGENTS.md`): business outcomes over AI jargon; every
section answers "why should I care?"; never promise rankings; only measured/aggregate stats;
never expose individual restaurant data.

---

## 3. The Observation Warehouse as the moat (cross-cutting message)

One consistent paragraph, surfaced on landing (moat block), dashboard (industry section
footer), and pricing:

> *Every completed visibility check anonymously sharpens how we understand the way AI discovers
> restaurants. No individual restaurant's data is ever shared. Because recommendations are
> measured across thousands of observations, they get more accurate over time — this is data
> ChatGPT doesn't have.*

This justifies the subscription (it compounds) and differentiates from any one-off tool.

---

## 4. Implementation plan (incremental, backward-compatible)

Each phase is independently shippable. Ordered by impact-to-effort.

### Phase 1 — Landing repositioning (messaging only) ⭐ highest leverage
- **Current:** audit-led copy, static "report" mock, quiet warehouse block.
- **New:** problem-led hero ("more guests let AI choose where to eat"); monitoring sub;
  CTAs "Check my restaurant for free" / "View a live dashboard"; vocabulary swap across all
  `T.en`/`T.nl`; stats band reframed to platform intelligence; warehouse moat block; a small
  "Latest discoveries" research teaser; the preview mock shows weekly/monthly Δ + latest
  discovery + top recommendation + last monitoring run.
- **Why:** positioning/conversion; the visitor instantly feels the recurring product.
- **Impact:** High (conversion + framing). **Effort:** Low–Med (copy + mock content; no new infra).
- **Dependencies:** none (warehouse counters already exist via `platformStats`).
- **Risks:** copy only — low. Keep NL/EN in lockstep.

### Phase 2 — Pricing reposition to Monitoring-flagship
- **Current:** Free / Audit (€49 one-time) / Implementation.
- **New:** Free Check / **AI Visibility Monitoring (monthly)** / Implementation; audit folded in.
- **Why:** recurring revenue + flagship clarity.
- **Impact:** High (revenue model). **Effort:** Low (copy) + **business decision on price/cadence**.
- **Dependencies:** **price point + whether billing changes** (Stripe). If we keep checkout as-is
  for now, Phase 2 can ship as messaging and a "talk to us / start monitoring" CTA, with billing
  wired later.
- **Risks:** must not break existing `/checkout`/Stripe; ship copy first, billing second.

### Phase 3 — Dashboard hierarchy polish (reorg, reuse)
- **Current:** monitoring sections exist; some legacy tabs still front operational metrics.
- **New:** enforce the 5-question order; evidence layout on *all* recommendation surfaces;
  provider "model drift / ranking change" labels; competitor gaining/losing/together framing;
  a Monitoring status strip (last/next run); Saved-Questions stub card.
- **Why:** retention — the dashboard must feel alive and answer "what changed?" first.
- **Impact:** High (retention). **Effort:** Med (reuse components).
- **Dependencies:** Monitoring-run concept (lightweight: derive "last run" from latest
  `fact_audit.observed_at`; "next run" from cadence setting). No new heavy infra.
- **Risks:** keep all existing tabs working when warehouse is empty (already handled via
  `intel.ready` fallback).

### Phase 4 — Agencies experience
- **Current:** a mailto link.
- **New:** `/agencies` (reusing landing components): measurement-platform story, white-label
  reports, before/after, multi-restaurant client dashboards, exports, benchmarks. Mostly a
  positioning page first; multi-restaurant client views already partially exist in backoffice.
- **Why:** new segment, higher ACV.
- **Impact:** Med–High. **Effort:** Med.
- **Dependencies:** reuse existing client-dashboard + CRM; white-label = config (logo/colours).
- **Risks:** scope creep — ship the story page first, features behind it incrementally.

### Phase 5 — Saved Questions (architecture prep only)
- **Current:** copy stub (`mon.savedTitle/savedSoon`).
- **New:** additive schema (`monitored_questions`: restaurant_id, prompt_text, locale, cadence,
  created_at) + a dashboard placeholder card; **no execution yet**. Designed so a future job can
  run these prompts and write to the same warehouse facts.
- **Why:** makes the future feature natural; signals the platform direction now.
- **Impact:** Low now / High later. **Effort:** Low (1 migration + stub UI).
- **Risks:** none (additive, unused until activated).

### Phase 6 — Research feed surface
- **Current:** discoveries exist in admin hub + dashboard industry section.
- **New:** a public "Latest discoveries" mini-feed on landing + a dashboard research card, both
  from `research_*` / `mv_signal_correlation`, each with sample size + confidence + effect.
- **Why:** content/SEO + credibility + moat proof.
- **Impact:** Med. **Effort:** Low (reuse overview endpoint + gating).
- **Risks:** only show statistically significant findings (gate already exists); never fabricate.

---

## 5. Backward compatibility & guardrails
- All warehouse reads are best-effort with `ready:false` fallbacks — empty warehouse → today's behaviour.
- No removal of existing routes, tabs, or the audit pipeline (audit = first monitoring run).
- Stripe/checkout untouched until a deliberate billing phase.
- Deterministic only; no LLM-generated insights; aggregate/anonymous only.
- NL + EN updated together every phase.

## 6. Suggested sequence & success metrics
Recommended order: **1 → 2 (copy) → 3 → 6 → 4 → 5**, shipping after each.
- Phase 1/2: landing conversion rate to free check; bounce; scroll depth to pricing.
- Phase 3: dashboard return visits / week; time-on-dashboard; upgrade rate from free.
- Phase 2 (billing): monthly active monitored restaurants; MRR; churn.
- Phase 4: agency leads; restaurants-per-agency.

## 7. Open decisions I need from you
1. **Monitoring price & cadence** (e.g. €X/month; is the €49 audit "first month" or separate?).
2. **Billing now or later** — ship Phase 2 as messaging first, or wire Stripe subscriptions in this pass?
3. **Agencies** — full `/agencies` page now, or a positioning section + waitlist first?
4. **Live demo dashboard** for the "View a live dashboard" CTA — use the sample mock, or a real read-only demo restaurant?
