# Finded — Architecture & Onboarding Guide

> A technical design document for an incoming senior engineer. It explains the
> system as a whole, *why* it is built the way it is, and where the bodies are
> buried. Read it once end-to-end before you touch the audit pipeline.

**Stack at a glance:** Next.js 15.3.9 (App Router) · React 19.2.7 · TypeScript 5 ·
Tailwind v4 · Supabase (Postgres) · Inngest (durable workflows) · Stripe ·
Resend · four AI providers (OpenAI, Anthropic, Gemini, Perplexity) ·
`@react-pdf/renderer`. Deployed on Vercel.

---

## 1. Product Overview

### What Finded does

Finded measures **how generative AI assistants recommend restaurants** and helps
owners improve that visibility. When a diner asks ChatGPT, Gemini, Claude or
Perplexity *"best Italian restaurant in Amsterdam for a date"*, some restaurants
get named and most don't. Finded runs that question — many variants of it, many
times, across all four assistants — records who got mentioned, in what position,
with what sentiment, and which third-party sources the model leaned on. From that
evidence it computes a **0–100 AI Visibility Score**, identifies the competitors
winning the mentions, diagnoses *why* (missing schema, PDF-only menu, no FAQ,
weak location signals), and produces **evidence-backed recommendations** with an
impact and a confidence band.

The product's north star, encoded in `AGENTS.md` and enforced throughout the
code, is that Finded is **an AI Visibility *Platform*, not a one-time PDF tool**.
Every feature must either improve a customer's understanding of how AI discovers
them, *or* feed the **Observation Engine** — the proprietary dataset of
anonymized measurements that lets Finded say things no single ChatGPT session
can, e.g. *"restaurants with a crawlable HTML menu are mentioned 2.1× more
often."* That dataset is the moat.

A hard product rule, also enforced in code: **never fabricate stats, never
promise rankings, never expose one customer's data in another's benchmark.**

### The user journey (the funnel is the business model)

```
Free Visibility Check   →   AI Visibility Audit   →   Implementation   →   Monthly Monitoring
        €0                        €49                      €299               (future, €29/mo)
   slug-gated dash         full multi-model           done-for-you         recurring re-audits
   Claude-only data        evidence + PDF             generated assets     trend tracking
```

The **dashboard at `/report/[slug]` is the product**; the PDF is an *export* of
it. Every completed audit automatically mints a permanent, hard-to-guess
dashboard URL and emails the owner a magic link. Tiers unlock progressively more
of that same dashboard rather than producing different artifacts.

### Main actors

- **Restaurant owner (lead → customer).** Submits a website on the public
  funnel, receives a magic-linked dashboard, optionally pays to unlock the full
  audit and implementation. Never creates an account — the slug *is* the
  credential for the free tier.
- **Admin / operator (the Finded team).** Works a "Restaurant Intelligence
  Platform" backoffice: a database of restaurants with a prospecting pipeline,
  bulk import, bulk audits, CRM, prompt editing, settings, analytics and the
  aggregate Insights dashboard. Single shared password gate.
- **The audit engine (autonomous).** A durable Inngest workflow that does the
  actual work: crawl, prompt-matrix execution across providers, entity
  extraction, scoring, competitor analysis, observation recording, dashboard
  creation, email. It is the most important "actor" and the rest of the system
  exists to feed it and render its output.

### Lead → completed audit, end to end

1. Owner submits website + email on `/audit` (or an operator adds/imports a
   restaurant, or triggers one from the backoffice).
2. A `restaurants` row exists or is created; an `audits` row is inserted with
   `status='queued'`.
3. `createAudit()` sends an Inngest `audit/requested` event (event id pinned to
   the audit id). If Inngest is unreachable, the audit parks in `audit_queue`
   and a cron re-dispatches it.
4. The durable workflow runs: crawl → generate prompts → provider preflight →
   prompt matrix → reliability gate → score → competitors → observation →
   complete.
5. On completion the audit is marked `completed`, the restaurant's
   `prospect_status` advances to `audit_complete`, a secure dashboard slug is
   ensured, and a magic-link email goes out.
6. The owner views the dashboard (free tier); pays to unlock; the operator
   reviews in the backoffice, can re-run, send the PDF, and manage the
   relationship through the CRM.

---

## 2. High-Level Architecture

Finded is a **single Next.js application** (one deployable) that wears three
hats — public marketing site, customer dashboard, and admin backoffice — backed
by Postgres (Supabase) and an out-of-process durable workflow engine (Inngest).
There is no separate backend service; "the backend" is route handlers plus the
Inngest function plus a library layer of pure domain logic.

### Subsystems

- **Next.js App Router app.** Server components for data-heavy pages (dashboard,
  admin lists, report), client components for everything interactive. Route
  handlers under `app/api/*` are the HTTP surface.
- **Public website** (`app/page.tsx`, `app/audit`, `app/checkout`,
  `app/privacy`, `app/terms`). The funnel: landing → lead capture → Stripe
  checkout. The landing page pulls live `platformStats()` from the Observation
  Engine (no fabricated numbers).
- **Customer dashboard** (`app/report/[slug]`). The actual product surface,
  tiered free/audit/implementation, accessed by secure slug.
- **Admin backoffice** (`app/admin/*`). Restaurant database + prospecting queue,
  audit viewer, requests inbox, prompts editor, analytics, aggregate Insights,
  leads/CRM, bulk import, settings.
- **API routes.** Two classes: admin-gated (`/api/admin/*` and most of `/api/*`)
  and intentionally public (`report`, `checkout`, `stripe`, `inngest`, the cron
  endpoints, and `audit-request`). The split is enforced by `middleware.ts`.
