import { LeadForm } from '@/components/landing/lead-form'
import { getSettings } from '@/lib/settings'
import { loadObservations, computeBenchmark } from '@/lib/observations'

export const dynamic = 'force-dynamic'

// ── Palette (beige / black / green) — unchanged branding ──────────────────────
const BG = '#fafaf8'
const PANEL = '#ffffff'
const INK = '#111110'
const MUTED = '#7a7874'
const FAINT = '#b0aea8'
const BORDER = '#e2e1dc'
const GREEN = '#16a37a'
const DGREEN = '#0d6b50'
const LGREEN = '#edf8f3'
const RED = '#c0392b'
const LRED = '#fbecea'

const FONT = 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

function SectionTitle({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 44, maxWidth: 680, marginLeft: 'auto', marginRight: 'auto' }}>
      {kicker && <div style={{ fontSize: 11, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>{kicker}</div>}
      <h2 style={{ fontSize: 'clamp(25px, 3.6vw, 34px)', fontWeight: 800, letterSpacing: -0.8, color: INK, lineHeight: 1.15 }}>{title}</h2>
      {sub && <p style={{ fontSize: 17, color: MUTED, marginTop: 14, lineHeight: 1.6 }}>{sub}</p>}
    </div>
  )
}

const PLATFORMS: { name: string; dot: string }[] = [
  { name: 'ChatGPT', dot: '#10a37f' },
  { name: 'Claude', dot: '#d97757' },
  { name: 'Gemini', dot: '#4285f4' },
  { name: 'Perplexity', dot: '#20808d' },
]

// ── The product, as the hero: a real-looking one-page audit ──────────────────
function AuditPreview() {
  const competitors = ['Restaurant A', 'Restaurant B', 'Restaurant C']
  const findings = ['Missing Restaurant schema', 'Menu only available as PDF', 'No FAQ content']
  const Label = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: MONO }}>{children}</div>
  )
  return (
    <div>
      <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: '0 40px 80px -40px rgba(17,17,16,0.38), 0 6px 16px -10px rgba(17,17,16,0.12)', overflow: 'hidden' }}>
        {/* window chrome → reads as an app screenshot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: '#f4f3f0', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
          <span style={{ marginLeft: 10, fontSize: 10.5, color: FAINT, fontFamily: MONO }}>finded.app/report</span>
        </div>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: GREEN }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: INK }}>Finded</span>
            <span style={{ fontSize: 11, color: FAINT }}>· AI visibility report</span>
          </span>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: FAINT, border: `1px solid ${BORDER}`, borderRadius: 5, padding: '3px 7px' }}>Example</span>
        </div>

        <div style={{ padding: 20 }}>
          <Label>Restaurant</Label>
          <div style={{ fontSize: 19, fontWeight: 800, color: INK, marginTop: 3, marginBottom: 16 }}>Restaurant Name</div>

          {/* Two stat tiles: you vs competitor average */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px' }}>
              <Label>Your visibility</Label>
              <div style={{ fontSize: 22, fontWeight: 800, color: INK, marginTop: 4 }}>7 <span style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>of 32 searches</span></div>
            </div>
            <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px' }}>
              <Label>Competitor average</Label>
              <div style={{ fontSize: 22, fontWeight: 800, color: RED, marginTop: 4 }}>18 <span style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>of 32</span></div>
            </div>
          </div>

          <div style={{ height: 1, background: BORDER, margin: '4px 0 16px' }} />

          <Label>Top competitors recommended instead</Label>
          <div style={{ display: 'grid', gap: 6, margin: '10px 0 16px' }}>
            {competitors.map((c, i) => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: BG, border: `1px solid ${BORDER}`, fontSize: 10, fontWeight: 800, color: MUTED, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>{c}</span>
              </div>
            ))}
          </div>

          <Label>Top findings</Label>
          <div style={{ display: 'grid', gap: 7, margin: '10px 0 16px' }}>
            {findings.map((f) => (
              <div key={f} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <span style={{ color: RED, fontWeight: 800, fontSize: 13 }}>✕</span>
                <span style={{ fontSize: 14, color: INK }}>{f}</span>
              </div>
            ))}
          </div>

          <div style={{ background: LGREEN, border: `1px solid #cce9dd`, borderRadius: 10, padding: '11px 14px' }}>
            <Label>Recommendation</Label>
            <div style={{ fontSize: 14, fontWeight: 700, color: DGREEN, marginTop: 3 }}>Implement Restaurant schema</div>
          </div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: FAINT, textAlign: 'center', marginTop: 10 }}>Illustrative example. Your report uses your restaurant&rsquo;s real results.</p>
    </div>
  )
}

