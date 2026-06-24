/**
 * Structured mention extraction from a raw model response.
 *
 * Wraps the existing LLM entity extractor (lib/engine/entity-extractor) and the
 * name-normalization/matching helpers into one ordered, evidence-carrying result.
 * The shaping step is a PURE function (`shapeMentions`) so the target-matching
 * and ordering rules are unit-testable without any model call.
 */

import {
  extractEntities, keywordTargetMention, type ExtractedEntity,
} from '@/lib/engine/entity-extractor'
import { normalizeName } from '@/lib/engine/normalize'
import { matchEntity } from '@/lib/audit/entity-matching'

export interface StructuredMention {
  name: string
  normalized_name: string
  position: number
  confidence: number
  is_target: boolean
  /** Why we did (or didn't) match this to the target restaurant. */
  match_reason: string | null
  /** Short raw excerpt backing the mention, when available. */
  evidence_excerpt: string | null
}

export interface ExtractMentionsResult {
  mentions: StructuredMention[]
  /** True when the LLM extractor failed and we fell back to keyword detection. */
  fallback: boolean
}

/**
 * Shape raw extracted entities into ordered structured mentions, flagging which
 * one is the target restaurant (via the shared entity matcher). Pure + deterministic.
 */
export function shapeMentions(entities: ExtractedEntity[], targetName: string): StructuredMention[] {
  return entities
    .slice()
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
    .map((e, i) => {
      const m = matchEntity({ name: e.name }, { name: targetName })
      return {
        name: e.name,
        normalized_name: normalizeName(e.name),
        position: e.position ?? i + 1,
        confidence: typeof e.confidence === 'number' ? e.confidence : 0.5,
        is_target: m.matched,
        match_reason: m.reason,
        evidence_excerpt: e.context?.trim() ? e.context.trim().slice(0, 280) : null,
      }
    })
}

/**
 * Extract structured mentions from a model response. On extractor failure, falls
 * back to keyword detection so we still record whether the TARGET appeared
 * (competitors can't be enumerated in that case).
 */
export async function extractMentions(
  response: string,
  prompt: string,
  model: string,
  targetName: string,
): Promise<ExtractMentionsResult> {
  const result = await extractEntities(response, prompt, model)

  if (!result.failed) {
    return { mentions: shapeMentions(result.entities, targetName), fallback: false }
  }

  // Fallback: at least detect the target via keywords.
  const kw = keywordTargetMention(targetName, response)
  if (!kw) return { mentions: [], fallback: true }
  return {
    mentions: [{
      name: targetName,
      normalized_name: normalizeName(targetName),
      position: kw.position ?? 1,
      confidence: 0.4,
      is_target: true,
      match_reason: 'keyword fallback',
      evidence_excerpt: null,
    }],
    fallback: true,
  }
}
