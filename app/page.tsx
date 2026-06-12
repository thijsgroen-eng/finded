import { supabaseAdmin } from '@/lib/supabase/client'
import { computeMetrics } from '@/lib/engine/metrics'
import { notFound } from 'next/navigation'
import { CheckCircle2, XCircle } from 'lucide-react'

async function getReportData(slug: string) {
  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('*')
    .eq('preview_slug', slug)
    .single()

  if (!restaurant) return null

  const { data: audit } = await supabaseAdmin
    .from('audits')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!audit) return null

  const [
    { data: mentions },
    { data: websiteAudit },
    { data: visibilityScore },
    { data: competitors },
  ] = await Promise.all([
    supabaseAdmin.from('mentions').select('model, prompt_id, mentioned, position, sentiment').eq('audit_id', audit.id),
    supabaseAdmin.from('website_audits').select('*').eq('audit_id', audit.id).single(),
    supabaseAdmin.from('visibility_scores').select('*').eq('audit_id', audit.id).single(),
    supabaseAdmin.from('competitors').select('name, mention_count, sentiment_score').eq('audit_id', audit.id).order('mention_count', { ascending: false }).limit(5),
  ])

  const metrics = computeMetrics(mentions ?? [])

  return { restaurant, audit, metrics, websiteAudit, visibilityScore, competitors: competitors ?? [] }
}

