import { supabaseAdmin } from '@/lib/supabase/client'
import { computeMetrics } from '@/lib/engine/metrics'
import { notFound } from 'next/navigation'
import { formatPercent } from '@/lib/utils'
import Link from 'next/link'

const MODEL_LABELS: Record<string, string> = {
  anthropic:  'Claude',
  openai:     'ChatGPT',
  gemini:     'Gemini',
  perplexity: 'Perplexity',
}

const MODEL_USERS: Record<string, string> = {
  anthropic:  '200K+ users',
  openai:     '3.5M+ users',
  gemini:     '8M+ users',
  perplexity: '450K+ users',
}

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

  const { data: mentions } = await supabaseAdmin
    .from('mentions')
    .select('model, prompt_id, mentioned, position, sentiment')
    .eq('audit_id', audit.id)

  const { data: websiteAudit } = await supabaseAdmin
    .from('website_audits')
    .select('*')
    .eq('audit_id', audit.id)
    .single()

  const metrics = computeMetrics(mentions ?? [])

  return { restaurant, audit, metrics, websiteAudit }
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size / 2) - 6
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 60 ? '#16a37a' : score >= 35 ? '#c47d14' : '#d94f4f'
  const label = score >= 60 ? 'Good' : score >= 35 ? 'Fair' : 'Poor'

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e8e7e3" strokeWidth="5"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}/>
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: size > 60 ? 20 : 14, fontWeight: 800, color: '#111110', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 10, color, fontWeight: 600, marginTop: 2 }}>{label}</span>
      </div>
    </div>
  )
}

