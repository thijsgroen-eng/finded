import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { ReportDocument, ReportData } from '../lib/report/report-document'

const data: ReportData = {
  restaurantName: 'De Kas', city: 'Amsterdam', cuisine: 'Mediterranean', auditDate: '25 June 2026',
  status: 'Not recommended', appeared: { x: 0, y: 66 },
  dataQuality: { level: 'High', reason: 'All providers completed.' },
  reliability: { band: 'green', headline: '92% of AI model calls succeeded', detail: '66 of 72 calls succeeded.' },
  visibilityScore: 36, opportunityScore: 70, mentionFrequency: 0, confidenceLo: 0, confidenceHi: 0.05,
  sampleCount: 66, modelConsensus: 0,
  modelBreakdown: [
    { model: 'openai', frequency: 0, mentions: 0 }, { model: 'anthropic', frequency: 0.17, mentions: 4 },
    { model: 'gemini', frequency: 0, mentions: 0 },
  ],
  keyFindings: [
    { ok: false, label: 'Not recommended by AI in your city' },
    { ok: false, label: 'Website not cited as a source' },
    { ok: false, label: 'No Restaurant schema detected' },
    { ok: true, label: 'Menu page present' },
  ],
  websiteSnapshot: [
    { label: 'Schema', strength: 'Missing' }, { label: 'Menu', strength: 'Present' },
    { label: 'Hours', strength: 'Weak' }, { label: 'Reservations', strength: 'Present' }, { label: 'Reviews', strength: 'Weak' },
  ],
  websiteReview: [
    { label: 'Restaurant schema', status: 'missing', why: null, impact: 'high', recommendation: 'Add JSON-LD' },
    { label: 'Menu', status: 'present', why: null, impact: null, recommendation: null },
  ],
  authorityPlatforms: ['Google', 'TripAdvisor', 'TheFork'], ownCited: false,
  competitors: [
    { name: 'Restaurant De Kas', mention_count: 18, providers: ['openai', 'gemini'] },
    { name: 'Flore', mention_count: 14, providers: ['anthropic'] },
    { name: 'Ciel Bleu', mention_count: 11, providers: ['gemini'] },
  ],
  promptEvidence: Array.from({ length: 6 }, (_, i) => ({
    prompt: `Best restaurant in Amsterdam #${i + 1}`, category: 'category',
    recommended: ['Flore', 'Ciel Bleu'], mentioned: false, sources: ['google.com', 'thefork.com'],
  })),
  categoryPerformance: [
    { category: 'Cuisine', appeared: 0, total: 12 }, { category: 'Occasion', appeared: 0, total: 10 },
    { category: 'Neighbourhood', appeared: 0, total: 10 },
  ],
  competitorComparison: {
    crawled: 3,
    rows: [
      { label: 'Cuisine clarity', you: 'Weak', competitors: [{ name: 'Flore', grade: 'Strong' }, { name: 'Ciel Bleu', grade: 'Medium' }, { name: 'De Kas', grade: 'Strong' }] },
      { label: 'Location clarity', you: 'Medium', competitors: [{ name: 'Flore', grade: 'Strong' }, { name: 'Ciel Bleu', grade: 'Strong' }, { name: 'De Kas', grade: 'Strong' }] },
      { label: 'Menu discoverability', you: 'Strong', competitors: [{ name: 'Flore', grade: 'Medium' }, { name: 'Ciel Bleu', grade: 'Medium' }, { name: 'De Kas', grade: 'Strong' }] },
      { label: 'FAQ coverage', you: 'Missing', competitors: [{ name: 'Flore', grade: 'Strong' }, { name: 'Ciel Bleu', grade: 'Missing' }, { name: 'De Kas', grade: 'Strong' }] },
      { label: 'Authority signals', you: 'Weak', competitors: [{ name: 'Flore', grade: 'Medium' }, { name: 'Ciel Bleu', grade: 'Strong' }, { name: 'De Kas', grade: 'Strong' }] },
      { label: 'Review signals', you: 'Weak', competitors: [{ name: 'Flore', grade: 'Medium' }, { name: 'Ciel Bleu', grade: 'Medium' }, { name: 'De Kas', grade: 'Strong' }] },
      { label: 'Structured data', you: 'Weak', competitors: [{ name: 'Flore', grade: 'Strong' }, { name: 'Ciel Bleu', grade: 'Medium' }, { name: 'De Kas', grade: 'Strong' }] },
    ],
    whyWin: [{ name: 'Flore', reasons: 'shows strong cuisine clarity, structured data — signals AI can read.' }],
    gaps: ['3 of the top competitors provide strong authority signals while your site does not.'],
  },
  recommendations: [
    { title: 'Add Restaurant JSON-LD structured data', description: 'Implement schema.', priority: 'high', suggested_fix: null, expected_impact: '+15–25% mention frequency', priority_rank: 'do_first', impact_level: 'high', effort: 'medium' },
    { title: 'Rewrite meta description to declare cuisine', description: 'Replace office copy.', priority: 'high', suggested_fix: null, expected_impact: 'cuisine queries', priority_rank: 'do_first', impact_level: 'high', effort: 'low' },
  ],
  actionPlan: [{ label: 'Week 1', items: ['Add schema', 'Fix meta'] }, { label: 'Week 2', items: ['About page'] }],
  roadmap: [{ label: 'Days 1–30', items: ['Schema, meta, menu'] }],
  generatedAssets: [],
  formulaVersion: 'v2',
}

function countPages(buf: Buffer): number {
  const s = buf.toString('latin1')
  return (s.match(/\/Type\s*\/Page(?![s])/g) || []).length
}

async function main() {
  const fs = await import('node:fs')
  const out = process.env.OUT_DIR || '.'
  for (const variant of ['free', 'audit', 'implementation'] as const) {
    const buf = await renderToBuffer(React.createElement(ReportDocument, { data, language: 'en', variant })) as Buffer
    const nl = await renderToBuffer(React.createElement(ReportDocument, { data, language: 'nl', variant })) as Buffer
    console.log(`${variant.padEnd(16)} en=${countPages(buf)}pp (${(buf.length/1024).toFixed(1)}kb)  nl=${countPages(nl)}pp`)
    fs.writeFileSync(`${out}/dekas-${variant}-en.pdf`, buf)
    if (variant === 'free') fs.writeFileSync(`${out}/dekas-${variant}-nl.pdf`, nl)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