- **Inngest workflows** (`lib/inngest/*`). The durable audit orchestrator
  (`run-full-audit`), the lead-intake function, and the implementation
  asset-generation function. Retries, step memoization and a 20-minute finish
  timeout come from Inngest.
- **Supabase / Postgres.** 23 sequential migrations, ~27 tables, accessed
  exclusively through a service-role client (`supabaseAdmin`). Source of truth
  for everything.
- **AI providers** (`lib/providers/*`). A uniform `ModelProvider` interface over
  OpenAI, Anthropic, Gemini and Perplexity, each with web-search grounding.
- **Prompt system** (`lib/engine/prompt-generator.ts` + `prompt-store.ts` +
  `prompt_templates` table). Code-defined templates by business type ×
  language × category, overridable from the DB without a deploy.
- **Background jobs / queue / retry.** Inngest is primary; `audit_queue` +
  `/api/queue/process` (cron) is the fallback dispatcher; `monitoring_schedules`
  + `/api/monitoring/run` is the (future) recurring-audit scheduler.
- **External services.** Stripe (payments, signed webhook), Resend (email,
  graceful no-op if unkeyed), the four AI APIs, and the websites being crawled.

### ASCII architecture diagram

```
                                  ┌──────────────────────────────────────────┐
                                  │            Next.js app (Vercel)           │
                                  │                                           │
  Restaurant owner ──HTTP──▶  PUBLIC SITE            CUSTOMER DASHBOARD       │
   (lead)                     /  /audit  /checkout    /report/[slug]          │
                                  │   │                    ▲ (secure slug)    │
                                  │   │ POST               │                  │
                                  │   ▼                    │                  │
                              /api/audit-request    ┌──────┴───────┐          │
                                  │                 │ tiered render │          │
                                  │                 │ free/€49/€299 │          │
   Operator ──login(cookie)──▶ ADMIN BACKOFFICE     └──────────────┘          │
                              /admin/* ── /api/admin/*  (gated by middleware)  │
                                  │                                            │
                                  │ createAudit()                              │
                                  ▼                                            │
                            ┌───────────┐  send event   ┌────────────────┐    │
                            │audit-runner│ ─────────────▶│  /api/inngest   │◀──┼── Inngest cloud
                            └───────────┘  (id-pinned)  └────────┬───────┘    │   (retries, steps,
                                  │ fallback                      │            │    20m timeout)
                                  ▼                               ▼            │
                            ┌───────────┐  cron        ┌──────────────────────┴────┐
                            │audit_queue│◀────────────▶│  run-full-audit (durable)  │
                            └───────────┘ /api/queue   │  crawl→prompts→preflight→  │
                                                       │  MATRIX→reliability gate→  │
                                                       │  score→competitors→obs→    │
                                                       │  complete→email            │
                                                       └───┬───────┬──────┬─────────┘
                                                           │       │      │
                          ┌────────────────────────────────┘       │      └────────────┐
                          ▼                                         ▼                   ▼
                 ┌──────────────────┐                    ┌──────────────────┐   ┌─────────────┐
                 │   AI PROVIDERS    │                    │  Supabase / PG    │   │   Resend    │
                 │ OpenAI Anthropic  │                    │  ~27 tables       │   │  (magic     │
                 │ Gemini Perplexity │                    │  service-role only│   │   link mail)│
                 │ (+ web grounding) │                    └──────────────────┘   └─────────────┘
                 └────────┬─────────┘                              ▲
                          │ crawl target + competitor sites        │ webhook (signed)
                          ▼                                  ┌─────────────┐
                   restaurant websites                       │   Stripe    │
                                                             └─────────────┘
```

---

## 3. Folder Architecture

Responsibilities, not file lists. The mental model: **`app/` is delivery,
`lib/` is the brain, `components/` is presentation, `supabase/` is the source of
truth, `tests/` guards the pure core.**

- **`app/`** — routing, pages and HTTP handlers only. Pages are thin: they load
  data via `supabaseAdmin` and the `lib/` helpers and render. The funnel, the
  dashboard, the backoffice and every API endpoint live here. Business logic
  should *not* accrete here (the recommendations route is the main violator —
  see §12).

- **`lib/`** — the domain layer, almost entirely pure and testable. The
  important sub-areas:
  - **`lib/engine/`** — the audit "machine room." Crawler (`website-auditor`),
    business detection, prompt generation/storage, name/domain normalization,
    entity extraction, the metrics families, the scoring formula, run accounting,
    signal-gap and attribution engines, and `audit-runner` (the enqueue path).
  - **`lib/providers/`** — the AI abstraction. One file per provider implementing
    a shared `ModelProvider` interface, plus a registry that respects per-provider
    Settings toggles and lazy-loads only keyed providers.
  - **`lib/prompts`** — there is no folder by this name; the prompt system is
    `lib/engine/prompt-generator.ts` (code templates) + `prompt-store.ts`
    (DB-backed overrides). Worth knowing because people look for `lib/prompts/`.
  - **`lib/audit/`** — the *analysis* layer that turns raw audit rows into
    human-meaningful, bilingual (NL/EN) output: reliability bands, key findings,
    the "why this result" summary, website-signal checklist, competitor
    comparison, authority/citation analysis, data-quality, report sections,
    recommendation prioritization, entity matching. Almost all pure functions.
  - **`lib/recommendations`** — likewise not a folder; recommendation generation
    lives in `app/api/recommendations/route.ts`, with priority/typing helpers in
    `lib/audit/recommendation-priority.ts` and `lib/engine/fix-types.ts`.
  - **`lib/inngest/`** — the durable orchestrators (audit, lead intake, fix
    generation) and the Inngest client.
  - **`lib/observations/`** — the Observation Engine: recording anonymized facts
    and computing benchmarks, pattern lift, and confidence.
  - **`lib/settings/`** — the singleton `AppSettings` (language, provider
    toggles, audit knobs) resolved from the `app_settings` table with env
    overrides.
  - **`lib/report/`** — `@react-pdf/renderer` document + build orchestrator for
    the tiered PDF export.
  - **`lib/email/`, `lib/payments/`, `lib/auth/`, `lib/leads/`, `lib/import/`,
    `lib/supabase/`, `lib/i18n.ts`, `lib/dashboard.ts`, `lib/utils.ts`** —
    Resend wrapper, Stripe + plan definitions, admin/cron auth, lead validation,
    bulk-import parse/dedupe, the Supabase clients, localization, secure slug
    generation, and shared UI utilities respectively.

