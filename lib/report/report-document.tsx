import React from 'react'
import { Document, Page, View, Text, StyleSheet, Svg, Circle, Path } from '@react-pdf/renderer'
import { Language } from '@/lib/i18n'
import { reportStrings } from './strings'

// Plan-based variants drive which sections appear:
//  - free           : lead magnet — score, models, basic competitors, summary; fixes upsold
//  - audit          : the €49 detailed report — everything
//  - implementation : the €299 package — the prioritised fixes as an action plan
// 'full' / 'teaser' are kept as aliases (audit / free) for older links.
export type ReportVariant = 'free' | 'audit' | 'implementation' | 'full' | 'teaser'

export type ReportPlan = 'free' | 'audit' | 'implementation'
export function normalizeVariant(v: ReportVariant): ReportPlan {
  if (v === 'full') return 'audit'
  if (v === 'teaser') return 'free'
  return v
}

export interface ReportData {
  restaurantName: string
  city: string | null
  cuisine: string | null
  auditDate: string
  visibilityScore: number
  mentionFrequency: number // 0–1
  confidenceLo: number | null // 0–1
  confidenceHi: number | null // 0–1
  sampleCount: number | null
  modelConsensus: number // 0–4
  modelBreakdown: { model: string; frequency: number; mentions: number }[]
  sentiment: { positive: number; neutral: number; negative: number }
  competitors: { name: string; mention_count: number }[]
  recommendations: { title: string; description: string; priority: string; suggested_fix?: string | null; expected_impact?: string | null }[]
  websiteSignals?: { present: number; total: number } | null
  formulaVersion?: string | null
}

const MODEL_LABELS: Record<string, string> = {
  openai: 'ChatGPT', anthropic: 'Claude', gemini: 'Gemini', perplexity: 'Perplexity',
}

// ── Palette (premium navy + orange) ─────────────────────────────────────────
const NAVY = '#0f1b2d'
const NAVY_SOFT = '#1b2c44'
const ORANGE = '#f97316'
const INK = '#111827'
const MUTED = '#6b7280'
const FAINT = '#9ca3af'
const LINE = '#e5e7eb'
const PANEL = '#f7f8fa'
const WHITE = '#ffffff'
const GREEN = '#16a34a'
const AMBER = '#d97706'
const RED = '#dc2626'

const healthColor = (v0to100: number) => (v0to100 >= 60 ? GREEN : v0to100 >= 30 ? AMBER : RED)
const freqColor = (f0to1: number) => healthColor(f0to1 * 100)
const pct = (x: number) => `${Math.round(x * 100)}%`

