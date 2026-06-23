import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveEntityName, findTargetInEntities } from '../lib/engine/entity-extractor'

test('exact + suffix/case/accent-insensitive matches score high', () => {
  assert.equal(resolveEntityName('De Kas', 'De Kas'), 1)
  assert.ok(resolveEntityName('Restaurant De Kas', 'De Kas') >= 0.9)        // suffix word stripped
  assert.ok(resolveEntityName('Café de Plek', 'de plek') >= 0.9)            // café stripped
})

test('clearly different names do not false-positive (< threshold)', () => {
  assert.ok(resolveEntityName('Bar Centraal', 'Central Park') < 0.7)
})

test('findTargetInEntities returns the matched entity above threshold, else null', () => {
  const entities = [
    { name: 'Rijks', type: 'restaurant' as const, position: 1, context: '', sentiment: 'positive' as const, reasons: [], confidence: 0.9 },
    { name: 'De Kas Amsterdam', type: 'restaurant' as const, position: 2, context: '', sentiment: 'positive' as const, reasons: [], confidence: 0.9 },
  ]
  assert.equal(findTargetInEntities('De Kas', entities)?.name, 'De Kas Amsterdam')
  assert.equal(findTargetInEntities('Toscanini', entities), null)
})
