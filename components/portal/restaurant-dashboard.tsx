'use client'

import { useState } from 'react'
import {
  Home, Gauge, Bot, Users, ListChecks, Globe, TrendingUp, FileDown,
  Sparkles, ExternalLink, Check, X,
} from 'lucide-react'
import { PORTAL } from '@/lib/portal-copy'
import type { Language } from '@/lib/i18n'

const CARD = '#FFFFFF', BORDER2 = 'rgba(36,28,19,0.09)', BORDER = 'rgba(36,28,19,0.13)'
const INK = '#241C13', MUTED = 'rgba(36,28,19,0.66)', FAINT = 'rgba(36,28,19,0.46)', GREEN = '#16a34a', AMBER = '#d97706', RED = '#dc2626'
const GRAD = 'linear-gradient(135deg, #C8804E 0%, #B5683A 50%, #9A5530 100%)'
const FONT = 'var(--font-inter), sans-serif'
const ML: Record<string, string> = { openai: 'ChatGPT', anthropic: 'Claude', gemini: 'Gemini', perplexity: 'Perplexity' }
type Dash = typeof PORTAL['en']['dash']

// Score component labels stored in DB are always English — translate client-side
const SCORE_LABELS: Record<string, Record<string, string>> = {
  nl: {
    'Mention frequency': 'Vermeldingsfrequentie',
    'Share of voice vs competitors': 'Share of voice vs. concurrenten',
    'Model consensus': 'Modelconsensus',
    'Authority & citations': 'Autoriteit & citaties',
    'Website signals': 'Websitesignalen',
  },
}
const DETAIL_PATTERNS: Array<{ pattern: RegExp; nl: (...m: string[]) => string }> = [
  { pattern: /Mentioned in (\d+)% of sampled answers\./, nl: (p) => `Genoemd in ${p}% van de geteste antwoorden.` },
  { pattern: /(\d+)% of all restaurant mentions in this prompt set\./, nl: (p) => `${p}% van alle restaurantvermeldingen in deze promptset.` },
  { pattern: /(\d+) of (\d+) AI models mentioned you\./, nl: (a, b) => `${a} van de ${b} AI-modellen noemden je.` },
  { pattern: /Authority signals \(AI citation of your site \+ review presence\): (\d+)%\./, nl: (p) => `Autoriteitssignalen (AI-citatie van je site + reviewaanwezigheid): ${p}%.` },
  { pattern: /(\d+) of (\d+) AI-readiness signals present on the website\./, nl: (a, b) => `${a} van de ${b} AI-gereedheidssignalen aanwezig op de website.` },
]
function translateLabel(label: string, lang: string) {
  return SCORE_LABELS[lang]?.[label] ?? label
}
function translateDetail(detail: string, lang: string) {
  if (lang === 'en') return detail
  for (const { pattern, nl } of DETAIL_PATTERNS) {
    const m = detail.match(pattern)
    if (m) return nl(...m.slice(1))
  }
  return detail
}

export interface DashboardData {
  restaurant: { id: string; name: string; city: string | null; cuisine: string | null; preview_slug: string | null; plan: string | null }
  ready: boolean
  auditedAt: string | null
  score: number | null
  mentionedPct: number | null
  consensus: number
  confidence: number | null
  scoreComponents: { label: string; score: number; weight: number; detail: string }[]
  competitors: { name: string; mention_count: number }[]
  modelBreakdown: { model: string; mentions: number; total_prompts: number; frequency: number; avg_position: number | null }[]
  recommendations: { title: string; why: string | null; what: string | null; evidence: string | null; priority_rank: string | null; impact_level: string | null; effort: string | null; confidence: string | null; benchmark: string | null; data_source: string | null; type: string | null }[]
  website: null | {
    schema_present: boolean; menu_present: boolean; menu_format: string | null; opening_hours_present: boolean
    reservation_present: boolean; social_present: boolean; faq_present: boolean; reviews_present: boolean
    location_present: boolean; schema_types: string[]; meta_title: string | null; meta_description: string | null
  }
  history: { visibility_score: number; snapshot_date: string }[]
  insight: string | null
  reliabilityBand: string | null
  reliabilityPct: number | null
}