/** SVG arc path from 12 o'clock, clockwise, for `fraction` of a full circle. */
function arcPath(cx: number, cy: number, r: number, fraction: number): string {
  const f = Math.max(0, Math.min(0.9999, fraction))
  const rad = (d: number) => (d * Math.PI) / 180
  const a0 = -90
  const a1 = -90 + f * 360
  const x0 = cx + r * Math.cos(rad(a0)), y0 = cy + r * Math.sin(rad(a0))
  const x1 = cx + r * Math.cos(rad(a1)), y1 = cy + r * Math.sin(rad(a1))
  const large = f > 0.5 ? 1 : 0
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`
}

const s = StyleSheet.create({
  // Cover
  cover: { backgroundColor: NAVY, color: WHITE, padding: 48, fontFamily: 'Helvetica', flexDirection: 'column', justifyContent: 'space-between' },
  coverTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: ORANGE, marginRight: 8 },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: WHITE, letterSpacing: 0.3 },
  previewBadge: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: NAVY, backgroundColor: ORANGE, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 3, letterSpacing: 1 },
  coverMid: { },
  coverKicker: { fontSize: 11, color: ORANGE, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 },
  coverName: { fontSize: 38, fontFamily: 'Helvetica-Bold', color: WHITE, lineHeight: 1.1 },
  coverMeta: { fontSize: 12, color: '#9fb3c8', marginTop: 12 },
  coverRule: { height: 3, width: 56, backgroundColor: ORANGE, marginTop: 22, borderRadius: 2 },
  coverTitle: { fontSize: 13, color: '#cdd9e5', marginTop: 22, maxWidth: 380, lineHeight: 1.5 },
  coverFootnote: { fontSize: 9, color: '#6f8298' },

  // Content
  page: { padding: 40, paddingBottom: 72, fontSize: 10, color: INK, fontFamily: 'Helvetica', lineHeight: 1.45 },

  // Hero score
  hero: { flexDirection: 'row', backgroundColor: NAVY, borderRadius: 10, padding: 26, marginBottom: 24, alignItems: 'center' },
  ringWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  ringCenter: { position: 'absolute', top: 0, left: 0, width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  ringScore: { fontSize: 34, fontFamily: 'Helvetica-Bold', color: WHITE },
  ringOf: { fontSize: 8, color: '#9fb3c8', marginTop: 1 },
  heroRight: { flex: 1, minWidth: 0, paddingLeft: 26 },
  heroLabel: { fontSize: 9, color: ORANGE, fontFamily: 'Helvetica-Bold', letterSpacing: 1, textTransform: 'uppercase' },
  heroHeadline: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: WHITE, marginTop: 4, marginBottom: 12 },
  heroStatRow: { flexDirection: 'row', gap: 16 },
  heroStat: { flex: 1, minWidth: 0 },
  heroStatVal: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: WHITE },
  heroStatLbl: { fontSize: 8, color: '#9fb3c8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  heroStatNote: { fontSize: 7.5, color: '#6f8298', marginTop: 2 },

  // Sections
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },

  // Model cards
  cardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modelCard: { width: '48%', backgroundColor: WHITE, border: `1pt solid ${LINE}`, borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modelLeft: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 9, height: 9, borderRadius: 5, marginRight: 8 },
  modelName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: INK },
  modelMentions: { fontSize: 8, color: FAINT, marginTop: 1 },
  modelPct: { fontSize: 15, fontFamily: 'Helvetica-Bold' },

  // Sentiment pills
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingVertical: 5, paddingHorizontal: 11 },
  pillText: { fontSize: 9, fontFamily: 'Helvetica-Bold' },

  // Competitor table
  table: { border: `1pt solid ${LINE}`, borderRadius: 8, overflow: 'hidden' },
  tHead: { flexDirection: 'row', backgroundColor: PANEL, paddingVertical: 6, paddingHorizontal: 12, borderBottom: `1pt solid ${LINE}` },
  tHeadCell: { fontSize: 8, color: MUTED, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  tRow: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 12, borderBottom: `0.5pt solid ${LINE}` },
  tRank: { width: 22, fontSize: 10, color: FAINT, fontFamily: 'Helvetica-Bold' },
  tName: { flex: 1, fontSize: 10, color: INK },
  tCount: { fontSize: 10, color: MUTED },

  // Recommendations
  recItem: { flexDirection: 'row', marginBottom: 10 },
  recNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: ORANGE, color: WHITE, fontSize: 11, fontFamily: 'Helvetica-Bold', textAlign: 'center', paddingTop: 4, marginRight: 10 },
  recBody: { flex: 1, borderLeft: `2pt solid ${LINE}`, paddingLeft: 10 },
  recTitle: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: INK },
  recPriority: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  recDesc: { fontSize: 9, color: MUTED, marginTop: 2 },

  methodBody: { fontSize: 8.5, color: MUTED, lineHeight: 1.5 },

  hiddenNote: { fontSize: 9.5, color: MUTED, backgroundColor: PANEL, borderRadius: 6, padding: 10 },
  unlock: { marginTop: 8, backgroundColor: NAVY, borderRadius: 8, padding: 14, flexDirection: 'row', alignItems: 'center' },
  unlockBar: { width: 3, backgroundColor: ORANGE, alignSelf: 'stretch', borderRadius: 2, marginRight: 12 },
  unlockTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: WHITE, marginBottom: 3 },
  unlockBody: { fontSize: 9, color: '#cdd9e5' },

  // Footer
  footer: { position: 'absolute', bottom: 28, left: 40, right: 40, borderTop: `1pt solid ${LINE}`, paddingTop: 7, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  footerBrand: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: FAINT, marginLeft: 12 },
  footerDisclaimer: { fontSize: 6.5, color: FAINT, maxWidth: 380, lineHeight: 1.3 },
})

function priorityColor(p: string) {
  return p === 'high' ? RED : p === 'low' ? FAINT : AMBER
}

function ScoreRing({ score }: { score: number }) {
  const size = 120, stroke = 11, r = (size - stroke) / 2, cx = size / 2, cy = size / 2
  const f = Math.max(0, Math.min(1, score / 100))
  const color = healthColor(score)
  return (
    <View style={s.ringWrap}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={NAVY_SOFT} strokeWidth={stroke} fill="none" />
        {f >= 0.999 ? (
          <Circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth={stroke} fill="none" />
        ) : f > 0 ? (
          <Path d={arcPath(cx, cy, r, f)} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" />
        ) : null}
      </Svg>
      <View style={s.ringCenter}>
        <Text style={s.ringScore}>{Math.round(score)}</Text>
        <Text style={s.ringOf}>/ 100</Text>
      </View>
    </View>
  )
}

function Footer({ disclaimer }: { disclaimer: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerDisclaimer}>{disclaimer}</Text>
      <Text
        style={s.footerBrand}
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `finded.vercel.app  ·  ${pageNumber}/${totalPages}`
        }
      />
    </View>
  )
}

export function ReportDocument({ data, language, variant }: { data: ReportData; language: Language; variant: ReportVariant }) {
  const t = reportStrings(language)
  const mode = normalizeVariant(variant)
  const isFree = mode === 'free'
  const isImpl = mode === 'implementation'
  const priorityLabel = (p: string) => (p === 'high' ? t.priorityHigh : p === 'low' ? t.priorityLow : t.priorityMedium)

  const sentimentPills: { label: string; value: number; color: string; bg: string }[] = [
    { label: t.positive, value: data.sentiment.positive, color: GREEN, bg: '#e7f6ec' },
    { label: t.neutral, value: data.sentiment.neutral, color: MUTED, bg: '#f1f2f4' },
    { label: t.negative, value: data.sentiment.negative, color: RED, bg: '#fcebeb' },
  ]

  return (
    <Document title={`${data.restaurantName} — ${t.brandTagline}`}>
      {/* ── Cover ── */}
      <Page size="A4" style={s.cover}>
        <View style={s.coverTopRow}>
          <View style={s.brandRow}>
            <View style={s.brandDot} />
            <Text style={s.brand}>Finded</Text>
          </View>
          {isFree && <Text style={s.previewBadge}>{t.previewBadge}</Text>}
        </View>

        <View style={s.coverMid}>
          <Text style={s.coverKicker}>{t.brandTagline}</Text>
          <Text style={s.coverName}>{data.restaurantName}</Text>
          <Text style={s.coverMeta}>
            {[data.city, data.cuisine].filter(Boolean).join('  ·  ') || ' '}
          </Text>
          <View style={s.coverRule} />
          <Text style={s.coverTitle}>{t.reportTitle}</Text>
        </View>

        <Text style={s.coverFootnote}>{t.auditedOn} {data.auditDate}</Text>
      </Page>

      {/* ── Report body ── */}
      <Page size="A4" style={s.page}>
        {/* Hero score */}
        <View style={s.hero}>
          <ScoreRing score={data.visibilityScore} />
          <View style={s.heroRight}>
            <Text style={s.heroLabel}>{t.visibilityScore}</Text>
            <Text style={s.heroHeadline}>{t.appearsInResponses(Math.round(data.mentionFrequency * 100))}</Text>
            <View style={s.heroStatRow}>
              <View style={s.heroStat}>
                <Text style={s.heroStatVal}>{pct(data.mentionFrequency)}</Text>
                <Text style={s.heroStatLbl}>{t.mentionFrequency}</Text>
                {data.confidenceLo != null && data.confidenceHi != null && (
                  <Text style={s.heroStatNote}>
                    {t.confidenceBand}: {pct(data.confidenceLo)}–{pct(data.confidenceHi)}
                    {data.sampleCount ? ` · ${t.basedOnSamples(data.sampleCount)}` : ''}
                  </Text>
                )}
              </View>
              <View style={s.heroStat}>
                <Text style={s.heroStatVal}>{data.modelConsensus} / 4</Text>
                <Text style={s.heroStatLbl}>{t.modelConsensus}</Text>
                <Text style={s.heroStatNote}>{t.modelsFound(data.modelConsensus)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Per-model cards */}
        {data.modelBreakdown.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t.perModel}</Text>
            <View style={s.cardRow}>
              {data.modelBreakdown.map((m) => {
                const c = freqColor(m.frequency)
                return (
                  <View key={m.model} style={s.modelCard}>
                    <View style={s.modelLeft}>
                      <View style={[s.statusDot, { backgroundColor: c }]} />
                      <View>
                        <Text style={s.modelName}>{MODEL_LABELS[m.model] ?? m.model}</Text>
                        <Text style={s.modelMentions}>{m.mentions} {t.mentions.toLowerCase()}</Text>
                      </View>
                    </View>
                    <Text style={[s.modelPct, { color: c }]}>{pct(m.frequency)}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Sentiment pills */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.sentiment}</Text>
          <View style={s.pillRow}>
            {sentimentPills.map((p) => (
              <View key={p.label} style={[s.pill, { backgroundColor: p.bg }]}>
                <View style={[s.statusDot, { backgroundColor: p.color }]} />
                <Text style={[s.pillText, { color: p.color }]}>{p.label}: {p.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Competitors (hidden in the implementation package) */}
        {!isImpl && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t.competitors}</Text>
            {data.competitors.length === 0 ? (
              <Text style={s.tCount}>—</Text>
            ) : (
              <View style={s.table}>
                <View style={s.tHead}>
                  <Text style={[s.tHeadCell, { width: 22 }]}>#</Text>
                  <Text style={[s.tHeadCell, { flex: 1 }]}>{t.competitorColumn}</Text>
                  <Text style={s.tHeadCell}>{t.mentions}</Text>
                </View>
                {(isFree ? data.competitors.slice(0, 3) : data.competitors).map((c, i) => (
                  <View key={`${c.name}-${i}`} style={s.tRow}>
                    <Text style={s.tRank}>{i + 1}</Text>
                    <Text style={s.tName}>{c.name}</Text>
                    <Text style={s.tCount}>{c.mention_count}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Recommendations / implementation plan */}
        <View style={[s.section, { marginBottom: 28 }]}>
          <Text style={s.sectionTitle}>{isImpl ? t.implementationPlan : t.recommendations}</Text>
          {data.recommendations.length === 0 ? (
            <Text style={s.tCount}>—</Text>
          ) : isFree ? (
            <>
              <Text style={s.hiddenNote}>{t.recommendationsHiddenNote(data.recommendations.length)}</Text>
              <View style={s.unlock}>
                <View style={s.unlockBar} />
                <View style={{ flex: 1 }}>
                  <Text style={s.unlockTitle}>{t.unlockTitle}</Text>
                  <Text style={s.unlockBody}>{t.unlockBody}</Text>
                </View>
              </View>
            </>
          ) : (
            data.recommendations.map((r, i) => (
              <View key={i} style={s.recItem} wrap={false}>
                <Text style={s.recNum}>{i + 1}</Text>
                <View style={s.recBody}>
                  <Text style={s.recTitle}>
                    {r.title}  <Text style={[s.recPriority, { color: priorityColor(r.priority) }]}>{priorityLabel(r.priority)}</Text>
                  </Text>
                  <Text style={s.recDesc}>{r.description}</Text>
                  {isImpl && r.suggested_fix && (
                    <Text style={[s.recDesc, { marginTop: 3 }]}>
                      <Text style={{ fontFamily: 'Helvetica-Bold', color: INK }}>{t.suggestedFix}: </Text>{r.suggested_fix}
                    </Text>
                  )}
                  {isImpl && r.expected_impact && (
                    <Text style={[s.recDesc, { marginTop: 2, color: GREEN }]}>
                      {t.expectedImpact}: {r.expected_impact}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Methodology & limitations — credibility in both variants */}
        <View style={s.section} wrap={false}>
          <Text style={s.sectionTitle}>{t.methodology}</Text>
          <Text style={s.methodBody}>{t.methodologyBody(data.modelBreakdown.length || 4, data.sampleCount)}</Text>
          {(data.websiteSignals || data.formulaVersion) && (
            <Text style={[s.methodBody, { marginTop: 4 }]}>
              {data.websiteSignals ? t.websiteSignalsLine(data.websiteSignals.present, data.websiteSignals.total) + ' ' : ''}
              {data.formulaVersion ? t.formulaVersionLine(data.formulaVersion) : ''}
            </Text>
          )}
          <Text style={[s.sectionTitle, { marginTop: 10 }]}>{t.limitations}</Text>
          <Text style={s.methodBody}>{t.limitationsBody}</Text>
        </View>

        <Footer disclaimer={t.estimateCaveat} />
      </Page>
    </Document>
  )
}
