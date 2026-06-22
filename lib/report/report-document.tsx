import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { Language } from '@/lib/i18n'
import { reportStrings } from './strings'

export type ReportVariant = 'full' | 'teaser'

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
  recommendations: { title: string; description: string; priority: string }[]
}

const MODEL_LABELS: Record<string, string> = {
  openai: 'ChatGPT', anthropic: 'Claude', gemini: 'Gemini', perplexity: 'Perplexity',
}

const INK = '#111110'
const MUTED = '#6b6a66'
const ACCENT = '#16a37a'
const LINE = '#e2e1dc'
const BG = '#fafaf8'

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: INK, fontFamily: 'Helvetica', lineHeight: 1.5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1pt solid ${LINE}`, paddingBottom: 12, marginBottom: 20 },
  brand: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: INK },
  tagline: { fontSize: 9, color: MUTED, marginTop: 2 },
  previewBadge: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#9a3412', backgroundColor: '#ffedd5', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 3 },
  h1: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  sub: { fontSize: 10, color: MUTED, marginBottom: 18 },
  heroRow: { flexDirection: 'row', gap: 16, marginBottom: 18 },
  scoreBox: { width: 150, backgroundColor: BG, border: `1pt solid ${LINE}`, borderRadius: 6, padding: 16, alignItems: 'center' },
  scoreNum: { fontSize: 40, fontFamily: 'Helvetica-Bold', color: ACCENT },
  scoreCap: { fontSize: 8, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4, textAlign: 'center' },
  metricCol: { flex: 1, justifyContent: 'space-between' },
  metric: { marginBottom: 8 },
  metricLabel: { fontSize: 8, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  metricVal: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  metricNote: { fontSize: 8, color: MUTED },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 6, borderBottom: `1pt solid ${LINE}`, paddingBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottom: `0.5pt solid ${LINE}` },
  cell: { fontSize: 10 },
  cellMuted: { fontSize: 10, color: MUTED },
  hiddenNote: { fontSize: 9, color: MUTED, backgroundColor: BG, padding: 8, borderRadius: 4 },
  unlock: { marginTop: 6, backgroundColor: '#0d2b22', borderRadius: 6, padding: 14 },
  unlockTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#fff', marginBottom: 4 },
  unlockBody: { fontSize: 9, color: '#cfe9df' },
  recTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  recDesc: { fontSize: 9, color: MUTED, marginBottom: 6 },
  footer: { position: 'absolute', bottom: 28, left: 40, right: 40, borderTop: `1pt solid ${LINE}`, paddingTop: 8 },
  footerText: { fontSize: 7.5, color: MUTED },
})

const pct = (x: number) => `${Math.round(x * 100)}%`

export function ReportDocument({ data, language, variant }: { data: ReportData; language: Language; variant: ReportVariant }) {
  const t = reportStrings(language)
  const isTeaser = variant === 'teaser'
  const priorityLabel = (p: string) =>
    p === 'high' ? t.priorityHigh : p === 'low' ? t.priorityLow : t.priorityMedium

  return (
    <Document title={`${data.restaurantName} — ${t.brandTagline}`}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>Finded</Text>
            <Text style={s.tagline}>{t.brandTagline}</Text>
          </View>
          {isTeaser && <Text style={s.previewBadge}>{t.previewBadge}</Text>}
        </View>

        <Text style={s.h1}>{data.restaurantName}</Text>
        <Text style={s.sub}>
          {[data.city, data.cuisine].filter(Boolean).join(' · ')}
          {data.city || data.cuisine ? '  ·  ' : ''}{t.auditedOn} {data.auditDate}
        </Text>

        {/* Hero: score + key metrics */}
        <View style={s.heroRow}>
          <View style={s.scoreBox}>
            <Text style={s.scoreNum}>{Math.round(data.visibilityScore)}</Text>
            <Text style={s.scoreCap}>{t.visibilityScore} ({t.outOf100})</Text>
          </View>
          <View style={s.metricCol}>
            <View style={s.metric}>
              <Text style={s.metricLabel}>{t.mentionFrequency}</Text>
              <Text style={s.metricVal}>{t.appearsInResponses(Math.round(data.mentionFrequency * 100))}</Text>
              {data.confidenceLo != null && data.confidenceHi != null && (
                <Text style={s.metricNote}>
                  {t.confidenceBand}: {pct(data.confidenceLo)}–{pct(data.confidenceHi)}
                  {data.sampleCount ? ` (${t.basedOnSamples(data.sampleCount)})` : ''}
                </Text>
              )}
            </View>
            <View style={s.metric}>
              <Text style={s.metricLabel}>{t.modelConsensus}</Text>
              <Text style={s.metricVal}>{t.modelsFound(data.modelConsensus)}</Text>
            </View>
          </View>
        </View>

        {/* Per-model */}
        {data.modelBreakdown.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t.perModel}</Text>
            {data.modelBreakdown.map((m) => (
              <View key={m.model} style={s.row}>
                <Text style={s.cell}>{MODEL_LABELS[m.model] ?? m.model}</Text>
                <Text style={s.cellMuted}>{pct(m.frequency)}  ({m.mentions})</Text>
              </View>
            ))}
          </View>
        )}

        {/* Sentiment */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.sentiment}</Text>
          <View style={s.row}>
            <Text style={s.cell}>{t.positive}</Text><Text style={s.cellMuted}>{data.sentiment.positive}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.cell}>{t.neutral}</Text><Text style={s.cellMuted}>{data.sentiment.neutral}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.cell}>{t.negative}</Text><Text style={s.cellMuted}>{data.sentiment.negative}</Text>
          </View>
        </View>

        {/* Competitors — names hidden in teaser */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.competitors}</Text>
          {data.competitors.length === 0 ? (
            <Text style={s.cellMuted}>—</Text>
          ) : isTeaser ? (
            <Text style={s.hiddenNote}>{t.competitorsHiddenNote(data.competitors.length)}</Text>
          ) : (
            data.competitors.map((c, i) => (
              <View key={`${c.name}-${i}`} style={s.row}>
                <Text style={s.cell}>{c.name}</Text>
                <Text style={s.cellMuted}>{c.mention_count}</Text>
              </View>
            ))
          )}
        </View>

        {/* Recommendations — hidden in teaser */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.recommendations}</Text>
          {data.recommendations.length === 0 ? (
            <Text style={s.cellMuted}>—</Text>
          ) : isTeaser ? (
            <>
              <Text style={s.hiddenNote}>{t.recommendationsHiddenNote(data.recommendations.length)}</Text>
              <View style={s.unlock}>
                <Text style={s.unlockTitle}>{t.unlockTitle}</Text>
                <Text style={s.unlockBody}>{t.unlockBody}</Text>
              </View>
            </>
          ) : (
            data.recommendations.map((r, i) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <Text style={s.recTitle}>{r.title}  ({priorityLabel(r.priority)})</Text>
                <Text style={s.recDesc}>{r.description}</Text>
              </View>
            ))
          )}
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{t.estimateCaveat}</Text>
        </View>
      </Page>
    </Document>
  )
}
