import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/client'
import { readCustomerSession, CUSTOMER_COOKIE } from '@/lib/auth/customer'
import { loadObservations, computePatterns, patternEvidence } from '@/lib/observations'
import { LogoutButton } from '@/components/portal/logout-button'
import {
  Home, Gauge, Bot, Users, ListChecks, Globe, TrendingUp, FileDown,
  Sparkles, ArrowLeft, ExternalLink,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const BG = '#070711', CARD = 'rgba(255,255,255,0.035)', BORDER = 'rgba(255,255,255,0.09)', BORDER2 = 'rgba(255,255,255,0.06)'
const INK = '#f4f5fa', MUTED = '#9a9fb6', FAINT = '#646a85', GREEN = '#34d399'
const GRAD = 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)'
const FONT = 'var(--font-inter), sans-serif'

function scoreBand(n: number) { return n >= 60 ? 'Good' : n >= 30 ? 'Fair' : 'Needs work' }
function bandColor(n: number) { return n >= 60 ? GREEN : n >= 30 ? '#fbbf24' : '#fb7185' }

function Ring({ pct, size, stroke, label, sub }: { pct: number; size: number; stroke: number; label: string; sub?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, dash = (pct / 100) * c
  const id = `g${Math.round(pct)}${size}`
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7c5cff" /><stop offset="100%" stopColor="#4f8cff" /></linearGradient></defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="49%" textAnchor="middle" dominantBaseline="central" style={{ fontFamily: FONT, fontSize: size * 0.26, fontWeight: 800, fill: '#fff' }}>{label}</text>
      {sub && <text x="50%" y="66%" textAnchor="middle" dominantBaseline="central" style={{ fontFamily: FONT, fontSize: size * 0.12, fill: MUTED }}>{sub}</text>}
    </svg>
  )
}

