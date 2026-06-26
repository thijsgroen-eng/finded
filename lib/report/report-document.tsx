import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { Language } from '@/lib/i18n'
import { reportStrings } from './strings'
import { statusLabel, strengthLabel } from '@/lib/audit/report-sections'
import { impactLabel } from '@/lib/audit/website-signals'

// Plan variants: free (concise teaser) · audit (the full "why") · implementation
// (execution deliverables). full/teaser are kept as aliases.
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
  status: string
  appeared: { x: number; y: number }
  dataQuality: { level: string; levelLabel?: string; reason: string }
  reliability: { band: 'green' | 'yellow' | 'red'; headline: string; detail: string }
  visibilityScore: number
  opportunityScore: number | null
  mentionFrequency: number
  confidenceLo: number | null
  confidenceHi: number | null
  sampleCount: number | null
  modelConsensus: number
  modelBreakdown: { model: string; frequency: number; mentions: number }[]
  keyFindings: { ok: boolean; label: string }[]
  websiteSnapshot: { label: string; strength: string }[]
  websiteReview: { label: string; status: string; why: string | null; impact: string | null; recommendation: string | null }[]
  authorityPlatforms: string[]
  ownCited: boolean
  competitors: { name: string; mention_count: number; providers: string[] }[]
  promptEvidence: { prompt: string; category: string | null; recommended: string[]; mentioned: boolean; sources: string[] }[]
  categoryPerformance: { category: string; appeared: number; total: number }[]
  competitorComparison: {
    crawled: number
    rows: { label: string; you: string; competitors: { name: string; grade: string | null }[] }[]
    whyWin: { name: string; reasons: string }[]
    gaps: string[]
  }
  recommendations: { title: string; description: string; priority: string; suggested_fix?: string | null; expected_impact?: string | null; priority_rank?: string | null; impact_level?: string | null; effort?: string | null; confidence?: string | null; evidence?: string | null }[]
  actionPlan: { label: string; items: string[] }[]
  roadmap: { label: string; items: string[] }[]
  generatedAssets: { type: string; title: string; content: string; format: string }[]
  industryInsights: {
    segmentLabel: string
    segmentN: number
    avgVisibility: number | null
    pctMentioned: number | null
    yourVisibility: number
    patterns: string[]
  } | null
  formulaVersion: string | null
}

const MODEL_LABELS: Record<string, string> = { openai: 'ChatGPT', anthropic: 'Claude', gemini: 'Gemini', perplexity: 'Perplexity' }
const ml = (m: string) => MODEL_LABELS[m] ?? m

const NAVY = '#0f1b2d', ORANGE = '#f97316', INK = '#111827', MUTED = '#6b7280', FAINT = '#9ca3af'
const LINE = '#e5e7eb', PANEL = '#f7f8fa', WHITE = '#ffffff', GREEN = '#16a34a', AMBER = '#d97706', RED = '#dc2626'
const pct = (x: number) => `${Math.round(x * 100)}%`

const statusColor = (s: string) => s.startsWith('Strong') ? GREEN : s.startsWith('Moderate') ? AMBER : RED
const dqColor = (l: string) => l === 'High' ? GREEN : l === 'Medium' ? AMBER : RED
const strengthColor = (s: string) => (s === 'Strong' || s === 'Present') ? GREEN : s === 'Weak' ? AMBER : RED
const rankColor = (r?: string | null) => r === 'do_first' ? RED : r === 'optional' ? FAINT : AMBER
const gradeColor = (g?: string | null) => g === 'Strong' ? GREEN : g === 'Medium' ? AMBER : g == null ? FAINT : RED

