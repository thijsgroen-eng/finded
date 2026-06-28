# Observation Engine V2 — Architecture & Design

> Status: **DESIGN — awaiting approval. No code changes yet.**
> Goal: make the Observation Engine the single, deterministic source of truth for
> every AI interaction, benchmark, pattern, recommendation and trend — queryable
> years later without re-running audits. SQL + deterministic code + materialized
> views. **No LLMs in analytics.**

---

## 1. Current architecture (review)

### Schema (today)
- **`observations`** (migration 019, extended by 026) — **one row per audit**:
  `audit_id` (unique), `restaurant_id` (set-null), segment dims (`city`, `cuisine`,
  `country`, `business_type`), outcomes (`visibility_score`, `mention_frequency`,
  `mentioned_any`), a **`facts` JSONB** blob, `algo_versions`, `scoring_version`,
  `benchmark_version`, `created_at`. Indexes: `(lower(cuisine), lower(city))`,
  `(created_at desc)`, `unique(audit_id)`. RLS on.
- **`observation_changes`** (026) — one row per audit: deltas vs the previous
  audit (`visibility_delta`, `mention_frequency_delta`, `facts_changed`,
  `providers_changed`, `prev_audit_id`).
- The **`facts` JSONB** holds booleans: `restaurant_schema`, `html_menu`,
  `menu_format`, `faq_present`, `dietary_present`, `reviews_present`,
  `opening_hours_present`, `location_present`, and per-provider
  `mentioned_{openai,anthropic,gemini,perplexity}`.

### Observations captured
One **coarse, per-audit summary**. All providers and all prompts are collapsed
into a handful of booleans + one visibility/mention number. There is **no**
per-provider, per-prompt, per-intent, per-citation, or per-competitor granularity
in the Observation Engine itself — that richer data lives only in the
**operational** tables (`model_runs`, `mentions`, `entities`, `competitors`,
`prompt_runs`, `website_audits`, `visibility_scores`, `recommendations`), which
are shaped to render *one* audit's report, not to be queried across millions.

### Benchmarks / aggregations / analytics (today)
All in **`lib/observations/index.ts`**, computed in **JavaScript in memory**:
`loadObservations()` pulls up to **5,000** rows, then `computeBenchmark`,
`computePatterns` (lift, min group 5, min lift 1.25), `factBenchmark`,
`scoreBuckets`, `perModelMentionRates`, `platformStats`. The Insights API filters
these in JS. Recommendations read the same patterns for confidence.

### Current limitations
1. **Grain is too coarse.** Cannot answer per-provider, per-prompt-intent,
   per-citation, or co-occurrence questions — the data isn't in the engine.
2. **No citations.** `model_runs.sources` exists operationally but is never
   captured into the engine → "which citation sources influence ChatGPT" is
   unanswerable.
3. **In-memory, capped at 5,000 rows.** Hard ceiling; O(n) JS scans; no SQL,
   no indexes, no percentiles, no materialized views. Will not survive 10⁵
   restaurants / 5×10⁶ audits / 5×10⁸ observations.
4. **No recommendation impact tracking.** No implemented/verified/visibility-
   change-after — so "which recommendation has the highest measured impact" and
   "which restaurants improved after implementing" cannot be measured.
5. **No correlation/significance engine.** `computePatterns` is a single lift
   ratio with a fixed threshold; no measured correlations with sample size /
   significance across arbitrary signals.
6. **Thin benchmarks.** Only avg + fact-rates + pctMentioned. No median, no
   percentiles (top 10/25%, bottom 25%), no distribution-as-data, no confidence.
7. **Limited dimensions.** No price range, chain-vs-independent, neighborhood,
   provider-release, season; prompt intent isn't stored on the observation.
8. **No trend/drift/seasonality detection.** `observation_changes` is per-audit
   only; no period-over-period provider drift or seasonality.
9. **Reproducibility is partial.** Versions are stamped on the audit summary, but
   the granular interactions aren't preserved in analyzable form, so re-querying
   the past at fine grain means re-reading operational tables (which may be
   pruned/changed) — not "years later without re-running."

---

## 2. Weaknesses (summary)

