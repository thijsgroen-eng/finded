import { supabaseAdmin } from '@/lib/supabase/client'
import { computeFullMetrics } from '@/lib/engine/metrics-v2'
import { notFound } from 'next/navigation'

// ── Localization — one dictionary, Dutch default ────────────────────────────
type Lang = 'nl' | 'en'
const STR = {
  nl: {
    badge: 'AI-zichtbaarheidsrapport',
    unlockNav: 'Volledig rapport ontgrendelen →',
    auditedOn: (d: string) => `Geaudit op ${d}`,
    visibility: 'AI-zichtbaarheid',
    appearsIn: (p: number) => `Verschijnt in ${p}% van de AI-antwoorden`,
    band: (p: number, lo: number, hi: number, n: number) =>
      `${p}% — 95%-interval ${lo}–${hi}%, op basis van ${n} steekproefantwoorden`,
    consensus: 'Consensus',
    modelsMention: (n: number) => `${n} van de 4 modellen noemen je`,
    findingTitle: (n: number) => `${n} van de 4 AI-modellen raden je niet aan`,
    findingBody: (city: string, name: string) =>
      `Als gasten in ${city} ChatGPT, Gemini of Perplexity om een restaurant vragen, verschijnt ${name} niet. Je concurrenten wel.`,
    competitorsTitle: 'Concurrenten die vaker worden aanbevolen',
    competitorsLockTitle: 'Concurrentieanalyse',
    competitorsLockBody: 'Zie welke restaurants AI in plaats van jou aanbeveelt',
    mentions: 'Vermeldingen',
    shareOfVoice: 'Aandeel',
    perModelTitle: 'Zichtbaarheid per AI-model',
    unlock: 'Ontgrendel',
    perModelLock: 'ChatGPT, Gemini en Perplexity zichtbaar in het volledige rapport',
    sentimentTitle: 'Sentiment',
    positive: 'Positief', neutral: 'Neutraal', negative: 'Negatief',
    websiteTitle: 'Websitesignalen voor AI',
    present: '✓ Aanwezig', missing: '✗ Ontbreekt',
    sigSchema: 'Schema.org-markup', sigMenu: 'Menu gedetecteerd', sigHours: 'Openingstijden',
    sigReservation: 'Reserveringslink', sigSocial: 'Social-medialinks',
    recommendationsTitle: 'Aanbevelingen',
    sev: { critical: 'Kritiek', high: 'Hoog', medium: 'Middel', low: 'Laag' } as Record<string, string>,
    unlockKicker: 'Volledig rapport · eenmalige betaling',
    unlockHeadline: 'Zie het volledige beeld.\nVerbeter je AI-zichtbaarheid.',
    unlockSub: 'Ontgrendel ChatGPT-, Gemini- en Perplexity-data · Concurrentieanalyse · Stappenplan',
    unlockFeatures: ['ChatGPT-data', 'Gemini-data', 'Concurrentieanalyse', 'Stappenplan', 'PDF-rapport'],
    unlockCta: 'Ontgrendel volledig rapport — €49',
    unlockFine: 'Eenmalige betaling · Direct toegang · Geen abonnement',
    monitorTitle: 'Wil je dit elke maand volgen?',
    monitorBody: 'AI-zichtbaarheid verandert constant. Krijg een maandelijks rapport, scoretracking en meldingen als concurrenten terrein winnen.',
    monitorCta: 'Maandelijkse monitoring — €29/maand',
    scoreMethodTitle: 'Hoe deze score is berekend',
    scoreWeight: 'weging',
    scoreConfidence: 'Betrouwbaarheid',
    scoreVariability: 'Gemeten over deze set prompts. AI-antwoorden kunnen variëren; scores zijn indicatief, geen garantie.',
    footer: 'Finded · AI-zichtbaarheid voor restaurants ·',
    // derived-gap explanations (evidence-tied)
    gapSchema: 'Geen Restaurant-schema gevonden — AI-modellen kunnen je type en gegevens niet betrouwbaar uitlezen.',
    gapMenu: 'Geen menupagina gevonden door AI-crawlers — keuken en gerechten zijn niet zichtbaar.',
    gapHours: 'Openingstijden niet gestructureerd gevonden.',
    gapReservation: 'Geen reserveringslink gedetecteerd.',
    gapSchemaT: 'Geen Restaurant-schema', gapMenuT: 'Menu niet gevonden', gapHoursT: 'Openingstijden ontbreken', gapReservationT: 'Reserveringslink ontbreekt',
    downloadPdf: 'Download PDF', unlockImplNav: 'Implementatie ontgrendelen →',
    implTitle: 'Implementatiecentrum', implSub: 'Werk je verbeteringen één voor één af — kant-en-klaar.',
    implFollowUp: 'Vervolg-audit inbegrepen — we meten opnieuw zodra de wijzigingen live zijn.', implReady: 'Klaar', download: 'Downloaden',
    auditUnlockTitle: 'Ontgrendel de volledige audit', auditUnlockSub: 'Zie precies waarom concurrenten vaker verschijnen — alle modellen, bewijs, concurrentievergelijking en aanbevelingen.', auditUnlockCta: 'Ontgrendel volledige audit — €49',
    implUnlockTitle: 'Ontgrendel het implementatiecentrum', implUnlockSub: 'Zet aanbevelingen om in kant-en-klare onderdelen: schema, FAQ, content, lokale SEO, prioriteiten en een vervolg-audit.', implUnlockCta: 'Ontgrendel implementatie — €299',
    monitorSoonTitle: 'Maandelijkse AI-zichtbaarheidsmonitoring', monitorSoonBadge: 'Binnenkort',
    monitorFeatures: ['Maandelijkse automatische checks', 'Historische grafieken', 'Concurrentiebeweging', 'Waarschuwingen bij grote veranderingen', 'Nieuwe aanbevelingen', 'Maandelijkse PDF-export'],
    historyTitle: 'Zichtbaarheid over tijd', historyEmpty: 'Je zichtbaarheid over tijd verschijnt hier zodra er meer audits zijn.',
    lockedTitle: 'Ontgrendel met de volledige audit', lockedSub: 'Deze onderdelen zitten in de volledige audit (€49) — in ditzelfde dashboard.',
    lockedItems: ['Gedetailleerde AI-modelanalyse', 'Bewijs per zoekopdracht', 'Website-signaalanalyse', 'Gestructureerde-data-review', 'Concurrentievergelijking', 'Actieplan', 'PDF-download'],
  },
  en: {
    badge: 'AI Visibility Report',
    unlockNav: 'Unlock full report →',
    auditedOn: (d: string) => `Audited on ${d}`,
    visibility: 'AI Visibility',
    appearsIn: (p: number) => `Appears in ${p}% of AI responses`,
    band: (p: number, lo: number, hi: number, n: number) =>
      `${p}% — 95% interval ${lo}–${hi}%, based on ${n} sample answers`,
    consensus: 'Consensus',
    modelsMention: (n: number) => `${n} of 4 models mention you`,
    findingTitle: (n: number) => `${n} of 4 AI models don't recommend you`,
    findingBody: (city: string, name: string) =>
      `When ${city} diners ask ChatGPT, Gemini or Perplexity for a restaurant, ${name} doesn't appear. Your competitors do.`,
    competitorsTitle: 'Competitors recommended more often',
    competitorsLockTitle: 'Competitor analysis',
    competitorsLockBody: 'See which restaurants AI recommends instead of you',
    mentions: 'Mentions',
    shareOfVoice: 'Share',
    perModelTitle: 'Visibility by AI model',
    unlock: 'Unlock',
    perModelLock: 'ChatGPT, Gemini and Perplexity data visible in the full report',
    sentimentTitle: 'Sentiment',
    positive: 'Positive', neutral: 'Neutral', negative: 'Negative',
    websiteTitle: 'Website signals for AI',
    present: '✓ Present', missing: '✗ Missing',
    sigSchema: 'Schema.org markup', sigMenu: 'Menu detected', sigHours: 'Opening hours',
    sigReservation: 'Reservation link', sigSocial: 'Social media links',
    recommendationsTitle: 'Recommendations',
    sev: { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' } as Record<string, string>,
    unlockKicker: 'Full report · one-time payment',
    unlockHeadline: 'See the full picture.\nFix your AI visibility.',
    unlockSub: 'Unlock ChatGPT, Gemini and Perplexity data · Competitor analysis · Step-by-step fix guide',
    unlockFeatures: ['ChatGPT data', 'Gemini data', 'Competitor analysis', 'Fix guide', 'PDF report'],
    unlockCta: 'Unlock full report — €49',
    unlockFine: 'One-time payment · Instant access · No subscription',
    monitorTitle: 'Want to track this every month?',
    monitorBody: 'AI visibility changes constantly. Get a monthly report, score tracking, and alerts when competitors gain ground.',
    monitorCta: 'Monthly monitoring — €29/month',
    scoreMethodTitle: 'How this score is calculated',
    scoreWeight: 'weight',
    scoreConfidence: 'Confidence',
    scoreVariability: 'Measured across this prompt set. AI answers can vary; scores are directional, not a guarantee.',
    footer: 'Finded · AI Visibility for Restaurants ·',
    gapSchema: 'No Restaurant schema detected — AI models can\'t reliably read your type and details.',
    gapMenu: 'No menu page found by AI crawlers — cuisine and dishes aren\'t visible.',
    gapHours: 'Opening hours not clearly structured.',
    gapReservation: 'No reservation link detected.',
    gapSchemaT: 'No Restaurant schema', gapMenuT: 'Menu not found', gapHoursT: 'Opening hours missing', gapReservationT: 'Reservation link missing',
    downloadPdf: 'Download PDF', unlockImplNav: 'Unlock implementation →',
    implTitle: 'Implementation Centre', implSub: 'Work through your improvements one by one — ready to use.',
    implFollowUp: 'Follow-up audit included — we re-measure once your changes are live.', implReady: 'Ready', download: 'Download',
    auditUnlockTitle: 'Unlock the full audit', auditUnlockSub: 'See exactly why competitors appear more often — every model, evidence, competitor comparison and recommendations.', auditUnlockCta: 'Unlock full audit — €49',
    implUnlockTitle: 'Unlock the Implementation Workspace', implUnlockSub: 'Turn recommendations into ready-to-use assets: schema, FAQ, content, local SEO, priorities and a follow-up audit.', implUnlockCta: 'Unlock implementation — €299',
    monitorSoonTitle: 'Monthly AI visibility monitoring', monitorSoonBadge: 'Coming soon',
    monitorFeatures: ['Automatic monthly checks', 'Historical charts', 'Competitor movement', 'Alerts on big changes', 'New recommendations', 'Monthly PDF exports'],
    historyTitle: 'Visibility over time', historyEmpty: 'Your visibility over time will appear here as more audits run.',
    lockedTitle: 'Unlock with the full audit', lockedSub: 'These are included in the full audit (€49) — right here in the same dashboard.',
    lockedItems: ['Detailed AI model analysis', 'Prompt-by-prompt evidence', 'Website signal breakdown', 'Structured data review', 'Competitor comparison', 'Action plan', 'PDF download'],
  },
} as const

const MODEL_LABELS: Record<string, string> = {
  anthropic: 'Claude', openai: 'ChatGPT', gemini: 'Gemini', perplexity: 'Perplexity',
}
const FREE_MODELS = ['anthropic'] // free report reveals Claude only

interface Headline {
  visibilityScore: number
  mentionFrequency: number // 0–1
  confidenceLo: number | null
  confidenceHi: number | null
  sampleCount: number | null
  modelConsensus: number
}
interface PerModel { model: string; frequency: number; mentions: number; samples: number }
interface Gap { title: string; explanation: string; severity: string }

async function getReportData(slug: string) {
  const { data: restaurant } = await supabaseAdmin.from('restaurants').select('*').eq('preview_slug', slug).single()
  if (!restaurant) return null

  const { data: audit } = await supabaseAdmin
    .from('audits').select('*').eq('restaurant_id', restaurant.id).eq('status', 'completed')
    .order('created_at', { ascending: false }).limit(1).single()
  if (!audit) return null

  const [{ data: vs }, { data: competitors }, { data: mentions }, { data: websiteAudit }, { data: signalGaps }] = await Promise.all([
    supabaseAdmin.from('visibility_scores').select('*').eq('audit_id', audit.id).single(),
    supabaseAdmin.from('competitors').select('name, mention_count, share_of_voice').eq('audit_id', audit.id).order('mention_count', { ascending: false }).limit(5),
    supabaseAdmin.from('mentions').select('model, mentioned, sentiment, prompt_id, position').eq('audit_id', audit.id),
    supabaseAdmin.from('website_audits').select('*').eq('audit_id', audit.id).single(),
    supabaseAdmin.from('signal_gaps').select('title, explanation, severity').eq('restaurant_id', restaurant.id).order('severity', { ascending: true }).limit(6),
  ])

  const mentionRows = mentions ?? []

  // ── Canonical basis: the per-sample mentions rows. Everything reconciles to these.
  // Per-model rate = mentioned / samples, only for models that actually ran.
  const byModel = new Map<string, { samples: number; mentions: number }>()
  for (const m of mentionRows) {
    const e = byModel.get(m.model) ?? { samples: 0, mentions: 0 }
    e.samples++
    if (m.mentioned) e.mentions++
    byModel.set(m.model, e)
  }
  const perModel: PerModel[] = [...byModel.entries()]
    .filter(([, e]) => e.samples > 0)
    .map(([model, e]) => ({ model, samples: e.samples, mentions: e.mentions, frequency: e.mentions / e.samples }))
    .sort((a, b) => b.frequency - a.frequency)

  // Sentiment counts over mentioned rows (prefer stored vs counts for exactness).
  let sentiment: { positive: number; neutral: number; negative: number } | null = null
  if (vs && (vs.sentiment_positive != null || vs.sentiment_neutral != null || vs.sentiment_negative != null)) {
    sentiment = { positive: Number(vs.sentiment_positive ?? 0), neutral: Number(vs.sentiment_neutral ?? 0), negative: Number(vs.sentiment_negative ?? 0) }
  } else {
    const sc = { positive: 0, neutral: 0, negative: 0 }
    for (const m of mentionRows) if (m.mentioned && m.sentiment && m.sentiment in sc) sc[m.sentiment as keyof typeof sc]++
    sentiment = sc
  }
  if (sentiment && sentiment.positive + sentiment.neutral + sentiment.negative === 0) sentiment = null

  // Headline: prefer the stored visibility_scores row; only recompute if absent.
  let headline: Headline | null = null
  if (vs) {
    headline = {
      visibilityScore: Number(vs.visibility_score ?? 0),
      mentionFrequency: Number(vs.mention_frequency ?? 0),
      confidenceLo: vs.confidence_lo != null ? Number(vs.confidence_lo) : null,
      confidenceHi: vs.confidence_hi != null ? Number(vs.confidence_hi) : null,
      sampleCount: vs.sample_count != null ? Number(vs.sample_count) : null,
      modelConsensus: Number(vs.model_consensus ?? perModel.filter(p => p.mentions > 0).length),
    }
  } else if (mentionRows.length > 0) {
    // Fallback to metrics-v2 over the same rows (no stored row yet).
    const { data: entities } = await supabaseAdmin.from('entities').select('name, position, sentiment, model, prompt_id').eq('audit_id', audit.id)
    const m = computeFullMetrics(
      restaurant.name,
      mentionRows.map(r => ({ model: r.model, prompt_id: r.prompt_id, mentioned: r.mentioned, position: r.position, sentiment: r.sentiment })),
      (entities ?? []).map(e => ({ name: e.name, position: e.position ?? 0, sentiment: e.sentiment ?? 'neutral', reasons: [], model: e.model, prompt_id: e.prompt_id })),
    )
    headline = {
      visibilityScore: m.visibility_score, mentionFrequency: m.mention_frequency,
      confidenceLo: m.confidence_lo, confidenceHi: m.confidence_hi, sampleCount: m.sample_count,
      modelConsensus: m.model_consensus,
    }
  }

  // Recommendations: real signal_gaps if present, else derive from website_audits gaps.
  let gaps: Gap[] = (signalGaps ?? []).filter(g => g.title).map(g => ({ title: g.title, explanation: g.explanation ?? '', severity: g.severity ?? 'medium' }))

  const scoreBreakdown = (vs?.score_breakdown ?? null) as null | {
    components: { key: string; label: string; score: number; weight: number; detail: string }[]
  }
  const confidenceScore = vs?.confidence_score != null ? Number(vs.confidence_score) : null

  // Implementation workspace + history (tiered dashboard).
  const [{ data: recsRaw }, { data: assetsRaw }, { data: history }] = await Promise.all([
    supabaseAdmin.from('recommendations').select('title, why, suggested_fix, priority_rank, asset_type, type, confidence, benchmark, data_source, impact_level').eq('audit_id', audit.id).order('created_at', { ascending: true }),
    supabaseAdmin.from('generated_assets').select('type, title, content, format, created_at').eq('audit_id', audit.id).order('created_at', { ascending: false }),
    supabaseAdmin.from('score_history').select('visibility_score, snapshot_date').eq('restaurant_id', restaurant.id).order('snapshot_date', { ascending: true }).limit(24),
  ])
  // newest asset per type
  const seenAsset = new Set<string>()
  const assets = (assetsRaw ?? []).filter((a) => a.type && !seenAsset.has(a.type) && seenAsset.add(a.type))
  const recommendations = recsRaw ?? []

  return { restaurant, audit, headline, perModel, sentiment, competitors: competitors ?? [], websiteAudit, gaps, scoreBreakdown, confidenceScore, recommendations, assets, history: history ?? [] }
}

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = (size / 2) - 6
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ
  const color = score >= 60 ? '#0f766e' : score >= 35 ? '#c47d14' : '#d94f4f'
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e8e7e3" strokeWidth="5"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}/>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{Math.round(score)}</span>
      </div>
    </div>
  )
}