// Bilingual labels for the new sections (methodology/limitations come from reportStrings).
const L = (lang: Language) => lang === 'nl' ? {
  planFree: 'GRATIS CHECK', planAudit: 'VOLLEDIGE AUDIT', planImpl: 'IMPLEMENTATIE',
  status: 'AI-zichtbaarheidsstatus', appeared: (x: number, y: number) => `Verschenen in ${x} van de ${y} geslaagde AI-antwoorden.`,
  dataQuality: 'Datakwaliteit', score: 'Zichtbaarheidsscore', opportunity: 'kans',
  keyFindings: 'Belangrijkste bevindingen', competitors: 'Restaurants die AI in plaats daarvan aanraadt',
  mentions: 'vermeldingen', snapshot: 'Website-overzicht', perModel: 'Per AI-model',
  categoryPerf: 'Prestatie per categorie', promptEvidence: 'Bewijs per zoekopdracht',
  recommended: 'AI raadde aan', yours: 'Jouw restaurant', notMentioned: 'niet genoemd', mentioned: 'genoemd', sources: 'Bronnen',
  reducedConfidence: 'Beperkte betrouwbaarheid',
  whyWin: 'Waarom concurrenten mogelijk winnen', whyWinSignal: 'Signaal', whyWinYou: 'Jij', whyWinGaps: 'Grootste concurrentieverschillen',
  websiteReview: 'Websiteanalyse', structuredData: 'Gestructureerde data', authority: 'Bronnen waar AI op vertrouwt',
  recommendations: 'Aanbevelingen', actionPlan: '30-dagen actieplan', roadmap: '90-dagen routekaart',
  execution: 'Implementatiepakket — kant-en-klare onderdelen', faqPackage: 'FAQ-pakket', schemaPackage: 'Gestructureerde-datapakket',
  positioning: 'Concurrentiepositionering', followUp: 'Vervolg-zichtbaarheidscheck',
  upgradeTitle: 'Wil je weten waaróm?', cited: 'jouw site werd genoemd', notCited: 'jouw site werd niet genoemd',
  pitchKicker: 'VOLLEDIGE AUDIT', pitchTitle: 'Ontdek waaróm AI je concurrenten aanraadt',
  pitchSub: 'Deze gratis check laat zien dát je niet wordt aanbevolen. De volledige audit laat zien waaróm — en wat je eraan kunt doen.',
  previewTitle: 'Voorbeeld: jij vs. de top concurrenten', previewCaption: 'De volledige audit beoordeelt elk signaal voor jou én elke concurrent.',
  locked: 'Vergrendeld', sampleFixesTitle: 'Voorbeelden van de verbeteringen die we prioriteren',
  includedTitle: 'Inbegrepen in de volledige audit', ctaTitle: 'Ontgrendel de volledige audit',
  ctaPrice: '€49 — eenmalig', ctaSub: 'Direct toegang · geen abonnement · geen verkoopgesprek',
  fixExamples: ['Restaurant-schema (JSON-LD) toevoegen', 'Keuken benoemen in metadata & homepage', 'Crawlbaar HTML-menu met gerechten', 'Over-pagina met verhaal & credentials', 'Google-bedrijfsprofiel claimen & optimaliseren'],
  included: ['ChatGPT-, Claude-, Gemini- & Perplexity-analyse', 'Nederlandse & Engelse bewijzen per zoekopdracht', 'Concurrentievergelijking & waarom zij winnen', 'Website-, menu- & gestructureerde-data-analyse', 'Geprioriteerde aanbevelingen + 30-dagen actieplan'],
  coverSubFree: 'Een snelle blik op of AI jouw restaurant aanraadt.',
  coverSubImpl: 'Kant-en-klare onderdelen om te verbeteren hoe AI jouw restaurant aanraadt.',
  coverSubAudit: 'Waarom AI sommige restaurants aanraadt en andere niet — en wat je eraan kunt doen.',
  restaurantCol: 'Restaurant', youSuffix: '(jij)',
  rankDoFirst: 'EERST DOEN', rankDoNext: 'DAARNA', rankOptional: 'OPTIONEEL',
  impactLabel: 'Impact', effortLabel: 'inspanning',
  noCitations: 'Geen bronvermeldingen gevonden voor deze audit.',
  implPlaceholder: 'Genereer de fix-onderdelen uit de audit (schema, FAQ, content) om ze hier op te nemen.',
  followUpBody: 'Nadat de wijzigingen live zijn, draaien we de audit opnieuw en tonen we de zichtbaarheid vóór/na, zodat je de impact ziet.',
  insightsTitle: 'Branche-inzichten', insightsBench: (seg: string, n: number) => `Gemeten over ${n} ${seg}-audits`,
  insightsAvg: 'Gemiddelde zichtbaarheid', insightsYou: 'Jij', insightsPctRec: '% aanbevolen',
  insightsCaption: 'Op basis van Finded’s eigen metingen — geen algemeen advies.',
  confidenceLabel: 'Betrouwbaarheid', evidenceLabel: 'Bewijs',
  conf: { high: 'Hoog', medium: 'Gemiddeld', low: 'Laag' } as Record<string, string>,
} : {
  planFree: 'FREE CHECK', planAudit: 'FULL AUDIT', planImpl: 'IMPLEMENTATION',
  status: 'AI visibility status', appeared: (x: number, y: number) => `Appeared in ${x} of ${y} successful AI responses tested.`,
  dataQuality: 'Data quality', score: 'Visibility score', opportunity: 'opportunity',
  keyFindings: 'Key findings', competitors: 'Restaurants AI recommends instead',
  mentions: 'mentions', snapshot: 'Website snapshot', perModel: 'Per AI model',
  categoryPerf: 'Performance by search type', promptEvidence: 'Prompt-level evidence',
  recommended: 'AI recommended', yours: 'Your restaurant', notMentioned: 'not mentioned', mentioned: 'mentioned', sources: 'Sources',
  reducedConfidence: 'Reduced confidence',
  whyWin: 'Why competitors may be winning', whyWinSignal: 'Signal', whyWinYou: 'You', whyWinGaps: 'Biggest competitive gaps',
  websiteReview: 'Website review', structuredData: 'Structured data', authority: 'Sources AI relied on',
  recommendations: 'Recommendations', actionPlan: '30-day action plan', roadmap: '90-day roadmap',
  execution: 'Implementation package — ready-to-use deliverables', faqPackage: 'FAQ package', schemaPackage: 'Structured-data package',
  positioning: 'Competitor positioning', followUp: 'Follow-up visibility check',
  upgradeTitle: 'Want to know why?', cited: 'your site was cited', notCited: 'your site was not cited',
  pitchKicker: 'FULL AUDIT', pitchTitle: 'See why AI recommends your competitors',
  pitchSub: 'This free check shows that you’re not being recommended. The full audit shows why — and exactly what to do about it.',
  previewTitle: 'Preview: you vs. the top competitors', previewCaption: 'The full audit grades every signal for you and each competitor.',
  locked: 'Locked', sampleFixesTitle: 'Examples of the fixes we prioritise',
  includedTitle: 'Included in the full audit', ctaTitle: 'Unlock the full audit',
  ctaPrice: '€49 — one-time', ctaSub: 'Instant access · no subscription · no sales call',
  fixExamples: ['Add Restaurant JSON-LD structured data', 'Declare your cuisine in metadata & homepage', 'Crawlable HTML menu with dishes', 'About page with story & credentials', 'Claim & optimise Google Business Profile'],
  included: ['ChatGPT, Claude, Gemini & Perplexity analysis', 'Dutch & English prompt-level evidence', 'Competitor comparison & why they win', 'Website, menu & structured-data review', 'Prioritised recommendations + 30-day action plan'],
  coverSubFree: 'A quick look at whether AI recommends your restaurant.',
  coverSubImpl: 'Ready-to-use deliverables to improve how AI recommends your restaurant.',
  coverSubAudit: 'Why AI recommends some restaurants and not others — and what to do about it.',
  restaurantCol: 'Restaurant', youSuffix: '(you)',
  rankDoFirst: 'DO FIRST', rankDoNext: 'DO NEXT', rankOptional: 'OPTIONAL',
  impactLabel: 'Impact', effortLabel: 'effort',
  noCitations: 'No citation sources were returned for this audit.',
  implPlaceholder: 'Generate the fix assets from the audit (schema, FAQ, content) to include them here.',
  followUpBody: 'After the changes are live, we re-run the audit and show before / after visibility so you can see the impact.',
  insightsTitle: 'Industry insights', insightsBench: (seg: string, n: number) => `Measured across ${n} ${seg} audits`,
  insightsAvg: 'Average visibility', insightsYou: 'You', insightsPctRec: '% recommended',
  insightsCaption: 'Based on Finded’s own measurements — not generic advice.',
  confidenceLabel: 'Confidence', evidenceLabel: 'Evidence',
  conf: { high: 'High', medium: 'Medium', low: 'Low' } as Record<string, string>,
}

