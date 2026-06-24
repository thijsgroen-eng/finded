/**
 * Pure aggregation of stored audit evidence into the shapes the audit-detail UI
 * renders. No I/O — the page fetches rows and passes them in — so the count logic
 * (which has been a source of confusion: "8 prompts / 34 model runs") is unit
 * testable.
 *
 * A model_runs row is the record of one raw provider call. Failed calls are
 * stored with raw_response prefixed "ERROR:" (see audit-function.ts), so we can
 * separate completed from failed instead of reporting one opaque total.
 */

export interface ModelRunRow {
  model: string
  prompt_id: string | null
  sample_index: number | null
  grounded: boolean | null
  model_version: string | null
  locale: string | null
  duration_ms: number | null
  raw_response: string | null
  /** First-class lifecycle status (013). Older rows may be null → fall back to the
   *  raw_response 'ERROR:' prefix. */
  status?: string | null
}

export interface MentionRow {
  model: string
  prompt_id: string | null
  mentioned: boolean
  mention_frequency: number | null
  position: number | null
  sentiment: string | null
}

export interface PromptRunRow {
  prompt_id: string
  category: string | null
  intent: string | null
  prompt_text: string | null
}

export interface EntityRow {
  prompt_id: string | null
  model: string
  name: string
  confidence: number | null
  is_target?: boolean | null
  normalized_name?: string | null
}

const isFailed = (r: ModelRunRow) =>
  r.status === 'failed' || (r.status == null && (r.raw_response ?? '').startsWith('ERROR:'))

export interface ProviderAccounting {
  model: string
  runs: number
  completed: number
  failed: number
  model_version: string | null
  grounded: boolean | null
  avg_duration_ms: number | null
}

export interface RunAccounting {
  total_runs: number
  completed: number
  failed: number
  distinct_prompts: number
  distinct_providers: number
  /** Distinct sample indexes observed (the N in "N samples per prompt"). */
  samples_per_prompt: number
  /** distinct_prompts × samples_per_prompt × distinct_providers — the planned cell count. */
  expected_runs: number
  any_grounded: boolean
  providers: ProviderAccounting[]
}

/**
 * Break the raw model_runs into a completed/failed accounting that explains the
 * headline counts. `expected_runs` is what a full matrix would produce; the gap
 * between it and total_runs (plus the failed count) is where retries/failures
 * show up.
 */
export function buildRunAccounting(runs: ModelRunRow[]): RunAccounting {
  const prompts = new Set<string>()
  const samples = new Set<number>()
  const providerMap = new Map<string, { runs: number; failed: number; durations: number[]; version: string | null; grounded: boolean | null }>()

  let completed = 0
  let failed = 0
  let anyGrounded = false

  for (const r of runs) {
    if (r.prompt_id) prompts.add(r.prompt_id)
    if (r.sample_index != null) samples.add(r.sample_index)
    if (r.grounded) anyGrounded = true

    const bad = isFailed(r)
    if (bad) failed++; else completed++

    const p = providerMap.get(r.model) ?? { runs: 0, failed: 0, durations: [], version: null, grounded: null }
    p.runs++
    if (bad) p.failed++
    if (!bad && r.duration_ms != null) p.durations.push(r.duration_ms)
    if (r.model_version && !p.version) p.version = r.model_version
    if (r.grounded != null && p.grounded == null) p.grounded = r.grounded
    providerMap.set(r.model, p)
  }

  const distinct_prompts = prompts.size
  const distinct_providers = providerMap.size
  const samples_per_prompt = samples.size || (runs.length > 0 ? 1 : 0)

  const providers: ProviderAccounting[] = [...providerMap.entries()]
    .map(([model, p]) => ({
      model,
      runs: p.runs,
      completed: p.runs - p.failed,
      failed: p.failed,
      model_version: p.version,
      grounded: p.grounded,
      avg_duration_ms: p.durations.length
        ? Math.round(p.durations.reduce((a, b) => a + b, 0) / p.durations.length)
        : null,
    }))
    .sort((a, b) => b.runs - a.runs)

  return {
    total_runs: runs.length,
    completed,
    failed,
    distinct_prompts,
    distinct_providers,
    samples_per_prompt,
    expected_runs: distinct_prompts * samples_per_prompt * distinct_providers,
    any_grounded: anyGrounded,
    providers,
  }
}

export interface PromptEvidenceModel {
  model: string
  ran: number
  failed: number
  mentioned: boolean
  /** mentions in this (prompt,model) over samples that ran. */
  mention_rate: number | null
  best_position: number | null
  model_version: string | null
  grounded: boolean | null
}

