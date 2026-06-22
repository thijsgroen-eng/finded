/**
 * Verifies that the read-time metrics (lib/engine/metrics.ts, used by the report
 * page + API routes) and the audit-time metrics (lib/engine/metrics-v2.ts, which
 * persists visibility_scores) agree on the fields they both compute, when given
 * the same mention data. Before the engine unification these used different
 * position weights and disagreed.
 *
 * Run: ANTHROPIC_API_KEY=dummy npx tsx scripts/verify-metrics.ts
 */
import assert from 'node:assert/strict'
import { computeMetrics, MentionRow } from '@/lib/engine/metrics'
import { computeFullMetrics } from '@/lib/engine/metrics-v2'

// Identical mention data fed to both engines. Positions span the weight table
// (1,2,3,5) and beyond it (6 → default), across two models, with a non-mention.
const mentions: MentionRow[] = [
  { model: 'openai',    prompt_id: 'p1', mentioned: true,  position: 1,    sentiment: 'positive' },
  { model: 'openai',    prompt_id: 'p2', mentioned: true,  position: 2,    sentiment: 'neutral'  },
  { model: 'openai',    prompt_id: 'p3', mentioned: true,  position: 5,    sentiment: 'positive' },
  { model: 'openai',    prompt_id: 'p4', mentioned: false, position: null, sentiment: null       },
  { model: 'anthropic', prompt_id: 'p1', mentioned: true,  position: 3,    sentiment: 'negative' },
  { model: 'anthropic', prompt_id: 'p2', mentioned: false, position: null, sentiment: null       },
  { model: 'anthropic', prompt_id: 'p3', mentioned: true,  position: 6,    sentiment: 'neutral'  },
  { model: 'anthropic', prompt_id: 'p4', mentioned: true,  position: 1,    sentiment: 'positive' },
]

const v1 = computeMetrics(mentions)
const v2 = computeFullMetrics('De Kas', mentions, [])

const round = (n: number) => Math.round(n * 1e6) / 1e6

const checks: Array<[string, unknown, unknown]> = [
  ['mention_frequency', round(v1.mention_frequency), round(v2.mention_frequency)],
  ['position_score',    round(v1.position_score),    round(v2.position_score)],
  ['model_consensus',   v1.model_consensus,          v2.model_consensus],
  ['total_mentions',    v1.total_mentions,           v2.total_mentions],
  ['total_prompts',     v1.total_prompts,            v2.total_prompts],
  ['sentiment.positive', v1.sentiment_breakdown.positive, v2.sentiment_breakdown.positive],
  ['sentiment.neutral',  v1.sentiment_breakdown.neutral,  v2.sentiment_breakdown.neutral],
  ['sentiment.negative', v1.sentiment_breakdown.negative, v2.sentiment_breakdown.negative],
]

let failed = 0
for (const [name, a, b] of checks) {
  const ok = a === b
  if (!ok) failed++
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${name.padEnd(20)} read-time=${a}  audit-time=${b}`)
}

assert.equal(failed, 0, `${failed} metric(s) disagree between the two engines`)
console.log('\n✓ read-time and audit-time metrics agree on all shared fields')
