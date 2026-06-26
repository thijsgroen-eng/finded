import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeBenchmark, computePatterns, patternEvidence, liftConfidence, buildObservationFacts, toObsRow, ObsRow } from '../lib/observations'

function row(p: Partial<ObsRow> & { mentionedAny: boolean }): ObsRow {
  return {
    cuisine: p.cuisine ?? 'italian', city: p.city ?? 'amsterdam',
    mentionedAny: p.mentionedAny,
    mentionFrequency: p.mentionFrequency ?? (p.mentionedAny ? 0.3 : 0),
    visibilityScore: p.visibilityScore ?? (p.mentionedAny ? 60 : 20),
    facts: p.facts ?? {},
  }
}

test('benchmark aggregates a segment and filters by cuisine/city', () => {
  const rows = [
    row({ mentionedAny: true, visibilityScore: 40, facts: { restaurant_schema: true } }),
    row({ mentionedAny: false, visibilityScore: 20, facts: { restaurant_schema: false } }),
    row({ cuisine: 'french', city: 'utrecht', mentionedAny: true, visibilityScore: 90 }),
  ]
  const b = computeBenchmark(rows, { cuisine: 'Italian', city: 'Amsterdam' })
  assert.equal(b.n, 2)
  assert.equal(b.avgVisibility, 30)
  assert.equal(b.pctMentioned, 0.5)
  assert.equal(b.factRates.restaurant_schema, 0.5)
})

test('benchmark with no filter covers all rows', () => {
  const rows = [row({ mentionedAny: true }), row({ mentionedAny: false }), row({ cuisine: 'french' as any, mentionedAny: true })]
  assert.equal(computeBenchmark(rows).n, 3)
})

test('pattern lift: HTML menu mentioned more often, with enough samples', () => {
  const withMenu = Array.from({ length: 8 }, (_, i) => row({ mentionedAny: i < 6, facts: { html_menu: true } })) // 6/8 = 0.75
  const withoutMenu = Array.from({ length: 8 }, (_, i) => row({ mentionedAny: i < 2, facts: { html_menu: false } })) // 2/8 = 0.25
  const patterns = computePatterns([...withMenu, ...withoutMenu])
  const p = patterns.find((x) => x.key === 'html_menu')!
  assert.ok(p, 'html_menu pattern present')
  assert.equal(p.nWith, 8)
  assert.equal(p.nWithout, 8)
  assert.equal(Number(p.lift.toFixed(1)), 3.0) // 0.75 / 0.25
})

test('pattern suppressed when a group is too small (no thin stats)', () => {
  const withMenu = Array.from({ length: 3 }, () => row({ mentionedAny: true, facts: { html_menu: true } }))
  const withoutMenu = Array.from({ length: 10 }, () => row({ mentionedAny: false, facts: { html_menu: false } }))
  const patterns = computePatterns([...withMenu, ...withoutMenu], { minGroup: 5 })
  assert.equal(patterns.find((x) => x.key === 'html_menu'), undefined)
})

test('pattern suppressed when lift is not meaningful', () => {
  const withF = Array.from({ length: 10 }, (_, i) => row({ mentionedAny: i < 5, facts: { faq_present: true } }))   // 0.5
  const withoutF = Array.from({ length: 10 }, (_, i) => row({ mentionedAny: i < 5, facts: { faq_present: false } })) // 0.5
  assert.equal(computePatterns([...withF, ...withoutF]).find((x) => x.key === 'faq_present'), undefined)
})

test('patternEvidence states the measured lift and sample size (NL + EN)', () => {
  const p = { key: 'html_menu' as const, withRate: 0.75, withoutRate: 0.25, lift: 3.0, nWith: 8, nWithout: 8 }
  assert.match(patternEvidence(p, 'en'), /3\.0× more often.*16 measured/)
  assert.match(patternEvidence(p, 'nl'), /3\.0× vaker.*16 gemeten/)
})

test('liftConfidence bands', () => {
  assert.equal(liftConfidence(2.5), 'High')
  assert.equal(liftConfidence(1.5), 'Medium')
  assert.equal(liftConfidence(1.1), 'Low')
})

test('buildObservationFacts derives html_menu and booleans', () => {
  const f = buildObservationFacts({
    auditId: 'a', restaurantId: 'r', city: 'Amsterdam', cuisine: 'Italian', country: 'NL', businessType: 'restaurant',
    visibilityScore: 40, mentionFrequency: 0.2, mentionedAny: true,
    menuFormat: 'html', restaurantSchema: true, faqPresent: false, dietaryPresent: true,
    mentionedBy: { gemini: true },
  })
  assert.equal(f.html_menu, true)
  assert.equal(f.restaurant_schema, true)
  assert.equal(f.faq_present, false)
  assert.equal(f.dietary_present, true)
  assert.equal(f.mentioned_gemini, true)
  assert.equal(f.mentioned_openai, false)
})

test('toObsRow maps stored jsonb facts back into a typed ObsRow', () => {
  const r = toObsRow({ cuisine: 'Italian', city: 'Amsterdam', mentioned_any: true, mention_frequency: 0.3, visibility_score: 55, facts: { html_menu: true, faq_present: false } })
  assert.equal(r.facts.html_menu, true)
  assert.equal(r.facts.faq_present, false)
  assert.equal(r.visibilityScore, 55)
})
