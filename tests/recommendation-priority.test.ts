import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computePriorityRank, asLevel, priorityRankOrder } from '../lib/audit/recommendation-priority'

test('high impact + low/medium effort → do_first', () => {
  assert.equal(computePriorityRank('high', 'low'), 'do_first')
  assert.equal(computePriorityRank('high', 'medium'), 'do_first')
})

test('high impact + high effort → do_next (valuable but hard)', () => {
  assert.equal(computePriorityRank('high', 'high'), 'do_next')
})

test('low impact → optional regardless of effort', () => {
  assert.equal(computePriorityRank('low', 'low'), 'optional')
  assert.equal(computePriorityRank('low', 'high'), 'optional')
})

test('medium impact: high effort → optional, else do_next', () => {
  assert.equal(computePriorityRank('medium', 'high'), 'optional')
  assert.equal(computePriorityRank('medium', 'low'), 'do_next')
  assert.equal(computePriorityRank('medium', 'medium'), 'do_next')
})

test('asLevel normalizes junk to medium', () => {
  assert.equal(asLevel('high'), 'high')
  assert.equal(asLevel('nonsense'), 'medium')
  assert.equal(asLevel(undefined), 'medium')
})

test('priorityRankOrder sorts do_first < do_next < optional', () => {
  assert.ok(priorityRankOrder('do_first') < priorityRankOrder('do_next'))
  assert.ok(priorityRankOrder('do_next') < priorityRankOrder('optional'))
})
