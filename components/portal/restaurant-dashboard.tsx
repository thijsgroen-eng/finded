'use client'

import { useState, type ReactNode } from 'react'
import {
  Home, Gauge, Bot, Users, ListChecks, Globe, TrendingUp, FileDown,
  Sparkles, ExternalLink, Check, X, ArrowUp, ArrowDown, Minus, Lock,
  BarChart3, Newspaper, Target, Activity, Zap,
} from 'lucide-react'
import { PORTAL } from '@/lib/portal-copy'
import type { Language } from '@/lib/i18n'
import type { RestaurantIntel, Change, Opportunity, BenchmarkRow, ProviderDetail, Finding, HistoryPoint } from '@/lib/warehouse/restaurant'

const CARD = 'rgba(255,255,255,0.035)', BORDER2 = 'rgba(255,255,255,0.06)', BORDER = 'rgba(255,255,255,0.09)'
const INK = '#f4f5fa', MUTED = '#9a9fb6', FAINT = '#646a85', GREEN = '#34d399', AMBER = '#fbbf24', RED = '#fb7185'
const GRAD = 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)'
const FONT = 'var(--font-inter), sans-serif'
const ML: Record<string, string> = { openai: 'ChatGPT', anthropic: 'Claude', gemini: 'Gemini', perplexity: 'Perplexity' }
type Dash = typeof PORTAL['en']['dash']

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
  intel?: RestaurantIntel | null
}

type Tab = 'overview' | 'opportunities' | 'benchmarks' | 'score' | 'mentions' | 'competitors' | 'recommendations' | 'website' | 'industry' | 'trends'
type Mon = typeof PORTAL['en']['mon']
const bandColor = (n: number) => n >= 60 ? GREEN : n >= 30 ? AMBER : RED
const scoreBand = (n: number, t: Dash) => n >= 60 ? t.bandGood : n >= 30 ? t.bandFair : t.bandWork
const cardBox = { background: CARD, border: `1px solid ${BORDER2}`, borderRadius: 14, padding: 18 } as const
const eyebrow = { fontSize: 10.5, fontWeight: 700, color: FAINT, textTransform: 'uppercase' as const, letterSpacing: 1 }

