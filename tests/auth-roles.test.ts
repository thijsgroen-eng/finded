import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.AUTH_SECRET = 'test-secret-for-tokens'

import {
  hashPassword, verifyPassword, createSessionToken, readSession,
  roleAtLeast, normRole,
} from '../lib/auth/admin'

test('password hash round-trips and rejects wrong password', async () => {
  const hash = await hashPassword('correct horse battery staple')
  assert.match(hash, /^pbkdf2\$\d+\$/)
  assert.equal(await verifyPassword('correct horse battery staple', hash), true)
  assert.equal(await verifyPassword('wrong', hash), false)
})

test('session token round-trips identity + role', async () => {
  const token = await createSessionToken({ uid: 'u1', email: 'a@finded.com', role: 'operator' })
  assert.ok(token && token.includes('.'))
  const s = await readSession(token!)
  assert.deepEqual(s, { uid: 'u1', email: 'a@finded.com', role: 'operator' })
})

test('a tampered token is rejected', async () => {
  const token = await createSessionToken({ uid: 'u1', email: 'a@finded.com', role: 'admin' })
  const [payload] = token!.split('.')
  assert.equal(await readSession(`${payload}.deadbeef`), null)
})

test('role hierarchy: admin > operator > viewer', () => {
  assert.equal(roleAtLeast('admin', 'operator'), true)
  assert.equal(roleAtLeast('operator', 'admin'), false)
  assert.equal(roleAtLeast('viewer', 'viewer'), true)
  assert.equal(roleAtLeast('operator', 'viewer'), true)
})

test('normRole falls back to operator for unknown values', () => {
  assert.equal(normRole('admin'), 'admin')
  assert.equal(normRole('nonsense'), 'operator')
  assert.equal(normRole(undefined), 'operator')
})