- **`components/`** — `components/ui/` is the (small, coherent) design system
  (Badge, Card, Button, Spinner, StatCard, EmptyState). `components/admin/*` are
  the interactive backoffice widgets (audit controls, evidence panels, plan
  controls, provider health, score trend, recommendations, CRM, etc.).
  `components/landing/*` are the marketing interactives (count-up, lead form).
  Everything in `components/` is a client component.

- **`supabase/migrations/`** — 23 numbered, idempotent, additive SQL migrations.
  This is the canonical schema. Migrations are applied manually by the operator;
  there is no automated migration runner in the deploy.

- **`tests/`** — Node's built-in test runner (`node --import tsx --test`), ~27
  files. Covers the deterministic core (scoring, reliability, normalization,
  entity matching, findings, observations, etc.). No E2E, integration, or
  component tests.

---

## 4. Audit Pipeline (one audit, end to end)

The whole pipeline is a single Inngest function, `run-full-audit`, in
`lib/inngest/audit-function.ts`, triggered by `audit/requested` with
`{ audit_id, restaurant_id }`. It is configured `retries: 2`,
`timeouts: { finish: '20m' }`, and the **event id is pinned to `audit-${id}`** so
Inngest never collapses a legitimate re-run into a cached execution. Every stage
below is a discrete `step.run(...)`, which means Inngest memoizes completed steps
— a retry resumes rather than restarts.

```
Lead/operator submits  →  restaurants row  →  audits row (queued)  →  audit/requested event
        →  load entity  →  website crawl  →  generate prompts  →  provider preflight
        →  PROMPT MATRIX (prompt × sample × provider)  →  entity extraction + mention scoring
        →  reliability gate  →  visibility scoring  →  competitor aggregation + crawl
        →  observation record + score-history snapshot  →  complete (slug + status)  →  magic-link email
```

**1 — `load-entity`.** Marks the audit `running`, loads the restaurant. Hard
fails if the entity is gone.

**2 — `website-audit`.** Crawls the target site (`auditWebsite`), SSRF-guarded
(`url-guard` blocks internal/reserved IPs). Extracts ~15 AI-readability signals:
schema.org types, contact, hours, location, social, booking platforms, FAQ, menu
**format** (html/pdf/image/none) and **richness**, dietary tags, review signals,
meta. Idempotently writes `website_audits`.

**3 — `generate-prompts`.** `getFullPromptsFromStore()` produces restaurant-intent
prompts (six categories: discovery, category, occasions, problem/solution, trust,
geographic), templated with location/cuisine/subtype, in the resolved language,
capped at `MAX_PROMPTS`. One `prompt_runs` row per prompt.

**4 — `preflight`** (toggle: `AUDIT_PREFLIGHT`, default on). One cheap ungrounded
"reply OK" call per *enabled* provider. If reliability of the preflight is `red`
(<50% of providers reachable), the audit aborts to `incomplete` immediately —
this is the fix for the historical "audit completes even though billing is dead"
class of failure.

**5 — the prompt matrix.** For each prompt, for each `sample` in `0..SAMPLES-1`,
all providers run **in parallel**. Per cell: insert a `model_runs` row as
`running` (recording temperature=0.7, grounding flag, and a `retry_of_run_id`
link if a prior attempt exists), call the provider, then update the row to
`completed` (with `raw_response`, `model_version`, `sources`, `duration_ms`) or
`failed` (with the error). On success, `extractEntities()` (Claude Haiku) parses
the response into named entities; each is matched against the target via
`matchEntity()` and written to `entities`; a `mentions` row records whether the
target appeared, at what position, with what sentiment. If extraction fails, a
keyword fallback still detects the target. Sampling N times at temperature 0.7 is
deliberate: it captures real-world variance so a single lucky/unlucky answer
doesn't define the score.

**6 — `assess-reliability` (the gate).** Builds run accounting over *all*
`model_runs` and computes a reliability band. **If `red`, the audit stops here**,
is marked `incomplete`, and no score/recommendations are produced — by design,
low-confidence data is never dressed up as fact. The reliability snapshot is
persisted to `audits.reliability`.

**7 — `compute-scores`.** Loads all mentions/entities, runs `computeFullMetrics`
(metrics-v2) for mention frequency, positions, model consensus, share of voice,
opportunity score, and Wilson confidence intervals; builds authority signals from
cited sources; then `computeScoreBreakdown` produces the headline 0–100 score and
a confidence value. Written to `visibility_scores` via **delete-then-insert**
(idempotent) with a hard-fail if the insert errors. Competitors are deduped and
written to `competitors`.

**8 — `crawl-competitors`.** Resolves the top-3 competitors' websites from stored
`sources` and crawls them (reusing `auditWebsite`), writing `competitor_audits`
— the evidence behind "why they win." Best-effort; failures are swallowed.

**9 — `save-score-history` + `record-observation`.** Appends a `score_history`
snapshot (time series for trends) and upserts one anonymized `observations` row
(keyed uniquely on `audit_id`) — the moat contribution.

