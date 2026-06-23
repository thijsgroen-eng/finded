import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeName, normalizeCity, domainFromUrl } from '../lib/engine/normalize'

test('normalizeName merges category/accent/case variants of the same name', () => {
  assert.equal(normalizeName('De Kas'), 'de kas')
  assert.equal(normalizeName('Restaurant De Kas'), 'de kas')
  assert.equal(normalizeName('De Kas Restaurant'), 'de kas')
  assert.equal(normalizeName('De Kás'), 'de kas')
  assert.equal(normalizeName('Café de Plek'), 'de plek')
})

test('normalizeName keeps distinct names distinct (no over-merge)', () => {
  assert.notEqual(normalizeName('De Kas'), normalizeName('De Plek'))
  assert.notEqual(normalizeName('Bar Centraal'), normalizeName('Central Park'))
})

test('normalizeCity tidies case/whitespace and applies NL aliases', () => {
  assert.equal(normalizeCity('  amsterdam '), 'Amsterdam')
  assert.equal(normalizeCity("'s-gravenhage"), 'Den Haag')
  assert.equal(normalizeCity('den haag'), 'Den Haag')
  assert.equal(normalizeCity(''), null)
  assert.equal(normalizeCity(null), null)
})

test('domainFromUrl strips protocol/www and lowercases', () => {
  assert.equal(domainFromUrl('https://www.De-Kas.nl/menu'), 'de-kas.nl')
  assert.equal(domainFromUrl('restaurantdekas.nl'), 'restaurantdekas.nl')
  assert.equal(domainFromUrl('not a url'), null)
  assert.equal(domainFromUrl(null), null)
})
