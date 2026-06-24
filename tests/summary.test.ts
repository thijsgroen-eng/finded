import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildVisibilitySummary } from '../lib/audit/summary'

const base = {
  restaurantName: 'De Kas',
  totalMentions: 2,
  sampleCount: 32,
  mentionFrequencyPct: 6,
  modelConsensus: 1,
  providersRan: 4,
  topCompetitors: [{ name: 'Trattoria del Centro', mention_count: 11 }, { name: 'Osteria', mention_count: 9 }],
  websiteGaps: ['Restaurant schema', 'Crawlable menu'],
  authorityPlatforms: ['Tripadvisor', 'TheFork'],
  ownCited: false,
}

test('summary states standing, who is ahead, reasons, and authority', () => {
  const s = buildVisibilitySummary(base)
  assert.ok(s.includes('De Kas'))
  assert.ok(s.includes('2 of 32'))
  assert.ok(s.includes('1 of 4 models'))
  assert.ok(s.includes('Trattoria del Centro (11)'))
  assert.ok(/restaurant schema/i.test(s))
  assert.ok(s.includes('Tripadvisor'))
  assert.ok(s.includes('not among the sources'))
})

test('handles no recorded answers gracefully', () => {
  const s = buildVisibilitySummary({ ...base, sampleCount: 0, totalMentions: 0 })
  assert.ok(/enough recorded answers/i.test(s))
})

test('omits the models clause when no providers ran', () => {
  const s = buildVisibilitySummary({ ...base, providersRan: 0 })
  assert.ok(!s.includes('models tested'))
})

test('credits the restaurant when its own site is cited', () => {
  const s = buildVisibilitySummary({ ...base, ownCited: true })
  assert.ok(s.includes('your own site was among the sources'))
})