The current engine is a **per-audit rollup computed in app memory** — excellent
as a cheap moat seed, structurally wrong as "the core intelligence platform." It
conflates the *fact* (what each AI interaction was) with a *summary*, throws away
the dimensions analytics needs, and aggregates in JavaScript with a row cap. It
cannot scale, cannot answer the design-goal questions, and isn't a durable
historical record at the interaction grain.

---

## 3. Observation Engine V2 (design)

### Principle: an append-only analytical warehouse beside the OLTP tables
Keep the operational tables exactly as they are (audits keep working). Add a
**deterministic, append-only, versioned, partitioned fact+dimension layer** that
is written at audit time (dual-write) and backfilled from history once. Analytics
become **SQL over materialized views**, never JS scans.

Grain, from coarse to fine (each append-only, each stamps the algo versions):

```
dim_prompt            (prompt_hash) — dedup of every distinct prompt + intent/category/language
dim_provider_release  (provider, model, model_version) — provider drift timeline
dim_restaurant_anon   (restaurant_id) — anonymized attributes only (cuisine/city/country/type/price/chain/neighborhood)

obs_audit             1 row / audit         — segment dims, scores, versions, outcome  (today's `observations`, evolved)
obs_call              1 row / (audit,provider,prompt,sample)  — THE AI-interaction fact
obs_citation          1 row / (call, citation domain)         — citation source + type
obs_competitor        1 row / (audit, competitor)             — for co-occurrence
obs_signal            1 row / audit (typed columns)           — website signals for correlation
obs_recommendation    1 row / recommendation                  — + impact tracking
```

### 3.1 `obs_call` — the AI-interaction source of truth
One row per model call, the spine of "every AI interaction queryable years
later". Narrow, typed, partitioned by month on `observed_at`.

Columns (typed, not JSON): `id`, `audit_id`, `restaurant_id`, `observed_at`,
`provider`, `provider_model`, `provider_version`, `prompt_hash`,
`prompt_category`, `prompt_intent`, `prompt_language`, `grounded`,
`mentioned` (bool), `mention_position` (int null), `mention_count` (int),
`sentiment` (smallint −1/0/1 null), `response_length` (int), `no_result` (bool),
`duplicate_response` (bool), `error` (text null), `tokens` (int null),
`cost_cents` (numeric null), `duration_ms` (int), plus the version stamps
(`prompt_version`, `parser_version`, `scoring_version`, `recommendation_version`,
`benchmark_version`), `created_at`. Raw text is **not** duplicated here — a
pointer (`model_run_id`) links back if ever needed; analytics never need the raw
blob.

### 3.2 `obs_citation`
One row per (call, domain): `call_id`, `audit_id`, `provider`, `domain`,
`citation_type` (enum: review / maps / guide / social / own_site / directory /
news / other — deterministic classifier already exists in `lib/audit/authority`),
`observed_at`. Powers "which citation sources influence ChatGPT most" and citation
drift over time.

### 3.3 `obs_competitor` + co-occurrence
One row per (audit, competitor canonical_key, providers[]). Co-occurrence
("which competitor appears most with another") is a deterministic self-join /
materialized view over pairs within the same audit — `mv_cooccurrence`.

### 3.4 `obs_signal` (typed website signals)
One row per audit with **typed boolean/enum columns** (not JSON) so correlations
are plain SQL: `schema_detected`, `menu_detected`, `menu_format`,
`reservation_widget`, `pricing_detected`, `opening_hours`, `faq`, `social_links`,
`review_links`, `blog`, `images`, `language_count`, `accessibility`. (Some of
these — reservation_widget, pricing, blog, images, language_count, accessibility
— are **not captured today**; see §6 capture gaps.)

### 3.5 `obs_recommendation` (+ impact tracking)
One row per recommendation: `audit_id`, `restaurant_id`, `type`, `category`,
`priority`, `difficulty`, `expected_impact`, `confidence`, version stamps, and the
**impact-tracking columns**: `implemented` (bool), `implementation_date`,
`verified` (bool), `visibility_before`, `visibility_after`, `visibility_change`,
`days_until_effect`. Filled deterministically by linking an implementation date to
the next completed audit's score (a scheduled job), enabling "highest measured
impact" and "who improved after implementing".

