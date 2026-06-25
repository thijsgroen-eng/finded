import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assessReliability, reliabilityFromAccounting } from '../lib/audit/reliability'

test('the reported example (24/72, only Gemini) is RED and blocks output', () => {
  const r = assessReliability({
    total: 72,
    completed: 24,
    providers: [
      { model: 'openai', completed: 0, failed: 24 },
      { model: 'anthropic', completed: 0, failed: 24 },
      { model: 'gemini', completed: 24, failed: 0 },
    ],
  })
  assert.equal(r.band, 'red')
  assert.equal(Math.round(r.completionRate * 100), 33)
  assert.equal(r.allow.score, false)
  assert.equal(r.allow.recommendations, false)
  assert.equal(r.allow.conclusions, false)
  assert.equal(r.confidenceMultiplier, 0)
  assert.deepEqual(r.deadProviders, ['ChatGPT', 'Claude'])
  assert.deepEqual(r.okProviders, ['Gemini'])
})

test('green requires ≥80% completion AND ≥2 providers with data', () => {
  const r = assessReliability({
    total: 72,
    completed: 66,
    providers: [
      { model: 'openai', completed: 22, failed: 2 },
      { model: 'anthropic', completed: 22, failed: 2 },
      { model: 'gemini', completed: 22, failed: 2 },
    ],
  })
  assert.equal(r.band, 'green')
  assert.equal(r.confidenceMultiplier, 1)
  assert.ok(r.allow.score && r.allow.recommendations)
})

test('80%+ but single provider is only yellow (no cross-model consensus)', () => {
  const r = assessReliability({
    total: 24,
    completed: 24,
    providers: [{ model: 'gemini', completed: 24, failed: 0 }],
  })
  assert.equal(r.band, 'yellow')
  assert.equal(r.providersWithData, 1)
})

test('50–80% is yellow: results allowed but confidence reduced', () => {
  const r = assessReliability({
    total: 72,
    completed: 48,
    providers: [
      { model: 'openai', completed: 24, failed: 0 },
      { model: 'anthropic', completed: 12, failed: 12 },
      { model: 'gemini', completed: 12, failed: 12 },
    ],
  })
  assert.equal(r.band, 'yellow')
  assert.equal(r.confidenceMultiplier, 0.6)
  assert.equal(r.allow.score, true)
  assert.equal(r.allow.recommendations, true)
})

test('exactly 50% is yellow, just under 50% is red (boundary)', () => {
  const half = assessReliability({ total: 10, completed: 5, providers: [
    { model: 'openai', completed: 3, failed: 2 }, { model: 'gemini', completed: 2, failed: 3 },
  ] })
  assert.equal(half.band, 'yellow')
  const under = assessReliability({ total: 10, completed: 4, providers: [
    { model: 'openai', completed: 2, failed: 3 }, { model: 'gemini', completed: 2, failed: 3 },
  ] })
  assert.equal(under.band, 'red')
})

test('zero calls is red, not a divide-by-zero', () => {
  const r = assessReliability({ total: 0, completed: 0, providers: [] })
  assert.equal(r.band, 'red')
  assert.equal(r.completionRate, 0)
  assert.equal(r.providersWithData, 0)
})

test('reliabilityFromAccounting maps a RunAccounting-shaped object', () => {
  const r = reliabilityFromAccounting({
    total_runs: 72, completed: 24,
    providers: [
      { model: 'openai', completed: 0, failed: 24 },
      { model: 'anthropic', completed: 0, failed: 24 },
      { model: 'gemini', completed: 24, failed: 0 },
    ],
  })
  assert.equal(r.band, 'red')
})