const s = StyleSheet.create({
  cover: { backgroundColor: NAVY, color: WHITE, padding: 48, flexDirection: 'column', justifyContent: 'space-between', fontFamily: 'Helvetica' },
  coverTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: ORANGE, marginRight: 8 },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: WHITE },
  planBadge: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY, backgroundColor: ORANGE, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 3, letterSpacing: 1 },
  coverName: { fontSize: 34, fontFamily: 'Helvetica-Bold', color: WHITE, lineHeight: 1.1 },
  coverMeta: { fontSize: 12, color: '#9fb3c8', marginTop: 12 },
  coverRule: { height: 3, width: 56, backgroundColor: ORANGE, marginTop: 22, borderRadius: 2 },
  coverTitle: { fontSize: 13, color: '#cdd9e5', marginTop: 22, maxWidth: 400, lineHeight: 1.5 },
  coverFoot: { fontSize: 9, color: '#6f8298' },

  page: { paddingTop: 60, paddingLeft: 40, paddingRight: 40, paddingBottom: 64, fontSize: 10, color: INK, fontFamily: 'Helvetica', lineHeight: 1.45 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  body: { fontSize: 9.5, color: MUTED, lineHeight: 1.5 },

  hero: { backgroundColor: NAVY, borderRadius: 10, padding: 22, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statusBig: { fontSize: 20, fontFamily: 'Helvetica-Bold' },
  heroSub: { fontSize: 10, color: '#cdd9e5', marginTop: 6 },
  dqBadge: { fontSize: 8, fontFamily: 'Helvetica-Bold', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 3, color: WHITE },
  heroScore: { fontSize: 9, color: '#9fb3c8', marginTop: 8, textAlign: 'right' },

  findingRow: { flexDirection: 'row', gap: 6, marginBottom: 4, alignItems: 'flex-start' },
  findingMark: { fontSize: 10, fontFamily: 'Helvetica-Bold', width: 12 },

  table: { border: `1pt solid ${LINE}`, borderRadius: 8, overflow: 'hidden' },
  tHead: { flexDirection: 'row', backgroundColor: PANEL, paddingVertical: 6, paddingHorizontal: 12, borderBottom: `1pt solid ${LINE}` },
  tHeadCell: { fontSize: 8, color: MUTED, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  tRow: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 12, borderBottom: `0.5pt solid ${LINE}` },
  tName: { flex: 1, fontSize: 10, color: INK },
  tNum: { fontSize: 10, color: MUTED, width: 70, textAlign: 'right' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { fontSize: 9, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 12, border: `1pt solid ${LINE}` },

  evItem: { borderBottom: `0.5pt solid ${LINE}`, paddingVertical: 7 },
  evPrompt: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: INK },
  evLine: { fontSize: 9, color: MUTED, marginTop: 2 },

  recItem: { flexDirection: 'row', marginBottom: 9 },
  recNum: { width: 18, fontSize: 10, fontFamily: 'Helvetica-Bold', color: ORANGE },
  recBody: { flex: 1, borderLeft: `2pt solid ${LINE}`, paddingLeft: 9 },
  recTitle: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: INK },
  recMeta: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  recDesc: { fontSize: 9, color: MUTED, marginTop: 2 },

  planBucket: { marginBottom: 8 },
  planLabel: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: INK, marginBottom: 3 },
  planItem: { fontSize: 9, color: MUTED, marginLeft: 8, marginBottom: 2 },

  upgrade: { backgroundColor: NAVY, borderRadius: 8, padding: 16, marginTop: 4 },
  upgradeTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: WHITE, marginBottom: 6 },
  upgradeItem: { fontSize: 9.5, color: '#cdd9e5', marginBottom: 2 },

  asset: { border: `1pt solid ${LINE}`, borderRadius: 8, padding: 10, marginBottom: 10 },
  assetTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: INK, marginBottom: 5 },
  assetCode: { fontSize: 7, fontFamily: 'Courier', color: '#374151', lineHeight: 1.35 },

  footer: { position: 'absolute', bottom: 26, left: 40, right: 40, borderTop: `1pt solid ${LINE}`, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 6.5, color: FAINT, maxWidth: 380, lineHeight: 1.3 },
  footerBrand: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: FAINT },

  // Running header — repeated on every content page for a consistent look.
  runHeader: { position: 'absolute', top: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1pt solid ${LINE}`, paddingBottom: 7 },
  rhLeft: { flexDirection: 'row', alignItems: 'center' },
  rhDot: { width: 8, height: 8, borderRadius: 2, backgroundColor: ORANGE, marginRight: 6 },
  rhBrand: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY },
  rhName: { fontSize: 9, color: MUTED },
  rhBadge: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: NAVY, backgroundColor: '#fbe8d6', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 3, letterSpacing: 0.5, marginLeft: 8 },

  // Free-report "full audit" pitch.
  pitchHero: { backgroundColor: NAVY, borderRadius: 10, padding: 22, marginBottom: 16 },
  pitchKicker: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: ORANGE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  pitchTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: WHITE, lineHeight: 1.2 },
  pitchSub: { fontSize: 10, color: '#cdd9e5', marginTop: 8, lineHeight: 1.5 },
  lockCell: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: FAINT },
  caption: { fontSize: 8.5, color: FAINT, marginTop: 6 },
  twoCol: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  ctaBox: { backgroundColor: ORANGE, borderRadius: 10, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ctaTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: NAVY },
  ctaSub: { fontSize: 9, color: '#5a3a1a', marginTop: 3 },
  ctaPrice: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: NAVY },
})

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={s.sectionTitle}>{children}</Text>
}

function CompetitorTable({ data, t }: { data: ReportData; t: ReturnType<typeof L> }) {
  if (data.competitors.length === 0) return null
  return (
    <View style={s.section}>
      <SectionTitle>{t.competitors}</SectionTitle>
      <View style={s.table}>
        <View style={s.tHead}>
          <Text style={[s.tHeadCell, { flex: 1 }]}>{t.restaurantCol}</Text>
          <Text style={[s.tHeadCell, { width: 70, textAlign: 'right' }]}>{t.mentions}</Text>
        </View>
        {data.competitors.map((c, i) => (
          <View key={i} style={s.tRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.tName}>{c.name}</Text>
              {c.providers.length > 0 && <Text style={{ fontSize: 7.5, color: FAINT }}>{c.providers.map(ml).join(', ')}</Text>}
            </View>
            <Text style={s.tNum}>{c.mention_count}×</Text>
          </View>
        ))}
        <View style={[s.tRow, { backgroundColor: PANEL }]}>
          <Text style={[s.tName, { fontFamily: 'Helvetica-Bold' }]}>{data.restaurantName} {t.youSuffix}</Text>
          <Text style={[s.tNum, { fontFamily: 'Helvetica-Bold', color: data.appeared.x > 0 ? INK : RED }]}>{data.appeared.x}×</Text>
        </View>
      </View>
    </View>
  )
}

function CompetitorComparison({ data, t }: { data: ReportData; t: ReturnType<typeof L> }) {
  const cc = data.competitorComparison
  if (!cc || cc.crawled === 0) return null
  const names = cc.rows[0]?.competitors.map((c) => c.name) ?? []
  return (
    <View style={s.section} wrap={false}>
      <SectionTitle>{t.whyWin}</SectionTitle>
      <View style={s.table}>
        <View style={s.tHead}>
          <Text style={[s.tHeadCell, { flex: 1.4 }]}>{t.whyWinSignal}</Text>
          <Text style={[s.tHeadCell, { flex: 1 }]}>{t.whyWinYou}</Text>
          {names.map((n, i) => <Text key={i} style={[s.tHeadCell, { flex: 1 }]}>{n}</Text>)}
        </View>
        {cc.rows.map((r, i) => (
          <View key={i} style={s.tRow}>
            <Text style={[{ flex: 1.4, fontSize: 9, color: INK }]}>{r.label}</Text>
            <Text style={[{ flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: gradeColor(r.you) }]}>{r.you}</Text>
            {r.competitors.map((c, j) => (
              <Text key={j} style={[{ flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: gradeColor(c.grade) }]}>{c.grade ?? '—'}</Text>
            ))}
          </View>
        ))}
      </View>
      {cc.whyWin.length > 0 && (
        <View style={{ marginTop: 8 }}>
          {cc.whyWin.map((w, i) => (
            <Text key={i} style={[s.body, { marginBottom: 2 }]}><Text style={{ fontFamily: 'Helvetica-Bold', color: INK }}>{w.name}: </Text>{w.reasons}</Text>
          ))}
        </View>
      )}
      {cc.gaps.length > 0 && (
        <View style={{ marginTop: 8, backgroundColor: PANEL, borderRadius: 6, padding: 10 }}>
          <Text style={[s.recMeta, { color: AMBER, marginBottom: 4 }]}>{t.whyWinGaps}</Text>
          {cc.gaps.map((g, i) => <Text key={i} style={[s.body, { marginBottom: 2 }]}>• {g}</Text>)}
        </View>
      )}
    </View>
  )
}

function KeyFindings({ data, t, limit }: { data: ReportData; t: ReturnType<typeof L>; limit?: number }) {
  const items = limit ? data.keyFindings.slice(0, limit) : data.keyFindings
  if (items.length === 0) return null
  return (
    <View style={s.section}>
      <SectionTitle>{t.keyFindings}</SectionTitle>
      {items.map((f, i) => (
        <View key={i} style={s.findingRow}>
          <Text style={[s.findingMark, { color: f.ok ? GREEN : RED }]}>{f.ok ? '✓' : '✕'}</Text>
          <Text style={{ fontSize: 9.5, color: INK, flex: 1 }}>{f.label}</Text>
        </View>
      ))}
    </View>
  )
}

function Recommendations({ data, t }: { data: ReportData; t: ReturnType<typeof L> }) {
  if (data.recommendations.length === 0) return null
  const order: Record<string, number> = { do_first: 0, do_next: 1, optional: 2 }
  const recs = [...data.recommendations].sort((a, b) => (order[a.priority_rank ?? 'do_next'] ?? 1) - (order[b.priority_rank ?? 'do_next'] ?? 1))
  const rankLabel = (r?: string | null) => r === 'do_first' ? t.rankDoFirst : r === 'optional' ? t.rankOptional : t.rankDoNext
  return (
    <View style={s.section}>
      <SectionTitle>{t.recommendations}</SectionTitle>
      {recs.map((r, i) => (
        <View key={i} style={s.recItem} wrap={false}>
          <Text style={s.recNum}>{i + 1}</Text>
          <View style={s.recBody}>
            <Text style={s.recTitle}>{r.title}  <Text style={[s.recMeta, { color: rankColor(r.priority_rank) }]}>{rankLabel(r.priority_rank)}</Text></Text>
            <Text style={s.recDesc}>{r.description}</Text>
            {r.evidence && <Text style={[s.recDesc, { color: MUTED }]}>{t.evidenceLabel}: {r.evidence}</Text>}
            {r.expected_impact && <Text style={[s.recDesc, { color: GREEN }]}>{t.impactLabel}: {r.expected_impact} · {t.effortLabel} {r.effort ?? '—'}{r.confidence ? ` · ${t.confidenceLabel}: ${t.conf[r.confidence] ?? r.confidence}` : ''}</Text>}
          </View>
        </View>
      ))}
    </View>
  )
}

function PlanBuckets({ title, buckets }: { title: string; buckets: { label: string; items: string[] }[] }) {
  if (buckets.length === 0) return null
  return (
    <View style={s.section}>
      <SectionTitle>{title}</SectionTitle>
      {buckets.map((b, i) => (
        <View key={i} style={s.planBucket} wrap={false}>
          <Text style={s.planLabel}>{b.label}</Text>
          {b.items.map((it, j) => <Text key={j} style={s.planItem}>• {it}</Text>)}
        </View>
      ))}
    </View>
  )
}

// Consistent chrome repeated on every content page.
function RunHeader({ data, planLabel }: { data: ReportData; planLabel: string }) {
  return (
    <View style={s.runHeader} fixed>
      <View style={s.rhLeft}>
        <View style={s.rhDot} />
        <Text style={s.rhBrand}>Finded</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={s.rhName}>{data.restaurantName}</Text>
        <Text style={s.rhBadge}>{planLabel}</Text>
      </View>
    </View>
  )
}

function Footer({ caveat }: { caveat: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{caveat}</Text>
      <Text style={s.footerBrand} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `finded.vercel.app  ·  ${pageNumber}/${totalPages}`} />
    </View>
  )
}

// Status hero (shared by all tiers).
function StatusHero({ data, t, lang }: { data: ReportData; t: ReturnType<typeof L>; lang: Language }) {
  return (
    <>
      <View style={s.hero}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 9, color: ORANGE, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1 }}>{t.status}</Text>
          <Text style={[s.statusBig, { color: statusColor(data.status) }]}>{statusLabel(data.status, lang)}</Text>
          <Text style={s.heroSub}>{t.appeared(data.appeared.x, data.appeared.y)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[s.dqBadge, { backgroundColor: dqColor(data.dataQuality.level) }]}>{t.dataQuality}: {data.dataQuality.levelLabel ?? data.dataQuality.level}</Text>
          <Text style={s.heroScore}>{t.score} {Math.round(data.visibilityScore)}/100</Text>
        </View>
      </View>
      {data.reliability.band === 'yellow' && (
        <View style={{ backgroundColor: '#fef3c7', border: `1pt solid #fcd34d`, borderRadius: 6, padding: 10, marginBottom: 16 }}>
          <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: AMBER }}>{t.reducedConfidence}</Text>
          <Text style={{ fontSize: 8.5, color: '#92400e', marginTop: 2 }}>{data.reliability.detail}</Text>
        </View>
      )}
    </>
  )
}