export default async function PreviewReportPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = await getReportData(slug)
  if (!data) notFound()

  const { restaurant, metrics, websiteAudit } = data
  const paid = restaurant.report_paid
  const overallScore = Math.round(metrics.mention_frequency * 100)
  const posScore = Math.round(metrics.position_score)

  const models = ['openai', 'anthropic', 'gemini', 'perplexity']
  const freeModels = ['anthropic'] // always show Claude
  const premiumModels = ['openai', 'gemini', 'perplexity']

  const websiteIssues = websiteAudit ? [
    !websiteAudit.schema_present && 'No schema.org markup detected',
    !websiteAudit.menu_present && 'Menu not found by AI crawlers',
    !websiteAudit.opening_hours_present && 'Opening hours not clearly structured',
    !websiteAudit.reservation_links_present && 'No reservation link detected',
  ].filter(Boolean) : []

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#fafaf8', minHeight: '100vh', WebkitFontSmoothing: 'antialiased' }}>

      {/* Nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e2e1dc', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#111110', letterSpacing: -0.5 }}>Finded</span>
        </div>
        <a href="#unlock" style={{ background: '#111110', color: '#fff', padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          Unlock full report →
        </a>
      </nav>

      {/* Hero */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e1dc', padding: '40px 24px 36px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#edf8f3', color: '#0d6b50', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 16 }}>
          AI Visibility Report
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 800, color: '#111110', letterSpacing: -1, marginBottom: 8, lineHeight: 1.1 }}>
          {restaurant.name}
        </h1>
        <p style={{ fontSize: 15, color: '#7a7874', marginBottom: 24 }}>
          {restaurant.city}{restaurant.cuisine ? ` · ${restaurant.cuisine}` : ''} · Audited {new Date(data.audit.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* Score cards */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', maxWidth: 640, margin: '0 auto' }}>
          <div style={{ background: '#fafaf8', border: '1px solid #e2e1dc', borderRadius: 10, padding: '18px 24px', minWidth: 140, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <ScoreRing score={overallScore} size={72} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#b0aea8', textTransform: 'uppercase', letterSpacing: 0.5 }}>AI Visibility</div>
          </div>
          <div style={{ background: '#fafaf8', border: '1px solid #e2e1dc', borderRadius: 10, padding: '18px 24px', minWidth: 140, textAlign: 'center' }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: '#111110', letterSpacing: -1 }}>{metrics.total_mentions}</div>
            <div style={{ fontSize: 12, color: '#7a7874', marginTop: 4 }}>of {metrics.total_prompts} prompts</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#b0aea8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 }}>Mentions</div>
          </div>
          <div style={{ background: '#fafaf8', border: '1px solid #e2e1dc', borderRadius: 10, padding: '18px 24px', minWidth: 140, textAlign: 'center' }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: '#111110', letterSpacing: -1 }}>{metrics.model_consensus}<span style={{ fontSize: 16, color: '#b0aea8' }}>/4</span></div>
            <div style={{ fontSize: 12, color: '#7a7874', marginTop: 4 }}>models mention you</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#b0aea8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 }}>Consensus</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Key finding banner */}
        {metrics.model_consensus < 4 && (
          <div style={{ background: '#fdeaea', border: '1px solid #f5c6c6', borderRadius: 10, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#9b2c2c', marginBottom: 4 }}>
                {4 - metrics.model_consensus} out of 4 AI models don&apos;t recommend you
              </div>
              <div style={{ fontSize: 13, color: '#c53030', lineHeight: 1.5 }}>
                When {restaurant.city} diners ask ChatGPT, Gemini or Perplexity for restaurant recommendations, {restaurant.name} doesn&apos;t appear. Your competitors do.
              </div>
            </div>
          </div>
        )}

        {/* Model breakdown */}
        <div style={{ background: '#fff', border: '1px solid #e2e1dc', borderRadius: 10, padding: '20px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#b0aea8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16 }}>
            Visibility by AI model
          </div>
          {models.map((model) => {
            const mb = metrics.model_breakdown.find(m => m.model === model)
            const freq = mb ? Math.round(mb.frequency * 100) : 0
            const isBlurred = !paid && premiumModels.includes(model)
            const barColor = freq >= 50 ? '#16a37a' : freq >= 25 ? '#c47d14' : '#d94f4f'

            return (
              <div key={model} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, position: 'relative' }}>
                <div style={{ width: 90, flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111110' }}>{MODEL_LABELS[model]}</div>
                  <div style={{ fontSize: 11, color: '#b0aea8' }}>{MODEL_USERS[model]}</div>
                </div>
                <div style={{ flex: 1, height: 7, background: '#f2f1ee', borderRadius: 4, overflow: 'hidden', filter: isBlurred ? 'blur(4px)' : 'none' }}>
                  <div style={{ height: '100%', width: `${freq}%`, background: barColor, borderRadius: 4, transition: 'width 1s ease' }} />
                </div>
                {isBlurred ? (
                  <div style={{ width: 40, textAlign: 'right', filter: 'blur(6px)', fontSize: 13, fontWeight: 700, color: '#111110' }}>??%</div>
                ) : (
                  <div style={{ width: 40, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#111110' }}>{freq}%</div>
                )}
                {isBlurred && (
                  <div style={{ position: 'absolute', right: 48, top: '50%', transform: 'translateY(-50%)', background: '#f2f1ee', border: '1px solid #e2e1dc', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#7a7874', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    Unlock
                  </div>
                )}
              </div>
            )
          })}
          {!paid && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#b0aea8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🔒</span> ChatGPT, Gemini and Perplexity data visible in full report
            </div>
          )}
        </div>

        {/* Website signals */}
        {websiteAudit && (
          <div style={{ background: '#fff', border: '1px solid #e2e1dc', borderRadius: 10, padding: '20px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#b0aea8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16 }}>
              Website signals for AI
            </div>
            {[
              { label: 'Schema.org markup', ok: websiteAudit.schema_present },
              { label: 'Menu detected', ok: websiteAudit.menu_present },
              { label: 'Opening hours', ok: websiteAudit.opening_hours_present },
              { label: 'Reservation link', ok: websiteAudit.reservation_links_present },
              { label: 'Social media links', ok: websiteAudit.social_links_present },
            ].map(({ label, ok }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f2f1ee' }}>
                <span style={{ fontSize: 13, color: '#111110' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: ok ? '#16a37a' : '#d94f4f' }}>
                  {ok ? '✓ Present' : '✗ Missing'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Blurred premium section */}
        {!paid && (
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none', background: '#fff', border: '1px solid #e2e1dc', borderRadius: 10, padding: '20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#b0aea8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16 }}>Competitor analysis</div>
              {['Restaurant A', 'Restaurant B', 'Restaurant C'].map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f2f1ee' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{r}</span>
                  <span style={{ fontSize: 13, color: '#16a37a', fontWeight: 700 }}>{85 - i * 15}% visibility</span>
                </div>
              ))}
              <div style={{ marginTop: 12, fontSize: 13, color: '#7a7874' }}>These competitors are recommended instead of you in 73% of relevant queries.</div>
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(250,250,248,0.7)', borderRadius: 10 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>🔒</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111110', marginBottom: 4 }}>Competitor analysis</div>
                <div style={{ fontSize: 12, color: '#7a7874' }}>See which restaurants AI recommends instead of you</div>
              </div>
            </div>
          </div>
        )}

        {/* Unlock CTA */}
        {!paid && (
          <div id="unlock" style={{ background: '#111110', borderRadius: 12, padding: '32px 28px', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Full report · one-time payment
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -0.5, marginBottom: 8, lineHeight: 1.2 }}>
              See the full picture.<br/>Fix your AI visibility.
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 24, lineHeight: 1.6 }}>
              Unlock ChatGPT, Gemini and Perplexity data · Competitor analysis · Step-by-step fix guide
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
              {['ChatGPT data', 'Gemini data', 'Competitor analysis', 'Fix guide', 'PDF report'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
                  <span style={{ color: '#16a37a' }}>✓</span> {f}
                </div>
              ))}
            </div>
            <a href={`/checkout?slug=${restaurant.preview_slug}`} style={{ display: 'inline-block', background: '#fff', color: '#111110', padding: '14px 32px', borderRadius: 8, fontSize: 15, fontWeight: 800, textDecoration: 'none', letterSpacing: -0.3 }}>
              Unlock full report — €49
            </a>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 12 }}>
              One-time payment · Instant access · No subscription required
            </div>
          </div>
        )}

        {/* Monitoring upsell */}
        <div style={{ background: '#f7f6f3', border: '1px solid #e2e1dc', borderRadius: 10, padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111110', marginBottom: 6 }}>Want to track this every month?</div>
          <div style={{ fontSize: 13, color: '#7a7874', marginBottom: 16, lineHeight: 1.6 }}>
            AI visibility changes constantly. Get a monthly report, score tracking, and alerts when competitors gain ground.
          </div>
          <a href={`/checkout?slug=${restaurant.preview_slug}&plan=monthly`} style={{ display: 'inline-block', background: '#fff', border: '1px solid #e2e1dc', color: '#111110', padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Monthly monitoring — €29/month
          </a>
        </div>

      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e2e1dc', padding: '20px 24px', textAlign: 'center', fontSize: 12, color: '#b0aea8' }}>
        Finded · AI Visibility for Restaurants · <a href="/" style={{ color: '#b0aea8' }}>finded.co</a>
      </div>
    </div>
  )
}
