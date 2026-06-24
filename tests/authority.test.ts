import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildAuthoritySignals } from '../lib/audit/authority'

test('classifies known platforms and counts them', () => {
  const a = buildAuthoritySignals([
    'https://www.tripadvisor.com/Restaurant_Review-x',
    'https://www.tripadvisor.nl/y',
    'https://guide.michelin.com/nl/amsterdam',
    'https://www.thefork.nl/restaurant/z',
    'https://someblog.example.com/best-eats',
  ], 'dekas.nl')

  assert.equal(a.totalSources, 5)
  const keys = a.platforms.map((p) => p.key)
  assert.ok(keys.includes('tripadvisor'))
  assert.equal(a.platforms.find((p) => p.key === 'tripadvisor')!.count, 2)
  assert.ok(keys.includes('michelin'))
  assert.ok(keys.includes('thefork'))
  assert.deepEqual(a.otherDomains.map((d) => d.domain), ['someblog.example.com'])
  assert.equal(a.ownCited, false)
})

test('detects when the restaurant\'s own domain is cited', () => {
  const a = buildAuthoritySignals(
    [{ url: 'https://dekas.nl/menu' }, 'https://www.tripadvisor.com/x'],
    'dekas.nl',
  )
  assert.equal(a.ownCited, true)
  // own domain is not counted as a platform/other
  assert.equal(a.platforms.find((p) => p.key === 'tripadvisor')!.count, 1)
})

test('handles object-shaped sources and ignores junk', () => {
  const a = buildAuthoritySignals([{ uri: 'https://www.thefork.nl/a' }, { nope: true }, 'not a url', null], null)
  assert.equal(a.platforms.find((p) => p.key === 'thefork')!.count, 1)
})

test('empty sources → empty signals', () => {
  const a = buildAuthoritySignals([], 'x.nl')
  assert.equal(a.totalSources, 0)
  assert.deepEqual(a.platforms, [])
  assert.equal(a.ownCited, false)
})
