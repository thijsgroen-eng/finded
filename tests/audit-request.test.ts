import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateAuditRequest, isValidEmail, isValidWebsite, normalizeWebsite, LIMITS,
} from '../lib/leads/audit-request'

test('isValidEmail accepts real emails, rejects junk', () => {
  assert.equal(isValidEmail('owner@dekas.nl'), true)
  assert.equal(isValidEmail('a@b.co'), true)
  assert.equal(isValidEmail('nope'), false)
  assert.equal(isValidEmail('a@b'), false)
  assert.equal(isValidEmail('a b@c.com'), false)
})

test('isValidWebsite accepts bare domains and rejects non-domains', () => {
  assert.equal(isValidWebsite('dekas.nl'), true)
  assert.equal(isValidWebsite('https://www.dekas.nl/menu'), true)
  assert.equal(isValidWebsite('notaurl'), false)
  assert.equal(isValidWebsite('localhost'), false)
  assert.equal(isValidWebsite(''), false)
})

test('normalizeWebsite adds a protocol to bare domains', () => {
  assert.equal(normalizeWebsite('dekas.nl'), 'https://dekas.nl')
  assert.equal(normalizeWebsite('http://x.nl'), 'http://x.nl')
})

test('validateAuditRequest rejects empty submissions', () => {
  const r = validateAuditRequest({})
  assert.equal(r.ok, false)
  assert.ok(r.errors.website)
  assert.ok(r.errors.email)
})

test('validateAuditRequest requires a valid website and email', () => {
  const r = validateAuditRequest({ website: 'notaurl', email: 'bad' })
  assert.equal(r.ok, false)
  assert.ok(r.errors.website)
  assert.ok(r.errors.email)
})

test('validateAuditRequest cleans and lowercases a good submission', () => {
  const r = validateAuditRequest({
    website: ' DeKas.nl ', email: ' Owner@DeKas.NL ', restaurant_name: '  De Kas ',
    city: ' Amsterdam ', phone: ' 020 123 ', note: ' hi ',
  })
  assert.equal(r.ok, true)
  assert.deepEqual(r.cleaned, {
    website: 'https://DeKas.nl',
    domain: 'dekas.nl',
    restaurant_name: 'De Kas',
    city: 'Amsterdam',
    email: 'owner@dekas.nl',
    phone: '020 123',
    note: 'hi',
  })
})

test('validateAuditRequest enforces length limits', () => {
  const r = validateAuditRequest({
    website: 'dekas.nl', email: 'a@b.co',
    restaurant_name: 'x'.repeat(LIMITS.name + 1),
    note: 'y'.repeat(LIMITS.note + 1),
  })
  assert.equal(r.ok, false)
  assert.ok(r.errors.restaurant_name)
  assert.ok(r.errors.note)
})

test('validateAuditRequest flags honeypot as spam without field errors', () => {
  const r = validateAuditRequest({ website: 'dekas.nl', email: 'a@b.co', company: 'bot inc' })
  assert.equal(r.ok, false)
  assert.equal(r.spam, true)
  assert.deepEqual(r.errors, {})
})

test('optional fields collapse to null when blank', () => {
  const r = validateAuditRequest({ website: 'dekas.nl', email: 'a@b.co' })
  assert.equal(r.ok, true)
  assert.equal(r.cleaned!.restaurant_name, null)
  assert.equal(r.cleaned!.city, null)
  assert.equal(r.cleaned!.phone, null)
  assert.equal(r.cleaned!.note, null)
})
