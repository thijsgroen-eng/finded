import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toWebsiteSignals, gapSignals } from '../lib/audit/website-signals'

const find = (sig: ReturnType<typeof toWebsiteSignals>, key: string) => sig.find((s) => s.key === key)!

test('returns [] when there is no website audit', () => {
  assert.deepEqual(toWebsiteSignals(null), [])
})

test('restaurant schema is present only when schema_types includes Restaurant', () => {
  assert.equal(find(toWebsiteSignals({ schema_present: true, schema_types: ['Restaurant'] }), 'restaurant_schema').status, 'present')
  // schema present but not a Restaurant type → weak
  assert.equal(find(toWebsiteSignals({ schema_present: true, schema_types: ['WebPage'] }), 'restaurant_schema').status, 'weak')
  // no schema → missing
  assert.equal(find(toWebsiteSignals({ schema_present: false }), 'restaurant_schema').status, 'missing')
})

test('title quality is weak when too long, present when reasonable', () => {
  assert.equal(find(toWebsiteSignals({ meta_title: 'De Kas — fine dining in Amsterdam' }), 'title_quality').status, 'present')
  assert.equal(find(toWebsiteSignals({ meta_title: 'x'.repeat(120) }), 'title_quality').status, 'weak')
  assert.equal(find(toWebsiteSignals({ meta_title: null }), 'title_quality').status, 'missing')
})

test('signals carry a recommended fix type and gapSignals filters to issues', () => {
  const sig = toWebsiteSignals({ schema_present: false, opening_hours_present: false, menu_present: true, menu_or_services_present: true })
  assert.equal(find(sig, 'restaurant_schema').recommendedFixType, 'schema_jsonld')
  assert.equal(find(sig, 'menu_link').status, 'present')
  const gaps = gapSignals(sig)
  assert.ok(gaps.every((s) => s.status !== 'present'))
  assert.ok(gaps.some((s) => s.key === 'opening_hours'))
})
