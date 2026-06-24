import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchEntity } from '../lib/audit/entity-matching'

test('exact normalized name matches with full confidence', () => {
  const r = matchEntity({ name: 'Restaurant De Kas' }, { id: 'r1', name: 'De Kas' })
  assert.equal(r.matched, true)
  assert.equal(r.matchedRestaurantId, 'r1')
  assert.equal(r.confidence, 1)
  assert.equal(r.reason, 'exact name match')
})

test('alias matches with high (not perfect) confidence', () => {
  const r = matchEntity({ name: 'Kas Amsterdam' }, { name: 'De Kas', aliases: ['Kas Amsterdam'] })
  assert.equal(r.matched, true)
  assert.equal(r.reason, 'alias match')
})

test('domain match identifies the target even with a different name', () => {
  const r = matchEntity(
    { name: 'Totally Different Name', domain: 'https://www.dekas.nl/menu' },
    { name: 'De Kas', domain: 'dekas.nl' },
  )
  assert.equal(r.matched, true)
  assert.equal(r.reason, 'domain match')
})

test('does not match a different restaurant', () => {
  const r = matchEntity({ name: 'Bar Centraal' }, { name: 'De Kas' })
  assert.equal(r.matched, false)
  assert.equal(r.matchedRestaurantId, null)
})

test('avoids naive partial false positive on a single short token', () => {
  const r = matchEntity({ name: 'De' }, { name: 'De Kas' })
  assert.equal(r.matched, false)
})
