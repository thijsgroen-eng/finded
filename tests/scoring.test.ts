import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeScoreBreakdown, positionScoreFromAvg } from '../lib/engine/scoring'

test('v2 full data: recommendation-first weighted score + full confidence', () => {
  const b = computeScoreBreakdown({
    mentionFrequency: 0.6, modelConsensus: 2, providersRan: 4,
    shareOfVoice: 0.3, authorityScore: 0.5, websiteSignals: { present: 3, total: 5 }, sampleCount: 24,
  })
  assert.equal(b.components.length, 5)
  // 60*.30 + 30*.20 + 50*.10 + 50*.15 + 60*.25 = 51.5 → 52
  assert.equal(b.visibility_score, 52)
  assert.equal(b.confidence_score, 1)
  assert.ok(Math.abs(b.components.reduce((s, c) => s + c.weight, 0) - 1) < 0.001)
})

test('missing competitor + website data: drops components, renormalizes', () => {
  const b = computeScoreBreakdown({
    mentionFrequency: 0.6, modelConsensus: 2, providersRan: 4,
    shareOfVoice: null, authorityScore: 0.5, websiteSignals: null, sampleCount: 12,
  })
  assert.equal(b.components.length, 3) // mention, consensus, authority
  assert.equal(b.confidence_score, 0.55) // 0.5*(3/5) + 0.5*(12/24)
  assert.ok(!b.components.find((c) => c.key === 'competitor_gap_score'))
  assert.ok(!b.components.find((c) => c.key === 'website_signal_score'))
})

test('authority is a first-class component', () => {
  const b = computeScoreBreakdown({
    mentionFrequency: 0.2, modelConsensus: 1, providersRan: 4,
    shareOfVoice: 0.1, authorityScore: 1, websiteSignals: { present: 2, total: 5 }, sampleCount: 24,
  })
  const auth = b.components.find((c) => c.key === 'authority_score')!
  assert.ok(auth)
  assert.equal(auth.score, 100)
  assert.equal(Math.round(auth.weight * 100), 15)
})

test('never mentioned: honest low score from website signal only', () => {
  const b = computeScoreBreakdown({
    mentionFrequency: 0, modelConsensus: 0, providersRan: 4,
    shareOfVoice: null, authorityScore: null, websiteSignals: { present: 1, total: 5 }, sampleCount: 24,
  })
  assert.ok(b.visibility_score < 12)
  assert.ok(!b.components.find((c) => c.key === 'authority_score'))
})

test('positionScoreFromAvg is monotonic and clamped', () => {
  assert.equal(positionScoreFromAvg(1), 100)
  assert.equal(positionScoreFromAvg(2), 82)
  assert.ok(positionScoreFromAvg(10) >= 0)
  assert.equal(positionScoreFromAvg(100), 0)
})