type Tab = 'overview' | 'score' | 'mentions' | 'competitors' | 'recommendations' | 'website' | 'trends'
const bandColor = (n: number) => n >= 60 ? GREEN : n >= 30 ? AMBER : RED
const scoreBand = (n: number, t: Dash) => n >= 60 ? t.bandGood : n >= 30 ? t.bandFair : t.bandWork
const cardBox = { background: CARD, border: `1px solid ${BORDER2}`, borderRadius: 14, padding: 18 } as const
const eyebrow = { fontSize: 10.5, fontWeight: 700, color: FAINT, textTransform: 'uppercase' as const, letterSpacing: 1 }

function Ring({ pct, size, stroke, label, sub }: { pct: number; size: number; stroke: number; label: string; sub?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, dash = (pct / 100) * c
  const id = `g${Math.round(pct)}${size}`
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#C8804E" /><stop offset="100%" stopColor="#B5683A" /></linearGradient></defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(36,28,19,0.10)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="49%" textAnchor="middle" dominantBaseline="central" style={{ fontFamily: FONT, fontSize: size * 0.26, fontWeight: 800, fill: INK }}>{label}</text>
      {sub && <text x="50%" y="66%" textAnchor="middle" dominantBaseline="central" style={{ fontFamily: FONT, fontSize: size * 0.12, fill: MUTED }}>{sub}</text>}
    </svg>
  )
}
function Bar({ pct, color = '#B5683A' }: { pct: number; color?: string }) {
  return <div style={{ height: 7, borderRadius: 4, background: 'rgba(36,28,19,0.10)', overflow: 'hidden' }}><div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', borderRadius: 4, background: color }} /></div>
}

