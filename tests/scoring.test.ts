import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeScoreBreakdown, positionScoreFromAvg } from '../lib/engine/scoring'

test('full data: deterministic weighted score + full confidence', () => {
  const b = computeScoreBreakdown({
    mentionFrequency: 0.6, avgPosition: 2, modelConsensus: 2, providersRan: 4,
    promptCoverage: 0.5, shareOfVoice: 0.3, websiteSignals: { present: 3, total: 5 }, sampleCount: 24,
  })
  assert.equal(b.components.length, 6)
  assert.equal(b.visibility_score, 57) // 60*.3 + 82*.2 + 30*.15 + 50*.15 + 50*.1 + 60*.1
  assert.equal(b.confidence_score, 1)  // completeness 1, sampleFactor 1
  // weights renormalize to ~1
  assert.ok(Math.abs(b.components.reduce((s, c) => s + c.weight, 0) - 1) < 0.001)
})

test('missing competitor + website data: drops components, renormalizes, lowers confidence', () => {
  const b = computeScoreBreakdown({
    mentionFrequency: 0.6, avgPosition: 2, modelConsensus: 2, providersRan: 4,
    promptCoverage: 0.5, shareOfVoice: null, websiteSignals: null, sampleCount: 12,
  })
  assert.equal(b.components.length, 4)
  assert.equal(b.visibility_score, 63)   // renormalized over 4 present weights
  assert.equal(b.confidence_score, 0.58) // 0.5*(4/6) + 0.5*(12/24)
  assert.ok(!b.components.find(c => c.key === 'competitor_gap_score'))
})

test('never mentioned: honest low score, position component dropped', () => {
  const b = computeScoreBreakdown({
    mentionFrequency: 0, avgPosition: null, modelConsensus: 0, providersRan: 4,
    promptCoverage: 0, shareOfVoice: null, websiteSignals: { present: 1, total: 5 }, sampleCount: 24,
  })
  assert.equal(b.visibility_score, 3) // only website signal contributes
  assert.ok(!b.components.find(c => c.key === 'average_position_score'))
  assert.ok(!b.components.find(c => c.key === 'competitor_gap_score'))
})

test('positionScoreFromAvg is monotonic and clamped', () => {
  assert.equal(positionScoreFromAvg(1), 100)
  assert.equal(positionScoreFromAvg(2), 82)
  assert.ok(positionScoreFromAvg(10) >= 0)
  assert.equal(positionScoreFromAvg(100), 0)
})
