import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  isRestaurant, onlyRestaurants, dedupeByEntity, findDuplicateGroups,
  dataQualityWarnings, displayCity, type EntityRow,
} from '../lib/engine/dashboard'

const row = (over: Partial<EntityRow>): EntityRow => ({
  id: Math.random().toString(36), name: 'X', city: 'Amsterdam', cuisine: 'italian',
  business_type: 'restaurant', website: null, domain: null, ...over,
})

test('isRestaurant treats null/empty as restaurant, rejects other types', () => {
  assert.equal(isRestaurant('restaurant'), true)
  assert.equal(isRestaurant(null), true)
  assert.equal(isRestaurant(''), true)
  assert.equal(isRestaurant('Restaurant'), true)
  assert.equal(isRestaurant('dentist'), false)
  assert.equal(isRestaurant('lawyer'), false)
})

test('onlyRestaurants drops dental clinics and lawyers', () => {
  const rows = [
    row({ name: 'De Kas', business_type: 'restaurant' }),
    row({ name: 'Dental Clinic', business_type: 'dentist' }),
    row({ name: 'Vanderkooijbestersadvocaten', business_type: 'lawyer' }),
    row({ name: 'Legacy', business_type: null }),
  ]
  const kept = onlyRestaurants(rows)
  assert.deepEqual(kept.map((r) => r.name), ['De Kas', 'Legacy'])
})

test('dedupeByEntity collapses same domain and name/city variants', () => {
  const rows = [
    row({ name: 'De Kas', website: 'https://www.dekas.nl' }),
    row({ name: 'Restaurant De Kas', website: 'http://dekas.nl/menu' }), // same domain
    row({ name: 'Bar Centraal', city: 'Amsterdam', website: null }),
    row({ name: 'Bar Centraal', city: 'amsterdam', website: null }),     // same name+city
  ]
  const unique = dedupeByEntity(rows)
  assert.equal(unique.length, 2)
})

test('findDuplicateGroups reports the duplicate clusters', () => {
  const rows = [
    row({ name: 'Bar Centraal', website: null }),
    row({ name: 'Bar Centraal', website: null }),
    row({ name: 'Solo', website: null }),
  ]
  const groups = findDuplicateGroups(rows)
  assert.equal(groups.length, 1)
  assert.equal(groups[0].length, 2)
})

test('dataQualityWarnings counts non-restaurants, dupes, and missing fields', () => {
  const rows = [
    row({ name: 'A', website: null, city: 'Amsterdam', cuisine: 'italian' }),
    row({ name: 'A', website: null, city: 'Amsterdam', cuisine: 'italian' }), // dup
    row({ name: 'Clinic', business_type: 'dentist' }),                        // non-restaurant
    row({ name: 'B', city: null, cuisine: null }),                            // missing city + cuisine
  ]
  const w = dataQualityWarnings(rows)
  assert.equal(w.nonRestaurants, 1)
  assert.equal(w.duplicateGroups, 1)
  assert.equal(w.missingCity, 1)
  assert.equal(w.missingCuisine, 1)
})

test('displayCity normalizes case and aliases', () => {
  assert.equal(displayCity('amsterdam'), 'Amsterdam')
  assert.equal(displayCity("'s-gravenhage"), 'Den Haag')
  assert.equal(displayCity(null), '—')
})