export default async function LandingPage() {
  const settings = await getSettings()
  const contactEmail = settings.contactEmail
  const founder = settings.founderName

  // Surface real proprietary benchmark data when the dataset is big enough.
  let dataset: { n: number; pctMentioned: number; schemaRate: number; htmlMenuRate: number } | null = null
  try {
    const obs = await loadObservations()
    const b = computeBenchmark(obs)
    if (b.n >= 20) dataset = { n: b.n, pctMentioned: Math.round(b.pctMentioned * 100), schemaRate: Math.round((b.factRates.restaurant_schema ?? 0) * 100), htmlMenuRate: Math.round((b.factRates.html_menu ?? 0) * 100) }
  } catch { /* dataset stays null → show the "growing" message */ }

  const card = { background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 22 } as const

  return (
    <div id="top" style={{ fontFamily: FONT, background: BG, minHeight: '100vh', WebkitFontSmoothing: 'antialiased', color: INK }}>

      {/* ── Nav ── */}
      <nav style={{ background: 'rgba(250,250,248,0.9)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${BORDER}`, padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5, color: INK, textDecoration: 'none' }}>Finded</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="#measure" className="lnk" style={{ fontSize: 13, fontWeight: 500, color: MUTED, textDecoration: 'none' }}>What we measure</a>
          <a href="#why" className="lnk" style={{ fontSize: 13, fontWeight: 500, color: MUTED, textDecoration: 'none' }}>Why Finded</a>
          <a href="#pricing" className="lnk" style={{ fontSize: 13, fontWeight: 500, color: MUTED, textDecoration: 'none' }}>Pricing</a>
          <a href="#check" className="btn btn-primary" style={{ fontSize: 13, fontWeight: 700, background: INK, color: '#fff', padding: '9px 16px', borderRadius: 8, textDecoration: 'none' }}>Check my AI visibility</a>
        </div>
      </nav>

      {/* ── 1. Hero ── */}
      <section className="grid-bg" style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(48px, 6vw, 80px) 24px 56px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 'clamp(36px, 5vw, 60px)', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-block', background: LGREEN, color: DGREEN, fontSize: 11, fontWeight: 700, padding: '5px 13px', borderRadius: 20, letterSpacing: 0.3, marginBottom: 22 }}>
            The first AI Visibility Platform for restaurants
          </div>
          <h1 style={{ fontSize: 'clamp(34px, 5.2vw, 54px)', fontWeight: 800, lineHeight: 1.03, letterSpacing: -1.6, marginBottom: 20 }}>
            Is AI recommending your restaurant?
          </h1>
          <p style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: MUTED, lineHeight: 1.6, marginBottom: 28, maxWidth: 540 }}>
            More guests are asking ChatGPT, Gemini, Claude and Perplexity where to eat. Finded measures how those AI
            tools recommend restaurants, compares you with your competitors, and shows exactly what to improve.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="#check" className="btn btn-primary" style={{ background: INK, color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 24px', borderRadius: 10, textDecoration: 'none' }}>Check my AI visibility</a>
            <a href="#sample" className="btn" style={{ background: PANEL, color: INK, fontWeight: 700, fontSize: 15, padding: '14px 24px', borderRadius: 10, textDecoration: 'none', border: `1px solid ${BORDER}` }}>View example audit</a>
          </div>
          <p style={{ fontSize: 13, color: FAINT, marginTop: 18 }}>Free check · no account, no card · results by email</p>
        </div>
        <div id="sample" className="rise"><AuditPreview /></div>
      </section>

      {/* ── Trust: platforms tested ── */}
      <section style={{ background: PANEL, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '34px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 20 }}>Tested across major AI platforms</div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'clamp(24px, 6vw, 52px)', flexWrap: 'wrap' }}>
            {PLATFORMS.map((p) => (
              <span key={p.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: p.dot }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: INK, letterSpacing: -0.2 }}>{p.name}</span>
              </span>
            ))}
          </div>
          <p style={{ fontSize: 13, color: MUTED, marginTop: 18 }}>Real Dutch and English restaurant searches.</p>
        </div>
      </section>

      {/* ── 2. Why AI discovery matters ── */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '72px 24px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(24px, 3.4vw, 32px)', fontWeight: 800, letterSpacing: -0.7, marginBottom: 16, lineHeight: 1.2 }}>
          Guests no longer only search Google.
        </h2>
        <p style={{ fontSize: 17, color: MUTED, lineHeight: 1.65, maxWidth: 620, margin: '0 auto 22px' }}>
          More people ask AI tools where to eat, where to celebrate, which place is romantic, or which restaurants
          locals recommend. These tools name only a few restaurants — if your competitors are mentioned and you
          aren&rsquo;t, you&rsquo;re missing a discovery channel that&rsquo;s quietly growing.
        </p>
      </section>

      {/* ── 3. What your audit actually measures ── */}
      <section id="measure" style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 24px 64px', scrollMarginTop: 64 }}>
        <SectionTitle title="What your audit actually measures" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            ['AI recommendations', 'Which AI models mention your restaurant — and how often.'],
            ['Competitor comparison', 'Which restaurants AI recommends instead of you, and why.'],
            ['Website analysis', 'Schema, menus, content and how crawlable your site is for AI.'],
            ['Google Business Profile', 'Categories, reviews and attributes AI leans on.'],
            ['Evidence', 'Which prompts and sources generated each finding.'],
            ['Action plan', 'Exactly what to improve first, ranked by impact.'],
          ].map(([t, d], i) => (
            <div key={t} className="card-fx" style={card}>
              <div style={{ fontSize: 12, fontWeight: 800, color: GREEN, fontFamily: MONO, marginBottom: 12 }}>{String(i + 1).padStart(2, '0')}</div>
              <h3 style={{ fontSize: 16.5, fontWeight: 800, color: INK, marginBottom: 8 }}>{t}</h3>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.55 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Built from real restaurant data ── */}
      <section style={{ background: INK }}>
        <div style={{ maxWidth: 880, margin: '0 auto', padding: '72px 24px', color: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14 }}>Built from real restaurant data</div>
          <h2 style={{ fontSize: 'clamp(25px, 3.6vw, 34px)', fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.15, marginBottom: 16 }}>
            We compare your restaurant with hundreds of others — and measure how AI actually recommends them.
          </h2>
          <p style={{ fontSize: 17, color: '#b9c2cc', lineHeight: 1.7, marginBottom: 24, maxWidth: 700 }}>
            Every completed audit helps us better understand how AI discovers restaurants. That means recommendations
            become smarter over time — based on observations from real restaurants, not only general SEO advice.
          </p>

          {dataset ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 8 }}>
              {[
                [`${dataset.n}`, 'restaurants analysed'],
                [`${dataset.pctMentioned}%`, 'recommended by AI'],
                [`${dataset.schemaRate}%`, 'have Restaurant schema'],
                [`${dataset.htmlMenuRate}%`, 'have a crawlable HTML menu'],
              ].map(([v, l]) => (
                <div key={l} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>{v}</div>
                  <div style={{ fontSize: 13, color: '#9fb0bf', marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 18, fontSize: 14, color: '#9fb0bf' }}>
              Our benchmark dataset grows with every completed audit. As more restaurants are analysed, we surface
              aggregate statistics here — like how many comparable restaurants AI recommends, and which signals they share.
            </div>
          )}
          <p style={{ fontSize: 12, color: '#6f8298', marginTop: 22, lineHeight: 1.6 }}>
            We never expose individual restaurant data — only aggregate, anonymous statistics. We measure how AI
            recommends restaurants today and help you improve; we don&rsquo;t promise rankings.
          </p>
        </div>
      </section>

      {/* ── 5. Why Finded instead of asking ChatGPT? ── */}
      <section id="why" style={{ maxWidth: 980, margin: '0 auto', padding: '72px 24px', scrollMarginTop: 64 }}>
        <SectionTitle title="Why Finded instead of asking ChatGPT?" sub="ChatGPT gives general advice. Finded measures what's actually happening — and backs it with data from real restaurants." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
          <div style={{ ...card, background: BG }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: MUTED, marginBottom: 14 }}>Ask ChatGPT</div>
            {['General advice', 'No competitor benchmarks', 'No repeated testing', 'No historical tracking', 'No restaurant dataset', 'No evidence from hundreds of audits'].map((x) => (
              <div key={x} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 9 }}>
                <span style={{ color: FAINT, fontWeight: 800 }}>✕</span>
                <span style={{ fontSize: 14, color: MUTED }}>{x}</span>
              </div>
            ))}
          </div>
          <div style={{ ...card, border: `1.5px solid ${INK}`, boxShadow: '0 24px 48px -32px rgba(17,17,16,0.28)' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: INK, marginBottom: 14 }}>Finded</div>
            {['Tests ChatGPT, Claude, Gemini & Perplexity', 'Runs dozens of realistic diner prompts', 'Compares you with the competitors AI names', 'Analyses your website & structured data', 'Shows the evidence behind every finding', 'Builds recommendations from real restaurant data'].map((x) => (
              <div key={x} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 9 }}>
                <span style={{ color: GREEN, fontWeight: 800 }}>✓</span>
                <span style={{ fontSize: 14, color: INK }}>{x}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. How it works ── */}
      <section style={{ background: PANEL, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 24px' }}>
          <SectionTitle kicker="How it works" title="From your website to evidence-based recommendations" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            {[
              ['1', 'Website crawl', 'We read your site the way AI does.'],
              ['2', 'AI prompt testing', 'Dozens of real searches across 4 models.'],
              ['3', 'Competitor comparison', 'Who gets named instead, and why.'],
              ['4', 'Evidence', 'The prompts & sources behind each finding.'],
              ['5', 'Recommendations', 'Prioritised, backed by data.'],
              ['6', 'Implementation', 'We help you make the changes.'],
            ].map(([n, t, d]) => (
              <div key={n} className="card-fx" style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: INK, color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{n}</div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: INK, marginBottom: 4 }}>{t}</div>
                <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>{d}</div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: 13, color: FAINT, marginTop: 20 }}>Monthly AI visibility monitoring is coming next — so you can track changes over time.</p>
        </div>
      </section>

      {/* ── 7. Pricing ── */}
      <section id="pricing" style={{ maxWidth: 1080, margin: '0 auto', padding: '72px 24px', scrollMarginTop: 58 }}>
        <SectionTitle kicker="Pricing" title="Start free. Pay only for more depth." sub="Free tells you whether AI recommends you. The audit explains why. Implementation helps you fix it." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, alignItems: 'stretch' }}>
          {[
            { name: 'Free AI Visibility Check', price: '€0', cadence: '', q: 'Is AI recommending my restaurant?',
              features: ['AI visibility status', 'Competitors mentioned instead', 'Top 3 findings', 'Website signal snapshot'],
              cta: 'Check my AI visibility', href: '#check', note: 'No account, no card, no obligation.', highlight: false },
            { name: 'AI Visibility Audit', price: '€49', cadence: 'one-time', q: 'Why do competitors appear more often?',
              features: ['Everything in the free check', 'ChatGPT, Claude, Gemini & Perplexity analysis', 'Prompt-level evidence', 'Competitor comparison & why they win', 'Website, menu & structured-data analysis', 'Evidence-backed recommendations', '30-day action plan'],
              cta: 'Request the full audit', href: `mailto:${contactEmail}?subject=AI Visibility Audit`, note: 'Understand exactly why competitors appear more often.', highlight: true },
            { name: 'AI Visibility Implementation', price: '€299', cadence: 'one-time', q: 'Help me actually fix it.',
              features: ['Everything in the audit', 'Restaurant schema implemented', 'FAQ & AI-friendly content', 'Homepage & location improvements', 'Menu & Google Business improvements', 'Follow-up audit (before / after)'],
              cta: 'Discuss implementation', href: `mailto:${contactEmail}?subject=AI Visibility Implementation`, note: 'We help make your restaurant easier for AI to understand and recommend.', highlight: false },
          ].map((p) => (
            <div key={p.name} style={{
              background: p.highlight ? INK : PANEL, color: p.highlight ? '#fff' : INK,
              border: `1px solid ${p.highlight ? INK : BORDER}`, borderRadius: 16, padding: 24,
              display: 'flex', flexDirection: 'column', boxShadow: p.highlight ? '0 28px 56px -30px rgba(17,17,16,0.45)' : 'none',
            }} className="card-fx">
              {p.highlight && <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: INK, background: GREEN, padding: '3px 8px', borderRadius: 5, marginBottom: 12 }}>Most popular</span>}
              <div style={{ fontSize: 16, fontWeight: 800 }}>{p.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '8px 0 6px' }}>
                <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1 }}>{p.price}</span>
                {p.cadence && <span style={{ fontSize: 13, color: p.highlight ? '#b9b8b3' : MUTED }}>{p.cadence}</span>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: p.highlight ? GREEN : DGREEN, marginBottom: 16 }}>{p.q}</div>
              <div style={{ display: 'grid', gap: 9, marginBottom: 20 }}>
                {p.features.map((f) => (
                  <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: GREEN, fontWeight: 800, fontSize: 13, lineHeight: 1.5 }}>✓</span>
                    <span style={{ fontSize: 13.5, color: p.highlight ? '#e7e6e2' : INK, lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
              <a href={p.href} style={{ marginTop: 'auto', textAlign: 'center', textDecoration: 'none', fontWeight: 700, fontSize: 14, padding: '13px 16px', borderRadius: 9, background: p.highlight ? '#fff' : INK, color: p.highlight ? INK : '#fff' }}>{p.cta}</a>
              <p style={{ fontSize: 12, color: p.highlight ? '#b9b8b3' : FAINT, marginTop: 10, textAlign: 'center', lineHeight: 1.45 }}>{p.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 8. Founder ── */}
      <section style={{ background: PANEL, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px', display: 'flex', gap: 'clamp(20px, 4vw, 32px)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ width: 92, height: 92, borderRadius: '50%', background: LGREEN, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 30, fontWeight: 800, color: DGREEN }}>{founder.charAt(0)}</span>
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>From the founder</div>
            <p style={{ fontSize: 17, color: INK, lineHeight: 1.65, marginBottom: 12 }}>
              I work with restaurants every day. As more people started asking ChatGPT where they should eat, I realised
              owners had no idea whether AI was recommending them — or their competitors. So I built Finded.
            </p>
            <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.6, marginBottom: 14 }}>
              Every audit helps us better understand how AI discovers restaurants. It&rsquo;s a small, independent
              project based in the Netherlands. Questions? Email me directly — I read every one.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: INK }}>{founder}</span>
              <span style={{ color: FAINT }}>·</span>
              <a href={`mailto:${contactEmail}`} style={{ fontSize: 14, color: DGREEN, fontWeight: 600, textDecoration: 'none' }}>{contactEmail}</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Lead capture ── */}
      <section id="check" style={{ background: INK, scrollMarginTop: 58 }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '72px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(25px, 3.8vw, 33px)', fontWeight: 800, letterSpacing: -0.7, marginBottom: 12, color: '#fff' }}>See whether AI recommends your restaurant</h2>
          <p style={{ fontSize: 16, color: '#b9b8b3', lineHeight: 1.6, marginBottom: 28 }}>Send your website and city, and we&rsquo;ll email you your free AI visibility check — no account, no card.</p>
          <div style={{ background: BG, borderRadius: 16, padding: 'clamp(18px, 3vw, 26px)', textAlign: 'left' }}>
            <LeadForm />
          </div>
        </div>
      </section>

      {/* ── 9. FAQ ── */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '72px 24px' }}>
        <SectionTitle kicker="FAQ" title="Honest answers" />
        <div style={{ display: 'grid', gap: 12 }}>
          {[
            ['Is the check really free?', 'Yes — the initial check is free and emailed to you. No account, no card, no obligation.'],
            ['How is this different from asking ChatGPT myself?', 'We don’t ask AI for advice. We measure how ChatGPT, Claude, Gemini and Perplexity actually answer real diner searches, repeated across dozens of prompts, then compare you with the competitors they name — and back recommendations with data from other audited restaurants.'],
            ['Do you guarantee AI will recommend me?', 'No, and nobody honestly can. We measure how AI recommends restaurants today, explain why, and show what to improve. It’s measurement, not guaranteed rankings.'],
            ['Can AI answers change over time?', 'They can and do. That’s why we measure across multiple prompts and models and treat the result as a snapshot — and why monthly monitoring is on the way.'],
            ['What do you need from me?', 'Just your restaurant’s website, your city, and an email to send the results to.'],
            ['What about my data?', 'We only use your details to prepare your report. Aggregate benchmarks are fully anonymous — individual restaurant data is never exposed.'],
          ].map(([q, a]) => (
            <details key={q} style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 18px' }}>
              <summary style={{ fontSize: 15, fontWeight: 700, color: INK, cursor: 'pointer', listStyle: 'none' }}>{q}</summary>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, marginTop: 10 }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── 10. Footer ── */}
      <footer style={{ background: PANEL, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '44px 24px', display: 'flex', flexWrap: 'wrap', gap: 28, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ maxWidth: 340 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: INK, marginBottom: 8 }}>Finded</div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: MUTED }}>
              The AI Visibility Platform for restaurants. We measure how ChatGPT, Claude, Gemini and Perplexity
              recommend restaurants — and help you improve.
            </p>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.9 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FAINT, marginBottom: 6 }}>Product</div>
            <a href="#check" style={{ color: INK, textDecoration: 'none', display: 'block' }}>Free visibility check</a>
            <a href="#measure" style={{ color: INK, textDecoration: 'none', display: 'block' }}>What we measure</a>
            <a href="#why" style={{ color: INK, textDecoration: 'none', display: 'block' }}>Why Finded</a>
            <a href="#pricing" style={{ color: INK, textDecoration: 'none', display: 'block' }}>Pricing</a>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.9 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FAINT, marginBottom: 6 }}>Company</div>
            <a href={`mailto:${contactEmail}`} style={{ color: INK, textDecoration: 'none', display: 'block' }}>{contactEmail}</a>
            <a href="/privacy" style={{ color: INK, textDecoration: 'none', display: 'block' }}>Privacy policy</a>
            <a href="/terms" style={{ color: INK, textDecoration: 'none', display: 'block' }}>Terms</a>
            <div style={{ color: MUTED, marginTop: 6 }}>Built in the Netherlands</div>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: '16px 24px', textAlign: 'center', fontSize: 12, color: FAINT }}>
          © {2026} Finded · We measure how AI recommends restaurants — not rankings.
        </div>
      </footer>
    </div>
  )
}