const MODEL_LABELS: Record<string, string> = {
  openai: 'ChatGPT (OpenAI)',
  anthropic: 'Claude (Anthropic)',
  gemini: 'Gemini (Google)',
  perplexity: 'Perplexity',
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = size / 2 - 6
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 70 ? '#16a37a' : score >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e1dc" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px`, fontSize: 18, fontWeight: 800, fill: color }}
      >
        {Math.round(score)}
      </text>
    </svg>
  )
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = await getReportData(slug)
  if (!data) notFound()

  const { restaurant, audit, metrics, websiteAudit, visibilityScore, competitors } = data

  const opportunityScore = visibilityScore?.opportunity_score ?? null
  const revenueMin = visibilityScore?.estimated_revenue_min ?? null
  const revenueMax = visibilityScore?.estimated_revenue_max ?? null
  const topCompetitorMentions = competitors[0]?.mention_count ?? 0
  const myMentions = metrics.total_mentions

  const auditDate = new Date(audit.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#fafaf8', minHeight: '100vh', color: '#111110', WebkitFontSmoothing: 'antialiased' }}>

      {/* Nav */}
      <nav style={{ background: 'rgba(250,250,248,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e1dc', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.5 }}>Finded</div>
        <div style={{ fontSize: 12, color: '#b0aea8' }}>AI Visibility Report</div>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#b0aea8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            AI Visibility Report · {auditDate}
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.8, marginBottom: 4 }}>{restaurant.name}</h1>
          <p style={{ fontSize: 15, color: '#7a7874' }}>
            {restaurant.city}{restaurant.cuisine ? ` · ${restaurant.cuisine}` : ''}
          </p>
        </div>

        {/* Score cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Mention frequency', value: `${Math.round(metrics.mention_frequency * 100)}%`, sub: `${myMentions} of ${metrics.total_prompts} prompts` },
            { label: 'Position score', value: `${Math.round(metrics.position_score)}/100`, sub: metrics.position_score >= 60 ? 'Good' : metrics.position_score >= 30 ? 'Fair' : 'Poor' },
            { label: 'Model consensus', value: `${metrics.model_consensus}/4`, sub: 'AI models' },
            { label: 'Prompts tested', value: String(audit.total_prompts ?? metrics.total_prompts), sub: `${audit.total_model_runs ?? metrics.total_prompts * 3} model runs` },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #e2e1dc', borderRadius: 10, padding: '16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#b0aea8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginBottom: 2 }}>{value}</div>
              <div style={{ fontSize: 12, color: '#7a7874' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Opportunity banner */}
        {opportunityScore !== null && opportunityScore > 20 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Revenue opportunity</div>
                {revenueMin !== null && revenueMax !== null && revenueMax > 0 ? (
                  <>
                    <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, color: '#111110' }}>
                      €{revenueMin.toLocaleString()} – €{revenueMax.toLocaleString()}<span style={{ fontSize: 14, fontWeight: 500, color: '#7a7874' }}>/month</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#7a7874', marginTop: 4 }}>
                      estimated additional revenue from improved AI visibility
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 15, color: '#7a7874' }}>High opportunity detected — contact us for full estimate</div>
                )}
                {topCompetitorMentions > myMentions && (
                  <div style={{ fontSize: 13, color: '#92400e', marginTop: 8, fontWeight: 500 }}>
                    ⚠️ Top competitor is mentioned {topCompetitorMentions}× vs your {myMentions}×
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <ScoreRing score={opportunityScore} size={72} />
                <div style={{ fontSize: 10, color: '#7a7874', marginTop: 4 }}>Opportunity</div>
              </div>
            </div>
          </div>
        )}

        {/* AI model breakdown */}
        <div style={{ background: '#fff', border: '1px solid #e2e1dc', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>AI model breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {metrics.model_breakdown.map(mb => {
              const pct = Math.round(mb.frequency * 100)
              return (
                <div key={mb.model} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 140, flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#111110' }}>{MODEL_LABELS[mb.model] ?? mb.model}</div>
                    <div style={{ fontSize: 11, color: '#b0aea8' }}>{mb.mentions} mentions</div>
                  </div>
                  <div style={{ flex: 1, background: '#f2f1ee', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4, background: pct === 0 ? '#e2e1dc' : pct >= 70 ? '#16a37a' : '#f59e0b', width: `${pct}%` }} />
                  </div>
                  <div style={{ width: 36, textAlign: 'right', fontSize: 13, fontWeight: 700, color: pct === 0 ? '#b0aea8' : '#111110' }}>{pct}%</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Competitor comparison */}
        {competitors.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e2e1dc', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Competitor comparison</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* You */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 160, flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{restaurant.name}</div>
                  <div style={{ fontSize: 11, color: '#16a37a', fontWeight: 600 }}>You</div>
                </div>
                <div style={{ flex: 1, background: '#f2f1ee', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, background: '#111110', width: `${Math.min(100, (myMentions / Math.max(topCompetitorMentions, 1)) * 100)}%` }} />
                </div>
                <div style={{ width: 80, textAlign: 'right', fontSize: 13, fontWeight: 700 }}>{myMentions}×</div>
              </div>
              {competitors.map(comp => {
                const isAhead = comp.mention_count > myMentions
                return (
                  <div key={comp.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 160, flexShrink: 0 }}>
                      <div style={{ fontSize: 13, color: '#3a3935', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{comp.name}</div>
                    </div>
                    <div style={{ flex: 1, background: '#f2f1ee', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 4, background: isAhead ? '#ef4444' : '#16a37a', width: `${Math.min(100, (comp.mention_count / Math.max(topCompetitorMentions, 1)) * 100)}%` }} />
                    </div>
                    <div style={{ width: 80, textAlign: 'right', fontSize: 13, color: isAhead ? '#ef4444' : '#16a37a', fontWeight: 600 }}>
                      {comp.mention_count}× {isAhead ? `(+${comp.mention_count - myMentions})` : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Website audit */}
        {websiteAudit && (
          <div style={{ background: '#fff', border: '1px solid #e2e1dc', borderRadius: 10, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Website audit</div>
              {restaurant.website && (
                <a href={restaurant.website} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#16a37a', textDecoration: 'none' }}>
                  {restaurant.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 32px' }}>
              {[
                { label: 'Schema.org markup', value: websiteAudit.schema_present },
                { label: 'Reservation link', value: websiteAudit.reservation_links_present },
                { label: 'Menu page', value: websiteAudit.menu_present },
                { label: 'Social media links', value: websiteAudit.social_links_present },
                { label: 'Opening hours', value: websiteAudit.opening_hours_present },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f2f1ee' }}>
                  <span style={{ fontSize: 13, color: '#3a3935' }}>{label}</span>
                  {value
                    ? <CheckCircle2 size={16} color="#16a37a" />
                    : <XCircle size={16} color="#d1d0ca" />
                  }
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ background: '#111110', borderRadius: 12, padding: '32px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Want to improve these numbers?</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: -0.5, marginBottom: 8 }}>
            Get your full action plan
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
            Prioritised fixes, step-by-step guidance, and monthly monitoring to close the gap with your competitors.
          </p>
          <a
            href="mailto:hello@finded.co?subject=I want to improve my AI visibility"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#111110', padding: '12px 28px', borderRadius: 8, fontSize: 14, fontWeight: 800, textDecoration: 'none' }}
          >
            Talk to us →
          </a>
        </div>

      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #e2e1dc', padding: '20px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: '#b0aea8' }}>Finded · AI Visibility for Restaurants · © 2025</div>
      </footer>

    </div>
  )
}