function TrendChart({ history, lang, t }: { history: { visibility_score: number; snapshot_date: string }[]; lang: Language; t: Dash }) {
  const pts = history.map((h) => h.visibility_score).filter((n) => Number.isFinite(n))
  if (pts.length < 2) return <p style={{ fontSize: 13, color: FAINT, marginTop: 12, lineHeight: 1.6 }}>{t.overTimeEmpty}</p>
  const W = 640, hPlot = 150, top = 18, bottom = top + hPlot
  const X = (i: number) => 44 + i * ((W - 70) / (pts.length - 1))
  const Y = (v: number) => bottom - (v / 100) * hPlot
  const line = pts.map((v, i) => `${X(i)},${Y(v)}`).join(' ')
  const area = `${line} ${X(pts.length - 1)},${bottom} ${X(0)},${bottom}`
  const step = Math.ceil(history.length / 6) || 1
  return (
    <svg viewBox={`0 0 ${W} 195`} style={{ width: '100%', height: 'auto', marginTop: 10 }}>
      <defs>
        <linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(181,104,58,0.35)" /><stop offset="100%" stopColor="rgba(181,104,58,0)" /></linearGradient>
        <linearGradient id="st" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#D08A5A" /><stop offset="100%" stopColor="#B5683A" /></linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((g) => (<g key={g}><line x1={44} y1={Y(g)} x2={W - 10} y2={Y(g)} stroke="rgba(36,28,19,0.08)" /><text x={32} y={Y(g) + 3} textAnchor="end" style={{ fontFamily: FONT, fontSize: 9, fill: FAINT }}>{g}</text></g>))}
      <polygon points={area} fill="url(#ar)" />
      <polyline points={line} fill="none" stroke="url(#st)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((v, i) => <circle key={i} cx={X(i)} cy={Y(v)} r={2.8} fill="#B5683A" />)}
      {history.map((h, i) => i % step === 0 ? <text key={i} x={X(i)} y={190} textAnchor="middle" style={{ fontFamily: FONT, fontSize: 9, fill: FAINT }}>{new Date(h.snapshot_date).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-GB', { month: 'short', year: '2-digit' })}</text> : null)}
    </svg>
  )
}

function SigRow({ label, present, note }: { label: string; present: boolean; note?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${BORDER2}` }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: present ? 'rgba(52,211,153,0.15)' : 'rgba(251,113,133,0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {present ? <Check style={{ width: 13, height: 13, color: GREEN }} /> : <X style={{ width: 13, height: 13, color: RED }} />}
      </span>
      <span style={{ fontSize: 14, color: INK, flex: 1 }}>{label}</span>
      {note && <span style={{ fontSize: 12, color: FAINT }}>{note}</span>}
    </div>
  )
}

const rankColor = (r: string | null) => r === 'do_first' ? RED : r === 'optional' ? FAINT : AMBER
const rankLabel = (r: string | null, t: Dash) => r === 'do_first' ? t.doFirst : r === 'optional' ? t.optional : t.doNext

export function RestaurantDashboard({ data, lang = 'en' }: { data: DashboardData; lang?: Language }) {
  const t = PORTAL[lang].dash
  const [tab, setTab] = useState<Tab>('overview')
  const { restaurant, score, mentionedPct, consensus, confidence, scoreComponents, competitors, modelBreakdown, recommendations, website, history, insight, reliabilityBand, reliabilityPct } = data

  const nav: { key: Tab; icon: typeof Home; label: string }[] = [
    { key: 'overview', icon: Home, label: t.nav[0] },
    { key: 'score', icon: Gauge, label: t.nav[1] },
    { key: 'mentions', icon: Bot, label: t.nav[2] },
    { key: 'competitors', icon: Users, label: t.nav[3] },
    { key: 'recommendations', icon: ListChecks, label: t.nav[4] },
    { key: 'website', icon: Globe, label: t.nav[5] },
    { key: 'trends', icon: TrendingUp, label: t.nav[6] },
  ]

  if (!data.ready) {
    return (
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 24 }}>
        <Header data={data} lang={lang} />
        <div style={{ ...cardBox, padding: 40, textAlign: 'center' }}>
          <Gauge style={{ width: 34, height: 34, color: FAINT, margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{t.preparingTitle}</h2>
          <p style={{ fontSize: 14, color: MUTED, maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>{t.preparingBody}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: 24 }}>
      <Header data={data} lang={lang} />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,210px) 1fr', gap: 18, alignItems: 'start' }}>
        <aside style={{ ...cardBox, background: '#F5EDE0', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 16 }}>
          {nav.map(({ key, icon: Icon, label }) => {
            const active = tab === key
            return (
              <button key={key} onClick={() => setTab(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 9, fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#7A3E1E' : MUTED, background: active ? 'rgba(181,104,58,0.14)' : 'transparent', border: active ? '1px solid rgba(181,104,58,0.28)' : '1px solid transparent', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                <Icon style={{ width: 15, height: 15, color: active ? '#B5683A' : FAINT }} /> {label}
              </button>
            )
          })}
          {restaurant.preview_slug && (
            <a href={`/report/${restaurant.preview_slug}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', marginTop: 8, borderTop: `1px solid ${BORDER2}`, paddingTop: 14, fontSize: 13, color: MUTED, textDecoration: 'none' }}>
              <FileDown style={{ width: 15, height: 15, color: FAINT }} /> {t.fullReport}
            </a>
          )}
        </aside>

        <div style={{ display: 'grid', gap: 14 }}>
          {tab === 'overview' && <Overview data={data} lang={lang} />}

          {tab === 'score' && (
            <div style={cardBox}>
              <div style={eyebrow}>{t.scoreTitle}</div>
              <div style={{ display: 'flex', gap: 18, alignItems: 'center', margin: '12px 0 20px' }}>
                <Ring pct={score ?? 0} size={120} stroke={12} label={String(score ?? '—')} sub="/100" />
                <div>
                  {score != null && <span style={{ fontSize: 12, fontWeight: 800, color: bandColor(score), background: 'rgba(36,28,19,0.06)', border: `1px solid ${BORDER}`, padding: '4px 11px', borderRadius: 7 }}>{scoreBand(score, t)}</span>}
                  <p style={{ fontSize: 13.5, color: MUTED, marginTop: 10, maxWidth: 380, lineHeight: 1.5 }}>{t.scoreLong(confidence ?? '—')}</p>
                </div>
              </div>
              <div style={{ ...eyebrow, marginBottom: 10 }}>{t.breaksDown}</div>
              <div style={{ display: 'grid', gap: 12 }}>
                {scoreComponents.length === 0 ? <p style={{ fontSize: 13, color: FAINT }}>{t.breakdownNA}</p> : scoreComponents.map((c) => (
                  <div key={c.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: INK }}>{translateLabel(c.label, lang)} <span style={{ color: FAINT }}>· {c.weight}% {t.weight}</span></span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: bandColor(c.score) }}>{c.score}/100</span>
                    </div>
                    <Bar pct={c.score} color={bandColor(c.score)} />
                    {c.detail && <p style={{ fontSize: 11.5, color: FAINT, marginTop: 5 }}>{translateDetail(c.detail, lang)}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'mentions' && (
            <div style={cardBox}>
              <div style={eyebrow}>{t.mentionsTitle}</div>
              <p style={{ fontSize: 13, color: MUTED, margin: '8px 0 16px' }}>{t.mentionsSub(consensus)}</p>
              <div style={{ display: 'grid', gap: 14 }}>
                {modelBreakdown.map((m) => (
                  <div key={m.model}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13.5, color: INK, fontWeight: 600 }}>{ML[m.model] ?? m.model}</span>
                      <span style={{ fontSize: 13, color: MUTED }}>{Math.round(m.frequency * 100)}% · {m.mentions} {m.mentions === 1 ? t.mentionOne : t.mentionMany}{m.avg_position != null ? ` · ${t.avgPos} ${m.avg_position.toFixed(1)}` : ''}</span>
                    </div>
                    <Bar pct={m.frequency * 100} color={m.mentions > 0 ? '#B5683A' : 'rgba(36,28,19,0.12)'} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'competitors' && (
            <div style={cardBox}>
              <div style={eyebrow}>{t.competitorsTitle}</div>
              <p style={{ fontSize: 13, color: MUTED, margin: '8px 0 14px' }}>{t.competitorsSub}</p>
              {competitors.length === 0 ? <p style={{ fontSize: 13, color: FAINT }}>{t.noCompetitors}</p> : (
                <div style={{ display: 'grid', gap: 4 }}>
                  {competitors.map((c, i) => {
                    const max = competitors[0]?.mention_count || 1
                    return (
                      <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                        <span style={{ fontSize: 12, color: FAINT, width: 16 }}>{i + 1}</span>
                        <span style={{ fontSize: 14, color: INK, width: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                        <div style={{ flex: 1 }}><Bar pct={(c.mention_count / max) * 100} /></div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: MUTED, width: 28, textAlign: 'right' }}>{c.mention_count}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'recommendations' && (
            <div style={{ display: 'grid', gap: 12 }}>
              {recommendations.length === 0 ? (
                <div style={cardBox}><p style={{ fontSize: 13, color: FAINT }}>{t.recsEmpty}</p></div>
              ) : recommendations.map((r, i) => (
                <div key={i} style={cardBox}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: rankColor(r.priority_rank), background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, padding: '3px 8px', borderRadius: 6 }}>{rankLabel(r.priority_rank, t)}</span>
                    {r.confidence && <span style={{ fontSize: 10.5, color: FAINT }}>{t.confidence}: {r.confidence}</span>}
                    {r.impact_level && <span style={{ fontSize: 10.5, color: FAINT }}>· {t.impact}: {r.impact_level}</span>}
                    {r.effort && <span style={{ fontSize: 10.5, color: FAINT }}>· {t.effort}: {r.effort}</span>}
                  </div>
                  <h3 style={{ fontSize: 15.5, fontWeight: 700, color: INK, marginBottom: 6 }}>{r.title}</h3>
                  {r.what && <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.55, marginBottom: 8 }}>{r.what}</p>}
                  {r.why && <p style={{ fontSize: 13, color: FAINT, lineHeight: 1.5, marginBottom: 8 }}>{r.why}</p>}
                  {(r.evidence || r.benchmark) && <div style={{ fontSize: 12, color: '#B5683A', background: 'rgba(181,104,58,0.08)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 11px' }}>{r.benchmark || r.evidence}{r.data_source ? ` · ${r.data_source}` : ''}</div>}
                </div>
              ))}
            </div>
          )}

          {tab === 'website' && (
            <div style={cardBox}>
              <div style={eyebrow}>{t.websiteTitle}</div>
              <p style={{ fontSize: 13, color: MUTED, margin: '8px 0 8px' }}>{t.websiteSub}</p>
              {!website ? <p style={{ fontSize: 13, color: FAINT }}>{t.noWebsite}</p> : (
                <div>
                  <SigRow label={t.sig.schema} present={website.schema_present} note={website.schema_types.length ? website.schema_types.slice(0, 3).join(', ') : undefined} />
                  <SigRow label={t.sig.menu} present={website.menu_present} note={website.menu_format ? website.menu_format.toUpperCase() : undefined} />
                  <SigRow label={t.sig.hours} present={website.opening_hours_present} />
                  <SigRow label={t.sig.reservation} present={website.reservation_present} />
                  <SigRow label={t.sig.faq} present={website.faq_present} />
                  <SigRow label={t.sig.reviews} present={website.reviews_present} />
                  <SigRow label={t.sig.location} present={website.location_present} />
                  <SigRow label={t.sig.social} present={website.social_present} />
                  {website.meta_title && <p style={{ fontSize: 11.5, color: FAINT, marginTop: 12 }}>{t.metaTitle}: <span style={{ color: MUTED }}>{website.meta_title}</span></p>}
                </div>
              )}
            </div>
          )}

          {tab === 'trends' && (
            <div style={cardBox}>
              <div style={eyebrow}>{t.overTime}</div>
              <TrendChart history={history} lang={lang} t={t} />
            </div>
          )}

          {restaurant.preview_slug && (
            <a href={`/report/${restaurant.preview_slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'start', background: GRAD, color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px 20px', borderRadius: 11, textDecoration: 'none', boxShadow: '0 14px 30px -14px rgba(99,102,241,0.7)' }}>
              {t.openFull} <ExternalLink style={{ width: 15, height: 15 }} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function Header({ data, lang }: { data: DashboardData; lang: Language }) {
  const { restaurant, auditedAt } = data
  const t = PORTAL[lang].list
  return (
    <div style={{ marginBottom: 18 }}>
      <h1 style={{ fontSize: 'clamp(22px,3vw,28px)', fontWeight: 800, letterSpacing: -0.8 }}>{restaurant.name}</h1>
      <p style={{ fontSize: 14, color: MUTED, marginTop: 2 }}>
        {[restaurant.city, restaurant.cuisine].filter(Boolean).join(' · ') || '—'}{auditedAt ? ` · ${t.auditedOn(new Date(auditedAt).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-GB'))}` : ''}
      </p>
    </div>
  )
}

function Overview({ data, lang }: { data: DashboardData; lang: Language }) {
  const t = PORTAL[lang].dash
  const { score, mentionedPct, consensus, competitors, insight, reliabilityBand, reliabilityPct, history } = data
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr 1fr', gap: 14 }}>
        <div style={cardBox}>
          <div style={eyebrow}>{t.scoreTitle}</div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 10 }}>
            <Ring pct={score ?? 0} size={104} stroke={11} label={String(score ?? '—')} sub="/100" />
            <div>
              {score != null && <span style={{ fontSize: 11, fontWeight: 800, color: bandColor(score), background: 'rgba(36,28,19,0.06)', border: `1px solid ${BORDER}`, padding: '3px 9px', borderRadius: 6 }}>{scoreBand(score, t)}</span>}
              <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, margin: '10px 0 0' }}>{t.scoreOverviewBody}</p>
            </div>
          </div>
        </div>
        <div style={cardBox}>
          <div style={eyebrow}>{t.mentioned}</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 10 }}>
            <Ring pct={mentionedPct ?? 0} size={84} stroke={10} label={`${mentionedPct ?? 0}%`} />
            <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, margin: 0 }}>{t.mentionedBody(mentionedPct ?? 0, consensus)}</p>
          </div>
        </div>
        <div style={cardBox}>
          <div style={eyebrow}>{t.topCompetitors}</div>
          <div style={{ marginTop: 10, display: 'grid', gap: 2 }}>
            {competitors.length === 0 ? <p style={{ fontSize: 12, color: FAINT }}>{t.noneExtracted}</p> : competitors.slice(0, 5).map((c, i) => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                <span style={{ fontSize: 11, color: FAINT, width: 10 }}>{i + 1}</span>
                <span style={{ fontSize: 12.5, color: INK, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: MUTED }}>{c.mention_count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        <div style={cardBox}>
          <div style={eyebrow}>{t.overTime}</div>
          <TrendChart history={history} lang={lang} t={t} />
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          {insight && (
            <div style={{ ...cardBox, background: 'linear-gradient(135deg, rgba(181,104,58,0.14), rgba(200,128,78,0.06))', border: '1px solid rgba(181,104,58,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, ...eyebrow, color: '#B5683A' }}><Sparkles style={{ width: 13, height: 13 }} /> {t.keyInsight}</div>
              <p style={{ fontSize: 12.5, color: INK, lineHeight: 1.5, margin: '10px 0 0' }}>{insight}</p>
            </div>
          )}
          <div style={cardBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={eyebrow}>{t.reliability}</div>
              {reliabilityBand && <span style={{ fontSize: 11, fontWeight: 700, color: reliabilityBand === 'green' ? GREEN : reliabilityBand === 'yellow' ? AMBER : RED }}>{reliabilityBand === 'green' ? t.relHigh : reliabilityBand === 'yellow' ? t.relMed : t.relLow}</span>}
            </div>
            <div style={{ marginTop: 10 }}><Bar pct={reliabilityPct ?? 0} color={GREEN} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
              <span style={{ fontSize: 10.5, color: FAINT }}>{t.relCaption}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: INK }}>{reliabilityPct != null ? `${reliabilityPct}%` : '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