export interface PromptEvidence {
  prompt_id: string
  prompt_text: string | null
  category: string | null
  intent: string | null
  locale: string | null
  mentioned_any: boolean
  models: PromptEvidenceModel[]
  /** Competitors AI named for this prompt (top by count) — "who won instead". */
  top_competitors: { name: string; count: number }[]
}

const PROVIDER_ORDER = ['openai', 'anthropic', 'gemini', 'perplexity']

/**
 * Join prompt_runs × mentions × model_runs into one row per prompt, with a
 * per-provider breakdown (did it run, did it fail, was the target mentioned, at
 * what rank, which model version, grounded?). Everything is derived from stored
 * rows; missing values stay null so the UI can render "not recorded" honestly.
 */
export function buildPromptEvidence(
  promptRuns: PromptRunRow[],
  mentions: MentionRow[],
  modelRuns: ModelRunRow[],
  entities: EntityRow[] = [],
): PromptEvidence[] {
  // Per-prompt competitor tally (non-target names) → "who won instead".
  const competitorsByPrompt = new Map<string, Map<string, { name: string; count: number }>>()
  for (const e of entities) {
    if (!e.prompt_id || e.is_target) continue
    const key = (e.normalized_name || e.name || '').toLowerCase()
    if (!key) continue
    const byKey = competitorsByPrompt.get(e.prompt_id) ?? new Map()
    const slot = byKey.get(key) ?? { name: e.name, count: 0 }
    slot.count++
    byKey.set(key, slot)
    competitorsByPrompt.set(e.prompt_id, byKey)
  }
  // Index runs + mentions by prompt_id then model.
  const runIndex = new Map<string, Map<string, ModelRunRow[]>>()
  for (const r of modelRuns) {
    if (!r.prompt_id) continue
    const byModel = runIndex.get(r.prompt_id) ?? new Map()
    ;(byModel.get(r.model) ?? byModel.set(r.model, []).get(r.model)!).push(r)
    runIndex.set(r.prompt_id, byModel)
  }
  const mentionIndex = new Map<string, Map<string, MentionRow[]>>()
  for (const m of mentions) {
    if (!m.prompt_id) continue
    const byModel = mentionIndex.get(m.prompt_id) ?? new Map()
    ;(byModel.get(m.model) ?? byModel.set(m.model, []).get(m.model)!).push(m)
    mentionIndex.set(m.prompt_id, byModel)
  }

  // prompt_runs may contain duplicates (one per generation); dedupe by prompt_id.
  const seen = new Set<string>()
  const prompts = promptRuns.filter((p) => !seen.has(p.prompt_id) && seen.add(p.prompt_id))

  return prompts.map((p) => {
    const runsByModel = runIndex.get(p.prompt_id) ?? new Map<string, ModelRunRow[]>()
    const mentionsByModel = mentionIndex.get(p.prompt_id) ?? new Map<string, MentionRow[]>()
    const modelNames = new Set<string>([...runsByModel.keys(), ...mentionsByModel.keys()])

    const models: PromptEvidenceModel[] = [...modelNames]
      .sort((a, b) => PROVIDER_ORDER.indexOf(a) - PROVIDER_ORDER.indexOf(b))
      .map((model) => {
        const rs = runsByModel.get(model) ?? []
        const ms = mentionsByModel.get(model) ?? []
        const mentionedRows = ms.filter((m) => m.mentioned)
        const positions = mentionedRows.map((m) => m.position).filter((x): x is number => x != null)
        return {
          model,
          ran: rs.length,
          failed: rs.filter(isFailed).length,
          mentioned: mentionedRows.length > 0,
          mention_rate: ms.length ? mentionedRows.length / ms.length : null,
          best_position: positions.length ? Math.min(...positions) : null,
          model_version: rs.find((r) => r.model_version)?.model_version ?? null,
          grounded: rs.find((r) => r.grounded != null)?.grounded ?? null,
        }
      })

    const locale = (runsByModel.size
      ? [...runsByModel.values()].flat().find((r) => r.locale)?.locale
      : null) ?? null

    const top_competitors = [...(competitorsByPrompt.get(p.prompt_id)?.values() ?? [])]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    return {
      prompt_id: p.prompt_id,
      prompt_text: p.prompt_text,
      category: p.category,
      intent: p.intent,
      locale,
      mentioned_any: models.some((m) => m.mentioned),
      models,
      top_competitors,
    }
  })
}

/** Average LLM extraction confidence across entity rows, or null if unrecorded. */
export function averageExtractionConfidence(entities: EntityRow[]): number | null {
  const vals = entities.map((e) => e.confidence).filter((x): x is number => x != null)
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}
