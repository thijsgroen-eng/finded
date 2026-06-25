import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildKeyFindings, buildCompetitorObservations } from '../lib/audit/findings'

test('key findings lead with recommendation status and citation', () => {
  const f = buildKeyFindings({
    mentioned: false, ownCited: false,
    presentSignals: ['Restaurant schema', 'Crawlable menu'],
    gapSignals: ['FAQ content', 'City stated in title/description'],
  })
  assert.equal(f[0].ok, false)
  assert.match(f[0].label, /Not recommended/)
  assert.equal(f[1].ok, false)
  assert.match(f[1].label, /not cited/)
  assert.ok(f.some((x) => x.ok && x.label === 'Restaurant schema'))
  assert.ok(f.some((x) => !x.ok && x.label === 'FAQ content'))
})

test('observations cite competitors, authority and gaps without inventing competitor sites', () => {
  const obs = buildCompetitorObservations({
    mentioned: false, ownCited: false,
    authorityPlatforms: ['Tripadvisor', 'Michelin Guide'],
    topCompetitors: [{ name: 'De Kas', mention_count: 9 }, { name: 'Bar Centraal', mention_count: 5 }],
    gapSignals: ['Restaurant schema', 'FAQ content'],
  })
  assert.ok(obs.some((o) => o.includes('De Kas')))
  assert.ok(obs.some((o) => o.includes('Tripadvisor') && o.includes('not cited')))
  assert.ok(obs.some((o) => /missing signals/i.test(o)))
  // never claims competitors' own sites have anything
  assert.ok(!obs.join(' ').toLowerCase().includes('competitors have'))
})

test('positive case: mentioned + own cited reads supportively', () => {
  const obs = buildCompetitorObservations({
    mentioned: true, ownCited: true,
    authorityPlatforms: ['Google'], topCompetitors: [], gapSignals: [],
  })
  assert.ok(obs.some((o) => o.includes('among the cited sources')))
})