function Ring({ pct, size, stroke, label, sub }: { pct: number; size: number; stroke: number; label: string; sub?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, dash = (pct / 100) * c
  const id = `g${Math.round(pct)}${size}`
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7c5cff" /><stop offset="100%" stopColor="#4f8cff" /></linearGradient></defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="49%" textAnchor="middle" dominantBaseline="central" style={{ fontFamily: FONT, fontSize: size * 0.26, fontWeight: 800, fill: '#fff' }}>{label}</text>
      {sub && <text x="50%" y="66%" textAnchor="middle" dominantBaseline="central" style={{ fontFamily: FONT, fontSize: size * 0.12, fill: MUTED }}>{sub}</text>}
    </svg>
  )
}
function Bar({ pct, color = '#7c5cff' }: { pct: number; color?: string }) {
  return <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}><div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', borderRadius: 4, background: color }} /></div>
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
        <linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(124,92,255,0.35)" /><stop offset="100%" stopColor="rgba(124,92,255,0)" /></linearGradient>
        <linearGradient id="st" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#5b8cff" /><stop offset="100%" stopColor="#a78bfa" /></linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((g) => (<g key={g}><line x1={44} y1={Y(g)} x2={W - 10} y2={Y(g)} stroke="rgba(255,255,255,0.06)" /><text x={32} y={Y(g) + 3} textAnchor="end" style={{ fontFamily: FONT, fontSize: 9, fill: FAINT }}>{g}</text></g>))}
      <polygon points={area} fill="url(#ar)" />
      <polyline points={line} fill="none" stroke="url(#st)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((v, i) => <circle key={i} cx={X(i)} cy={Y(v)} r={2.8} fill="#a78bfa" />)}
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
  const m = PORTAL[lang].mon
  const [tab, setTab] = useState<Tab>('overview')
  const { restaurant, score, mentionedPct, consensus, confidence, scoreComponents, competitors, modelBreakdown, recommendations, website, history, insight, reliabilityBand, reliabilityPct, intel } = data
  const hasIntel = !!intel?.ready
  const isPaid = restaurant.plan === 'audit' || restaurant.plan === 'implementation'

  const nav: { key: Tab; icon: typeof Home; label: string }[] = [
    { key: 'overview', icon: Home, label: t.nav[0] },
    ...(hasIntel ? [{ key: 'opportunities' as Tab, icon: Target, label: m.oppTitle }, { key: 'benchmarks' as Tab, icon: BarChart3, label: m.cmpTitle }] : []),
    { key: 'score', icon: Gauge, label: t.nav[1] },
    { key: 'mentions', icon: Bot, label: hasIntel ? m.provTitle : t.nav[2] },
    { key: 'competitors', icon: Users, label: t.nav[3] },
    { key: 'recommendations', icon: ListChecks, label: t.nav[4] },
    { key: 'website', icon: Globe, label: t.nav[5] },
    ...(hasIntel ? [{ key: 'industry' as Tab, icon: Newspaper, label: m.indTitle }] : []),
    { key: 'trends', icon: TrendingUp, label: hasIntel ? m.histTitle : t.nav[6] },
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
        <aside style={{ ...cardBox, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 16 }}>
          {nav.map(({ key, icon: Icon, label }) => {
            const active = tab === key
            return (
              <button key={key} onClick={() => setTab(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 9, fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#fff' : MUTED, background: active ? 'rgba(124,92,255,0.16)' : 'transparent', border: active ? '1px solid rgba(124,92,255,0.3)' : '1px solid transparent', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                <Icon style={{ width: 15, height: 15, color: active ? '#a78bfa' : FAINT }} /> {label}
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

          {tab === 'opportunities' && intel && (
            isPaid
              ? <OpportunitiesSection opps={intel.opportunities} m={m} full />
              : <LockedOr m={m} preview={<OpportunitiesSection opps={intel.opportunities.slice(0, 1)} m={m} />} />
          )}

          {tab === 'benchmarks' && intel && (
            isPaid
              ? <CompareSection benchmarks={intel.benchmarks} you={intel.current.score} yourRec={intel.current.recRate} m={m} />
              : <LockedOr m={m} />
          )}

          {tab === 'industry' && intel && (
            isPaid
              ? <IndustrySection industry={intel.industry} research={intel.research} m={m} />
              : <LockedOr m={m} />
          )}

          {tab === 'score' && (
            <div style={cardBox}>
              <div style={eyebrow}>{t.scoreTitle}</div>
              <div style={{ display: 'flex', gap: 18, alignItems: 'center', margin: '12px 0 20px' }}>
                <Ring pct={score ?? 0} size={120} stroke={12} label={String(score ?? '—')} sub="/100" />
                <div>
                  {score != null && <span style={{ fontSize: 12, fontWeight: 800, color: bandColor(score), background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, padding: '4px 11px', borderRadius: 7 }}>{scoreBand(score, t)}</span>}
                  <p style={{ fontSize: 13.5, color: MUTED, marginTop: 10, maxWidth: 380, lineHeight: 1.5 }}>{t.scoreLong(confidence ?? '—')}</p>
                </div>
              </div>
              <div style={{ ...eyebrow, marginBottom: 10 }}>{t.breaksDown}</div>
              <div style={{ display: 'grid', gap: 12 }}>
                {scoreComponents.length === 0 ? <p style={{ fontSize: 13, color: FAINT }}>{t.breakdownNA}</p> : scoreComponents.map((c) => (
                  <div key={c.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: INK }}>{c.label} <span style={{ color: FAINT }}>· {c.weight}% {t.weight}</span></span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: bandColor(c.score) }}>{c.score}/100</span>
                    </div>
                    <Bar pct={c.score} color={bandColor(c.score)} />
                    {c.detail && <p style={{ fontSize: 11.5, color: FAINT, marginTop: 5 }}>{c.detail}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'mentions' && (
            hasIntel && intel && intel.providers.length > 0 && isPaid ? (
              <ProviderBreakdown providers={intel.providers} m={m} />
            ) : (
            <div style={cardBox}>
              <div style={eyebrow}>{t.mentionsTitle}</div>
              <p style={{ fontSize: 13, color: MUTED, margin: '8px 0 16px' }}>{t.mentionsSub(consensus)}</p>
              <div style={{ display: 'grid', gap: 14 }}>
                {modelBreakdown.map((mb) => (
                  <div key={mb.model}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13.5, color: INK, fontWeight: 600 }}>{ML[mb.model] ?? mb.model}</span>
                      <span style={{ fontSize: 13, color: MUTED }}>{Math.round(mb.frequency * 100)}% · {mb.mentions} {mb.mentions === 1 ? t.mentionOne : t.mentionMany}{mb.avg_position != null ? ` · ${t.avgPos} ${mb.avg_position.toFixed(1)}` : ''}</span>
                    </div>
                    <Bar pct={mb.frequency * 100} color={mb.mentions > 0 ? '#7c5cff' : 'rgba(255,255,255,0.15)'} />
                  </div>
                ))}
              </div>
            </div>
            )
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
                  {r.why && <p style={{ fontSize: 13, color: '#cfd2e0', lineHeight: 1.5, marginBottom: 8 }}>{r.why}</p>}
                  {(r.evidence || r.benchmark) && <div style={{ fontSize: 12, color: '#a78bfa', background: 'rgba(124,92,255,0.08)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 11px' }}>{r.benchmark || r.evidence}{r.data_source ? ` · ${r.data_source}` : ''}</div>}
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
              <div style={eyebrow}>{hasIntel ? m.histTitle : t.overTime}</div>
              <TrendChart history={history} lang={lang} t={t} />
              {hasIntel && intel && intel.history.length > 0 && <AnnotatedHistory history={intel.history} m={m} lang={lang} />}
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
  const m = PORTAL[lang].mon
  const { score, mentionedPct, consensus, competitors, insight, reliabilityBand, reliabilityPct, history, intel, restaurant } = data
  const hasIntel = !!intel?.ready
  const isPaid = restaurant.plan === 'audit' || restaurant.plan === 'implementation'
  return (
    <>
      {hasIntel && intel && (
        <>
          <MonitoringHero intel={intel} lang={lang} m={m} />
          <ChangesSection changes={intel.changes} m={m} />
          {isPaid ? (
            <>
              {intel.opportunities.length > 0 && <OpportunitiesSection opps={intel.opportunities.slice(0, 3)} m={m} />}
              {intel.benchmarks.length > 0 && <CompareSection benchmarks={intel.benchmarks} you={intel.current.score} yourRec={intel.current.recRate} m={m} />}
              {intel.industry.length > 0 && <IndustrySection industry={intel.industry.slice(0, 3)} research={intel.research} m={m} />}
            </>
          ) : (
            <>
              {intel.opportunities.length > 0 && <OpportunitiesSection opps={intel.opportunities.slice(0, 1)} m={m} />}
              <LockedTeaser m={m} />
            </>
          )}
        </>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr 1fr', gap: 14 }}>
        <div style={cardBox}>
          <div style={eyebrow}>{t.scoreTitle}</div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 10 }}>
            <Ring pct={score ?? 0} size={104} stroke={11} label={String(score ?? '—')} sub="/100" />
            <div>
              {score != null && <span style={{ fontSize: 11, fontWeight: 800, color: bandColor(score), background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, padding: '3px 9px', borderRadius: 6 }}>{scoreBand(score, t)}</span>}
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
            <div style={{ ...cardBox, background: 'linear-gradient(135deg, rgba(124,92,255,0.16), rgba(79,124,255,0.06))', border: '1px solid rgba(124,92,255,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, ...eyebrow, color: '#a78bfa' }}><Sparkles style={{ width: 13, height: 13 }} /> {t.keyInsight}</div>
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

// ── Monitoring sections (deterministic, warehouse-backed) ────────────────────
const trendIcon = (d: 'up' | 'down' | 'flat') => d === 'up' ? ArrowUp : d === 'down' ? ArrowDown : Minus
const trendColor = (d: 'up' | 'down' | 'flat') => d === 'up' ? GREEN : d === 'down' ? RED : FAINT
const fmtDate = (iso: string, lang: Language) => new Date(iso).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

function changeText(c: Change, m: Mon): string {
  switch (c.kind) {
    case 'visibility': return c.dir === 'up' ? m.chg.visUp(c.value ?? 0) : m.chg.visDown(c.value ?? 0)
    case 'provider': return c.dir === 'up' ? m.chg.provUp(c.subject ?? '') : m.chg.provDown(c.subject ?? '')
    case 'signal': return c.dir === 'up' ? m.chg.sigUp(c.subject ?? '') : m.chg.sigDown(c.subject ?? '')
    case 'mention': return c.dir === 'up' ? m.chg.menUp(c.value ?? 0) : m.chg.menDown(c.value ?? 0)
    default: return c.subject ?? ''
  }
}

function DeltaPill({ value, suffix }: { value: number; suffix?: string }) {
  const up = value > 0, flat = value === 0
  const color = flat ? FAINT : up ? GREEN : RED
  const Icon = flat ? Minus : up ? ArrowUp : ArrowDown
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700, color, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: 7, padding: '4px 9px' }}>
      <Icon style={{ width: 12, height: 12 }} />{up ? '+' : ''}{value}{suffix}
    </span>
  )
}

function MonitoringHero({ intel, lang, m }: { intel: RestaurantIntel; lang: Language; m: Mon }) {
  const score = intel.current.score
  return (
    <div style={{ ...cardBox, padding: 20 }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <Ring pct={score ?? 0} size={104} stroke={11} label={String(score ?? '—')} sub="/100" />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {intel.deltas.sinceLast != null && <DeltaPill value={intel.deltas.sinceLast} />}
            {intel.deltas.monthly != null && <span style={{ fontSize: 11.5, color: FAINT, alignSelf: 'center' }}>{m.monthly(intel.deltas.monthly)}</span>}
          </div>
          {intel.providers.length > 0 && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
              {intel.providers.map((p) => { const Icon = trendIcon(p.trend); return (
                <span key={p.provider} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: INK }}>
                  {p.provider} <Icon style={{ width: 13, height: 13, color: trendColor(p.trend) }} />
                </span>
              ) })}
            </div>
          )}
          <div style={{ fontSize: 11.5, color: FAINT }}>
            {intel.current.auditedAt ? m.lastUpdated(fmtDate(intel.current.auditedAt, lang)) : ''} · {m.runs(intel.auditCount)}
          </div>
        </div>
      </div>
    </div>
  )
}

function ChangesSection({ changes, m }: { changes: Change[]; m: Mon }) {
  return (
    <div style={cardBox}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, ...eyebrow, color: '#a78bfa' }}><Activity style={{ width: 13, height: 13 }} /> {m.changedTitle}</div>
      {changes.length === 0 ? (
        <p style={{ fontSize: 13, color: FAINT, lineHeight: 1.6, marginTop: 10 }}>{m.changedEmpty}</p>
      ) : (
        <div style={{ display: 'grid', gap: 2, marginTop: 10 }}>
          {changes.map((c, i) => { const Icon = trendIcon(c.dir === 'neutral' ? 'flat' : c.dir); return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < changes.length - 1 ? `1px solid ${BORDER2}` : 'none' }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: c.positive ? 'rgba(52,211,153,0.15)' : 'rgba(251,113,133,0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ width: 12, height: 12, color: c.positive ? GREEN : RED }} />
              </span>
              <span style={{ fontSize: 13.5, color: INK }}>{changeText(c, m)}</span>
            </div>
          ) })}
        </div>
      )}
    </div>
  )
}

function OpportunitiesSection({ opps, m, full }: { opps: Opportunity[]; m: Mon; full?: boolean }) {
  return (
    <div style={cardBox}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, ...eyebrow }}><Target style={{ width: 13, height: 13, color: FAINT }} /> {m.oppTitle}</div>
      <p style={{ fontSize: 12.5, color: MUTED, margin: '7px 0 14px' }}>{m.oppSub}</p>
      {opps.length === 0 ? <p style={{ fontSize: 13, color: FAINT }}>{m.oppEmpty}</p> : (
        <div style={{ display: 'grid', gap: 12 }}>
          {opps.map((o) => (
            <div key={o.key} style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${BORDER2}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: INK }}>{o.label}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: GREEN }}>+{o.expectedGainPct}%</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginTop: 12 }}>
                <Metric label={m.oppGain} value={`+${o.expectedGainPct}%`} />
                <Metric label={m.oppConf} value={`${Math.round(o.confidence * 100)}%`} />
                <Metric label={m.oppMeasured} value={o.measured.toLocaleString()} />
                <Metric label={m.oppDiff} value={m.diff[o.difficulty] ?? o.difficulty} />
                <Metric label={m.oppEst} value={m.mins(o.minutes)} />
              </div>
            </div>
          ))}
        </div>
      )}
      {!full && opps.length > 0 && <p style={{ fontSize: 11, color: FAINT, marginTop: 10 }}>{m.oppMeasured} · {m.oppSub}</p>}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, color: INK }}>{value}</div>
      <div style={{ fontSize: 10.5, color: FAINT, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function CompareSection({ benchmarks, you, yourRec, m }: { benchmarks: BenchmarkRow[]; you: number | null; yourRec: number | null; m: Mon }) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {benchmarks.map((b) => {
        const top = Math.max(b.top10 ?? 0, you ?? 0, b.avg ?? 0, 100)
        const rows: { label: string; val: number | null; color: string }[] = [
          { label: m.cmpAvg, val: b.avg, color: FAINT },
          { label: m.cmpYou, val: you, color: '#7c5cff' },
          { label: m.cmpTop10, val: b.top10, color: GREEN },
        ]
        return (
          <div key={`${b.scope}-${b.key}`} style={cardBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={eyebrow}>{m.scope[b.scope] ?? b.scope}{b.scope !== 'overall' ? ` · ${b.key}` : ''}</div>
              <span style={{ fontSize: 11, color: FAINT }}>n={b.n}</span>
            </div>
            <div style={{ display: 'grid', gap: 9, marginTop: 12 }}>
              {rows.map((r) => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12.5, color: r.label === m.cmpYou ? INK : MUTED, width: 96, fontWeight: r.label === m.cmpYou ? 700 : 400 }}>{r.label}</span>
                  <div style={{ flex: 1 }}><Bar pct={r.val == null ? 0 : (r.val / top) * 100} color={r.color} /></div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: r.color === FAINT ? MUTED : r.color, width: 30, textAlign: 'right' }}>{r.val ?? '—'}</span>
                </div>
              ))}
            </div>
            {(b.recRate != null || yourRec != null) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: `1px solid ${BORDER2}`, fontSize: 12 }}>
                <span style={{ color: FAINT }}>{m.cmpRec}: <span style={{ color: MUTED, fontWeight: 600 }}>{b.recRate != null ? `${Math.round(b.recRate * 100)}%` : '—'}</span></span>
                <span style={{ color: FAINT }}>{m.cmpYourRec}: <span style={{ color: INK, fontWeight: 700 }}>{yourRec != null ? `${Math.round(yourRec * 100)}%` : '—'}</span></span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ProviderBreakdown({ providers, m }: { providers: ProviderDetail[]; m: Mon }) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={cardBox}>
        <div style={eyebrow}>{m.provTitle}</div>
        <p style={{ fontSize: 13, color: MUTED, margin: '7px 0 0' }}>{m.provSub}</p>
      </div>
      {providers.map((p) => { const Icon = trendIcon(p.trend); return (
        <div key={p.provider} style={cardBox}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>{p.provider}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: trendColor(p.trend) }}>
              <Icon style={{ width: 13, height: 13 }} /> {m.provTrend[p.trend]}{p.driftPts !== 0 ? ` (${p.driftPts > 0 ? '+' : ''}${p.driftPts}pts)` : ''}
            </span>
          </div>
          <Bar pct={p.latestRate * 100} color={p.latestRate > 0 ? '#7c5cff' : 'rgba(255,255,255,0.15)'} />
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, fontSize: 12, color: FAINT }}>
            <span>{Math.round(p.latestRate * 100)}% · {m.provResponses(p.responses)}</span>
            {p.avgPosition != null && <span>{m.provAvgPos} {p.avgPosition.toFixed(1)}</span>}
            <span>{m.provStability} {(100 - Math.round(p.stability * 100))}%</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ ...eyebrow, marginBottom: 6 }}>{m.provCites}</div>
            {p.citations.length === 0 ? <p style={{ fontSize: 12, color: FAINT }}>{m.provNoCites}</p> : (
              <div style={{ display: 'grid', gap: 4 }}>
                {p.citations.map((c) => (
                  <div key={c.domain} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: MUTED }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.domain} <span style={{ color: FAINT }}>({c.type})</span></span>
                    <span style={{ fontWeight: 700, color: INK }}>{c.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) })}
    </div>
  )
}

