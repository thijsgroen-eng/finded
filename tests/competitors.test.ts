import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aggregateCompetitors, type AggEntity } from '../lib/audit/competitors'

const e = (over: Partial<AggEntity>): AggEntity => ({
  name: 'X', model: 'openai', prompt_id: 'p1', ...over,
})

test('aggregates non-target mentions into evidence-rich rows', () => {
  const rows = aggregateCompetitors([
    e({ name: 'De Kas', is_target: true, position: 1 }),
    e({ name: 'Bar Centraal', model: 'openai', prompt_id: 'p1', position: 2, sentiment: 'positive', context: 'lively' }),
    e({ name: 'Bar Centraal', model: 'anthropic', prompt_id: 'p2', position: 4, sentiment: 'neutral' }),
  ], 'De Kas')

  assert.equal(rows.length, 1)
  const c = rows[0]
  assert.equal(c.mention_count, 2)
  assert.equal(c.avg_position, 3)
  assert.deepEqual(c.providers, ['anthropic', 'openai'])
  assert.deepEqual(c.prompt_ids, ['p1', 'p2'])
  assert.ok(c.sample_evidence.includes('lively'))
  assert.ok(c.share_of_voice > 0 && c.share_of_voice < 1)
})

test('share of voice is over target + competitor mentions', () => {
  const rows = aggregateCompetitors([
    e({ name: 'Target', is_target: true }),
    e({ name: 'Target', is_target: true }),
    e({ name: 'Comp', model: 'openai', prompt_id: 'p1' }),
  ], 'Target')
  // 1 competitor mention out of 3 total
  assert.ok(Math.abs(rows[0].share_of_voice - 1 / 3) < 1e-9)
})

test('picks the most common surface form as the display name', () => {
  const rows = aggregateCompetitors([
    e({ name: 'Restaurant Centraal', normalized_name: 'centraal', prompt_id: 'p1' }),
    e({ name: 'Centraal', normalized_name: 'centraal', prompt_id: 'p2' }),
    e({ name: 'Centraal', normalized_name: 'centraal', prompt_id: 'p3' }),
  ], 'Target')
  assert.equal(rows[0].name, 'Centraal')
})

test('respects the limit', () => {
  const many: AggEntity[] = []
  for (let i = 0; i < 15; i++) many.push(e({ name: `Comp ${i}`, prompt_id: `p${i}` }))
  assert.equal(aggregateCompetitors(many, 'Target', 10).length, 10)
})
