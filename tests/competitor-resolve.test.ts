import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveCompetitorUrl } from '../lib/audit/competitor-resolve'

test('matches a competitor name to its own cited domain', () => {
  const url = resolveCompetitorUrl('De Kas', [
    'https://restauranttripadvisor.com/x',
    'https://dekas.nl/menu',
  ])
  assert.equal(url, 'https://dekas.nl/menu')
})

test('accepts source objects with a url field', () => {
  const url = resolveCompetitorUrl('Restaurant Breda', [
    { title: 'Breda site', url: 'https://restaurantbreda.nl' },
  ])
  assert.equal(url, 'https://restaurantbreda.nl')
})

test('never matches an aggregator/directory domain', () => {
  const url = resolveCompetitorUrl('De Kas', [
    'https://www.tripadvisor.com/dekas',
    'https://maps.google.com/dekas',
  ])
  assert.equal(url, null)
})

test('returns null when no cited domain matches the name', () => {
  const url = resolveCompetitorUrl('De Kas', [
    'https://someotherplace.nl',
    'https://yelp.com/dekas',
  ])
  assert.equal(url, null)
})

test('short names that would over-match are rejected', () => {
  assert.equal(resolveCompetitorUrl('Bar', ['https://bar.nl']), null)
})

test('prepends https when the cited url has no protocol', () => {
  const url = resolveCompetitorUrl('Brasserie Centraal', ['brasseriecentraal.nl/over-ons'])
  assert.equal(url, 'https://brasseriecentraal.nl/over-ons')
})
