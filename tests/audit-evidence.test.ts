import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildRunAccounting, buildPromptEvidence, averageExtractionConfidence,
  type ModelRunRow, type MentionRow, type PromptRunRow,
} from '../lib/engine/audit-evidence'

function run(over: Partial<ModelRunRow>): ModelRunRow {
  return {
    model: 'openai', prompt_id: 'p1', sample_index: 0, grounded: false,
    model_version: 'gpt-test', locale: 'nl', duration_ms: 1000, raw_response: 'ok', ...over,
  }
}

test('buildRunAccounting separates completed from failed and explains the planned count', () => {
  // 2 prompts × 2 samples × 2 providers = 8 planned. One failed.
  const runs: ModelRunRow[] = []
  for (const prompt of ['p1', 'p2']) {
    for (const sample of [0, 1]) {
      for (const model of ['openai', 'anthropic']) {
        runs.push(run({ prompt_id: prompt, sample_index: sample, model }))
      }
    }
  }
  runs[0] = run({ ...runs[0], raw_response: 'ERROR: rate limited' })

  const acc = buildRunAccounting(runs)
  assert.equal(acc.total_runs, 8)
  assert.equal(acc.distinct_prompts, 2)
  assert.equal(acc.distinct_providers, 2)
  assert.equal(acc.samples_per_prompt, 2)
  assert.equal(acc.expected_runs, 8)
  assert.equal(acc.failed, 1)
  assert.equal(acc.completed, 7)
  const openai = acc.providers.find((p) => p.model === 'openai')!
  assert.equal(openai.failed, 1)
  assert.equal(openai.completed, 3)
})

test('buildRunAccounting handles an empty audit without dividing by zero', () => {
  const acc = buildRunAccounting([])
  assert.equal(acc.total_runs, 0)
  assert.equal(acc.expected_runs, 0)
  assert.equal(acc.samples_per_prompt, 0)
})

test('buildPromptEvidence joins prompts, mentions and runs per provider', () => {
  const promptRuns: PromptRunRow[] = [
    { prompt_id: 'p1', category: 'category', intent: 'italiaans', prompt_text: 'Beste italiaans Utrecht' },
    // duplicate row (generator wrote it twice) must collapse to one
    { prompt_id: 'p1', category: 'category', intent: 'italiaans', prompt_text: 'Beste italiaans Utrecht' },
  ]
  const mentions: MentionRow[] = [
    { model: 'openai', prompt_id: 'p1', mentioned: true, mention_frequency: 1, position: 2, sentiment: 'positive' },
    { model: 'openai', prompt_id: 'p1', mentioned: false, mention_frequency: 0, position: null, sentiment: null },
    { model: 'anthropic', prompt_id: 'p1', mentioned: false, mention_frequency: 0, position: null, sentiment: null },
  ]
  const runs: ModelRunRow[] = [
    run({ model: 'openai', prompt_id: 'p1', sample_index: 0 }),
    run({ model: 'openai', prompt_id: 'p1', sample_index: 1 }),
    run({ model: 'anthropic', prompt_id: 'p1', sample_index: 0, raw_response: 'ERROR: boom' }),
  ]

  const ev = buildPromptEvidence(promptRuns, mentions, runs)
  assert.equal(ev.length, 1, 'duplicate prompt rows collapse')
  const p = ev[0]
  assert.equal(p.mentioned_any, true)
  const openai = p.models.find((m) => m.model === 'openai')!
  assert.equal(openai.mentioned, true)
  assert.equal(openai.best_position, 2)
  assert.equal(openai.mention_rate, 0.5)
  const anthropic = p.models.find((m) => m.model === 'anthropic')!
  assert.equal(anthropic.failed, 1)
  assert.equal(anthropic.mentioned, false)
})

test('averageExtractionConfidence ignores nulls and returns null when unrecorded', () => {
  assert.equal(averageExtractionConfidence([]), null)
  assert.equal(
    averageExtractionConfidence([
      { prompt_id: 'p', model: 'openai', name: 'X', confidence: 0.8 },
      { prompt_id: 'p', model: 'openai', name: 'Y', confidence: null },
      { prompt_id: 'p', model: 'openai', name: 'Z', confidence: 0.6 },
    ]),
    0.7,
  )
})
