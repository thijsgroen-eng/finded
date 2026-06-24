/**
 * Aggregate per-competitor provenance from stored entity rows so each competitor
 * in `competitors` carries proof: which providers named it, which prompts
 * surfaced it, and a few raw excerpts. Pure + testable (no I/O); the pipeline
 * feeds it the audit's entity rows.
 */

import { normalizeName } from '@/lib/engine/normalize'

export interface ProvenanceEntity {
  name: string
  model: string
  prompt_id: string | null
  is_target?: boolean | null
  normalized_name?: string | null
  evidence_excerpt?: string | null
  context?: string | null
}

export interface CompetitorProvenance {
  providers: string[]
  prompt_ids: string[]
  sample_evidence: string[]
}

const MAX_EVIDENCE = 3

/**
 * Map of canonical competitor key → provenance. Keyed by normalized name so it
 * lines up with competitors.canonical_key. Excludes the target restaurant.
 */
export function buildCompetitorProvenance(
  entities: ProvenanceEntity[],
  targetName: string,
): Map<string, CompetitorProvenance> {
  const targetKey = normalizeName(targetName)
  const acc = new Map<string, { providers: Set<string>; prompts: Set<string>; evidence: string[] }>()

  for (const e of entities) {
    const key = e.normalized_name || normalizeName(e.name)
    if (!key || key === targetKey || e.is_target) continue

    const slot = acc.get(key) ?? { providers: new Set(), prompts: new Set(), evidence: [] }
    if (e.model) slot.providers.add(e.model)
    if (e.prompt_id) slot.prompts.add(e.prompt_id)
    const excerpt = (e.evidence_excerpt || e.context || '').trim()
    if (excerpt && slot.evidence.length < MAX_EVIDENCE && !slot.evidence.includes(excerpt)) {
      slot.evidence.push(excerpt.slice(0, 280))
    }
    acc.set(key, slot)
  }

  const out = new Map<string, CompetitorProvenance>()
  for (const [key, v] of acc) {
    out.set(key, {
      providers: [...v.providers].sort(),
      prompt_ids: [...v.prompts].sort(),
      sample_evidence: v.evidence,
    })
  }
  return out
}