async function getData(id: string, cid: string) {
  const { data: link } = await supabaseAdmin.from('customer_restaurants').select('id').eq('customer_user_id', cid).eq('restaurant_id', id).maybeSingle()
  if (!link) return null
  const { data: restaurant } = await supabaseAdmin.from('restaurants').select('id, name, city, cuisine, preview_slug, plan').eq('id', id).single()
  if (!restaurant) return null

  const { data: audit } = await supabaseAdmin
    .from('audits').select('id, reliability, created_at').eq('restaurant_id', id).eq('status', 'completed')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  let vs: any = null, competitors: any[] = [], mentionedBy: Record<string, boolean> = {}
  if (audit) {
    const [{ data: v }, { data: comps }, { data: ms }] = await Promise.all([
      supabaseAdmin.from('visibility_scores').select('visibility_score, mention_frequency, model_consensus, confidence_score').eq('audit_id', audit.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('competitors').select('name, mention_count').eq('audit_id', audit.id).order('mention_count', { ascending: false }).limit(5),
      supabaseAdmin.from('mentions').select('model, mentioned').eq('audit_id', audit.id),
    ])
    vs = v; competitors = comps ?? []
    for (const m of ms ?? []) if (m.mentioned) mentionedBy[m.model] = true
  }
  const { data: history } = await supabaseAdmin
    .from('score_history').select('visibility_score, snapshot_date').eq('restaurant_id', id).order('snapshot_date', { ascending: true }).limit(24)

  let insight: string | null = null
  try {
    const patterns = computePatterns(await loadObservations())
    if (patterns[0]) insight = patternEvidence(patterns[0], 'en')
  } catch { /* no insight yet */ }

  return { restaurant, audit, vs, competitors, mentionedBy, history: history ?? [], insight }
}

export default async function CustomerRestaurantDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await readCustomerSession((await cookies()).get(CUSTOMER_COOKIE)?.value)
  if (!session) redirect('/portal/login')
  const data = await getData(id, session.cid)
  if (!data) notFound()

  const { restaurant, audit, vs, competitors, mentionedBy, history, insight } = data
  const score = vs?.visibility_score != null ? Math.round(Number(vs.visibility_score)) : null
  const mentionedPct = vs?.mention_frequency != null ? Math.round(Number(vs.mention_frequency) * 100) : null
  const consensus = vs?.model_consensus ?? Object.values(mentionedBy).filter(Boolean).length
  const reliabilityBand = (audit?.reliability as { band?: string; completionRate?: number } | null)?.band ?? null
  const reliabilityPct = audit?.reliability ? Math.round((Number((audit.reliability as any).completionRate ?? 0)) * 100) : null

  const cardBox = { background: CARD, border: `1px solid ${BORDER2}`, borderRadius: 14, padding: 18 } as const
  const eyebrow = { fontSize: 10.5, fontWeight: 700, color: FAINT, textTransform: 'uppercase' as const, letterSpacing: 1 }

  const nav = [
    { icon: Home, label: 'Overview', active: true },
    { icon: Gauge, label: 'AI Visibility Score' },
    { icon: Bot, label: 'AI Mentions' },
    { icon: Users, label: 'Competitors' },
    { icon: ListChecks, label: 'Recommendations' },
    { icon: Globe, label: 'Website Audit' },
    { icon: TrendingUp, label: 'Trends (Beta)' },
  ]

  // Visibility-over-time chart geometry
  const pts = history.map((h) => Number(h.visibility_score)).filter((n) => Number.isFinite(n))
  const W = 520, hPlot = 130, top = 18, bottom = top + hPlot
  const X = (i: number) => pts.length <= 1 ? W / 2 : 44 + i * ((W - 70) / (pts.length - 1))
  const Y = (v: number) => bottom - (v / 100) * hPlot
  const line = pts.map((v, i) => `${X(i)},${Y(v)}`).join(' ')
  const area = pts.length > 1 ? `${line} ${X(pts.length - 1)},${bottom} ${X(0)},${bottom}` : ''

  return (
    <div style={{ minHeight: '100vh', background: BG, color: INK, fontFamily: FONT }}>
      <nav style={{ borderBottom: `1px solid ${BORDER}`, padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: MUTED, textDecoration: 'none', fontSize: 13.5, fontWeight: 600 }}>
          <ArrowLeft style={{ width: 15, height: 15 }} /> All restaurants
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, color: FAINT }}>{session.email}</span>
          <LogoutButton />
        </div>
      </nav>

      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 24 }}>
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: 'clamp(22px,3vw,28px)', fontWeight: 800, letterSpacing: -0.8 }}>{restaurant.name}</h1>
          <p style={{ fontSize: 14, color: MUTED, marginTop: 2 }}>
            {[restaurant.city, restaurant.cuisine].filter(Boolean).join(' · ') || '—'}
            {audit ? ` · audited ${new Date(audit.created_at).toLocaleDateString()}` : ''}
          </p>
        </div>

        {!audit || !vs ? (
          <div style={{ ...cardBox, padding: 40, textAlign: 'center' }}>
            <Gauge style={{ width: 34, height: 34, color: FAINT, margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Your audit is being prepared</h2>
            <p style={{ fontSize: 14, color: MUTED, maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>As soon as your AI Visibility audit completes, your score, competitors and recommendations appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,210px) 1fr', gap: 18, alignItems: 'start' }}>
            {/* Sidebar */}
            <aside style={{ ...cardBox, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {nav.map(({ icon: Icon, label, active }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 9, fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#fff' : MUTED, background: active ? 'rgba(124,92,255,0.16)' : 'transparent', border: active ? '1px solid rgba(124,92,255,0.3)' : '1px solid transparent' }}>
                  <Icon style={{ width: 15, height: 15, color: active ? '#a78bfa' : FAINT }} /> {label}
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${BORDER2}`, margin: '10px 0 0', paddingTop: 10 }}>
                {restaurant.preview_slug && (
                  <a href={`/report/${restaurant.preview_slug}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', fontSize: 13, color: MUTED, textDecoration: 'none' }}>
                    <FileDown style={{ width: 15, height: 15, color: FAINT }} /> Full report &amp; PDF
                  </a>
                )}
              </div>
            </aside>

            {/* Main */}
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr 1fr', gap: 14 }}>
                {/* Score */}
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
                {/* Mentioned */}
                <div style={cardBox}>
                  <div style={eyebrow}>Mentioned by AI</div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 10 }}>
                    <Ring pct={mentionedPct ?? 0} size={84} stroke={10} label={`${mentionedPct ?? 0}%`} />
                    <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, margin: 0 }}>You appear in {mentionedPct ?? 0}% of the AI answers we tested. {consensus} of 4 models name you.</p>
                  </div>
                </div>
                {/* Competitors */}
                <div style={cardBox}>
                  <div style={eyebrow}>Top Competitors</div>
                  <div style={{ marginTop: 10, display: 'grid', gap: 2 }}>
                    {competitors.length === 0 ? <p style={{ fontSize: 12, color: FAINT }}>No competitors extracted.</p> : competitors.map((c, i) => (
                      <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 7px', borderRadius: 7 }}>
                        <span style={{ fontSize: 11, color: FAINT, width: 10 }}>{i + 1}</span>
                        <span style={{ fontSize: 12.5, color: INK, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: MUTED }}>{c.mention_count}</span>
                      </div>
                    ))}
                  </div>
                  {restaurant.preview_slug && <a href={`/report/${restaurant.preview_slug}`} style={{ display: 'inline-block', fontSize: 11.5, color: '#a78bfa', fontWeight: 600, marginTop: 10, textDecoration: 'none' }}>View full comparison →</a>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
                {/* Chart */}
                <div style={cardBox}>
                  <div style={eyebrow}>Visibility over time</div>
                  {pts.length > 1 ? (
                    <svg viewBox={`0 0 ${W} 175`} style={{ width: '100%', height: 'auto', marginTop: 8 }}>
                      <defs>
                        <linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(124,92,255,0.35)" /><stop offset="100%" stopColor="rgba(124,92,255,0)" /></linearGradient>
                        <linearGradient id="st" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#5b8cff" /><stop offset="100%" stopColor="#a78bfa" /></linearGradient>
                      </defs>
                      {[0, 25, 50, 75, 100].map((g) => (<g key={g}><line x1={44} y1={Y(g)} x2={W - 10} y2={Y(g)} stroke="rgba(255,255,255,0.06)" /><text x={32} y={Y(g) + 3} textAnchor="end" style={{ fontFamily: FONT, fontSize: 9, fill: FAINT }}>{g}</text></g>))}
                      <polygon points={area} fill="url(#ar)" />
                      <polyline points={line} fill="none" stroke="url(#st)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                      {pts.map((v, i) => <circle key={i} cx={X(i)} cy={Y(v)} r={2.6} fill="#a78bfa" />)}
                      {history.map((h, i) => i % Math.ceil(history.length / 6 || 1) === 0 && <text key={i} x={X(i)} y={170} textAnchor="middle" style={{ fontFamily: FONT, fontSize: 9, fill: FAINT }}>{new Date(h.snapshot_date).toLocaleDateString(undefined, { month: 'short' })}</text>)}
                    </svg>
                  ) : (
                    <p style={{ fontSize: 13, color: FAINT, marginTop: 12, lineHeight: 1.6 }}>Your visibility over time will appear here as more audits run. Monthly monitoring is coming soon.</p>
                  )}
                </div>
                {/* Insight + reliability */}
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
                      {reliabilityBand && <span style={{ fontSize: 11, fontWeight: 700, color: reliabilityBand === 'green' ? GREEN : reliabilityBand === 'yellow' ? '#fbbf24' : '#fb7185' }}>{reliabilityBand === 'green' ? 'High' : reliabilityBand === 'yellow' ? 'Medium' : 'Low'}</span>}
                    </div>
                    <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.08)', marginTop: 10, overflow: 'hidden' }}>
                      <div style={{ width: `${reliabilityPct ?? 0}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${GREEN}, #6ee7b7)` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
                      <span style={{ fontSize: 10.5, color: FAINT }}>How many AI calls completed</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: INK }}>{reliabilityPct != null ? `${reliabilityPct}%` : '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {restaurant.preview_slug && (
                <a href={`/report/${restaurant.preview_slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'start', background: GRAD, color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px 20px', borderRadius: 11, textDecoration: 'none', boxShadow: '0 14px 30px -14px rgba(99,102,241,0.7)' }}>
                  Open full report &amp; recommendations <ExternalLink style={{ width: 15, height: 15 }} />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