function IndustrySection({ industry, research, m }: { industry: Finding[]; research: Finding[]; m: Mon }) {
  const fText = (f: Finding) => f.kind === 'trend'
    ? (f.dir === 'up' ? m.find.trendUp(f.metricPct) : m.find.trendDown(f.metricPct))
    : (f.dir === 'up' ? m.find.corrUp(f.metricPct, f.subject) : m.find.corrDown(f.metricPct, f.subject))
  const Row = (f: Finding) => (
    <div key={f.id} style={{ display: 'flex', gap: 10, padding: '11px 0', borderBottom: `1px solid ${BORDER2}` }}>
      <span style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(124,92,255,0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Zap style={{ width: 12, height: 12, color: '#a78bfa' }} />
      </span>
      <div>
        <p style={{ fontSize: 13.5, color: INK, lineHeight: 1.45, margin: 0 }}>{fText(f)}</p>
        <p style={{ fontSize: 11, color: FAINT, margin: '3px 0 0' }}>{m.findMeta(f.measured, f.confidence)}</p>
      </div>
    </div>
  )
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={cardBox}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, ...eyebrow, color: '#a78bfa' }}><Newspaper style={{ width: 13, height: 13 }} /> {m.indTitle}</div>
        <p style={{ fontSize: 12.5, color: MUTED, margin: '7px 0 8px' }}>{m.indSub}</p>
        {industry.length === 0 ? <p style={{ fontSize: 13, color: FAINT }}>{m.indEmpty}</p> : <div>{industry.map(Row)}</div>}
      </div>
      {research.length > 0 && (
        <div style={cardBox}>
          <div style={eyebrow}>{m.resTitle}</div>
          <div style={{ marginTop: 6 }}>{research.map(Row)}</div>
        </div>
      )}
    </div>
  )
}