**10 — `complete`.** Marks the audit `completed`, removes it from `audit_queue`,
advances `restaurants.prospect_status` to `audit_complete` (only from
`not_audited`/`audit_queued`, so it never clobbers a hand-set later status), and
ensures a secure dashboard slug.

**11 — `notify-requester`.** Best-effort magic-link email via Resend. Never fails
the audit.

**Recommendations are *not* part of this pipeline** — they are generated on
demand by `POST /api/recommendations` (see §7). That is an architectural seam
worth knowing.

---

## 5. Database Design

23 idempotent, additive migrations; ~27 tables; accessed only via the
service-role client. The shape is **append-mostly with a thin layer of
recomputed, denormalized read models.**

### The entity graph

```
restaurants (1) ─┬─< audits (many) ─┬─< model_runs ─(parsed)→ mentions
                 │                   ├─< prompt_runs
                 │                   ├─< entities ─(matched)→ restaurants
                 │                   ├─< website_audits (1)
                 │                   ├─< visibility_scores (1, UPSERT)   ← derived, mutable
                 │                   ├─< competitors (many, recomputed)  ← derived
                 │                   ├─< competitor_audits
                 │                   ├─< recommendations
                 │                   ├─< observations (1, UNIQUE)        ← the moat
                 │                   └─< score_history (append)          ← time series
                 ├─< audit_requests (lead funnel)
                 ├─< lead_statuses (legacy CRM) / prospect_status (current CRM, on restaurants)
                 ├─< payments / customers (legacy)
                 ├─< signal_gaps / signal_snapshots
                 ├─< monitoring_schedules (future)
                 └─< generated_assets (implementation deliverables)
```

### The tables that matter, by role

**Sources of truth (mutable, hand- or system-edited):**
- **`restaurants`** — the master business entity. Identity is triangulated by
  `place_id` (Google), `domain` (normalized website) and `preview_slug` (public
  URL) — three keys for three different jobs (dedupe / matching / access). Carries
  the plan tier and the CRM/prospecting fields (`prospect_status`, `tags`,
  `internal_notes`, `next_follow_up`) added in migration 023.
- **`app_settings`** — a single-row (`CHECK id=1`) JSONB config: language,
  provider toggles, audit knobs, brand/contact.
- **`prompt_templates`** — operator-editable prompt overrides by
  (business_type, language, category).
- **`audit_requests`** — the public lead funnel inbox.

