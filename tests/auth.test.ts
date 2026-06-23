import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { passwordMatches, expectedToken, isValidSession } from '../lib/auth/admin'

const original = process.env.ADMIN_PASSWORD
afterEach(() => { process.env.ADMIN_PASSWORD = original })

test('passwordMatches accepts the correct password and rejects wrong ones', () => {
  process.env.ADMIN_PASSWORD = 'hunter2'
  assert.equal(passwordMatches('hunter2'), true)
  assert.equal(passwordMatches('nope'), false)
})

test('passwordMatches tolerates trailing whitespace in the env var (paste footgun)', () => {
  process.env.ADMIN_PASSWORD = 'hunter2\n' // trailing newline from a dashboard paste
  assert.equal(passwordMatches('hunter2'), true)
  assert.equal(passwordMatches('  hunter2  '), true)
})

test('expectedToken round-trips to a valid session and rejects garbage', async () => {
  process.env.ADMIN_PASSWORD = 'hunter2\n'
  const token = await expectedToken()
  assert.ok(token)
  assert.equal(await isValidSession(token), true)
  assert.equal(await isValidSession('garbage'), false)
  assert.equal(await isValidSession(undefined), false)
})

test('unconfigured password fails closed', async () => {
  delete process.env.ADMIN_PASSWORD
  assert.equal(passwordMatches('anything'), false)
  assert.equal(await expectedToken(), null)
  assert.equal(await isValidSession('whatever'), false)
})
