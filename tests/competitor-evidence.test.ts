import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCompetitorProvenance, type ProvenanceEntity } from '../lib/audit/competitor-evidence'

const e = (over: Partial<ProvenanceEntity>): ProvenanceEntity => ({
  name: 'X', model: 'openai', prompt_id: 'p1', ...over,
})

test('aggregates providers and prompts per competitor, excluding the target', () => {
  const rows = [
    e({ name: 'De Kas', model: 'openai', prompt_id: 'p1', is_target: true }),     // target — excluded
    e({ name: 'Bar Centraal', model: 'openai', prompt_id: 'p1', context: 'great cocktails' }),
    e({ name: 'Restaurant Bar Centraal', model: 'anthropic', prompt_id: 'p2', context: 'lively' }),
    e({ name: 'Bar Centraal', model: 'openai', prompt_id: 'p1' }),                 // dup provider+prompt
  ]
  const prov = buildCompetitorProvenance(rows, 'De Kas')

  assert.equal(prov.has('de kas'), false, 'target excluded')
  // normalizeName strips the category word "Bar" → canonical key is "centraal".
  const bc = prov.get('centraal')!
  assert.deepEqual(bc.providers, ['anthropic', 'openai'])
  assert.deepEqual(bc.prompt_ids, ['p1', 'p2'])
  assert.deepEqual(bc.sample_evidence, ['great cocktails', 'lively'])
})

test('caps sample evidence at three excerpts and dedupes', () => {
  const rows = ['a', 'b', 'c', 'd', 'a'].map((ctx, i) =>
    e({ name: 'Comp', model: 'openai', prompt_id: `p${i}`, context: ctx }))
  const prov = buildCompetitorProvenance(rows, 'Target')
  assert.equal(prov.get('comp')!.sample_evidence.length, 3)
})

test('prefers stored normalized_name and is_target flag', () => {
  const rows = [
    e({ name: 'Weird Casing CO', normalized_name: 'comp', model: 'gemini', prompt_id: 'p1' }),
    e({ name: 'Target Inc', normalized_name: 'target', is_target: true, prompt_id: 'p2' }),
  ]
  const prov = buildCompetitorProvenance(rows, 'Target Inc')
  assert.ok(prov.has('comp'))
  assert.equal(prov.has('target'), false)
})
