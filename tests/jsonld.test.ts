import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  stripJsonComments, parseJsonLd, sanitizeJsonLd, hasValidJsonLd, extractJsonLdBlocks,
} from '../lib/engine/jsonld'

test('stripJsonComments removes // and block comments and trailing commas', () => {
  const dirty = `{
    "@type": "Restaurant", // the type
    "name": "De Kas", /* legal name */
    "servesCuisine": "Italian",
  }`
  const cleaned = stripJsonComments(dirty)
  const parsed = JSON.parse(cleaned)
  assert.equal(parsed.name, 'De Kas')
  assert.equal(parsed['@type'], 'Restaurant')
})

test('stripJsonComments does not touch // inside string values (e.g. URLs)', () => {
  const json = '{"url": "https://dekas.nl/menu"}'
  assert.equal(JSON.parse(stripJsonComments(json)).url, 'https://dekas.nl/menu')
})

test('parseJsonLd recovers commented JSON-LD that plain JSON.parse rejects', () => {
  const commented = '{"@type":"Restaurant", // x\n "name":"X"}'
  assert.throws(() => JSON.parse(commented))
  assert.deepEqual(parseJsonLd(commented), { '@type': 'Restaurant', name: 'X' })
})

test('sanitizeJsonLd rewrites a commented block into strictly-valid JSON-LD', () => {
  const html = `<script type="application/ld+json">
  {
    "@context": "https://schema.org", // context
    "@type": "Restaurant",
    "telephone": "[PLACEHOLDER: phone]",
  }
  </script>`
  // The raw inner block is NOT strict JSON (comments + trailing comma).
  const rawInner = html.replace(/[\s\S]*?>/, '').replace(/<\/script>/, '').trim()
  assert.throws(() => JSON.parse(rawInner))

  const fixed = sanitizeJsonLd(html)
  assert.ok(!fixed.includes('// context'), 'comment removed')
  const fixedInner = fixed.replace(/[\s\S]*?>/, '').replace(/<\/script>/, '').trim()
  const parsed = JSON.parse(fixedInner) // strict parse must now succeed
  assert.equal(parsed['@type'], 'Restaurant')
  assert.equal(hasValidJsonLd(fixed), true)
})

test('sanitizeJsonLd wraps bare JSON in a script tag', () => {
  const bare = '{"@type":"Restaurant","name":"X",}'
  const out = sanitizeJsonLd(bare)
  assert.ok(out.includes('application/ld+json'))
  assert.equal(extractJsonLdBlocks(out)[0].valid, true)
})

test('sanitizeJsonLd leaves valid JSON-LD and placeholder string values intact', () => {
  const ok = '<script type="application/ld+json">{"@type":"Restaurant","priceRange":"[PLACEHOLDER: €€]"}</script>'
  assert.equal(hasValidJsonLd(sanitizeJsonLd(ok)), true)
})