**Immutable evidence (append-only, the audit's permanent record):**
- **`audits`** — one row per run; the anchor for all downstream evidence.
  Carries `status` (`queued|running|completed|failed|incomplete`) and the
  `reliability` JSONB snapshot.
- **`model_runs`** — raw provider call + response, one per (prompt × sample ×
  model), with full provenance (model_version, temperature, grounded, sources)
  and a self-referential `retry_of_run_id`.
- **`mentions` / `entities`** — parsed extracts from `model_runs`: did the target
  appear and where; what other entities were named.
- **`website_audits` / `competitor_audits`** — crawl results for the target and
  its top competitors.
- **`prompt_runs`, `recommendation_reasons`, `score_history`, `observations`,
  `payments`** — all append-only.

**Derived / recomputed read models (the only "mutable derived" data):**
- **`visibility_scores`** — the denormalized metric bundle, **upserted** per
  audit (delete-then-insert). One row per audit; carries `score_breakdown`
  (JSONB: components, formula, method_version, confidence) and Wilson CI bounds.
  Because it's upserted, historical granularity lives in `score_history`, not
  here.
- **`competitors`** — recomputed aggregate per audit.

**The moat:**
- **`observations`** — one anonymized fact-record per audit (`UNIQUE(audit_id)`),
  carrying segmentation dims (city, cuisine, country, business_type), outcome
  measures (visibility, mention frequency, mentioned_any) and a `facts` JSONB of
  boolean signals. `restaurant_id` is kept for ops but **never** surfaced in any
  aggregate.

**Operational:**
- **`audit_queue`** — the Inngest fallback queue (lock + attempts<3).
- **`monitoring_schedules`** — recurring re-audit scheduling (future tier).
- **`signal_gaps` / `signal_snapshots`** — external-signal posture (knowledge
  graph, directories, reviews) and daily snapshots.

**Legacy / deprecated (still present, partially superseded):** `customers`
(→ `restaurants.plan`), `lead_statuses` (→ `prospect_status`), `prompts`
(→ `prompt_templates`), `reports`.

### Schema notes a new engineer must internalize

- **The audit is the unit of immutability.** Re-auditing produces a *new* audit
  with fresh evidence; it never mutates old evidence. Trends come from comparing
  audits / reading `score_history`.
- **RLS is enabled on the tables but is not load-bearing.** The app uses only the
  service-role key, which bypasses RLS. Policies exist as defense-in-depth for a
  future auth model; today, access control is 100% application-level (see §10).
- **`prompt_id` is `text`, not a FK.** It deliberately holds both legacy UUIDs
  and v2 string ids. Type-ambiguous by design; handle as a string.
- **`visibility_scores.estimated_visitors_*/estimated_revenue_*` are explicitly
  illustrative**, flagged in code as not empirically validated. They must always
  be shown with a caveat. This is a product-integrity landmine (see §10/§12).
- **JSONB is used heavily** (`score_breakdown`, `reliability`, `facts`, `sources`,
  `signals`, `metadata`, …) — flexible, but unindexed and unvalidated; navigation
  happens in app code.
- **`restaurant_overview`** (migration 023) is a lateral-join view giving
  one-row-per-restaurant with last audit + count + latest score, for the
  backoffice list at scale.

---

## 6. AI Architecture

### Supported providers and models

| Provider | Audit model | Grounding mechanism |
|---|---|---|
| OpenAI | `gpt-4o-mini` / `gpt-4o-mini-search-preview` (grounded) | `web_search_options` |
| Anthropic | `claude-haiku-4-5-20251001` | native `web_search_20250305` tool (max 3 uses) |
| Gemini | `gemini-2.5-flash` | `googleSearch` tool (untyped — SDK is deprecated) |
| Perplexity | `sonar` | inherently search-grounded (raw `fetch`, no SDK) |

Claude Haiku does triple duty: it's an *audit* provider, *and* the model behind
entity extraction, business detection, recommendation generation, and
implementation-asset generation. That concentration is a cost/throughput
consideration (see §11).

### Provider abstraction

`lib/providers/types.ts` defines a single `ModelProvider` interface —
`{ name, supportsGrounding, runPrompt(prompt, opts) → ModelResponse }` — with a
pinned `AUDIT_TEMPERATURE = 0.7` and a normalized `ModelResponse`
(response text, duration, grounded flag, model_version, parsed `sources`, error).
The registry (`index.ts`) lazy-instantiates only providers whose API key is
present and, via `getEnabledProviders()`, filters by the per-provider Settings
toggles — with a safety net that falls back to all-available if an operator
disables everything. Each provider parses citations from its own
provider-specific shape and falls back to regex URL extraction. **Audit calls cap
at `max_tokens: 600`** (recommendations use 4096).

### Prompt versioning

Two layers. Code defines the canonical template set
(`prompt-generator.ts`) by business type × language × category; the DB
(`prompt_templates`, edited at `/admin/prompts`) overlays operator overrides per
category, merged at load time by `prompt-store.ts`, with the code defaults as a
resilient fallback if the table is unreachable. Versioning is at the template
level, not per-audit — but each audit immutably stores the exact `prompt_text`
it sent in `prompt_runs`/`model_runs`, so historical prompts are always
recoverable.

### Response validation, retries, structured outputs

- **Validation** is mostly *tolerant parsing*, not strict schemas. Entity
  extraction returns a typed shape but degrades to keyword matching on failure.
  Recommendation JSON is salvaged object-by-object even when truncated
  mid-string (`parseRecommendations`).
- **Retries** operate at the Inngest step level (the function retries 2×, and
  completed steps are memoized) and at the queue level (`audit_queue`, attempts <
  3). Individual provider calls are *not* independently retried inside a step,
  and have no per-call timeout beyond the provider SDK defaults — a slow provider
  blocks its `Promise.all` cohort (see §8/§11).
- **Structured outputs** are not enforced via provider JSON-mode/tool schemas;
  the system relies on prompt discipline + tolerant parsing. This is pragmatic
  but a known fragility.

### Confidence scoring

Confidence is computed honestly, never invented:
`confidence = (0.5 × completeness + 0.5 × sampleFactor) × completionRate`, where
`sampleFactor = min(sampleCount/24, 1)` and `completionRate` is the fraction of
provider calls that succeeded. The reliability band multiplies it further
(green ×1.0, yellow ×0.6, red ×0). Recommendation confidence is additionally
gated by the Observation Engine: it can only be labeled *High* when a measured
benchmark backs it (≥70% segment frequency), otherwise it's capped at *Medium*.

---

## 7. Recommendation Engine

Recommendations are generated on demand in `app/api/recommendations/route.ts`
(not in the audit pipeline). The flow:

1. **Reliability gate first.** It rebuilds run accounting and returns **HTTP 422**
   if the audit is `red` — no recommendations for unreliable audits, full stop.
2. **Assemble six evidence datasets** (deterministic, from the DB): per-model
   mentions + sentiment; the website audit; top competitors; crawled competitor
   signals; cuisine-specific prompt wins/misses; and the score breakdown's
   weakest components.
3. **Inject Observation Engine patterns** — the measured lift facts ("HTML menu →
   2.1× mentions") as first-class evidence the model is told to prefer.
4. **One LLM call** (Claude Haiku, `max_tokens: 4096`) produces prioritized
   recommendations.
5. **Tolerant parse**, then **enrich each rec deterministically**: attach a
   localized benchmark sentence and `data_source` ("Direct audit + Finded
   benchmark" vs "Direct audit only"), compute a `priority_rank`
   (`do_first/do_next/optional`) from impact × effort, and set `confidence`
   from the benchmark (capped at Medium without one).
6. **Store** in `recommendations` (with a legacy fallback to the
   `audits.recommendations` JSON blob — dual storage, see §12).

**What's deterministic vs LLM:** the *selection and phrasing* of recommendations
is LLM-driven; the *evidence, benchmark, confidence, data-source attribution and
prioritization* are deterministic code wrapped around the model. The surrounding
analysis the dashboard shows — key findings, the "why this result" summary,
website-signal checklist, competitor comparison, authority analysis,
data-quality, report sections — is **entirely deterministic and bilingual**, all
pure functions in `lib/audit/` with unit tests. This division is the single best
design decision in the codebase: the model is a phrasing layer over an auditable
spine, not the source of truth.

---

## 8. Reliability Features

This is where Finded is unusually mature for its stage — reliability is a
first-class, tested subsystem (`lib/audit/reliability.ts`), born from a real
incident where audits "succeeded" while most provider calls were failing on
billing errors.

- **Reliability bands.** `green ≥ 0.8`, `yellow ≥ 0.5`, `red < 0.5` completion
  rate, with a `providersWithData ≥ 2` requirement for green. Each band carries a
  `confidenceMultiplier` (1.0 / 0.6 / 0) and an explicit
  `allow.{score, recommendations, conclusions}` flag — `red` forbids all three.
  Providers are classified `ok` / `partial` / `dead` for human-readable
  diagnostics.
- **Two gates.** A *preflight* gate kills obviously-broken runs before spending
  money, and a *post-matrix* gate withholds output if the real run came in red.
- **Reliability groups.** `audits.reliability_group` / `reliability_run_index`
  support K-way reliability testing (running the same restaurant N times to
  measure the engine's own consistency) — the reason the Inngest event id is
  pinned, so these legitimate duplicates aren't deduped.
- **Duplicate prevention / idempotency.** Event-id pinning (no double execution);
  step memoization (retries resume); `visibility_scores`/`competitors`
  delete-then-insert; `observations` upsert on `audit_id`; `score_history`
  append. The `model_runs.retry_of_run_id` chain tracks retried calls without
  losing the originals (accounting counts all attempts, which is what makes the
  completion rate honest).
- **Queue fallback.** If Inngest dispatch fails, `createAudit` parks the audit in
  `audit_queue`; the `/api/queue/process` cron claims rows (lock + attempts<3)
  and re-dispatches.

**Honest gaps** (also in §11/§12): no request-level dedupe (the same restaurant
can be queued twice); no per-provider-call timeout (a hung provider blocks its
parallel cohort up to the 20-minute function ceiling); partial failures are
accepted into yellow, which is correct but means a systematically-down provider
quietly biases consensus until someone notices the band.

---

## 9. Admin Dashboard

The backoffice is being deliberately reframed from "audit viewer" into a
**Restaurant Intelligence Platform** where the *restaurant* (not the audit) is
the primary entity.

- **Dashboard** (`/admin/dashboard`) — platform overview: counts, visibility
  distribution, lead pipeline, duplicate detection, data-quality warnings.
- **Restaurants** (`/admin/restaurants`) — the centerpiece. A scalable database
  over the `restaurant_overview` view with search, city/cuisine/plan filters, a
  score-range filter, sortable columns, pagination, and the **prospecting queue**
  status (not_audited → audit_queued → audit_complete → outreach_ready →
  contacted → customer → monitoring). Bulk actions: run audit, set status, export
  CSV. The example query it's built for: *"Italian in Amsterdam, score < 30, not
  yet contacted."*
- **Restaurant profile** (`/admin/restaurants/[id]`) — per-restaurant hub with
  tabs: Overview (details + score trend), Audits (full history), CRM & Outreach
  (tier control, tags, follow-up date, notes).
- **Audits** (`/admin/audits`, `/admin/audits/[id]`) — the audit viewer: the full
  evidence stack (run accounting, per-prompt evidence, score breakdown,
  reliability banner, website signals, authority, competitor comparison,
  recommendations) plus controls to re-run/stop, set the plan tier, copy the
  dashboard link, and send PDFs.
- **Requests** (`/admin/requests`) — the public lead inbox; qualify and convert
  to audits.
- **Leads** (`/admin/leads`) — CRM/pipeline view with follow-ups (legacy
  alongside the newer per-restaurant CRM).
- **Prompts** (`/admin/prompts`) — edit/override prompt templates per
  business-type × language × category without a deploy.
- **Analytics** (`/admin/analytics`) — platform metrics (audits/day, model
  distribution, average score).
- **Insights** (`/admin/insights`) — the Observation Engine surfaced: aggregate
  benchmarks and pattern lift by segment, plus a backfill tool. Aggregate-only,
  never per-customer.
- **Settings** (`/admin/settings`) — language, provider toggles, audit cost knobs
  (grounding, prompts, samples) with a live cost estimate, brand/contact.
- **New / Upload** (`/admin/new`, `/admin/upload`) — single add, and the
  scalable bulk-import pipeline (parse → validate → dedupe → **preview** →
  batched commit) built for ~35k-row files.

Manual/operational tools are spread across these screens (re-run, stop, set tier,
backfill observations, edit prompts, provider-health panel) rather than a single
"tools" page.

---

## 10. Security

### What exists

- **Admin auth** (`lib/auth/admin.ts`): a single shared `ADMIN_PASSWORD`. Login
  sets an HTTP-only, `SameSite=Lax`, Secure-in-prod cookie holding an
  HMAC-SHA256-derived, stateless session token (30-day expiry). Validation is
  constant-time. **Fails closed in production** (503 if the password is unset);
  open in dev for convenience.
- **`middleware.ts`** gates `/admin/*` and **all of `/api/*` except** an explicit
  allowlist: `report`, `checkout`, `stripe`, `inngest`, `queue`, `monitoring`,
  `audit-request` (plus the login endpoint). Unauthenticated → redirect (pages)
  or 401 (API). *Note: contrary to a first read of the route tree, the
  non-allowlisted routes like `/api/restaurants`, `/api/detect`, `/api/leads`,
  `/api/audits/[id]` **are** gated by this matcher — they require the admin
  cookie.* I verified this against the matcher directly.
- **Cron auth** (`lib/auth/cron.ts`): `/api/queue/process` and
  `/api/monitoring/run` require `CRON_SECRET` (header or Bearer); fail closed in
  prod.
- **Stripe webhook**: signature-verified, idempotent on `stripe_session_id`.
- **Public funnel** (`/api/audit-request`): honeypot field + soft rate limit
  (10/email/hour, returns success regardless to avoid oracle behavior).
- **Secrets**: provider keys, Supabase service-role key, Stripe/Resend/Inngest
  keys, admin & cron secrets all via env vars; only `NEXT_PUBLIC_*` (Supabase URL
  + anon key) reach the browser.
- **Dashboard access**: the free dashboard is gated solely by an 80-bit random
  slug (`secureDashboardSlug`) — genuinely unguessable; slug enumeration is not a
  practical threat.

### Weaknesses — be honest about these

1. **RLS is enabled but not enforced.** Everything runs through the service-role
   key, which bypasses RLS entirely. The blast radius of a leaked service key is
   *the whole database*. The policies exist but protect nothing today. This is the
   single biggest structural risk.
2. **One shared admin password, no users, no audit log.** No per-operator
   identity, no "who re-ran/deleted/exported what," and rotation means changing
   an env var for everyone. Fine for a 2-person team, unacceptable past that.
3. **`/api/report/*` is outside the middleware** and must do its own gating. The
   free dashboard data is intentionally public-by-slug; the paid PDF route gates
   on a session. The correctness of those in-route checks is load-bearing and
   should be covered by tests — it currently isn't.
4. **Customer PII (emails, phones) is stored in plaintext** and exported via CSV
   to any authenticated operator. No field-level encryption, no per-operator
   scoping.
5. **Rate limiting exists only on the lead funnel** (and softly). Checkout and
   report-by-slug lookups are unthrottled; not exploitable for enumeration given
   the entropy, but DoS/scraping surface if a slug leaks.
6. **The `xlsx` dependency** (bulk import) has a history of prototype-pollution/
   ReDoS advisories; it parses untrusted operator-uploaded files server-side.
   Worth pinning/auditing.
7. **Product-integrity risk, not infra:** the `estimated_visitors_*/revenue_*`
   columns and any place they surface must carry the "illustrative, not
   validated" caveat — shipping them as hard numbers would violate the stated
   "never fabricate stats" principle and is a credibility/legal exposure.

---

## 11. Scalability

The architecture is sound for hundreds of restaurants and low-thousands of
audits. The pressure points as it grows:

- **Per-audit cost and latency dominate everything.** Cost = prompts × samples ×
  providers × (grounding fees), and grounding is the expensive part (~$2.50–4 per
  audit at full settings; ~$0.30–0.50 ungrounded). 100 audits ≈ $250–400
  grounded. **This is why bulk import deliberately does *not* auto-run audits** —
  35k auto-audits would be a five-figure invoice. Audits must stay
  operator-selected. The Settings cost knobs (samples, max prompts, grounding)
  are the main lever.
- **Provider concurrency and timeouts.** Inside a step, all providers run via
  `Promise.all` with no per-call timeout; one slow/hung provider stalls its
  cohort up to the 20-minute function ceiling. At volume this caps throughput and
  wastes wall-clock. Adding per-call timeouts + independent retries is the
  highest-leverage reliability/throughput fix.
- **Claude Haiku is a chokepoint.** It's an audit provider *and* the extraction/
  detection/recommendation/asset model. Anthropic rate limits or an outage
  degrade multiple subsystems at once. Consider isolating the "infrastructure"
  uses (extraction) from the "measurement" use.
- **Database growth is in the evidence tables.** `model_runs`, `entities`,
  `mentions` grow as prompts × samples × providers *per audit* — tens of
  thousands of rows for a single big audit batch. The hot read paths
  (`restaurant_overview`, latest-audit-per-restaurant) lean on lateral joins;
  they're fine now but want a compound `(restaurant_id, created_at desc)` index
  before 10k audits. Raw `raw_response` text storage will dominate table size —
  a retention/archival policy is needed eventually.
- **No caching layer.** `loadObservations()` (up to 5k rows) is recomputed on
  every recommendation request and PDF build; the landing page recomputes
  `platformStats()` per request. These are cheap now and obvious caching targets
  later (in-memory/Redis with a short TTL).
- **PDF rendering is synchronous** (`renderToBuffer`) and the document is large;
  at volume, move it behind the queue.
- **Background processing** is healthy: Inngest gives durability and step
  memoization, and the `audit_queue` fallback prevents lost work. The scaling
  question is concurrency limits and cost governance, not correctness.

**Where it breaks first as you scale:** cost control and provider-call timeouts,
well before the database. Put a hard per-day spend cap and per-call timeouts in
before any large bulk-audit campaign.

---

## 12. Code Quality Review

### Strongest decisions (keep these)

- **Deterministic spine, LLM as a phrasing layer.** Scores, findings,
  comparisons, benchmarks and confidence are pure, tested functions; the model
  only phrases. This is what makes the product *defensible* and the output
  *auditable*. It's a genuinely good architecture, not a typical AI-wrapper.
- **Evidence-first, honesty-by-construction.** Every score traces to stored
  `model_runs`; the reliability gate withholds rather than fabricates; confidence
  is computed from real completion rates; the product principle is enforced in
  code, not just docs.
- **The Observation Engine.** Anonymized, aggregation-first, privacy-preserving,
  and a real moat. Few seed-stage AI products have a data asset this deliberate.
- **Idempotent, additive migrations** and clear immutable-evidence/derived-
  read-model separation.
- **Reliability subsystem** with bands, gates, groups and tests.

### Technical debt and coupling

- **Business logic leaking into route handlers.** `app/api/recommendations/
  route.ts` is ~335 lines of orchestration that belongs in `lib/`. It's the
  clearest violation of the otherwise-clean app/lib boundary, and it's why
  recommendations are *outside* the audit pipeline — an architectural seam that
  surprises people.
- **Metric duplication.** `metrics.ts` (read-time) and `metrics-v2.ts`
  (audit-time) reimplement overlapping logic on top of `metrics-core.ts`. They
  should converge.
- **Dual storage of recommendations** (relational table *and* legacy
  `audits.recommendations` JSON blob, with read-fallback) is debt; migrate fully
  to relational and drop the blob.
- **JSONB sprawl.** Powerful for evolution, but several critical structures
  (`score_breakdown`, `reliability`, `facts`) are unvalidated and unindexed; they
  deserve documented schemas and app-level validation, especially as they feed
  customer-facing numbers.
- **Legacy tables linger** (`customers`, `lead_statuses`, `prompts`, `reports`,
  `report_paid`) alongside their replacements; the half-migrated CRM (legacy
  `lead_statuses` vs new `prospect_status`) is a live source of confusion.
- **Dual identity keys on competitors** (`canonical_key` vs `normalized_name`)
  need consolidation or documentation.
- **`@google/generative-ai@0.24.1` is deprecated**; the `googleSearch` tool is
  passed untyped and is the least-verified grounding path. Migrate to
  `@google/genai`.
- **Empty ESLint config.** Linting is effectively off. For a TS codebase this
  size that's accumulating silent inconsistency.
- **The PDF document is monolithic** and should be split by plan variant.

### Test coverage

The deterministic core is *well* covered (~27 files: scoring, reliability,
normalization, entity matching, findings, observations, prompts, data-quality,
etc.) via the Node test runner. But there are **no E2E tests, no integration
tests** (Stripe/Inngest/Supabase are unmocked and untested as a system), and **no
component tests**. The riskiest, least-tested code is exactly the glue: route
handlers, the Inngest function's wiring, and the in-route auth checks on
`/api/report/*`.

---

## 13. Future Roadmap

### Features that fit the architecture naturally

- **Monthly Monitoring** — the schema (`monitoring_schedules`, `score_history`,
  `signal_snapshots`) and the durable workflow engine already anticipate it; it's
  mostly a scheduler + diff/alerting layer over existing capability. This is the
  obvious next revenue tier.
- **Implementation autopilot** — `generated_assets` + the fix function already
  generate schema/FAQ/copy; closing the loop (apply → re-audit → prove lift) is a
  natural €299-tier deepening.
- **Cross-customer benchmarks as a product** — the Observation Engine can power a
  public "state of AI restaurant visibility" report and richer in-dashboard
  benchmarking, all within the no-individual-data rule.
- **More verticals** — the engine already models `business_type`/`subtypes`;
  dentists/hotels/etc. are a templating + prompt exercise, not a rewrite.

### Architecture improvements to make *before* 10,000 audits

1. **Cost governance + per-provider-call timeouts.** Non-negotiable before any
   bulk-audit campaign: a hard daily spend cap, per-call timeouts, independent
   per-call retries.
2. **Turn on RLS for real, or adopt Supabase Auth** with per-operator identity
   and an admin audit log. The single-password + service-role-everywhere model
   doesn't survive a growing team or a compliance conversation.
3. **Caching** for `loadObservations()`/`platformStats()` and move PDF rendering
   behind the queue.
4. **Indexing and retention** for the evidence tables (compound
   `(restaurant_id, created_at desc)`; an archival policy for `raw_response`).
5. **Lift recommendations into `lib/`** and fold them into (or alongside) the
   audit pipeline so the dashboard isn't generating them on read.
6. **Request-level audit dedupe.**

### Things that should *not* change (architectural strengths)

- The deterministic-core / LLM-phrasing split.
- Evidence immutability and the reliability gate.
- The Observation Engine's anonymized, aggregation-first design.
- Idempotent additive migrations and event-id-pinned durable workflows.

### Things to redesign before scale

- The auth model (see #2 above).
- The metric-module duplication and recommendations-in-routes seam.
- Synchronous PDF generation.

---

## 14. Executive Summary (brutally honest)

**What would impress a principal engineer.** This is not a ChatGPT wrapper
wearing a SaaS costume. The team built a *measurement instrument*: a deterministic,
tested scoring spine with the LLM relegated to phrasing, an honesty-by-
construction reliability gate that withholds output rather than faking it, and a
genuinely thought-through proprietary data asset (the Observation Engine) that is
anonymized and aggregation-first from day one. The product principle ("never
fabricate stats, never promise rankings, never leak a customer into a benchmark")
is enforced in code, not just asserted in a README. The migration history is
disciplined — 23 idempotent, additive steps with clear immutable-evidence /
derived-read-model separation. For a product at this stage, the reliability
subsystem (bands, two gates, K-way reliability groups, durable retried workflows)
is unusually mature. Most AI startups have none of this; they have a prompt and a
vibe.

**What would concern them.** Security is the glaring gap: RLS is enabled but
bypassed by a service-role-everywhere data layer, behind a *single shared
password* with no per-user identity and no audit log — a leaked service key is
total compromise, and that model won't survive the third employee or the first
enterprise security review. Testing is lopsided: the pure core is well covered,
but the glue (route handlers, the Inngest wiring, the in-route auth on the
public report endpoints) — the code most likely to actually break or leak — has
essentially no tests. There's real debt: business logic leaking into route
handlers (recommendations), duplicated metric modules, dual-stored
recommendations, JSONB structures that feed customer-facing numbers without
validation, a deprecated Gemini SDK on the least-verified grounding path, and
linting effectively turned off. And there are two landmines specific to *this*
product: unbounded per-audit cost (grounding fees make a careless bulk-audit a
five-figure mistake — currently mitigated only by *not* auto-running imports) and
the `estimated_visitors/revenue` figures, which must never be presented as hard
numbers without violating the product's own integrity rule.

**What makes this codebase different from a typical AI startup.** The typical AI
startup ships a thin wrapper where the model *is* the product, correctness is
"looks plausible," and the moat is "we prompt-engineered well." Finded inverts
that: the model is a component inside a deterministic, auditable system; "correct"
means "traceable to stored evidence and gated on real reliability"; and the moat
is an accruing, privacy-preserving dataset rather than a prompt. The result reads
like infrastructure built by people who expect to be asked *"prove it"* — because
their customers will. The gap between the rigor of the *domain core* and the
immaturity of the *operational/security envelope* is the defining tension of this
codebase: the hard part is impressively done, and the parts every B2B SaaS
eventually gets audited on (auth, tenancy, audit logging, cost controls, glue
testing) are not yet there. Close that gap before scaling the team or the audit
volume, and this is a genuinely strong platform rather than a strong prototype.
```