function AnnotatedHistory({ history, m, lang }: { history: HistoryPoint[]; m: Mon; lang: Language }) {
  const withEvents = [...history].reverse().filter((h) => h.events.length > 0 || h.delta != null)
  if (withEvents.length === 0) return null
  return (
    <div style={{ marginTop: 16, borderTop: `1px solid ${BORDER2}`, paddingTop: 14 }}>
      <div style={{ ...eyebrow, marginBottom: 10 }}>{m.histTitle}</div>
      <div style={{ display: 'grid', gap: 0 }}>
        {withEvents.map((h, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: i < withEvents.length - 1 ? `1px solid ${BORDER2}` : 'none' }}>
            <span style={{ fontSize: 12, color: FAINT, width: 92, flexShrink: 0 }}>{fmtDate(h.date, lang)}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: INK, width: 64 }}>{h.score}/100</span>
            {h.delta != null && h.delta !== 0 && <span style={{ flexShrink: 0 }}><DeltaPill value={h.delta} /></span>}
            <span style={{ fontSize: 12, color: MUTED, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {h.events.map((e, j) => (
                <span key={j} style={{ fontSize: 11, color: e.kind === 'signal_added' ? GREEN : RED, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '2px 7px' }}>
                  {e.kind === 'signal_added' ? m.histEvent.signal_added(e.label) : m.histEvent.signal_removed(e.label)}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LockedTeaser({ m }: { m: Mon }) {
  return (
    <div style={{ ...cardBox, background: 'linear-gradient(135deg, rgba(124,92,255,0.12), rgba(79,124,255,0.04))', border: '1px solid rgba(124,92,255,0.22)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, ...eyebrow, color: '#a78bfa' }}><Lock style={{ width: 13, height: 13 }} /> {m.upgrade}</div>
      <p style={{ fontSize: 13, color: MUTED, margin: '8px 0 12px' }}>{m.lockedBody}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
        {m.locked.map((l) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: MUTED }}>
            <Check style={{ width: 13, height: 13, color: '#a78bfa', flexShrink: 0 }} /> {l}
          </div>
        ))}
      </div>
    </div>
  )
}

function LockedOr({ m, preview }: { m: Mon; preview?: ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {preview}
      <LockedTeaser m={m} />
    </div>
  )
}
