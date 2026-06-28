'use client'

import { useState } from 'react'
import {
  Home, Gauge, Bot, Users, ListChecks, Globe, TrendingUp, FileDown,
  Sparkles, ExternalLink, Check, X,
} from 'lucide-react'

const CARD = 'rgba(255,255,255,0.035)', BORDER2 = 'rgba(255,255,255,0.06)', BORDER = 'rgba(255,255,255,0.09)'
const INK = '#f4f5fa', MUTED = '#9a9fb6', FAINT = '#646a85', GREEN = '#34d399', AMBER = '#fbbf24', RED = '#fb7185'
const GRAD = 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)'
const FONT = 'var(--font-inter), sans-serif'
const ML: Record<string, string> = { openai: 'ChatGPT', anthropic: 'Claude', gemini: 'Gemini', perplexity: 'Perplexity' }

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
const scoreBand = (n: number) => n >= 60 ? 'Good' : n >= 30 ? 'Fair' : 'Needs work'
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

function TrendChart({ history }: { history: { visibility_score: number; snapshot_date: string }[] }) {
  const pts = history.map((h) => h.visibility_score).filter((n) => Number.isFinite(n))
  if (pts.length < 2) return <p style={{ fontSize: 13, color: FAINT, marginTop: 12, lineHeight: 1.6 }}>Your visibility over time will appear here as more audits run. Monthly monitoring is coming soon.</p>
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
      {history.map((h, i) => i % step === 0 ? <text key={i} x={X(i)} y={190} textAnchor="middle" style={{ fontFamily: FONT, fontSize: 9, fill: FAINT }}>{new Date(h.snapshot_date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}</text> : null)}
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
const rankLabel = (r: string | null) => r === 'do_first' ? 'Do first' : r === 'optional' ? 'Optional' : 'Do next'

export function RestaurantDashboard({ data }: { data: DashboardData }) {
  const [tab, setTab] = useState<Tab>('overview')
  const { restaurant, score, mentionedPct, consensus, confidence, scoreComponents, competitors, modelBreakdown, recommendations, website, history, insight, reliabilityBand, reliabilityPct } = data

  const nav: { key: Tab; icon: typeof Home; label: string }[] = [
    { key: 'overview', icon: Home, label: 'Overview' },
    { key: 'score', icon: Gauge, label: 'AI Visibility Score' },
    { key: 'mentions', icon: Bot, label: 'AI Mentions' },
    { key: 'competitors', icon: Users, label: 'Competitors' },
    { key: 'recommendations', icon: ListChecks, label: 'Recommendations' },
    { key: 'website', icon: Globe, label: 'Website Audit' },
    { key: 'trends', icon: TrendingUp, label: 'Trends (Beta)' },
  ]

  if (!data.ready) {
    return (
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 24 }}>
        <Header data={data} />
        <div style={{ ...cardBox, padding: 40, textAlign: 'center' }}>
          <Gauge style={{ width: 34, height: 34, color: FAINT, margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Your audit is being prepared</h2>
          <p style={{ fontSize: 14, color: MUTED, maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>As soon as your AI Visibility audit completes, your score, competitors and recommendations appear here.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: 24 }}>
      <Header data={data} />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,210px) 1fr', gap: 18, alignItems: 'start' }}>
        {/* Sidebar */}
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
              <FileDown style={{ width: 15, height: 15, color: FAINT }} /> Full report &amp; PDF
            </a>
          )}
        </aside>

        {/* Content */}
        <div style={{ display: 'grid', gap: 14 }}>
          {tab === 'overview' && <Overview data={data} />}

          {tab === 'score' && (
            <div style={cardBox}>
              <div style={eyebrow}>AI Visibility Score</div>
              <div style={{ display: 'flex', gap: 18, alignItems: 'center', margin: '12px 0 20px' }}>
                <Ring pct={score ?? 0} size={120} stroke={12} label={String(score ?? '—')} sub="/100" />
                <div>
                  {score != null && <span style={{ fontSize: 12, fontWeight: 800, color: bandColor(score), background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, padding: '4px 11px', borderRadius: 7 }}>{scoreBand(score)}</span>}
                  <p style={{ fontSize: 13.5, color: MUTED, marginTop: 10, maxWidth: 380, lineHeight: 1.5 }}>A weighted measure of how visible you are in AI recommendations. Confidence {confidence ?? '—'}% — based on how much data backed this audit.</p>
                </div>
              </div>
              <div style={{ ...eyebrow, marginBottom: 10 }}>How it breaks down</div>
              <div style={{ display: 'grid', gap: 12 }}>
                {scoreComponents.length === 0 ? <p style={{ fontSize: 13, color: FAINT }}>Breakdown not available.</p> : scoreComponents.map((c) => (
                  <div key={c.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: INK }}>{c.label} <span style={{ color: FAINT }}>· {c.weight}% weight</span></span>
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
            <div style={cardBox}>
              <div style={eyebrow}>AI Mentions — by model</div>
              <p style={{ fontSize: 13, color: MUTED, margin: '8px 0 16px' }}>How often each assistant named you across the prompts we tested. {consensus} of 4 models mention you.</p>
              <div style={{ display: 'grid', gap: 14 }}>
                {modelBreakdown.map((m) => (
                  <div key={m.model}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13.5, color: INK, fontWeight: 600 }}>{ML[m.model] ?? m.model}</span>
                      <span style={{ fontSize: 13, color: MUTED }}>{Math.round(m.frequency * 100)}% · {m.mentions} mention{m.mentions === 1 ? '' : 's'}{m.avg_position != null ? ` · avg pos ${m.avg_position.toFixed(1)}` : ''}</span>
                    </div>
                    <Bar pct={m.frequency * 100} color={m.mentions > 0 ? '#7c5cff' : 'rgba(255,255,255,0.15)'} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'competitors' && (
            <div style={cardBox}>
              <div style={eyebrow}>Competitors recommended by AI</div>
              <p style={{ fontSize: 13, color: MUTED, margin: '8px 0 14px' }}>Restaurants the assistants named, by how many times they appeared.</p>
              {competitors.length === 0 ? <p style={{ fontSize: 13, color: FAINT }}>No competitors were extracted from this audit.</p> : (
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
                <div style={cardBox}><p style={{ fontSize: 13, color: FAINT }}>Recommendations appear here once generated for this audit.</p></div>
              ) : recommendations.map((r, i) => (
                <div key={i} style={cardBox}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: rankColor(r.priority_rank), background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, padding: '3px 8px', borderRadius: 6 }}>{rankLabel(r.priority_rank)}</span>
                    {r.confidence && <span style={{ fontSize: 10.5, color: FAINT }}>confidence: {r.confidence}</span>}
                    {r.impact_level && <span style={{ fontSize: 10.5, color: FAINT }}>· impact: {r.impact_level}</span>}
                    {r.effort && <span style={{ fontSize: 10.5, color: FAINT }}>· effort: {r.effort}</span>}
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
              <div style={eyebrow}>Website signals for AI</div>
              <p style={{ fontSize: 13, color: MUTED, margin: '8px 0 8px' }}>What AI crawlers can read on your site — the building blocks of being understood and recommended.</p>
              {!website ? <p style={{ fontSize: 13, color: FAINT }}>No website audit available.</p> : (
                <div>
                  <SigRow label="Restaurant schema (Schema.org)" present={website.schema_present} note={website.schema_types.length ? website.schema_types.slice(0, 3).join(', ') : undefined} />
                  <SigRow label="Crawlable menu" present={website.menu_present} note={website.menu_format ? website.menu_format.toUpperCase() : undefined} />
                  <SigRow label="Opening hours" present={website.opening_hours_present} />
                  <SigRow label="Reservation link" present={website.reservation_present} />
                  <SigRow label="FAQ content" present={website.faq_present} />
                  <SigRow label="Review signals" present={website.reviews_present} />
                  <SigRow label="Clear location" present={website.location_present} />
                  <SigRow label="Social links" present={website.social_present} />
                  {website.meta_title && <p style={{ fontSize: 11.5, color: FAINT, marginTop: 12 }}>Meta title: <span style={{ color: MUTED }}>{website.meta_title}</span></p>}
                </div>
              )}
            </div>
          )}

          {tab === 'trends' && (
            <div style={cardBox}>
              <div style={eyebrow}>Visibility over time</div>
              <TrendChart history={history} />
            </div>
          )}

          {restaurant.preview_slug && (
            <a href={`/report/${restaurant.preview_slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'start', background: GRAD, color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px 20px', borderRadius: 11, textDecoration: 'none', boxShadow: '0 14px 30px -14px rgba(99,102,241,0.7)' }}>
              Open full report &amp; recommendations <ExternalLink style={{ width: 15, height: 15 }} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function Header({ data }: { data: DashboardData }) {
  const { restaurant, auditedAt } = data
  return (
    <div style={{ marginBottom: 18 }}>
      <h1 style={{ fontSize: 'clamp(22px,3vw,28px)', fontWeight: 800, letterSpacing: -0.8 }}>{restaurant.name}</h1>
      <p style={{ fontSize: 14, color: MUTED, marginTop: 2 }}>
        {[restaurant.city, restaurant.cuisine].filter(Boolean).join(' · ') || '—'}{auditedAt ? ` · audited ${new Date(auditedAt).toLocaleDateString()}` : ''}
      </p>
    </div>
  )
}

function Overview({ data }: { data: DashboardData }) {
  const { score, mentionedPct, consensus, competitors, insight, reliabilityBand, reliabilityPct, history } = data
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr 1fr', gap: 14 }}>
        <div style={cardBox}>
          <div style={eyebrow}>AI Visibility Score</div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 10 }}>
            <Ring pct={score ?? 0} size={104} stroke={11} label={String(score ?? '—')} sub="/100" />
            <div>
              {score != null && <span style={{ fontSize: 11, fontWeight: 800, color: bandColor(score), background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, padding: '3px 9px', borderRadius: 6 }}>{scoreBand(score)}</span>}
              <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, margin: '10px 0 0' }}>How visible you are in AI recommendations today.</p>
            </div>
          </div>
        </div>
        <div style={cardBox}>
          <div style={eyebrow}>Mentioned by AI</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 10 }}>
            <Ring pct={mentionedPct ?? 0} size={84} stroke={10} label={`${mentionedPct ?? 0}%`} />
            <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, margin: 0 }}>You appear in {mentionedPct ?? 0}% of the AI answers we tested. {consensus} of 4 models name you.</p>
          </div>
        </div>
        <div style={cardBox}>
          <div style={eyebrow}>Top Competitors</div>
          <div style={{ marginTop: 10, display: 'grid', gap: 2 }}>
            {competitors.length === 0 ? <p style={{ fontSize: 12, color: FAINT }}>None extracted.</p> : competitors.slice(0, 5).map((c, i) => (
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
          <div style={eyebrow}>Visibility over time</div>
          <TrendChart history={history} />
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          {insight && (
            <div style={{ ...cardBox, background: 'linear-gradient(135deg, rgba(124,92,255,0.16), rgba(79,124,255,0.06))', border: '1px solid rgba(124,92,255,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, ...eyebrow, color: '#a78bfa' }}><Sparkles style={{ width: 13, height: 13 }} /> Key insight</div>
              <p style={{ fontSize: 12.5, color: INK, lineHeight: 1.5, margin: '10px 0 0' }}>{insight}</p>
            </div>
          )}
          <div style={cardBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={eyebrow}>Reliability</div>
              {reliabilityBand && <span style={{ fontSize: 11, fontWeight: 700, color: reliabilityBand === 'green' ? GREEN : reliabilityBand === 'yellow' ? AMBER : RED }}>{reliabilityBand === 'green' ? 'High' : reliabilityBand === 'yellow' ? 'Medium' : 'Low'}</span>}
            </div>
            <div style={{ marginTop: 10 }}><Bar pct={reliabilityPct ?? 0} color={GREEN} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
              <span style={{ fontSize: 10.5, color: FAINT }}>How many AI calls completed</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: INK }}>{reliabilityPct != null ? `${reliabilityPct}%` : '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
