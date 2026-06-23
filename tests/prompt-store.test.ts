import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  mergeTemplateRows,
  selectTemplate,
  generatePrompts,
  type TemplateSet,
} from '../lib/engine/prompt-generator'

const base: TemplateSet = {
  discovery: ['Best restaurants in {location}'],
  category: ['Best {subtype} restaurant {location}'],
  occasions: ['Romantic dinner {location}'],
  problemSolution: ['Where to eat with kids in {location}'],
  trust: ['Highest rated restaurants {location}'],
  geographic: ['Best restaurants near me {location}'],
}

test('mergeTemplateRows with no rows returns the base set unchanged', () => {
  assert.deepEqual(mergeTemplateRows(base, []), base)
})

test('mergeTemplateRows overrides only categories that have rows', () => {
  const merged = mergeTemplateRows(base, [
    { category: 'category', template: 'Top {subtype} spot {location}' },
    { category: 'category', template: 'Where for {subtype} in {location}' },
  ])
  // overridden category replaced entirely…
  assert.deepEqual(merged.category, [
    'Top {subtype} spot {location}',
    'Where for {subtype} in {location}',
  ])
  // …others untouched
  assert.deepEqual(merged.discovery, base.discovery)
  assert.deepEqual(merged.trust, base.trust)
})

test('mergeTemplateRows ignores unknown categories', () => {
  const merged = mergeTemplateRows(base, [
    { category: 'nonsense', template: 'should be dropped' },
  ])
  assert.deepEqual(merged, base)
})

test('generatePrompts honours a template override and fills placeholders', () => {
  const override = mergeTemplateRows(selectTemplate('restaurant', 'nl'), [
    { category: 'category', template: 'UNIEK {subtype} {location}' },
  ])
  const prompts = generatePrompts(
    { name: 'X', businessType: 'restaurant', subtypes: ['italiaans'], location: 'Utrecht', language: 'nl' },
    override,
  )
  const custom = prompts.find((p) => p.prompt.startsWith('UNIEK'))
  assert.ok(custom, 'override template should appear in generated prompts')
  assert.equal(custom!.prompt, 'UNIEK italiaans Utrecht')
})
