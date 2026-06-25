import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scoreSignals, buildCompetitorComparison, COMPARISON_SIGNALS } from '../lib/audit/competitor-comparison'

test('scoreSignals grades a strong site as Strong across the board', () => {
  const g = scoreSignals({
    meta_title: 'Authentic Italian restaurant in Amsterdam',
    meta_description: 'Featured in Michelin guide',
    menu_format: 'html',
    location_present: true,
    contact_present: true,
    faq_present: true,
    review_signals: true,
    review_count: 120,
    schema_present: true,
    schema_types: ['Restaurant'],
  })
  assert.equal(g.cuisine_clarity, 'Strong')
  assert.equal(g.location_clarity, 'Strong')
  assert.equal(g.menu, 'Strong')
  assert.equal(g.faq, 'Strong')
  assert.equal(g.authority, 'Strong')
  assert.equal(g.reviews, 'Strong')
  assert.equal(g.schema, 'Strong')
})

test('scoreSignals grades an empty site as weak/missing', () => {
  const g = scoreSignals({})
  assert.equal(g.cuisine_clarity, 'Weak')
  assert.equal(g.location_clarity, 'Weak')
  assert.equal(g.menu, 'Weak')
  assert.equal(g.faq, 'Missing')
  assert.equal(g.authority, 'Weak')
  assert.equal(g.reviews, 'Weak')
  assert.equal(g.schema, 'Weak')
})

test('PDF menu reads as Medium, no menu reads Weak', () => {
  assert.equal(scoreSignals({ menu_format: 'pdf' }).menu, 'Medium')
  assert.equal(scoreSignals({ menu_format: 'none' }).menu, 'Weak')
})

test('comparison table has one row per signal and one cell per competitor', () => {
  const cmp = buildCompetitorComparison(
    { menu_format: 'pdf' },
    [
      { name: 'Comp A', website: 'https://a.test', signals: { menu_format: 'html', faq_present: true } },
      { name: 'Comp B', website: 'https://b.test', signals: { menu_format: 'pdf' } },
    ],
  )
  assert.equal(cmp.rows.length, COMPARISON_SIGNALS.length)
  for (const r of cmp.rows) {
    assert.equal(r.competitors.length, 2)
    assert.deepEqual(r.competitors.map((c) => c.name), ['Comp A', 'Comp B'])
  }
  assert.equal(cmp.crawled, 2)
})

test('a competitor with no crawlable site shows null grades and is not counted as crawled', () => {
  const cmp = buildCompetitorComparison(
    {},
    [{ name: 'Unknown', website: null, signals: null }],
  )
  assert.equal(cmp.crawled, 0)
  for (const r of cmp.rows) assert.equal(r.competitors[0].grade, null)
  assert.equal(cmp.whyWin.length, 0)
})

test('gaps surface only where you are weak/missing and a competitor is Strong', () => {
  const cmp = buildCompetitorComparison(
    { faq_present: false, menu_format: 'none' },               // you: faq Missing, menu Weak
    [{ name: 'Comp A', website: 'https://a.test', signals: { faq_present: true, menu_format: 'html' } }],
  )
  // FAQ + menu are both gaps; the gap text references the signal labels
  assert.ok(cmp.gaps.some((g) => /faq coverage/i.test(g)))
  assert.ok(cmp.gaps.some((g) => /menu discoverability/i.test(g)))
})

test('no gaps when you match or exceed competitors', () => {
  const strong = { menu_format: 'html', faq_present: true, location_present: true, schema_present: true, schema_types: ['Restaurant'], review_count: 10, meta_title: 'Italian bistro' }
  const cmp = buildCompetitorComparison(strong, [{ name: 'Comp A', website: 'https://a.test', signals: {} }])
  assert.equal(cmp.gaps.length, 0)
})

test('whyWin lists a crawled competitor with its strong signals', () => {
  const cmp = buildCompetitorComparison(
    {},
    [{ name: 'Comp A', website: 'https://a.test', signals: { faq_present: true, location_present: true } }],
  )
  assert.equal(cmp.whyWin.length, 1)
  assert.equal(cmp.whyWin[0].name, 'Comp A')
  assert.match(cmp.whyWin[0].reasons, /faq coverage|location clarity/i)
})
