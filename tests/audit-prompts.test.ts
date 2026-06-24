import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildAuditPrompts, PROMPT_CORPUS } from '../lib/audit/prompts'

test('buildAuditPrompts is deterministic / repeatable', () => {
  const a = buildAuditPrompts({ city: 'Amsterdam', cuisine: 'Italiaans' })
  const b = buildAuditPrompts({ city: 'Amsterdam', cuisine: 'Italiaans' })
  assert.deepEqual(a, b)
})

test('defaults to Dutch and renders the city', () => {
  const prompts = buildAuditPrompts({ city: 'Utrecht' })
  assert.ok(prompts.length > 0)
  assert.ok(prompts.every((p) => p.language === 'nl'))
  assert.ok(prompts.some((p) => p.rendered_prompt.includes('Utrecht')))
})

test('cuisine template is included only when cuisine is known, and renders it', () => {
  const without = buildAuditPrompts({ city: 'Amsterdam' })
  assert.equal(without.some((p) => p.intent === 'cuisine_recommendation'), false)

  const withCuisine = buildAuditPrompts({ city: 'Amsterdam', cuisine: 'sushi' })
  const cuisine = withCuisine.find((p) => p.intent === 'cuisine_recommendation')
  assert.ok(cuisine)
  assert.ok(cuisine!.rendered_prompt.includes('sushi'))
})

test('neighborhood template only when neighborhood is known', () => {
  const none = buildAuditPrompts({ city: 'Amsterdam' })
  assert.equal(none.some((p) => p.intent === 'neighborhood'), false)
  const withHood = buildAuditPrompts({ city: 'Amsterdam', neighborhood: 'De Pijp' })
  const hood = withHood.find((p) => p.intent === 'neighborhood')
  assert.ok(hood && hood.rendered_prompt.includes('De Pijp'))
})

test('cuisine recommendation outranks generic best-in-city (sorted by weight)', () => {
  const prompts = buildAuditPrompts({ city: 'Amsterdam', cuisine: 'Italiaans' })
  const cuisineIdx = prompts.findIndex((p) => p.intent === 'cuisine_recommendation')
  const bestIdx = prompts.findIndex((p) => p.intent === 'best_in_city')
  assert.ok(cuisineIdx < bestIdx, 'cuisine prompt should sort before generic discovery')
})

test('no rendered prompt contains an empty placeholder', () => {
  const prompts = buildAuditPrompts({ city: 'Amsterdam', cuisine: 'Frans', neighborhood: 'Jordaan', language: 'en' })
  for (const p of prompts) {
    assert.equal(/\{(city|cuisine|neighborhood)\}/.test(p.rendered_prompt), false)
    assert.equal(/\s{2,}/.test(p.rendered_prompt), false)
  }
})

test('English corpus is available and used when requested', () => {
  const prompts = buildAuditPrompts({ city: 'Amsterdam', language: 'en' })
  assert.ok(prompts.every((p) => p.language === 'en'))
  assert.ok(prompts.some((p) => p.rendered_prompt.startsWith('What are the best restaurants')))
  assert.equal(PROMPT_CORPUS.en.length, PROMPT_CORPUS.nl.length)
})