### 3.6 Dimensions
- `dim_prompt(prompt_hash PK, category, intent, language, example_text)` — one row
  per distinct prompt; intents from the fixed enum (Discovery/Romantic/Family/…).
- `dim_provider_release(provider, model, model_version, first_seen, last_seen)` —
  detects when a provider shipped a new model (drift boundary).
- `dim_restaurant_anon(restaurant_id PK, cuisine, city, country, business_type,
  price_range, chain, neighborhood)` — anonymized; analytics join here, never to
  `restaurants`, preserving the "never expose individual data" rule.

### 3.7 Time
Partition facts by `observed_at` (monthly RANGE partitions). Expose
`day/week/month/quarter/year/season` and `provider_release` via a `dim_date`
or generated columns; seasonality and period-over-period read from these.

---

## 4. Analytics layer — deterministic, as materialized views

Every dashboard number comes from a **materialized view** refreshed on a schedule
(cron, `REFRESH MATERIALIZED VIEW CONCURRENTLY`). The UI queries MVs (fast,
pre-joined); it never scans facts live and never aggregates in JS.

- `mv_benchmark` — group by (segment dims × provider × intent × period):
  `avg`, `median` (`percentile_cont(0.5)`), `p90`, `p75`, `p25`, distribution
  buckets, `n`, and a confidence (Wilson / sample-size band).
- `mv_correlation_signal` — for each signal: mention/visibility **with vs without**,
  measured lift, `n_with`, `n_without`, and a **significance gate** (two-proportion
  z / Welch t, min sample) → only statistically measurable relationships are
  emitted. No invented correlations.
- `mv_provider_month` — provider × month: mention rate, avg position, citation mix
  → drift & change detection.
