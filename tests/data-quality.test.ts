import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDataQuality } from '../lib/audit/data-quality'

test('High when most calls completed across 2+ providers', () => {
  const dq = buildDataQuality({
    total_runs: 10, completed: 9,
    providers: [{ model: 'openai', completed: 5, failed: 0 }, { model: 'anthropic', completed: 4, failed: 1 }],
  })
  assert.equal(dq.level, 'High')
  assert.ok(dq.reason.includes('ChatGPT completed successfully'))
})

test('Medium when completion is partial', () => {
  const dq = buildDataQuality({
    total_runs: 10, completed: 5,
    providers: [{ model: 'openai', completed: 5, failed: 0 }, { model: 'anthropic', completed: 0, failed: 5 }],
  })
  assert.equal(dq.level, 'Medium')
  assert.ok(dq.reason.includes('Claude failed'))
})

test('Low when almost everything failed', () => {
  const dq = buildDataQuality({
    total_runs: 12, completed: 1,
    providers: [{ model: 'openai', completed: 1, failed: 3 }, { model: 'anthropic', completed: 0, failed: 4 }, { model: 'gemini', completed: 0, failed: 4 }],
  })
  assert.equal(dq.level, 'Low')
})

test('no runs → Low with a clear reason', () => {
  const dq = buildDataQuality({ total_runs: 0, completed: 0, providers: [] })
  assert.equal(dq.level, 'Low')
  assert.match(dq.reason, /No model responses/)
})
