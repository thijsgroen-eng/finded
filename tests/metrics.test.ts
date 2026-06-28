import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeMetrics, computeShareOfVoice, type MentionRow } from '../lib/engine/metrics'

/**
 * Characterization tests for the read-time metrics (computeMetrics) — used by the
 * report page and several API routes but, unlike metrics-v2, not previously
 * covered. These lock the current outputs so the metrics-core convergence (#13)
 * provably changes nothing.
 */

const FIXTURE: MentionRow[] = [
  { model: 'openai',    prompt_id: 'p1', mentioned: true,  mention_frequency: null, position: 1,    sentiment: 'positive' },
  { model: 'openai',    prompt_id: 'p2', mentioned: false, mention_frequency: null, position: null, sentiment: null },
  { model: 'anthropic', prompt_id: 'p1', mentioned: true,  mention_frequency: null, position: 2,    sentiment: 'neutral' },
  { model: 'gemini',    prompt_id: 'p1', mentioned: true,  mention_frequency: null, position: null, sentiment: 'negative' },
  { model: 'gemini',    prompt_id: 'p2', mentioned: false, mention_frequency: null, position: null, sentiment: null },
]

test('computeMetrics: headline figures', () => {
  const m = computeMetrics(FIXTURE)
  assert.equal(m.total_prompts, 2)
  assert.equal(m.total_mentions, 3)
  assert.equal(m.mention_frequency, 0.6)          // 3 of 5 sampled rows
  assert.equal(m.position_score, 92.5)            // mean(weight(1)=100, weight(2)=85)
  assert.equal(m.model_consensus, 3)              // openai, anthropic, gemini
})

test('computeMetrics: sentiment counts only mentioned rows', () => {
  const m = computeMetrics(FIXTURE)
  assert.deepEqual(m.sentiment_breakdown, { positive: 1, neutral: 1, negative: 1 })
})

test('computeMetrics: per-model breakdown', () => {
  const m = computeMetrics(FIXTURE)
  const by = Object.fromEntries(m.model_breakdown.map((b) => [b.model, b]))
  assert.deepEqual(by.openai,     { model: 'openai',     mentions: 1, total_prompts: 2, frequency: 0.5, avg_position: 1 })
  assert.deepEqual(by.anthropic,  { model: 'anthropic',  mentions: 1, total_prompts: 1, frequency: 1,   avg_position: 2 })
  assert.deepEqual(by.gemini,     { model: 'gemini',     mentions: 1, total_prompts: 2, frequency: 0.5, avg_position: null })
  assert.deepEqual(by.perplexity, { model: 'perplexity', mentions: 0, total_prompts: 0, frequency: 0,   avg_position: null })
})

test('computeMetrics: empty input is all-zero', () => {
  const m = computeMetrics([])
  assert.equal(m.total_mentions, 0)
  assert.equal(m.position_score, 0)
  assert.equal(m.model_consensus, 0)
  assert.deepEqual(m.model_breakdown, [])
})

test('computeShareOfVoice: fractions sum to 1 across a cohort', () => {
  const sov = computeShareOfVoice([
    { restaurant_id: 'a', total_mentions: 3 },
    { restaurant_id: 'b', total_mentions: 1 },
  ])
  assert.equal(sov.get('a'), 0.75)
  assert.equal(sov.get('b'), 0.25)
})
