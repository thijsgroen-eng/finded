# Finded reliability audit — why a 1/3-provider run still produced a full report

**Scope:** the example run — 72 planned calls, 24 completed, 48 failed (ChatGPT 0/24,
Claude 0/24, Gemini 24/24) — that nonetheless emitted a visibility score, competitor
analysis, recommendations, conclusions and an implementation package.

**Verdict:** the pipeline had exactly one hard gate — "did *any* call succeed?" — so a
single healthy provider was enough to green-light the entire report. Every downstream
metric was computed over successful calls only, so failures were invisible rather than
disqualifying.

---

## 1. Root cause of the failures

### 1a. ChatGPT (OpenAI) — 0/24
`lib/providers/openai.ts` uses the **grounded** path whenever `AUDIT_GROUNDED` is on
(default `true`) and the provider advertises `supportsGrounding`:

```ts
const modelVersion = grounded ? 'gpt-4o-mini-search-preview' : 'gpt-4o-mini'
if (grounded) params.web_search_options = {}
```

A *uniform* 0/24 is not transient — it is a systemic rejection of every grounded call.
Most likely, in order of probability:
1. **Web-search/model entitlement.** `gpt-4o-mini-search-preview` + `web_search_options`
   requires access the account may not have (plan/region/feature gating). Plain
   `gpt-4o-mini` would work — which is why extraction (below) still ran.
2. **Invalid key / no credit / org mismatch** on `OPENAI_API_KEY`.

> Note: a *missing* key cannot cause this. `getProvider()` throws in the constructor when
> the key is absent, and the provider is dropped from `getAvailableProviders()` — there
> would be **0 planned** calls, not 24 failed. 24 failures means the key is present but
> the **call** is rejected.

### 1b. Claude (Anthropic) — 0/24
`lib/providers/anthropic.ts` calls `claude-haiku-4-5-20251001` and, when grounded, attaches
the server-side web-search tool:

```ts
params.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }]
```

