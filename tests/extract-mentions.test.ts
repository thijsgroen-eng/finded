import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shapeMentions } from '../lib/audit/extract-mentions'
import type { ExtractedEntity } from '../lib/engine/entity-extractor'

const ent = (over: Partial<ExtractedEntity>): ExtractedEntity => ({
  name: 'X', type: 'restaurant', position: 1, context: '', sentiment: 'neutral',
  reasons: [], confidence: 0.9, ...over,
})

test('shapeMentions orders by position and normalizes names', () => {
  const out = shapeMentions([
    ent({ name: 'Restaurant De Kas', position: 3 }),
    ent({ name: 'Bar Centraal', position: 1 }),
  ], 'Something Else')
  assert.deepEqual(out.map((m) => m.position), [1, 3])
  assert.equal(out[1].normalized_name, 'de kas')
})

test('shapeMentions flags the target with an explanatory reason', () => {
  const out = shapeMentions([ent({ name: 'De Kas', position: 2 })], 'De Kas')
  assert.equal(out[0].is_target, true)
  assert.equal(out[0].match_reason, 'exact name match')
})

test('non-target mentions are not flagged and carry no match reason', () => {
  const out = shapeMentions([ent({ name: 'Completely Different', position: 1 })], 'De Kas')
  assert.equal(out[0].is_target, false)
  assert.equal(out[0].match_reason, null)
})

test('evidence excerpt comes from context and is truncated', () => {
  const long = 'a'.repeat(400)
  const out = shapeMentions([ent({ name: 'De Kas', context: long })], 'De Kas')
  assert.ok(out[0].evidence_excerpt)
  assert.ok(out[0].evidence_excerpt!.length <= 280)
})

test('confidence falls back to 0.5 when missing', () => {
  const out = shapeMentions([ent({ name: 'X', confidence: undefined as unknown as number })], 'Y')
  assert.equal(out[0].confidence, 0.5)
})
