import { test } from 'node:test'
import assert from 'node:assert/strict'
import { visibilityStatus, websiteSnapshot, categoryPerformance, actionPlanWeeks, roadmap90 } from '../lib/audit/report-sections'

test('visibilityStatus maps frequency to a plain label', () => {
  assert.equal(visibilityStatus(0, false), 'Not recommended')
  assert.equal(visibilityStatus(10, true), 'Low visibility')
  assert.equal(visibilityStatus(30, true), 'Moderate visibility')
  assert.equal(visibilityStatus(60, true), 'Strong visibility')
})

test('websiteSnapshot summarises key signals at a high level', () => {
  const snap = websiteSnapshot([
    { key: 'cuisine_clarity', status: 'present' },
    { key: 'location_clarity', status: 'weak' },
    { key: 'restaurant_schema', status: 'present' },
    { key: 'faq_content', status: 'missing' },
  ], false)
  const get = (l: string) => snap.find((r) => r.label === l)!.strength
  assert.equal(get('Cuisine signals'), 'Strong')
  assert.equal(get('Location signals'), 'Weak')
  assert.equal(get('Schema'), 'Present')
  assert.equal(get('FAQ content'), 'Missing')
  assert.equal(get('Authority signals'), 'Weak') // ownCited false
})

test('categoryPerformance groups prompts by category with appearance counts', () => {
  const perf = categoryPerformance([
    { category: 'category', mentioned_any: true },
    { category: 'category', mentioned_any: false },
    { category: 'discovery', mentioned_any: false },
  ])
  const cuisine = perf.find((p) => p.category === 'Cuisine specific')!
  assert.equal(cuisine.appeared, 1)
  assert.equal(cuisine.total, 2)
})

test('actionPlanWeeks buckets recs by priority and always ends with measure', () => {
  const plan = actionPlanWeeks([
    { title: 'Add schema', priority_rank: 'do_first' },
    { title: 'Add FAQ', priority_rank: 'do_next' },
    { title: 'Tweak meta', priority_rank: 'optional' },
  ])
  assert.equal(plan[0].label.startsWith('Week 1'), true)
  assert.deepEqual(plan[0].items, ['Add schema'])
  assert.ok(plan.some((b) => b.label.startsWith('Week 4')))
})

test('roadmap90 buckets into immediate/30/60/90', () => {
  const r = roadmap90([{ title: 'X', priority_rank: 'do_first' }])
  assert.equal(r[0].label, 'Immediate')
  assert.ok(r.some((b) => b.label === '90 days'))
})
