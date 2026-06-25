import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { Language } from '@/lib/i18n'
import { reportStrings } from './strings'

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
  dataQuality: { level: string; reason: string }
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
  recommendations: { title: string; description: string; priority: string; suggested_fix?: string | null; expected_impact?: string | null; priority_rank?: string | null; impact_level?: string | null; effort?: string | null }[]
  actionPlan: { label: string; items: string[] }[]
  roadmap: { label: string; items: string[] }[]
  generatedAssets: { type: string; title: string; content: string; format: string }[]
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

// Bilingual labels for the new sections (methodology/limitations come from reportStrings).
const L = (lang: Language) => lang === 'nl' ? {
  planFree: 'GRATIS CHECK', planAudit: 'VOLLEDIGE AUDIT', planImpl: 'IMPLEMENTATIE',
  status: 'AI-zichtbaarheidsstatus', appeared: (x: number, y: number) => `Verschenen in ${x} van de ${y} geslaagde AI-antwoorden.`,
  dataQuality: 'Datakwaliteit', score: 'Zichtbaarheidsscore', opportunity: 'kans',
  keyFindings: 'Belangrijkste bevindingen', competitors: 'Restaurants die AI in plaats daarvan aanraadt',
  mentions: 'vermeldingen', snapshot: 'Website-overzicht', perModel: 'Per AI-model',
  categoryPerf: 'Prestatie per categorie', promptEvidence: 'Bewijs per zoekopdracht',
  recommended: 'AI raadde aan', yours: 'Jouw restaurant', notMentioned: 'niet genoemd', mentioned: 'genoemd', sources: 'Bronnen',
  websiteReview: 'Websiteanalyse', structuredData: 'Gestructureerde data', authority: 'Bronnen waar AI op vertrouwt',
  recommendations: 'Aanbevelingen', actionPlan: '30-dagen actieplan', roadmap: '90-dagen routekaart',
  execution: 'Implementatiepakket — kant-en-klare onderdelen', faqPackage: 'FAQ-pakket', schemaPackage: 'Gestructureerde-datapakket',
  positioning: 'Concurrentiepositionering', followUp: 'Vervolg-zichtbaarheidscheck',
  upgradeTitle: 'Wil je weten waaróm?', cited: 'jouw site werd genoemd', notCited: 'jouw site werd niet genoemd',
} : {
  planFree: 'FREE CHECK', planAudit: 'FULL AUDIT', planImpl: 'IMPLEMENTATION',
  status: 'AI visibility status', appeared: (x: number, y: number) => `Appeared in ${x} of ${y} successful AI responses tested.`,
  dataQuality: 'Data quality', score: 'Visibility score', opportunity: 'opportunity',
  keyFindings: 'Key findings', competitors: 'Restaurants AI recommends instead',
  mentions: 'mentions', snapshot: 'Website snapshot', perModel: 'Per AI model',
  categoryPerf: 'Performance by search type', promptEvidence: 'Prompt-level evidence',
  recommended: 'AI recommended', yours: 'Your restaurant', notMentioned: 'not mentioned', mentioned: 'mentioned', sources: 'Sources',
  websiteReview: 'Website review', structuredData: 'Structured data', authority: 'Sources AI relied on',
  recommendations: 'Recommendations', actionPlan: '30-day action plan', roadmap: '90-day roadmap',
  execution: 'Implementation package — ready-to-use deliverables', faqPackage: 'FAQ package', schemaPackage: 'Structured-data package',
  positioning: 'Competitor positioning', followUp: 'Follow-up visibility check',
  upgradeTitle: 'Want to know why?', cited: 'your site was cited', notCited: 'your site was not cited',
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

  page: { padding: 40, paddingBottom: 64, fontSize: 10, color: INK, fontFamily: 'Helvetica', lineHeight: 1.45 },
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
          <Text style={[s.tHeadCell, { flex: 1 }]}>Restaurant</Text>
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
          <Text style={[s.tName, { fontFamily: 'Helvetica-Bold' }]}>{data.restaurantName} (you)</Text>
          <Text style={[s.tNum, { fontFamily: 'Helvetica-Bold', color: data.appeared.x > 0 ? INK : RED }]}>{data.appeared.x}×</Text>
        </View>
      </View>
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
  const rankLabel = (r?: string | null) => r === 'do_first' ? 'DO FIRST' : r === 'optional' ? 'OPTIONAL' : 'DO NEXT'
  return (
    <View style={s.section}>
      <SectionTitle>{t.recommendations}</SectionTitle>
      {recs.map((r, i) => (
        <View key={i} style={s.recItem} wrap={false}>
          <Text style={s.recNum}>{i + 1}</Text>
          <View style={s.recBody}>
            <Text style={s.recTitle}>{r.title}  <Text style={[s.recMeta, { color: rankColor(r.priority_rank) }]}>{rankLabel(r.priority_rank)}</Text></Text>
            <Text style={s.recDesc}>{r.description}</Text>
            {r.expected_impact && <Text style={[s.recDesc, { color: GREEN }]}>Impact: {r.expected_impact} · effort {r.effort ?? '—'}</Text>}
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
            {isFree ? 'A quick look at whether AI recommends your restaurant.'
              : isImpl ? 'Ready-to-use deliverables to improve how AI recommends your restaurant.'
              : 'Why AI recommends some restaurants and not others — and what to do about it.'}
          </Text>
        </View>
        <Text style={s.coverFoot}>{rs.auditedOn} {data.auditDate}</Text>
      </Page>

      {/* Body */}
      <Page size="A4" style={s.page}>
        {/* Status hero (all tiers) */}
        <View style={s.hero}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, color: ORANGE, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1 }}>{t.status}</Text>
            <Text style={[s.statusBig, { color: statusColor(data.status) }]}>{data.status}</Text>
            <Text style={s.heroSub}>{t.appeared(data.appeared.x, data.appeared.y)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[s.dqBadge, { backgroundColor: dqColor(data.dataQuality.level) }]}>{t.dataQuality}: {data.dataQuality.level}</Text>
            <Text style={s.heroScore}>{t.score} {Math.round(data.visibilityScore)}/100</Text>
          </View>
        </View>

        {/* Key findings — top 3 (free) or all (paid/impl) */}
        <KeyFindings data={data} t={t} limit={isFree ? 3 : undefined} />

        {/* Competitors recommended instead (all) */}
        <CompetitorTable data={data} t={t} />

        {/* ───── FREE: snapshot + upgrade CTA ───── */}
        {isFree && (
          <>
            <View style={s.section}>
              <SectionTitle>{t.snapshot}</SectionTitle>
              <View style={s.chipRow}>
                {data.websiteSnapshot.map((r, i) => (
                  <Text key={i} style={[s.chip, { color: strengthColor(r.strength) }]}>{r.label}: {r.strength}</Text>
                ))}
              </View>
            </View>
            <View style={s.upgrade}>
              <Text style={s.upgradeTitle}>{t.upgradeTitle}</Text>
              <Text style={s.upgradeItem}>• Which prompts your competitors win</Text>
              <Text style={s.upgradeItem}>• Why competitors appear (website, schema, authority)</Text>
              <Text style={s.upgradeItem}>• Per-model + per-category visibility</Text>
              <Text style={s.upgradeItem}>• Prioritised recommendations + a 30-day action plan</Text>
            </View>
          </>
        )}

        {/* ───── PAID + IMPLEMENTATION: the full "why" ───── */}
        {!isFree && (
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

            {/* Website review */}
            <View style={s.section}>
              <SectionTitle>{t.websiteReview}</SectionTitle>
              {data.websiteReview.map((sig, i) => (
                <View key={i} style={s.findingRow}>
                  <Text style={[s.findingMark, { color: sig.status === 'present' ? GREEN : sig.status === 'weak' ? AMBER : RED }]}>{sig.status === 'present' ? '✓' : sig.status === 'weak' ? '!' : '✕'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9.5, color: INK }}>{sig.label}{sig.status !== 'present' && sig.impact ? `  (${sig.impact} impact)` : ''}</Text>
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
              ) : <Text style={s.body}>No citation sources were returned for this audit.</Text>}
            </View>

            {/* Recommendations */}
            <Recommendations data={data} t={t} />

            {/* PAID: 30-day plan */}
            {isPaid && <PlanBuckets title={t.actionPlan} buckets={data.actionPlan} />}
          </>
        )}

        {/* ───── IMPLEMENTATION: execution deliverables ───── */}
        {isImpl && (
          <>
            <View style={s.section}>
              <SectionTitle>{t.execution}</SectionTitle>
              {data.generatedAssets.length === 0 ? (
                <Text style={s.body}>Generate the fix assets from the audit (schema, FAQ, content) to include them here.</Text>
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
              <Text style={s.body}>After the changes are live, we re-run the audit and show before / after visibility so you can see the impact.</Text>
            </View>
          </>
        )}

        {/* Methodology & limitations (all) */}
        <View style={s.section} wrap={false}>
          <SectionTitle>{rs.methodology}</SectionTitle>
          <Text style={s.body}>{rs.methodologyBody(data.modelBreakdown.length || 4, data.sampleCount)}</Text>
          <Text style={[s.sectionTitle, { marginTop: 8 }]}>{rs.limitations}</Text>
          <Text style={s.body}>{rs.limitationsBody}</Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{rs.estimateCaveat}</Text>
          <Text style={s.footerBrand} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `finded.vercel.app  ·  ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