Decisive corroboration: **`lib/engine/entity-extractor.ts` calls the *same* model**
(`claude-haiku-4-5-20251001`) **without** the web-search tool, and it ran successfully on
Gemini's responses. Same model, same key — the only difference is the `web_search_20250305`
tool. That isolates the most probable root cause to **web-search-tool entitlement (or a tool
version the account can't use)**, with invalid-key/no-credit as the secondary candidate.

### 1c. Why Gemini survived
Gemini uses a different grounding mechanism, so it isn't subject to the OpenAI/Anthropic
web-search entitlements. It wasn't "better" — it was simply the provider whose call shape
the account is allowed to make.

### Confirmed root cause (2026-06-25): provider billing, not grounding
The `model_runs.error` query below returned:
- **Claude:** `400 invalid_request_error — "Your credit balance is too low to access the
  Anthropic API."` → Anthropic account out of credit.
- **ChatGPT:** `429 — "You exceeded your current quota..."` → OpenAI out of credit / billing cap.

Gemini runs on a separately-funded Google account, so it survived. The grounding-entitlement
hypothesis was ruled out. **Fix is purely account billing** (top up OpenAI + Anthropic); no
code change recovers it.

> Wider blast radius: `ANTHROPIC_API_KEY` also powers entity extraction
> (`entity-extractor.ts`), recommendation generation (`/api/recommendations`) and fix-asset
> generation. While Anthropic was out of credit, even Gemini's answers had degraded
> extraction (keyword fallback), and generating recommendations/implementation would fail.

**The query used:**
```sql
select model, status, left(error, 200) as error
from model_runs
where audit_id = '<AUDIT_ID>' and status = 'failed'
order by model;
```

---

## 2. Is Gemini a fallback? — No.
There is no fallback, promotion, or cross-provider retry anywhere. For each
`(prompt, sample)` the pipeline runs **all available providers in parallel**
(`audit-function.ts`, `Promise.all(providers.map(...))`). Gemini appearing as "the source"
is pure survivorship, not design. The only retry is Inngest re-running a whole step, and the
per-call `try/catch` swallows provider errors so the step never actually throws.

---

## 3. How the visibility score was computed when 2/3 models failed
The math silently excluded the failures:

- **Mentions exist only for successes.** A failed call `return`s before the `mentions`
  insert, so `sample_count = mentions.length` counted **only the 24 Gemini cells**.
- **Confidence band was false-tight.** The Wilson interval was computed over those 24
  successes as if 24 were the whole sample — the 48 failures never widened it.
- **Consensus denominator collapsed.** `providersRan` was the count of *successful* models
  (= 1), so "1 of 1 models mention you" read as **100% consensus** instead of the honest
  **1 of 3**.
- **`confidence_score` ignored failures entirely** — it was `0.5·completeness +
  0.5·sampleFactor`, both satisfiable by Gemini alone, so a 33%-complete run could score as
  high-confidence.
- Weighted components renormalize over present data, so "missing" never penalised — it just
  vanished.

Net: the score described **Gemini's worldview, presented as the whole market.**

## 4. Why recommendations/implementation were generated anyway
`/api/recommendations` and `/api/admin/prepare-implementation` had **no reliability gate**.
They generated from whatever rows existed. The `data-quality` rating ("Low") was **display
only** — computed at render time, enforced nowhere.

## 5. Why the audit wasn't marked inconclusive
The pipeline's only negative terminal state was `totalSuccessful === 0` → `failed`. Anything
above zero → `completed`. There was no `incomplete`/`inconclusive` concept and no minimum
threshold. "Low data quality" was a cosmetic badge, not a state.

---

## Reliability weaknesses (summary)

| # | Weakness | Effect |
|---|----------|--------|
| 1 | Single gate: `totalSuccessful === 0` | 1 of 72 calls would pass the audit |
| 2 | Metrics computed over successes only | failures invisible to score & confidence band |
| 3 | Consensus denominator = successful models | 1/1 = "100% consensus" |
| 4 | `confidence_score` ignored completion rate | 33%-complete run could read high-confidence |
| 5 | No gate on recommendations/implementation | advice built on too little data |
| 6 | No `incomplete` status | unreliable runs indistinguishable from good ones |
| 7 | Grounding on by default w/ provider-specific web search | one entitlement gap kills 2 providers silently |
| 8 | Present-but-broken key ⇒ 24 failures (not exclusion) | a dead key degrades instead of failing loudly |

---

## Recommended fixes — and what shipped in this change

**Minimum reliability thresholds (`lib/audit/reliability.ts`)** — one source of truth:

| Band | Successful calls | Behaviour |
|------|------------------|-----------|
| 🟢 Green | ≥ 80% (and ≥2 providers) | Full-confidence results |
| 🟡 Yellow | 50–80% | Results shown **with warning + reduced confidence** (×0.6) |
| 🔴 Red | < 50% (or 0 providers) | **No** score / competitors / recommendations / conclusions. Audit marked `incomplete`, rerun requested |

Shipped:
1. **Pipeline gate** (`audit-function.ts`): after sampling, assess reliability from the
   `model_runs` ledger (which records failures). Red → `status = 'incomplete'`, store a
   `reliability` snapshot, set an explanatory `error_message`, **stop before scoring**.
2. **Honest consensus denominator**: `providersRan` is now the number of providers
   *attempted*, so "1 of 3" not "1 of 1".
3. **Reliability-weighted confidence** (`scoring.ts`): `confidence_score` is scaled by the
   completion rate, so failures drag confidence down (back-compatible — defaults to 1).
4. **Route gates**: `/api/recommendations` and `/api/admin/prepare-implementation` return
   **422** for red audits.
5. **Surfacing**: admin detail shows a red "incomplete — rerun" banner and **suppresses the
   score/why/key-findings narrative**; yellow shows a reduced-confidence banner. The public
   report only renders `completed` audits, so `incomplete` ones are never shown. The PDF
   refuses incomplete audits and prints a reduced-confidence banner on yellow.
6. **`data-quality` thresholds aligned** to the same 50%/80% cutoffs.
7. **Schema** (`017_reliability_gating.sql`): adds the `incomplete` status + durable
   `audits.reliability` snapshot.

8. **Pre-flight provider health check** (`audit-function.ts`, `AUDIT_PREFLIGHT`, default on):
   one cheap ungrounded call per provider before the matrix runs. If too few providers are
   reachable to clear the gate, the audit aborts in seconds and stores the real per-provider
   errors (e.g. "Claude: credit balance too low") instead of recording dozens of failures.
   Set `AUDIT_PREFLIGHT=false` to disable.

**Still recommended (not in this change):**
- **Fix the Wilson band** to be computed over *attempted* cells (or annotate it with the
  completion rate) so the interval reflects true uncertainty.
- **Alerting**: emit a metric when any provider's per-audit failure rate is 100%, so a dead
  provider is caught before customers see it.

---

## Validation rules to prevent unreliable reports
These are now enforced in code (R1–R5) or recommended (R6–R7):

- **R1 — Gate before synthesis.** No visibility score unless reliability ≥ yellow.
- **R2 — Gate the advice.** No recommendations/implementation unless reliability ≥ yellow.
- **R3 — Honest denominators.** Consensus and confidence use *attempted* calls, not
  *successful* ones.
- **R4 — Confidence reflects completion.** `confidence_score ∝ completion rate`.
- **R5 — Distinct terminal state.** < 50% success ⇒ `incomplete` (not `completed`/`failed`),
  with a rerun request.
- **R6 — Never present low-confidence as fact.** Red audits show *no* findings on any
  surface (page, public report, PDF).
- **R7 — Fail loud on dead providers.** A present-but-broken key / 100% provider failure
  should surface as an explicit error, ideally pre-flight.