- `mv_pattern` — lift per fact per segment (today's `computePatterns`, in SQL).
- `mv_cooccurrence` — competitor pair counts within audits.
- `mv_recommendation_impact` — recommendation type → avg `visibility_change`, `n`,
  stability (variance).
- `mv_citation_influence` — citation_type/domain × provider → frequency, and
  correlation of citation presence with mention.

All of the **Analytics Layer**, **Correlation Engine**, **Benchmark Engine** and
**Pattern Engine** requested map onto these MVs + a small set of pure SQL
functions (percentiles, z-test, slope). Pattern summaries are deterministic
template strings over the measured numbers (like today's `patternEvidence`), never
LLM-generated.

### Research Layer (architecture only)
Versioned, anonymized aggregate views ready to surface publicly later:
`research_ai_visibility_index` (weighted aggregate over the latest period),
`research_monthly_trends`, `research_provider_report`, `research_cuisine_report`,
`research_city_report`. Each stamps `benchmark_version` so a published number is
reproducible. No UI now.

---

## 5. Admin dashboard (Insights V2)

Expand the existing Insights page into tabs, each backed by an MV/endpoint:
**Overview · Benchmarks · Patterns · Provider Comparison · Citation Analysis ·
Correlation Explorer · Trend Explorer · Opportunity Explorer · Recommendation
Impact · Observation Explorer**. Filters: date range, provider, model, cuisine,
city, country, prompt intent, mentioned, website signals, recommendation category,
benchmark. Charts use deterministic MV data only.

---

## 6. Migration strategy (additive, non-breaking, incremental)

Normal audits keep working at every step; nothing is rewritten in place.

- **Phase A — Schema.** Additive migrations create the V2 tables (dims + facts,
  partitioned, empty) + the MVs (empty). No reads/writes change yet.
- **Phase B — Dual-write.** The Inngest audit pipeline, *in addition to* today's
  `recordObservation`, writes the granular facts (`obs_call` per `model_run`,
  `obs_citation` per source, `obs_competitor`, `obs_signal`, `obs_recommendation`).
  Best-effort, wrapped so it never fails an audit. `observations` (now `obs_audit`)
  stays.
- **Phase C — Backfill.** A one-time, idempotent job replays existing
  `model_runs/mentions/entities/competitors/website_audits/visibility_scores/
  recommendations` into the facts (per audit, upsert). This realizes "query years
  later without re-running" for the existing corpus.
- **Phase D — Materialized views + refresh cron** (`/api/cron/refresh-insights`,
  CRON_SECRET). Golden tests assert MV outputs match the current JS aggregators on
  the same data (parity gate).
- **Phase E — Repoint reads.** Insights API + recommendation confidence read MVs/
  SQL instead of `loadObservations()`. Keep `lib/observations` functions as thin
  shims during transition.
- **Phase F — Deprecate** the 5,000-row JS path once parity is proven.

**Capture gaps to close along the way** (fields requested but not collected
today): per-call `tokens`/`cost`, `hallucination_score`, `duplicate_response`,
reservation_widget/pricing/blog/images/language_count/accessibility,
price_range/chain/neighborhood on the restaurant, recommendation
implemented/verified/impact, prompt_embedding. Each is additive; some (embeddings)
need `pgvector` and are explicitly **future**.

---

## 7. Database impact

- **New tables only** — no destructive change; OLTP untouched.
- **Volume:** `obs_call` ≈ prompts × samples × providers per audit (~128 at
  defaults). 5M audits → ~640M call rows; citations a similar order → the
  500M-row target. Rows are **narrow & typed** (no raw text), so storage is
  modest relative to `model_runs` (which already stores the raw responses).
- **Anonymization preserved:** analytics join `dim_restaurant_anon`, never
  `restaurants`; RLS stays on; identity never enters an aggregate.
- **Reproducibility:** every fact carries the algo-version stamps; algorithm
  changes never rewrite old facts — old rows keep their versions, new audits use
  new ones, so cross-version comparisons are explicit.

---

## 8. Performance impact (designed for 10⁵ restaurants / 5×10⁶ audits / 5×10⁸ obs)

- **Partitioning:** `obs_call`, `obs_citation` RANGE-partitioned by month;
  queries prune to the date window.
- **Indexes:** BRIN on `observed_at` (cheap on huge append-only tables); btree on
  `(provider, observed_at)`, `(prompt_intent)`, `(restaurant_id)`; partial indexes
  where filters are common. GIN only if any JSON survives (goal: none in hot path).
- **Materialized views are the query layer** — the dashboard hits small,
  pre-aggregated MVs, not the 500M-row facts. Refreshed by cron (hourly/daily).
- **No expensive live joins:** all joins happen at refresh time inside the MVs.
- **Caching:** MV results are the cache; add short-TTL HTTP/in-memory caching on
  the Insights endpoints. The current `loadObservations()` (full-table scan into
  JS) is removed.

---

## 9. Recommended decision points (need your approval before code)

1. **Grain of `obs_call`:** per (audit, provider, prompt, sample) — agreed? This
   is the 500M-scale table.
2. **Partitioning now vs later:** introduce monthly partitions from day one
   (recommended) vs add when volume warrants.
3. **Dual-write + backfill** as the migration (recommended) vs derive MVs directly
   from operational tables (cheaper now, but not a durable record if those tables
   are pruned).
4. **Scope of first implementation slice.** Suggested Phase 1: `obs_call` +
   `obs_citation` + `dim_prompt` + dual-write + backfill + `mv_provider_month` and
   `mv_benchmark` + repoint the Insights Provider/Citation/Benchmark tabs. Defer
   recommendation-impact and the research layer to a later phase (they need the
   new capture fields).

Once you approve the grain, partitioning, migration approach and the Phase 1
slice, I'll implement incrementally — additive migrations first, dual-write,
backfill, MVs, then repoint reads — with golden parity tests at each step.

---

## 10. Approved refinements (V2.1) — warehouse hardening

Direction approved. The following refinements are folded in. Each lists *why it
improves long-term maintainability* and *its trade-off*. Migrations stay additive;
audits never break; parity with the current engine is maintained until V2 is
validated.

### Warehouse naming (fact_* / dim_*)
The schema separates **immutable facts** (grain-level measurements) from
**dimensions** (reusable descriptive entities). Final names:

```
dim_date              calendar (day/week/month/quarter/year/season)
dim_provider          provider + model + VERSION (one row per release)        [#1]
dim_provider_event    provider release/behaviour-change timeline               [#8]
dim_prompt            distinct prompt (hash, category, intent, language)
dim_restaurant        anonymized restaurant attributes (cuisine/city/country/type/price/chain/neighborhood)
dim_feature_snapshot  reusable website-state snapshot (dedup by website_hash)  [#4]
dim_experiment        experiment registry (control/treatment)                  [#9]

fact_audit            1/audit   — rollup: scores, outcome, snapshot ref, quality, versions
fact_provider_response 1/(audit,provider,prompt,sample) — THE AI interaction   [#1,#2,#7,#9]
fact_response_evidence 1/response — immutable raw evidence (hash + compressed)  [#5]
fact_citation         1/(response,url) — citation graph edge                    [#6]
fact_entity           1/(response,entity) — extracted mentions + competitors
fact_recommendation   1/recommendation — + impact tracking
```
*Why:* unambiguous fact/dimension separation is the convention every BI tool,
analyst and future API expects; it keeps facts narrow (fast) and descriptive data
in one reusable place. *Trade-off:* the snapshot is reusable state, so it's a
`dim_` (referenced by facts) rather than the `fact_signal` name floated earlier —
a reasoned deviation; documented here so it's not a surprise.

### 1 — Provider versioning (mandatory)
`dim_provider(provider, model, version)` with `unique(provider,model,version)`;
every `fact_provider_response.provider_id` points at an exact release. *Why:*
"did GPT-5.1 change recommendations?" becomes a clean group-by on a stable key —
the core of provider drift analysis. *Trade-off:* the pipeline must resolve the
exact version string per call (we already capture `model_version` on `model_runs`,
so this is wiring, not new capture); unknown versions get an explicit
`version='unknown'` release rather than null.

### 2 — Partitioning from day one
`fact_*` tables `PARTITION BY RANGE (observed_at)`, monthly, with a `default`
partition catch-all + a helper to pre-create months. *Why:* retrofitting
partitions onto a 600M-row table later is a painful migration; doing it now is
free. *Trade-off:* slightly more DDL and a monthly "create next partition" cron;
composite PKs `(id, observed_at)` (partition key must be in the PK) and **no
cross-fact foreign keys** (warehouse style — facts reference by id without FK
enforcement, which is also faster at scale).

### 3 — Immutable, append-only
Facts are INSERT-only; never UPDATE/DELETE in normal operation. Algorithm
improvements create **new rows with new version stamps** (`scoring_version`,
`parser_version`, `recommendation_version`, `benchmark_version`,
`extraction_version`) — history is never rewritten. *Why:* reproducibility —
any past report can be recomputed exactly, and cross-version comparisons are
explicit. *Trade-off:* re-parsing history means inserting a *new generation* of
rows (more storage) instead of mutating — acceptable, and exactly why #5 stores
raw evidence. The one sanctioned mutation is `fact_recommendation` impact
back-annotation, isolated to that table.

### 4 — Feature snapshot layer
`dim_feature_snapshot` keyed by `(restaurant_id, website_hash, crawl_version)`
holds the typed website signals once; `fact_audit`/`fact_provider_response`
reference `feature_snapshot_id`. *Why:* a restaurant's site state is identical
across its ~128 calls per audit and stable across audits — storing it once (not
millions of times) shrinks the warehouse and lets correlations join a small table.
*Trade-off:* a hash/dedup step at write time; signals that change require a new
snapshot row (intended).

### 5 — Raw evidence (immutable)
`fact_response_evidence(response_id, response_hash, compressed_raw_response bytea,
structured_response jsonb, citations jsonb, parsed_entities jsonb)`, 1:1 with the
response fact but stored separately so analytics scans never touch the blobs.
*Why:* "storage is cheaper than repeating AI calls" — future parser/extraction
improvements replay over stored evidence without new provider spend.
*Trade-off:* largest storage component; mitigated by compression + keeping it off
the hot analytic path (separate table, never in MVs).

### 6 — Citation graph
`fact_citation` is an edge table carrying the full chain on each row:
`response_id, prompt_id, provider_id, restaurant_id, entity_name, domain, url,
citation_type, is_own_site, observed_at`. *Why:* one denormalized edge table
answers "which domains are gaining influence", "which URLs vanish", "which
providers cite official sites most" with pure group-by + time windows — no
recursive graph engine needed. *Trade-off:* denormalization duplicates ids per
edge (storage) in exchange for join-free, partition-pruned queries at scale.

### 7 — Observation quality score
Deterministic `quality_score` (0–1) on `fact_audit`/`fact_provider_response` from
crawl completeness, provider success rate, parser confidence, extraction quality,
response validity. MVs include only rows above a threshold. *Why:* keeps
benchmarks/correlations clean — a half-failed audit can't skew the index.
*Trade-off:* the threshold is a tunable that must be versioned (it affects
published numbers), so it's part of `benchmark_version`.

### 8 — Provider events
`dim_provider_event(provider, model, version, event_type, event_date, note)`.
Trend MVs left-join events by date so charts auto-annotate ("GPT-5.1 shipped
here"). *Why:* turns "visibility dropped in March" into "visibility dropped when
Gemini changed its search model" — causal context, deterministically. *Trade-off:*
events are curated input (operator-entered), not auto-detected; auto change-point
detection can later *propose* events but a human confirms.

### 9 — Experiment framework
`dim_experiment` + `experiment_id` & `arm` (control/treatment) on facts. *Why:*
enables controlled before/after measurement of website changes, prompts and
recommendation effectiveness — the rigorous basis for "measured impact".
*Trade-off:* none structurally (nullable columns); the discipline of assigning
arms is operational, added when experiments begin.

### 10 — Correlation engine (statistical only)
Deterministic SQL producing, per signal/segment: direction (+/−), effect size
(Cohen's h / mean diff), 95% CI (Wilson / Welch), `n_with`/`n_without`, and a
min-sample gate; only relationships passing significance + min-n are published.
*Why:* a defensible, never-invented differentiator. *Trade-off:* conservative —
real-but-underpowered relationships stay hidden until enough data; correct
behaviour for a trust-first product.

### 11 — Research layer
Versioned, anonymized aggregate views (`research_ai_visibility_index`,
`research_*_report`, benchmark API shapes) defined over the MVs, each stamping
`benchmark_version`. *Why:* a published index must be reproducible and stable;
building reports on versioned MVs (not ad-hoc queries) guarantees that.
*Trade-off:* none now — architecture only; no implementation this phase.

### 12–13 — Scale (10⁵ restaurants / 5×10⁶ audits / 6×10⁸ responses / 10⁹ entities)
Monthly partitions + BRIN on `observed_at` + narrow typed facts + MV query layer +
no live cross-fact joins. *Why:* the warehouse scales by adding partitions, not by
redesign. *Trade-off:* MVs add refresh latency (minutes-stale analytics) —
acceptable for benchmarks/research; the few real-time needs read facts directly
with partition pruning.

### Trade-offs summary
- More tables + DDL up front (partitions, dims) — paid once, saves a 5-year retrofit.
- More storage (raw evidence, denormalized citations) — deliberately traded for
  never re-calling providers and join-free analytics.
- No FK enforcement on facts — standard warehouse practice; integrity enforced at
  write time in code + parity tests.
- MV staleness — analytics are minutes-old, not live; correct for this workload.

---

## 11. Phase 1 implementation plan (incremental, additive)

1. **029 — warehouse schema (this step).** Create `dim_*` + partitioned `fact_*`
   (empty) + initial monthly partitions + indexes. No pipeline/read change →
   nothing can break; parity is automatic (nothing reads it yet).
2. **030 — dual-write.** Pipeline writes `dim_provider`/`dim_prompt`/
   `dim_feature_snapshot` + `fact_provider_response` + `fact_citation` +
   `fact_response_evidence` alongside today's `recordObservation` (best-effort).
3. **031 — backfill.** Idempotent replay of existing operational tables into the
   facts.
4. **032 — materialized views** (`mv_provider_month`, `mv_benchmark`,
   `mv_citation_influence`) + refresh cron; golden parity vs the current JS
   aggregators.
5. **033 — repoint** Insights (Provider/Citation/Benchmark tabs) + recommendation
   confidence to the MVs; keep `lib/observations` as shims.
6. **Deprecate** the 5,000-row JS path once parity holds.

The legacy `observations`/`observation_changes` tables and `lib/observations`
keep working untouched throughout, so every existing audit, the current Insights
page and recommendations continue functioning until V2 is fully validated.