// Free-tier conversion page: preview of the locked analysis + what you get + CTA.
function FullAuditPitch({ data, t }: { data: ReportData; t: ReturnType<typeof L> }) {
  const cc = data.competitorComparison
  const names = cc?.rows?.[0]?.competitors?.map((c) => c.name).slice(0, 3) ?? []
  const lockCols = names.length ? names : ['', '', '']
  const showPreview = !!cc && cc.rows.length > 0
  return (
    <>
      <View style={s.pitchHero}>
        <Text style={s.pitchKicker}>{t.pitchKicker} · {t.ctaPrice}</Text>
        <Text style={s.pitchTitle}>{t.pitchTitle}</Text>
        <Text style={s.pitchSub}>{t.pitchSub}</Text>
      </View>

      {showPreview && (
        <View style={s.section}>
          <SectionTitle>{t.previewTitle}</SectionTitle>
          <View style={s.table}>
            <View style={s.tHead}>
              <Text style={[s.tHeadCell, { flex: 1.4 }]}>{t.whyWinSignal}</Text>
              <Text style={[s.tHeadCell, { flex: 1 }]}>{t.whyWinYou}</Text>
              {lockCols.map((n, i) => <Text key={i} style={[s.tHeadCell, { flex: 1 }]}>{n || t.locked}</Text>)}
            </View>
            {cc!.rows.map((r, i) => (
              <View key={i} style={s.tRow}>
                <Text style={[{ flex: 1.4, fontSize: 9, color: INK }]}>{r.label}</Text>
                <Text style={[{ flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: gradeColor(r.you) }]}>{r.you}</Text>
                {lockCols.map((_, j) => <Text key={j} style={s.lockCell}>•••</Text>)}
              </View>
            ))}
          </View>
          <Text style={s.caption}>{t.previewCaption}</Text>
        </View>
      )}

      <View style={s.twoCol}>
        <View style={{ flex: 1 }}>
          <SectionTitle>{t.sampleFixesTitle}</SectionTitle>
          {t.fixExamples.map((f, i) => (
            <View key={i} style={s.findingRow}>
              <Text style={[s.findingMark, { color: ORANGE }]}>+</Text>
              <Text style={{ fontSize: 9.5, color: INK, flex: 1 }}>{f}</Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <SectionTitle>{t.includedTitle}</SectionTitle>
          {t.included.map((f, i) => (
            <View key={i} style={s.findingRow}>
              <Text style={[s.findingMark, { color: GREEN }]}>✓</Text>
              <Text style={{ fontSize: 9.5, color: INK, flex: 1 }}>{f}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.ctaBox}>
        <View style={{ flex: 1 }}>
          <Text style={s.ctaTitle}>{t.ctaTitle}</Text>
          <Text style={s.ctaSub}>{t.ctaSub}</Text>
        </View>
        <Text style={s.ctaPrice}>€49</Text>
      </View>
    </>
  )
}

// Industry insights from the Observation Engine (proprietary benchmark + patterns).
function IndustryInsights({ data, t }: { data: ReportData; t: ReturnType<typeof L> }) {
  const ii = data.industryInsights
  if (!ii) return null
  return (
    <View style={s.section} wrap={false}>
      <SectionTitle>{t.insightsTitle}</SectionTitle>
      {ii.avgVisibility != null && (
        <View style={[s.table, { marginBottom: 8 }]}>
          <View style={s.tHead}>
            <Text style={[s.tHeadCell, { flex: 2 }]}>{t.insightsBench(ii.segmentLabel, ii.segmentN)}</Text>
            <Text style={[s.tHeadCell, { flex: 1, textAlign: 'right' }]}>{t.insightsAvg}</Text>
            <Text style={[s.tHeadCell, { flex: 1, textAlign: 'right' }]}>{t.insightsPctRec}</Text>
          </View>
          <View style={s.tRow}>
            <Text style={[{ flex: 2, fontSize: 9.5, color: MUTED }]}>{t.insightsAvg} ({ii.segmentLabel})</Text>
            <Text style={[{ flex: 1, fontSize: 9.5, color: INK, textAlign: 'right' }]}>{ii.avgVisibility}/100</Text>
            <Text style={[{ flex: 1, fontSize: 9.5, color: INK, textAlign: 'right' }]}>{ii.pctMentioned}%</Text>
          </View>
          <View style={[s.tRow, { backgroundColor: PANEL }]}>
            <Text style={[{ flex: 2, fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: INK }]}>{t.insightsYou}</Text>
            <Text style={[{ flex: 1, fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: INK, textAlign: 'right' }]}>{ii.yourVisibility}/100</Text>
            <Text style={[{ flex: 1, fontSize: 9.5, color: FAINT, textAlign: 'right' }]}>—</Text>
          </View>
        </View>
      )}
      {ii.patterns.map((p, i) => (
        <View key={i} style={s.findingRow}><Text style={[s.findingMark, { color: GREEN }]}>+</Text><Text style={{ fontSize: 9.5, color: INK, flex: 1 }}>{p}</Text></View>
      ))}
      <Text style={s.caption}>{t.insightsCaption}</Text>
    </View>
  )
}

export function ReportDocument({ data, language, variant }: { data: ReportData; language: Language; variant: ReportVariant }) {
  const t = L(language)
  const rs = reportStrings(language)
  const mode = normalizeVariant(variant)
  const isFree = mode === 'free', isImpl = mode === 'implementation', isPaid = mode === 'audit'
  const planLabel = isFree ? t.planFree : isImpl ? t.planImpl : t.planAudit

  return (
    <Document title={`${data.restaurantName} — ${rs.brandTagline}`}>
      {/* Cover */}
      <Page size="A4" style={s.cover}>
        <View style={s.coverTop}>
          <View style={s.brandRow}><View style={s.brandDot} /><Text style={s.brand}>Finded</Text></View>
          <Text style={s.planBadge}>{planLabel}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 11, color: ORANGE, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, marginBottom: 14 }}>{rs.brandTagline}</Text>
          <Text style={s.coverName}>{data.restaurantName}</Text>
          <Text style={s.coverMeta}>{[data.city, data.cuisine].filter(Boolean).join('  ·  ') || ' '}</Text>
          <View style={s.coverRule} />
          <Text style={s.coverTitle}>
            {isFree ? t.coverSubFree : isImpl ? t.coverSubImpl : t.coverSubAudit}
          </Text>
        </View>
        <Text style={s.coverFoot}>{rs.auditedOn} {data.auditDate}</Text>
      </Page>

      {/* ───── FREE: 3 clean pages — cover, what we found, the upgrade pitch ───── */}
      {isFree ? (
        <>
          <Page size="A4" style={s.page}>
            <RunHeader data={data} planLabel={planLabel} />
            <StatusHero data={data} t={t} lang={language} />
            <KeyFindings data={data} t={t} limit={3} />
            <CompetitorTable data={data} t={t} />
            <View style={s.section}>
              <SectionTitle>{t.snapshot}</SectionTitle>
              <View style={s.chipRow}>
                {data.websiteSnapshot.map((r, i) => (
                  <Text key={i} style={[s.chip, { color: strengthColor(r.strength) }]}>{r.label}: {strengthLabel(r.strength, language)}</Text>
                ))}
              </View>
            </View>
            <View style={s.section}>
              <SectionTitle>{rs.methodology}</SectionTitle>
              <Text style={s.body}>{rs.methodologyBody(data.modelBreakdown.length || 4, data.sampleCount)}</Text>
              <Text style={[s.sectionTitle, { marginTop: 8 }]}>{rs.limitations}</Text>
              <Text style={s.body}>{rs.limitationsBody}</Text>
            </View>
            <Footer caveat={rs.estimateCaveat} />
          </Page>

          <Page size="A4" style={s.page}>
            <RunHeader data={data} planLabel={planLabel} />
            <FullAuditPitch data={data} t={t} />
            <Footer caveat={rs.estimateCaveat} />
          </Page>
        </>
      ) : (
        <Page size="A4" style={s.page}>
          <RunHeader data={data} planLabel={planLabel} />
          <StatusHero data={data} t={t} lang={language} />
          <KeyFindings data={data} t={t} />
          <CompetitorTable data={data} t={t} />

          {/* ───── PAID + IMPLEMENTATION: the full "why" ───── */}
          <>
            {/* Per-model */}
            {data.modelBreakdown.length > 0 && (
              <View style={s.section}>
                <SectionTitle>{t.perModel}</SectionTitle>
                <View style={s.chipRow}>
                  {data.modelBreakdown.map((m, i) => (
                    <Text key={i} style={[s.chip, { color: m.frequency > 0 ? GREEN : RED }]}>{ml(m.model)}: {pct(m.frequency)} ({m.mentions})</Text>
                  ))}
                </View>
              </View>
            )}

            {/* Category performance */}
            {data.categoryPerformance.length > 0 && (
              <View style={s.section}>
                <SectionTitle>{t.categoryPerf}</SectionTitle>
                <View style={s.table}>
                  {data.categoryPerformance.map((c, i) => (
                    <View key={i} style={s.tRow}>
                      <Text style={s.tName}>{c.category}</Text>
                      <Text style={[s.tNum, { color: c.appeared > 0 ? INK : RED }]}>{c.appeared}/{c.total}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Prompt-level evidence */}
            {data.promptEvidence.length > 0 && (
              <View style={s.section}>
                <SectionTitle>{t.promptEvidence}</SectionTitle>
                {data.promptEvidence.slice(0, isImpl ? 8 : 16).map((p, i) => (
                  <View key={i} style={s.evItem} wrap={false}>
                    <Text style={s.evPrompt}>{p.prompt}</Text>
                    <Text style={s.evLine}>{t.recommended}: {p.recommended.length ? p.recommended.join(', ') : '—'}</Text>
                    <Text style={[s.evLine, { color: p.mentioned ? GREEN : RED }]}>{t.yours}: {p.mentioned ? t.mentioned : t.notMentioned}</Text>
                    {p.sources.length > 0 && <Text style={[s.evLine, { color: FAINT }]}>{t.sources}: {p.sources.join(', ')}</Text>}
                  </View>
                ))}
              </View>
            )}

            {/* Why competitors may be winning — signal comparison of crawled competitor sites */}
            <CompetitorComparison data={data} t={t} />

            {/* Industry insights — proprietary benchmark + measured patterns */}
            <IndustryInsights data={data} t={t} />

            {/* Website review */}
            <View style={s.section}>
              <SectionTitle>{t.websiteReview}</SectionTitle>
              {data.websiteReview.map((sig, i) => (
                <View key={i} style={s.findingRow}>
                  <Text style={[s.findingMark, { color: sig.status === 'present' ? GREEN : sig.status === 'weak' ? AMBER : RED }]}>{sig.status === 'present' ? '✓' : sig.status === 'weak' ? '!' : '✕'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9.5, color: INK }}>{sig.label}{sig.status !== 'present' && sig.impact ? `  (${impactLabel(sig.impact, language)})` : ''}</Text>
                    {sig.status !== 'present' && sig.recommendation && <Text style={{ fontSize: 8.5, color: MUTED }}>{sig.recommendation}</Text>}
                  </View>
                </View>
              ))}
            </View>

            {/* Authority & citations */}
            <View style={s.section}>
              <SectionTitle>{t.authority}</SectionTitle>
              {data.authorityPlatforms.length > 0 ? (
                <>
                  <View style={s.chipRow}>{data.authorityPlatforms.map((p, i) => <Text key={i} style={s.chip}>{p}</Text>)}</View>
                  <Text style={[s.body, { marginTop: 6 }]}>{data.ownCited ? t.cited : t.notCited}.</Text>
                </>
              ) : <Text style={s.body}>{t.noCitations}</Text>}
            </View>

            {/* Recommendations */}
            <Recommendations data={data} t={t} />

            {/* PAID: 30-day plan */}
            {isPaid && <PlanBuckets title={t.actionPlan} buckets={data.actionPlan} />}
          </>

        {/* ───── IMPLEMENTATION: execution deliverables ───── */}
        {isImpl && (
          <>
            <View style={s.section}>
              <SectionTitle>{t.execution}</SectionTitle>
              {data.generatedAssets.length === 0 ? (
                <Text style={s.body}>{t.implPlaceholder}</Text>
              ) : (
                data.generatedAssets.map((a, i) => (
                  <View key={i} style={s.asset} wrap={false}>
                    <Text style={s.assetTitle}>{a.title}</Text>
                    <Text style={s.assetCode}>{a.content.slice(0, 1400)}{a.content.length > 1400 ? '\n…' : ''}</Text>
                  </View>
                ))
              )}
            </View>
            <PlanBuckets title={t.roadmap} buckets={data.roadmap} />
            <View style={s.section}>
              <SectionTitle>{t.followUp}</SectionTitle>
              <Text style={s.body}>{t.followUpBody}</Text>
            </View>
          </>
        )}

          {/* Methodology & limitations */}
          <View style={s.section}>
            <SectionTitle>{rs.methodology}</SectionTitle>
            <Text style={s.body}>{rs.methodologyBody(data.modelBreakdown.length || 4, data.sampleCount)}</Text>
            <Text style={[s.sectionTitle, { marginTop: 8 }]}>{rs.limitations}</Text>
            <Text style={s.body}>{rs.limitationsBody}</Text>
          </View>

          <Footer caveat={rs.estimateCaveat} />
        </Page>
      )}
    </Document>
  )
}
