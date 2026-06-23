import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decodeHtmlEntities } from '../lib/engine/html'

test('decodes numeric (decimal + hex) entities', () => {
  assert.equal(decodeHtmlEntities('Bistro &#8211; Amsterdam'), 'Bistro – Amsterdam')
  assert.equal(decodeHtmlEntities('Caf&#xe9; de Plek'), 'Café de Plek')
})

test('decodes common named entities', () => {
  assert.equal(decodeHtmlEntities('Fish &amp; Chips'), 'Fish & Chips')
  assert.equal(decodeHtmlEntities('Tapas &ndash; Bar'), 'Tapas – Bar')
  assert.equal(decodeHtmlEntities('Prijs &euro;25'), 'Prijs €25')
})

test('leaves unknown entities untouched and collapses whitespace', () => {
  assert.equal(decodeHtmlEntities('a&nbsp;&nbsp;b'), 'a b')
  assert.equal(decodeHtmlEntities('keep &notareal; here'), 'keep &notareal; here')
})

test('null/undefined passthrough', () => {
  assert.equal(decodeHtmlEntities(null), null)
  assert.equal(decodeHtmlEntities(undefined), null)
})
