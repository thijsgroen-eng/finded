import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseRecommendations } from '../lib/recommendations/parse'
import { enrichRecommendation, shapeStoredRec } from '../lib/recommendations/enrich'

/* parseRecommendations — tolerant JSON salvage (parser layer) */

test('parse: clean JSON array', () => {
  const out = parseRecommendations('[{"title":"A"},{"title":"B"}]')
  assert.equal(out.length, 2)
  assert.equal(out[0].title, 'A')
})

test('parse: fenced ```json block', () => {
  const out = parseRecommendations('```json\n[{"title":"A"}]\n```')
  assert.equal(out.length, 1)
})

test('parse: salvages complete objects from a truncated array', () => {
  // Second object is cut off mid-string (token limit) — first must survive.
  const out = parseRecommendations('[{"title":"Done","what":"x"},{"title":"Tru')
  assert.equal(out.length, 1)
  assert.equal(out[0].title, 'Done')
})

test('parse: nothing usable → empty array', () => {
  assert.deepEqual(parseRecommendations('the model refused'), [])
})

/* enrichRecommendation — deterministic layer (numbers never from the LLM) */

const ctx = { auditId: 'a1', restaurantId: 'r1', cuisine: 'Italian', language: 'en' as const, obsRows: [] }

test('enrich: with no benchmark data, confidence is capped at medium and data_source is audit-only', () => {
  const row = enrichRecommendation({ title: 'T', what: 'do', impact_level: 'high', effort: 'low', confidence: 'high', type: 'schema_jsonld' }, ctx)
  // No observations → no benchmark → model's "high" must be downgraded.
  assert.equal(row.confidence, 'medium')
  assert.equal(row.data_source, 'Direct audit only')
  assert.equal(row.priority, 'high')
  assert.equal(row.impact_level, 'high')
  assert.equal(row.effort, 'low')
  assert.ok(['do_first', 'do_next', 'optional'].includes(row.priority_rank))
  assert.equal(row.status, 'pending')
  assert.ok(row.algo_version, 'stamps the recommendation algo version')
})

test('enrich: invalid fix type is rejected (null), not invented', () => {
  const row = enrichRecommendation({ title: 'T', what: 'do', type: 'totally_made_up' }, ctx)
  assert.equal(row.type, null)
  assert.equal(row.asset_type, null)
})

test('enrich: Dutch data-source attribution', () => {
  const row = enrichRecommendation({ title: 'T', what: 'do' }, { ...ctx, language: 'nl' })
  assert.equal(row.data_source, 'Alleen directe audit')
})

/* shapeStoredRec — stable API response contract */

test('shape: maps a stored row and falls back to the raw rec for prose', () => {
  const shaped = shapeStoredRec({ id: 'x', description: null, status: 'pending' }, { title: 'Fallback', what: 'fb' })
  assert.equal(shaped.id, 'x')
  assert.equal(shaped.title, 'Fallback')
  assert.equal(shaped.what, 'fb')
  assert.equal(shaped.priority_rank, 'do_next')
})
