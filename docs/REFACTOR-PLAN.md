# Finded — Architecture Hardening Plan

Goal: production-ready for tens of thousands of audits **without changing product
behaviour**. Additive migrations only, backwards compatible, deterministic over
LLM, no abstraction for its own sake.

Complexity key: **S** ≤½ day · **M** 1–2 days · **L** 3–5 days · **XL** 1–2 weeks.

---

## Cross-cutting backbone: a single version registry

Almost every item below depends on one small foundation, so build it first:
`lib/versions.ts` exporting frozen constants —
`SCORING_VERSION`, `PARSER_VERSION`, `EXTRACTION_VERSION`,
`RECOMMENDATION_VERSION`, `BENCHMARK_VERSION` (reuse the existing
`METHOD_VERSION='v2'` as `SCORING_VERSION`). Stamp them onto each audit in one
additive column. This is the spine for reproducibility (#1), golden-dataset
regression detection (#6), and observation trend analysis (#11).

---

## 1. Versioning everywhere

**Change.** Add `audits.algo_versions jsonb` recording
`{scoring, parser, extraction, recommendation, benchmark}` at run time, sourced
from `lib/versions.ts`. Bump a constant whenever its logic changes. Recommendation
rows already exist per-audit; stamp `recommendations.algo_version` too.

**Why.** Today only the scoring formula is versioned (`method_version` inside a
JSONB blob). Without parser/extraction/recommendation versions you cannot tell
*why* two audits of the same restaurant differ, and you cannot safely change an
algorithm — old audits silently become unreproducible. Versioning makes every
historical audit explainable forever and is the precondition for safe iteration.

**Complexity.** S. One column, one module, ~6 stamp sites.

**Migration impact.** Additive column, nullable; old audits read as "pre-v1"
(treat null as the earliest known version). Zero behaviour change — versions are
recorded, not acted on.

---

## 2. Preserve all raw evidence

**Change.** `model_runs` already stores provider, model, model_version,
prompt_text, raw_response, sources, duration_ms, tokens_used, status, error,
grounded, temperature, sample_index, locale. Gaps to close (all additive):
`prompt_version text`, `prompt_vars jsonb` (the variables used to fill the
template), `parsed_response jsonb` (the structured extraction, currently
recomputed/discarded). Confirm `tokens_used` is actually populated by each
provider (OpenAI/Anthropic report it; wire it through where missing). Never
UPDATE a completed run in place for a *re-run* — re-runs already create new rows
via `retry_of_run_id`, so this is mostly enforcement + a code-review guard.

**Why.** Raw evidence is the audit trail and the moat's raw material. Storing the
parsed response (not just raw) means parser changes can be replayed offline (#6)
without re-calling providers, and token usage enables real cost accounting (#10).

**Complexity.** M. ~3 columns + threading parsed output and tokens through the
matrix step.

**Migration impact.** Additive nullable columns. Existing evidence untouched.

---

## 3. Audit event timeline

**Change.** New `audit_events` table:
`(id, audit_id, type text, at timestamptz, duration_ms int null, data jsonb)`.
Emit one event at each existing pipeline boundary (audit created, queued, crawl
start/finish, prompts generated, each provider start/finish, extraction finished,
score calculated, recommendations generated, dashboard published, email sent,
completed/incomplete). A tiny `emitEvent()` helper, called from the steps that
already exist. Render a read-only timeline component in the admin audit viewer.

**Why.** Right now a stuck or slow audit is a black box — you infer state from
scattered rows. A timeline gives per-stage latency (where audits actually spend
time), makes incomplete/stuck audits debuggable, and is the natural home for
future SLA/alerting. Pure observability; no control flow depends on it.

**Complexity.** M. Table + helper + ~14 call sites + one display component.

**Migration impact.** New additive table. No behaviour change (events are
write-only telemetry; failure to emit must never fail the audit — wrap in
try/catch).

---

## 4. Generic-enough job queue

**Change.** Extend the existing `audit_queue` (don't replace it) additively:
`job_type text default 'audit'`, `payload jsonb`, `last_error text`,
`next_retry_at timestamptz`, `status text default 'queued'`. Replace the cron's
fixed retry with **exponential backoff** (`next_retry_at = now + base·2^attempts`,
capped) and a terminal `failed` status when `attempts >= max_attempts` (stops
infinite retries — today rows just stall). Keep `audit_id` for backwards compat;
new jobs also carry `payload`.

**Why.** The queue is the durability backstop when Inngest dispatch fails. Today
it only re-dispatches audits, retries linearly, and stalls silently at the cap.
Backoff + terminal failure + a payload makes it a reliable, inspectable
dead-letter-aware queue. I'm **deliberately not** building a fully generic
multi-job framework — that's an unnecessary abstraction until there's a second
job type. The columns make it *possible* later without forcing it now.

**Complexity.** M. Additive columns + rewrite the ~30-line cron claim/retry loop.

**Migration impact.** Additive columns with defaults; the existing claim query
keeps working. Behaviour-preserving except the *intended* fix: stalled-forever →
terminal-failed (an improvement, not a product change).

---

## 5. Adaptive provider execution  ⚠️ tension with your rules

**Change.** Optional, **default-off** strategy: run providers in a configured
order, recompute running confidence after each, and stop early once a
confidence/consensus threshold is met. Config lives in Settings.

**Why (and the honest caveat).** This saves cost/latency — but it **does change
outputs**: fewer providers means different `model_consensus`, different
share-of-voice, and a thinner Observation Engine row (the moat depends on
*all-provider* coverage). That directly conflicts with "don't change business
behaviour" and weakens the dataset. My recommendation: implement it as an
explicit, off-by-default mode used only for cheap re-checks/monitoring, and
**keep full-matrix as the default for billed audits and all observations**. If
the moat matters more than per-audit cost, consider deferring this entirely and
getting the savings from #10 (budgets/timeouts) instead.

**Complexity.** L (the mechanism is M; doing it *without* polluting the moat and
keeping behaviour identical when off is the hard, careful part).

**Migration impact.** None (config only). Behaviour change is opt-in.

---

## 6. Golden-dataset evaluation framework

**Change.** A fixtures set (`tests/golden/*.json`): benchmark restaurants with
frozen raw provider responses + expected parsed entities, scores, and
recommendations-shape. A runner replays the deterministic pipeline (parser →
scoring → benchmark) over the fixtures **with no network/LLM calls** and diffs
against expectations, emitting a pass/fail report. Wire into `npm test`.

**Why.** This is the single highest-leverage item for "safe to change
algorithms." Versioning (#1) records *that* something changed; golden tests catch
*regressions* the moment a parser/scoring/benchmark edit alters output. It turns
the deterministic core into something you can refactor fearlessly.

**Complexity.** L. The harness is M; curating good fixtures (and capturing real
raw responses to freeze) is the effort.

**Migration impact.** None — test-only. Depends on #2 (stored parsed responses
make capturing fixtures trivial).

---

## 7. First-class prompt management

**Change.** Extend `prompt_templates` (additive): `status text` (draft|published),
`version int`, `provider text null` (provider-specific overrides), keep existing
`language`. Add a `prompt_template_history` table (append-only snapshots) for
rollback and version comparison. Editor gains draft→publish, rollback, and a
diff view. Audits already record the exact prompt text sent, so historical
reproducibility is preserved.

**Why.** Prompts are the most-iterated knob and already DB-backed/no-deploy. Today
an edit is immediately live with no draft, no history, no rollback — risky. Draft
+ publish + history makes prompt iteration safe and auditable, and provider/locale
specificity improves measurement quality without code changes.

**Complexity.** L. Schema + store logic (merge published over defaults,
provider-specific resolution) + editor UI.

**Migration impact.** Additive columns/table; default `status='published'` for
existing rows so current behaviour is identical. The generator's fallback to code
defaults stays.

---

## 8. Recommendation engine separation

**Change.** Move the orchestration out of `app/api/recommendations/route.ts` into
`lib/recommendations/` with four explicit, ordered layers: **(a) measured facts**
(pure, from DB), **(b) derived metrics** (pure), **(c) recommendation selection**
(currently LLM — keep, but it picks from a typed catalog and never computes
numbers), **(d) natural-language explanation** (LLM writes prose only). The LLM
must never produce a score, benchmark, confidence, or impact number — those are
computed in (a)/(b) and passed in.

**Why.** This is your stated principle ("LLMs explain, never calculate") made
structural. Today a 335-line route handler interleaves all four; numbers and
prose come from the same model call, which is exactly the integrity risk. Pure
fact/metric layers are testable (feed them into #6) and the route becomes a thin
caller.

**Complexity.** L. Mostly mechanical extraction + tightening the LLM contract;
risk is in preserving identical output for unchanged inputs (snapshot-test it).

**Migration impact.** Drop the legacy dual-write to `audits.recommendations` JSON
blob *after* a read-compat window (additive: keep reading it, stop writing it,
backfill, then remove). No schema break.

---

## 9. Security: real users, audit log, least privilege

**Change.** Phased. (a) `admin_users (id, email, password_hash, role, created_at)`
+ `admin_audit_log (id, user_id, action, target, at, data)`; sessions tie to a
user; keep the shared password as a seeded fallback during migration. (b) Role
separation (admin vs operator vs read-only) checked in middleware + route guards.
(c) Reduce service-role usage by routing read-only customer-facing queries
(dashboard) through the anon key + RLS policies, keeping service-role for the
trusted pipeline only. RLS stays enabled throughout.

**Why.** The single shared password with service-role-everywhere is the biggest
structural risk in the system (a leaked key = whole-DB compromise; no "who did
what"). Per-user identity + audit log is table-stakes past a 2-person team; least
privilege shrinks the blast radius.

**Complexity.** XL (auth + RBAC + audit log is L; the service-role/RLS reduction
is the long tail — do it incrementally, surface by surface).

**Migration impact.** Additive tables. Auth flow changes for operators (login by
user), but the cookie/session mechanism is reused. Customer dashboard behaviour
unchanged. Highest-care item; gate behind a feature flag and migrate operators
deliberately.

---

## 10. Cost controls

**Change.** (a) A provider cost table in Settings (€/grounded call, €/ungrounded);
(b) `estimateAuditCost(settings, promptCount)` shown before manual/bulk runs;
(c) a daily spend ledger (aggregate `model_runs` by day, or a small
`provider_spend` counter) with a **hard daily cap** that fails new audits closed
when exceeded; (d) **per-provider-call timeout** via `Promise.race` (today a hung
provider blocks its whole cohort up to the 20-min ceiling); (e) a provider-health
cache (short-TTL table) so preflight isn't re-run constantly; (f) provider
fallback ordering when one is unhealthy.

**Why.** Per-audit cost is dominated by grounding fees; a careless bulk run is a
five-figure mistake, currently mitigated only by *not* auto-auditing imports. A
hard cap, pre-flight estimate, and call timeouts are the difference between
"scary to run at scale" and "safe." Timeouts are also the top throughput fix.

**Complexity.** L. Each piece is S–M; the cap/ledger needs care to be correct and
race-safe.

**Migration impact.** Additive (Settings fields + optional counter table).
Behaviour-preserving except the intended guardrails (caps/timeouts), which only
trigger in abnormal conditions.

---

## 11. Observation Engine expansion

**Change.** Additively enrich `observations`: record `algo_versions` (from #1),
per-provider mention booleans already exist — add per-provider *position/sentiment*
where available, and stamp `scoring_version`/`benchmark_version` so trend queries
can segment by methodology. Add an append-only `observation_snapshots` (or reuse
`score_history`) keyed to capture **signal changes over time** for a restaurant
(what changed between audits). Store enough to answer "how did confidence/benchmark
evolve" without re-running audits.

**Why.** The moat's value compounds with longitudinal data. Recording versions
alongside observations means future research isn't corrupted by methodology
changes (you can compare like-with-like). Capturing inter-audit signal deltas is
the data foundation for the monitoring product (#12).

**Complexity.** M. Additive columns + a delta-capture step in the pipeline.

**Migration impact.** Additive. The `UNIQUE(audit_id)` invariant stays; new
columns nullable for historical rows.

---

## 12. Monitoring product — architecture only

**Change.** No UI redesign. Make recurring audits real at the data/scheduler
layer: `monitoring_schedules` already exists — wire `/api/monitoring/run` (cron,
CRON_SECRET) to enqueue due re-audits through the (hardened) queue (#4), tag those
audits as `source='monitoring'` (additive column), and rely on `score_history` +
the #11 deltas for trend/competitor-movement/provider-change data. An
`emailMonthlySummary()` builder (deterministic, reusing existing report sections)
sends the digest via Resend.

**Why.** Monitoring is the next revenue tier and the architecture already
anticipates it; this connects the existing pieces (schedule table, score history,
queue, email) without new product surface. Doing the plumbing now means the
feature is a UI exercise later, not a re-architecture.

**Complexity.** L. Scheduler wiring (M) + summary builder (M); depends on #4 and
#11.

**Migration impact.** Additive (`audits.source` column, schedule activation). No
behaviour change until a schedule is created.

---

## 13. Engineering hygiene (continuous)

**Change.** (a) Converge `metrics.ts`/`metrics-v2.ts` onto `metrics-core` (remove
duplication). (b) Move business logic out of route handlers into `lib/`
(recommendations is the worst offender — covered by #8). (c) Generate/strengthen
TypeScript types for DB rows (a `lib/db-types.ts` derived from the schema) and
type the JSONB shapes (`score_breakdown`, `reliability`, `facts`). (d) Turn ESLint
back on with a pragmatic config. (e) Split the monolithic PDF document by plan
variant. (f) Add a thin integration-test layer for the glue (route handlers,
queue cron) — the least-tested, riskiest code. (g) Migrate the deprecated
`@google/generative-ai` SDK.

**Why.** This is the debt that compounds: duplication causes drift, untyped JSONB
feeds customer-facing numbers unchecked, no linting means silent inconsistency,
and the glue is exactly what breaks in production. Each is independently shippable.

**Complexity.** Ongoing; individual items S–M, except types (M) and the PDF split
(M).

**Migration impact.** None (code-only). Behaviour-preserving by construction;
guard the metrics convergence with #6 golden tests.

---

## Recommended sequence (each phase ships independently, no behaviour change)

**Phase 1 — Foundations & observability** *(S–M, ~3–5 days, zero risk)*
#1 version registry → #2 raw-evidence columns → #3 event timeline → #4 queue
backoff. These are additive, deterministic, and unlock everything else. Start
here.

**Phase 2 — Safety nets** *(L, ~1 week)*
#6 golden-dataset harness → #10 cost controls (budgets + per-call timeouts +
health cache). After this, algorithm changes are regression-guarded and bulk
audits are financially safe.

**Phase 3 — Determinism & quality** *(L, ~1–1.5 weeks)*
#8 recommendation separation → #13 hygiene (metrics convergence, DB types,
ESLint) → #7 prompt management. Guarded by Phase-2 golden tests.

**Phase 4 — Longitudinal & monitoring** *(L)*
#11 observation expansion → #12 monitoring plumbing.

**Phase 5 — Security** *(XL, deliberate)*
#9 users/RBAC/audit-log, then incremental service-role reduction.

**#5 adaptive execution:** deferred / opt-in-only, pending your call on the
cost-vs-moat tradeoff (see item #5).

Every phase: additive migrations, snapshot/golden tests to prove identical output
for unchanged inputs, and a short note appended to this doc describing what
changed and why.

---

## Implemented — Phases 1 & 2 (migration 024)

Shipped together, additive and behaviour-preserving. Apply
`supabase/migrations/024_architecture_hardening.sql`.

**#1 Versioning.** `lib/versions.ts` is the single registry
(`SCORING_VERSION` reuses the existing `METHOD_VERSION='v2'`). Stamped onto
`audits.algo_versions` at run start and onto `recommendations.algo_version`.
Historical audits read as legacy versions.

**#2 Raw evidence.** `model_runs` gains `prompt_vars` (the template fill
variables) and `parsed_response` (the structured extraction, persisted so parser
changes can be replayed offline). `prompt_version` column added for #7.

**#3 Event timeline.** New `audit_events` table + `lib/audit/events.ts`
(`emitEvent`, best-effort, never fails an audit). Emitted at every pipeline
boundary and shown as a per-stage latency timeline in the admin audit viewer
(`components/admin/audit-timeline.tsx`).

**#4 Queue hardening.** `audit_queue` extended (`job_type`, `payload`,
`last_error`, `next_retry_at`, `status`). The cron now does exponential backoff
(1m→2m→4m… capped 1h) and a terminal `failed` state that also marks the audit
failed — no more silently stalled rows.

**#6 Golden dataset.** `tests/golden/` fixtures freeze the deterministic chain
(metrics → score → competitors); `tests/golden.test.ts` replays them with no
network/LLM and diffs against baselines. Re-baseline intentional changes with
`GOLDEN_UPDATE=1 npm test`. Wired into `npm test`.

**#10 Cost controls.** `lib/cost.ts` + Settings fields (`dailyBudgetCents`,
`providerTimeoutMs`, per-call price estimates) + a `daily_spend` ledger and
`provider_health` cache. The pipeline now: estimates cost up front and refuses to
start if it would exceed the daily cap (0 = disabled, the default); applies a
per-provider-call timeout (a hung provider no longer blocks its cohort); and
reuses a fresh provider-health cache so batches skip redundant preflight probes.
Operator-settable under Settings → Cost controls.

Deferred per decision: **#5 adaptive execution** (opt-in/default-off, later).
Remaining phases 4–5 unchanged.

## Implemented — Phase 3 (in progress)

**#8 Recommendation separation.** The 380-line route is now a thin orchestrator
over four explicit layers, all pure and testable:
- `lib/recommendations/parse.ts` — tolerant JSON salvage (parser layer).
- `lib/recommendations/prompt.ts` — facts assembly + the prompt (the LLM's
  text-only contract; the model is asked only to write prose).
- `lib/recommendations/enrich.ts` — the DETERMINISTIC layer: fix type, impact/
  effort, priority rank, measured benchmark, data-source attribution and the
  confidence band are all computed in code. **The LLM never calculates a number.**
- the route wires them: load → reliability gate → facts → prompt → LLM → parse →
  enrich → store.
Behaviour-preserving by relocation (prompt string byte-identical); new unit tests
in `tests/recommendations.test.ts` lock the parser + enrichment.

**#7 Prompt management** (migration 025). The override layer (011) is now a
managed workflow:
- `status` (draft|published) on `prompt_templates` — audits read **published**
  only; existing rows default to published so behaviour is unchanged.
- Edits are saved as **drafts** and don't affect audits until **Publish**, which
  snapshots the prior published set to the new `prompt_template_history` table.
- **Version history**, **rollback** (itself snapshotted, so reversible) and a
  per-category **diff** of any version vs current — all in the admin editor.
- `provider` column added for future provider-specific overrides, but **not**
  wired into audit execution on purpose: every model must answer the same prompt
  for cross-model consensus to mean anything.
Editor (`components/admin/prompt-editor.tsx`) updated with draft badges, a
publish/discard bar, and a history+diff panel.

**#13 Engineering hygiene.** No migration.
- **Metrics convergence:** `metrics.ts` (read-time) and `metrics-v2.ts`
  (audit-time) no longer duplicate the per-model breakdown, sentiment breakdown
  and position-score loops — both now call shared primitives in
  `metrics-core.ts` (`computeModelBreakdown`, `computeSentimentBreakdown`,
  `weightedPositionScore`). Guarded behaviour-safe by **new characterization
  tests** for `computeMetrics` (`tests/metrics.test.ts`, baselined against the
  pre-refactor output) plus the existing golden tests for the v2 chain.
- **DB types:** `lib/db-types.ts` documents/types the JSONB payloads
  (`ParsedResponseJson`, `PromptVarsJson`, algo-versions/score-breakdown/
  reliability) and the most-handled rows (audit/restaurant/model_run), to be
  adopted incrementally in place of `any`. Types-only; zero runtime change.
- **ESLint:** turned back on with a pragmatic, **build-safe** flat config — a
  small set of high-signal correctness rules (dupe keys, unsafe negation,
  constant binary expr, self-compare, unreachable, fallthrough, isNaN,
  hooks rules) all at `warn`, so `npm run lint` surfaces real bugs but
  `next build` never fails on style. Style rules (unused vars etc.) stay off by
  design.
- Business-logic-out-of-routes was delivered by **#8** (recommendation engine).

Phase 3 complete (#8, #7, #13). Optional remainders flagged but not done:
splitting the monolithic PDF document and migrating the deprecated Gemini SDK —
both larger and better as their own change.

Phases 4–5 (observation expansion #11 + monitoring #12; security #9) unchanged.
