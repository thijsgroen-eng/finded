import { test } from 'node:test'
import assert from 'node:assert/strict'
import { monitoringSummaryEmail } from '../lib/email/send'

/* monitoringSummaryEmail — deterministic monthly digest (#12). Numbers come from
 * the Observation Engine change log; this only formats them. */

test('summary: visibility up, provider gained', () => {
  const m = monitoringSummaryEmail({
    restaurantName: 'De Kas',
    visibilityScore: 72,
    visibilityDelta: 8,
    providersChanged: { gemini: { from: false, to: true } },
    factsChanged: {},
    reportUrl: 'https://finded.app/report/de-kas-abc',
  })
  assert.match(m.subject, /De Kas/)
  assert.match(m.subject, /72\/100/)
  assert.match(m.subject, /up \+8/)
  assert.match(m.html, /Gemini now mentions you/)
  assert.match(m.html, /View your dashboard/)
})

test('summary: visibility down is shown as a drop', () => {
  const m = monitoringSummaryEmail({ restaurantName: 'X', visibilityScore: 40, visibilityDelta: -5 })
  assert.match(m.subject, /down -5/)
})

test('summary: no changes reads as unchanged', () => {
  const m = monitoringSummaryEmail({ restaurantName: 'X', visibilityScore: 50, visibilityDelta: 0 })
  assert.match(m.subject, /unchanged/)
  assert.match(m.text, /No major changes/)
})

test('summary: Dutch localization', () => {
  const m = monitoringSummaryEmail({
    restaurantName: 'De Kas', visibilityScore: 60, visibilityDelta: 3,
    providersChanged: { openai: { from: true, to: false } }, lang: 'nl',
  })
  assert.match(m.subject, /gestegen/)
  assert.match(m.html, /ChatGPT noemt je niet meer/)
})

test('summary: counts changed website signals', () => {
  const m = monitoringSummaryEmail({
    restaurantName: 'X', visibilityScore: 55, visibilityDelta: 2,
    factsChanged: { html_menu: { from: false, to: true }, faq_present: { from: false, to: true } },
  })
  assert.match(m.html, /2 website signal\(s\) changed/)
})
