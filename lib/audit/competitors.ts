/**
 * Competitor aggregation — the table that carries the sales value.
 *
 * Groups all NON-target mentions across an audit by canonical name and produces
 * one evidence-rich row per competitor: mention count, average position, share of
 * voice, sentiment, and provenance (providers, prompt ids, sample excerpts).
 * Pure + testable; composes the provenance helper. Saved to `competitors`.
 */

import { normalizeName } from '@/lib/engine/normalize'
import { buildCompetitorProvenance, type ProvenanceEntity } from '@/lib/audit/competitor-evidence'

export interface AggEntity extends ProvenanceEntity {
  position?: number | null
  sentiment?: string | null
  reasons?: string[]
}

export interface CompetitorRow {
  name: string
  canonical_key: string
  normalized_name: string
  mention_count: number
  avg_position: number | null
  sentiment_score: number   // -1..1
  share_of_voice: number    // 0..1
  top_reasons: string[]
  providers: string[]
  prompt_ids: string[]
  sample_evidence: string[]
}

const sentimentValue = (s?: string | null) => (s === 'positive' ? 1 : s === 'negative' ? -1 : 0)

/**
 * Aggregate competitor rows from an audit's entity rows. `limit` caps the table
 * (top by mention count). Share of voice is over target + competitor mentions.
 */
export function aggregateCompetitors(entities: AggEntity[], targetName: string, limit = 10): CompetitorRow[] {
  const targetKey = normalizeName(targetName)
  const provByKey = buildCompetitorProvenance(entities, targetName)

  const groups = new Map<string, {
    surface: Map<string, number> // surface name → frequency, to pick a display name
    count: number
    positions: number[]
    sentiments: number[]
    reasons: string[]
  }>()

  let targetMentions = 0
  for (const e of entities) {
    const key = e.normalized_name || normalizeName(e.name)
    if (!key) continue
    if (e.is_target || key === targetKey) { targetMentions++; continue }

    const g = groups.get(key) ?? {
      surface: new Map<string, number>(), count: 0,
      positions: [] as number[], sentiments: [] as number[], reasons: [] as string[],
    }
    g.count++
    g.surface.set(e.name, (g.surface.get(e.name) ?? 0) + 1)
    if (typeof e.position === 'number') g.positions.push(e.position)
    g.sentiments.push(sentimentValue(e.sentiment))
    if (e.reasons) g.reasons.push(...e.reasons)
    groups.set(key, g)
  }

  const totalMarket = targetMentions + [...groups.values()].reduce((s, g) => s + g.count, 0)

  const rows: CompetitorRow[] = [...groups.entries()].map(([key, g]) => {
    const prov = provByKey.get(key)
    const displayName = [...g.surface.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? key
    return {
      name: displayName,
      canonical_key: key,
      normalized_name: key,
      mention_count: g.count,
      avg_position: g.positions.length ? g.positions.reduce((a, b) => a + b, 0) / g.positions.length : null,
      sentiment_score: g.sentiments.length ? g.sentiments.reduce((a, b) => a + b, 0) / g.sentiments.length : 0,
      share_of_voice: totalMarket > 0 ? g.count / totalMarket : 0,
      top_reasons: [...new Set(g.reasons)].slice(0, 5),
      providers: prov?.providers ?? [],
      prompt_ids: prov?.prompt_ids ?? [],
      sample_evidence: prov?.sample_evidence ?? [],
    }
  })

  return rows.sort((a, b) => b.mention_count - a.mention_count).slice(0, limit)
}