const SEV_COLOR: Record<string, string> = { critical: '#d94f4f', high: '#c47d14', medium: '#1f6feb', low: '#7a7874' }

function Sparkline({ points }: { points: number[] }) {
  const w = 600, h = 60, pad = 4
  const max = Math.max(100, ...points), min = Math.min(0, ...points)
  const x = (i: number) => pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2)
  const y = (v: number) => h - pad - ((v - min) / Math.max(1, max - min)) * (h - pad * 2)
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 60, marginBottom: 12 }}>
      <path d={d} fill="none" stroke="#0f766e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill="#0f766e" />)}
    </svg>
  )
}

export default async function PreviewReportPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const { slug } = await params
  const { lang: langParam } = await searchParams
  const lang: Lang = langParam === 'en' ? 'en' : 'nl' // default nl
  const t = STR[lang]

  const data = await getReportData(slug)
  if (!data) notFound()

  const { restaurant, audit, headline, perModel, sentiment, competitors, websiteAudit, gaps, scoreBreakdown, confidenceScore, recommendations, assets, history } = data
  // Tier: free → audit (€49) → implementation (€299). Falls back to legacy report_paid.
  const plan: 'free' | 'audit' | 'implementation' =
    restaurant.plan === 'implementation' ? 'implementation'
    : restaurant.plan === 'audit' || restaurant.report_paid ? 'audit'
    : 'free'
  const paid = plan !== 'free'              // audit content unlocked
  const impl = plan === 'implementation'    // implementation workspace unlocked
  const pdfHref = `/api/report/${audit.id}/pdf?plan=${plan}&lang=${lang}`

  const freqPct = headline ? Math.round(headline.mentionFrequency * 100) : null
  const showBand = !!(headline && headline.sampleCount && headline.sampleCount > 1 && headline.confidenceLo != null && headline.confidenceHi != null)

  // Derive recommendations from website gaps only if no signal_gaps rows exist.
  let recs = gaps
  if (recs.length === 0 && websiteAudit) {
    const derived: Gap[] = []
    if (!websiteAudit.schema_present) derived.push({ title: t.gapSchemaT, explanation: t.gapSchema, severity: 'high' })
    if (!websiteAudit.menu_present) derived.push({ title: t.gapMenuT, explanation: t.gapMenu, severity: 'medium' })
    if (!websiteAudit.opening_hours_present) derived.push({ title: t.gapHoursT, explanation: t.gapHours, severity: 'low' })
    if (!websiteAudit.reservation_links_present) derived.push({ title: t.gapReservationT, explanation: t.gapReservation, severity: 'low' })
    recs = derived
  }

  const websiteSignals = websiteAudit ? [
    { label: t.sigSchema, ok: websiteAudit.schema_present },
    { label: t.sigMenu, ok: websiteAudit.menu_present },
    { label: t.sigHours, ok: websiteAudit.opening_hours_present },
    { label: t.sigReservation, ok: websiteAudit.reservation_links_present },
    { label: t.sigSocial, ok: websiteAudit.social_links_present },
  ] : []

  const card = { background: '#fff', border: '1px solid #e7e5e0', borderRadius: 16, padding: '22px', marginBottom: 20, boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 18px 40px -32px rgba(16,40,34,0.22)' } as const
  const cardTitle = { fontSize: 11, fontWeight: 700, color: '#b0aea8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16 } as const

  return (
    <div style={{ fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#f8f7f4', minHeight: '100vh', WebkitFontSmoothing: 'antialiased' }}>
      {/* Nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e7e5e0', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#111827', letterSpacing: -0.5 }}>Finded</span>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: '#7a7874', background: '#f2f1ee', border: '1px solid #e7e5e0', borderRadius: 5, padding: '2px 7px' }}>
            {plan === 'implementation' ? 'Implementation' : plan === 'audit' ? 'Full audit' : 'Free'} dashboard
          </span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          {paid && <a href={pdfHref} target="_blank" rel="noreferrer" style={{ color: '#111827', border: '1px solid #e7e5e0', background: '#fff', padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>{t.downloadPdf}</a>}
          {!impl && <a href="#unlock" style={{ background: '#111827', color: '#fff', padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>{paid ? t.unlockImplNav : t.unlockNav}</a>}
        </span>
      </nav>

      {/* Hero / header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e7e5e0', padding: '40px 24px 36px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#dff8f2', color: '#0b5c55', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 16 }}>{t.badge}</div>
        <h1 style={{ fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 800, color: '#111827', letterSpacing: -1, marginBottom: 8, lineHeight: 1.1 }}>{restaurant.name}</h1>
        <p style={{ fontSize: 15, color: '#7a7874', marginBottom: 24 }}>
          {restaurant.city}{restaurant.cuisine ? ` · ${restaurant.cuisine}` : ''} · {t.auditedOn(new Date(audit.created_at).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))}
        </p>

        {headline && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', maxWidth: 680, margin: '0 auto', alignItems: 'stretch' }}>
            <div style={{ background: '#fafaf8', border: '1px solid #e7e5e0', borderRadius: 10, padding: '18px 24px', minWidth: 150, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><ScoreRing score={headline.visibilityScore} /></div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#b0aea8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.visibility}</div>
            </div>
            <div style={{ background: '#fafaf8', border: '1px solid #e7e5e0', borderRadius: 10, padding: '18px 24px', minWidth: 220, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1.4 }}>{t.appearsIn(freqPct ?? 0)}</div>
              {showBand && (
                <div style={{ fontSize: 12, color: '#7a7874', marginTop: 6, lineHeight: 1.5 }}>
                  {t.band(freqPct ?? 0, Math.round((headline.confidenceLo ?? 0) * 100), Math.round((headline.confidenceHi ?? 0) * 100), headline.sampleCount ?? 0)}
                </div>
              )}
            </div>
            <div style={{ background: '#fafaf8', border: '1px solid #e7e5e0', borderRadius: 10, padding: '18px 24px', minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#111827', letterSpacing: -1 }}>{headline.modelConsensus}<span style={{ fontSize: 16, color: '#b0aea8' }}>/4</span></div>
              <div style={{ fontSize: 12, color: '#7a7874', marginTop: 4 }}>{t.modelsMention(headline.modelConsensus)}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#b0aea8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 }}>{t.consensus}</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Key finding */}
        {headline && headline.modelConsensus < 4 && (
          <div style={{ background: '#fdeaea', border: '1px solid #f5c6c6', borderRadius: 10, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#9b2c2c', marginBottom: 4 }}>{t.findingTitle(4 - headline.modelConsensus)}</div>
              <div style={{ fontSize: 13, color: '#c53030', lineHeight: 1.5 }}>{t.findingBody(restaurant.city, restaurant.name)}</div>
            </div>
          </div>
        )}

        {/* Top competitors mentioned instead — FREE (names + counts). */}
        {competitors.length > 0 && (
          <div style={{ ...card, marginBottom: 20 }}>
            <div style={cardTitle}>{t.competitorsTitle}</div>
            {competitors.map((c, i) => (
              <div key={`${c.name}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f2f1ee' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{i + 1}. {c.name}</span>
                <span style={{ fontSize: 13, color: '#7a7874' }}>
                  {c.mention_count} {t.mentions.toLowerCase()}
                  {paid && c.share_of_voice != null ? ` · ${Math.round(Number(c.share_of_voice) * 100)}% ${t.shareOfVoice.toLowerCase()}` : ''}
                </span>
              </div>
            ))}
            {!paid && <p style={{ fontSize: 12, color: '#b0aea8', marginTop: 12 }}>🔒 {t.competitorsLockBody} — {t.lockedTitle.toLowerCase()}.</p>}
          </div>
        )}

        {/* What the full audit unlocks (free only) — visible but locked, with explanation. */}
        {!paid && (
          <div style={{ ...card, marginBottom: 20 }}>
            <div style={cardTitle}>{t.lockedTitle}</div>
            <p style={{ fontSize: 13, color: '#7a7874', marginTop: -6, marginBottom: 12 }}>{t.lockedSub}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
              {t.lockedItems.map((it) => (
                <div key={it} style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: 13.5, color: '#111827' }}>
                  <span style={{ opacity: 0.55 }}>🔒</span>{it}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-model breakdown — only models that actually ran. */}
        {perModel.length > 0 && (
          <div style={card}>
            <div style={cardTitle}>{t.perModelTitle}</div>
            {perModel.map(({ model, frequency }) => {
              const freq = Math.round(frequency * 100)
              const isBlurred = !paid && !FREE_MODELS.includes(model)
              const barColor = freq >= 50 ? '#0f766e' : freq >= 25 ? '#c47d14' : '#d94f4f'
              return (
                <div key={model} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, position: 'relative' }}>
                  <div style={{ width: 90, flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{MODEL_LABELS[model] ?? model}</div>
                  <div style={{ flex: 1, height: 7, background: '#f2f1ee', borderRadius: 4, overflow: 'hidden', filter: isBlurred ? 'blur(4px)' : 'none' }}>
                    <div style={{ height: '100%', width: `${freq}%`, background: barColor, borderRadius: 4 }} />
                  </div>
                  <div style={{ width: 40, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#111827', filter: isBlurred ? 'blur(6px)' : 'none' }}>{isBlurred ? '??%' : `${freq}%`}</div>
                  {isBlurred && (
                    <div style={{ position: 'absolute', right: 48, top: '50%', transform: 'translateY(-50%)', background: '#f2f1ee', border: '1px solid #e7e5e0', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#7a7874', textTransform: 'uppercase', letterSpacing: 0.3 }}>{t.unlock}</div>
                  )}
                </div>
              )
            })}
            {!paid && perModel.some(p => !FREE_MODELS.includes(p.model)) && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#b0aea8', display: 'flex', alignItems: 'center', gap: 6 }}><span>🔒</span> {t.perModelLock}</div>
            )}
          </div>
        )}

        {/* How this score is calculated — transparent, evidence-backed breakdown. */}
        {scoreBreakdown && scoreBreakdown.components.length > 0 && (
          <div style={card}>
            <div style={cardTitle}>{t.scoreMethodTitle}</div>
            {scoreBreakdown.components.map((c) => (
              <div key={c.key} style={{ padding: '8px 0', borderBottom: '1px solid #f2f1ee' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{c.label}</span>
                  <span style={{ fontSize: 13, color: '#7a7874' }}>
                    {Math.round(c.score)}/100 · {Math.round(c.weight * 100)}% {t.scoreWeight}
                  </span>
                </div>
                {c.detail ? <div style={{ fontSize: 12, color: '#b0aea8', marginTop: 2 }}>{c.detail}</div> : null}
              </div>
            ))}
            {confidenceScore != null && (
              <div style={{ marginTop: 12, fontSize: 12, color: '#7a7874' }}>
                {t.scoreConfidence}: <strong style={{ color: '#111827' }}>{Math.round(confidenceScore * 100)}%</strong>
              </div>
            )}
            <div style={{ marginTop: 8, fontSize: 11, color: '#b0aea8', lineHeight: 1.5 }}>{t.scoreVariability}</div>
          </div>
        )}

        {/* Sentiment — hidden if no values. */}
        {sentiment && (
          <div style={card}>
            <div style={cardTitle}>{t.sentimentTitle}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { label: t.positive, value: sentiment.positive, color: '#0f766e', bg: '#dff8f2' },
                { label: t.neutral, value: sentiment.neutral, color: '#7a7874', bg: '#f2f1ee' },
                { label: t.negative, value: sentiment.negative, color: '#d94f4f', bg: '#fdeaea' },
              ].map(p => (
                <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 7, background: p.bg, borderRadius: 16, padding: '6px 14px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: p.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: p.color }}>{p.label}: {p.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Website signals — real audit. */}
        {websiteSignals.length > 0 && (
          <div style={card}>
            <div style={cardTitle}>{t.websiteTitle}</div>
            {websiteSignals.map(({ label, ok }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f2f1ee' }}>
                <span style={{ fontSize: 13, color: '#111827' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: ok ? '#0f766e' : '#d94f4f' }}>{ok ? t.present : t.missing}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations — real signal_gaps or website-derived gaps. Hidden if none. */}
        {recs.length > 0 && (
          <div style={card}>
            <div style={cardTitle}>{t.recommendationsTitle}</div>
            {recs.map((g, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < recs.length - 1 ? '1px solid #f2f1ee' : 'none' }}>
                <span style={{ width: 22, height: 22, borderRadius: 11, background: '#111827', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827' }}>
                    {g.title}
                    <span style={{ fontSize: 10, fontWeight: 700, color: SEV_COLOR[g.severity] ?? '#7a7874', textTransform: 'uppercase', letterSpacing: 0.4, marginLeft: 8 }}>{t.sev[g.severity] ?? g.severity}</span>
                  </div>
                  {g.explanation ? <div style={{ fontSize: 12.5, color: '#7a7874', lineHeight: 1.5, marginTop: 2 }}>{g.explanation}</div> : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Implementation Centre (€299) — workspace when unlocked, else the €299 unlock ── */}
        {impl ? (
          <div style={{ ...card }}>
            <div style={cardTitle}>{t.implTitle}</div>
            <p style={{ fontSize: 13, color: '#7a7874', marginTop: -6, marginBottom: 14 }}>{t.implSub}</p>
            {recommendations.length === 0 ? (
              <p style={{ fontSize: 13, color: '#7a7874' }}>—</p>
            ) : (
              recommendations.map((r: any, i: number) => {
                const asset = assets.find((a: any) => a.type && (a.type === r.asset_type || a.type === r.type))
                const ext = asset?.format === 'json' ? 'json' : asset?.format === 'html' ? 'html' : 'txt'
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f2f1ee' }}>
                    <span style={{ width: 22, height: 22, borderRadius: 11, background: asset ? '#dff8f2' : '#f2f1ee', color: asset ? '#0b5c55' : '#b0aea8', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{asset ? '✓' : i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{r.title}</div>
                      {r.why && <div style={{ fontSize: 12.5, color: '#7a7874', marginTop: 2, lineHeight: 1.5 }}>{r.why}</div>}
                      {asset ? (
                        <div style={{ marginTop: 8 }}>
                          <a download={`${asset.type || 'asset'}.${ext}`} href={`data:text/plain;charset=utf-8,${encodeURIComponent(asset.content || '')}`} style={{ display: 'inline-block', background: '#111827', color: '#fff', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 6, textDecoration: 'none' }}>{t.download}</a>
                          <details style={{ marginTop: 8 }}>
                            <summary style={{ fontSize: 12, color: '#0b5c55', cursor: 'pointer' }}>Preview</summary>
                            <pre style={{ fontSize: 11, background: '#f7f6f3', border: '1px solid #e7e5e0', borderRadius: 8, padding: 12, overflowX: 'auto', marginTop: 6, whiteSpace: 'pre-wrap' }}>{(asset.content || '').slice(0, 1200)}{(asset.content || '').length > 1200 ? '\n…' : ''}</pre>
                          </details>
                        </div>
                      ) : r.suggested_fix ? <div style={{ fontSize: 12.5, color: '#111827', marginTop: 6 }}>{r.suggested_fix}</div> : null}
                    </div>
                    {asset && <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#0b5c55', flexShrink: 0 }}>{t.implReady}</span>}
                  </div>
                )
              })
            )}
            <p style={{ fontSize: 12.5, color: '#7a7874', marginTop: 14 }}>{t.implFollowUp}</p>
          </div>
        ) : (
          <div id="unlock" style={{ background: '#111827', borderRadius: 12, padding: '30px 28px', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{t.unlockKicker}</div>
            <div style={{ fontSize: 25, fontWeight: 800, color: '#fff', letterSpacing: -0.5, marginBottom: 8, lineHeight: 1.2 }}>{paid ? t.implUnlockTitle : t.auditUnlockTitle}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginBottom: 22, lineHeight: 1.6, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>{paid ? t.implUnlockSub : t.auditUnlockSub}</div>
            <a href={`/checkout?slug=${restaurant.preview_slug}${paid ? '&plan=implementation' : ''}`} style={{ display: 'inline-block', background: '#fff', color: '#111827', padding: '14px 32px', borderRadius: 8, fontSize: 15, fontWeight: 800, textDecoration: 'none', letterSpacing: -0.3 }}>{paid ? t.implUnlockCta : t.auditUnlockCta}</a>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 12 }}>{t.unlockFine}</div>
          </div>
        )}

        {/* ── Monthly AI visibility monitoring — Coming soon ── */}
        <div style={{ ...card, marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
            <div style={cardTitle}>{t.monitorSoonTitle}</div>
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6, color: '#0b5c55', background: '#dff8f2', border: '1px solid #cce9dd', borderRadius: 20, padding: '3px 9px' }}>{t.monitorSoonBadge}</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#b0aea8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{t.historyTitle}</div>
          {history.length >= 2 ? <Sparkline points={history.map((h: any) => Number(h.visibility_score ?? 0))} /> : <p style={{ fontSize: 13, color: '#b0aea8', marginBottom: 12 }}>{t.historyEmpty}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginTop: 8 }}>
            {t.monitorFeatures.map((f) => (
              <div key={f} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#7a7874' }}><span style={{ color: '#b0aea8' }}>○</span>{f}</div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #e7e5e0', padding: '20px 24px', textAlign: 'center', fontSize: 12, color: '#b0aea8' }}>
        {t.footer} <a href="/" style={{ color: '#b0aea8' }}>finded.vercel.app</a>
      </div>
    </div>
  )
}
