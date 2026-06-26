import { LeadForm } from '@/components/landing/lead-form'
import { getSettings } from '@/lib/settings'
import { platformStats } from '@/lib/observations'

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

const FONT = 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

function SectionTitle({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 48, maxWidth: 700, marginLeft: 'auto', marginRight: 'auto' }}>
      {kicker && <div style={{ fontSize: 11, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 14 }}>{kicker}</div>}
      <h2 style={{ fontSize: 'clamp(26px, 3.8vw, 38px)', fontWeight: 800, letterSpacing: -1, color: INK, lineHeight: 1.12 }}>{title}</h2>
      {sub && <p style={{ fontSize: 17.5, color: MUTED, marginTop: 16, lineHeight: 1.6 }}>{sub}</p>}
    </div>
  )
}

const MODELS = [
  { name: 'ChatGPT', hit: false },
  { name: 'Claude', hit: true },
  { name: 'Gemini', hit: false },
  { name: 'Perplexity', hit: false },
]

// ── The product, as the hero: a real-looking one-page audit ──────────────────
function AuditPreview() {
  const Label = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: MONO }}>{children}</div>
  )
  return (
    <div>
      <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: '0 44px 90px -44px rgba(17,17,16,0.40), 0 6px 16px -10px rgba(17,17,16,0.12)', overflow: 'hidden' }}>
        {/* window chrome → reads as an app screenshot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: '#f4f3f0', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
          <span style={{ marginLeft: 10, fontSize: 10.5, color: FAINT, fontFamily: MONO }}>finded.app/report</span>
        </div>

        <div style={{ padding: 22 }}>
          {/* Name + visibility score + status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
            <div>
              <Label>Restaurant</Label>
              <div style={{ fontSize: 20, fontWeight: 800, color: INK, marginTop: 3 }}>Restaurant Name</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 8, background: '#fbecea', border: '1px solid #f0cfc9', borderRadius: 8, padding: '5px 11px' }}>
                <span style={{ color: RED, fontWeight: 800, fontSize: 12 }}>✕</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: RED }}>Not recommended</span>
              </div>
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', border: `4px solid ${BORDER}`, borderTopColor: RED, borderRightColor: RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 19, fontWeight: 800, color: INK }}>36</span>
              </div>
              <Label>Visibility</Label>
            </div>
          </div>

          {/* AI models tested */}
          <Label>AI models tested</Label>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', margin: '9px 0 16px' }}>
            {MODELS.map((m) => (
              <span key={m.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: m.hit ? INK : MUTED, background: BG, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '4px 10px' }}>
                <span style={{ color: m.hit ? GREEN : FAINT, fontWeight: 800 }}>{m.hit ? '✓' : '✕'}</span>{m.name}
              </span>
            ))}
          </div>

          <div style={{ height: 1, background: BORDER, margin: '2px 0 16px' }} />

          <Label>Competitors recommended instead</Label>
          <div style={{ display: 'grid', gap: 6, margin: '10px 0 16px' }}>
            {['Restaurant A', 'Restaurant B', 'Restaurant C'].map((c, i) => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: BG, border: `1px solid ${BORDER}`, fontSize: 10, fontWeight: 800, color: MUTED, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>{c}</span>
              </div>
            ))}
          </div>

          <Label>Biggest opportunities</Label>
          <div style={{ display: 'grid', gap: 7, margin: '10px 0 16px' }}>
            {['Missing Restaurant schema', 'Menu only available as PDF', 'No FAQ content'].map((f) => (
              <div key={f} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <span style={{ color: RED, fontWeight: 800, fontSize: 13 }}>✕</span>
                <span style={{ fontSize: 14, color: INK }}>{f}</span>
              </div>
            ))}
          </div>

          <div style={{ background: LGREEN, border: `1px solid #cce9dd`, borderRadius: 10, padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <Label>Recommendation</Label>
              <div style={{ fontSize: 14, fontWeight: 700, color: DGREEN, marginTop: 3 }}>Implement Restaurant schema</div>
            </div>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: '#fff', background: DGREEN, borderRadius: 5, padding: '4px 8px', whiteSpace: 'nowrap' }}>Do first</span>
          </div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: FAINT, textAlign: 'center', marginTop: 10 }}>Illustrative example. Your report uses your restaurant&rsquo;s real results.</p>
    </div>
  )
}

const fmt = (n: number) => n.toLocaleString('en-US')

export default async function LandingPage() {
  const settings = await getSettings()
  const contactEmail = settings.contactEmail
  const founder = settings.founderName

  const stats = await platformStats().catch(() => null)
  const haveData = !!stats && stats.audits > 0
  const haveBench = !!stats && stats.n >= 20
  const rate = (k: 'restaurant_schema' | 'html_menu' | 'faq_present') => stats ? Math.round((stats.factRates[k] ?? 0) * 100) : 0

  const card = { background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 } as const

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

      {/* ── 1. Hero (product alongside) ── */}
      <section className="grid-bg" style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(52px, 6vw, 88px) 24px 60px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'clamp(36px, 5vw, 64px)', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-block', background: LGREEN, color: DGREEN, fontSize: 11, fontWeight: 700, padding: '5px 13px', borderRadius: 20, letterSpacing: 0.3, marginBottom: 24 }}>
            The first AI Visibility Platform for restaurants
          </div>
          <h1 style={{ fontSize: 'clamp(33px, 4.8vw, 52px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.6, marginBottom: 22 }}>
            Find out why AI recommends your competitors.
          </h1>
          <p style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: MUTED, lineHeight: 1.6, marginBottom: 28, maxWidth: 560 }}>
            More guests ask ChatGPT, Claude, Gemini and Perplexity where to eat. Finded measures how those AI tools
            recommend restaurants, compares you with competitors, and identifies the website signals influencing
            those recommendations.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="#check" className="btn btn-primary" style={{ background: INK, color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 24px', borderRadius: 10, textDecoration: 'none' }}>Check my AI visibility</a>
            <a href="#sample" className="btn" style={{ background: PANEL, color: INK, fontWeight: 700, fontSize: 15, padding: '14px 24px', borderRadius: 10, textDecoration: 'none', border: `1px solid ${BORDER}` }}>View example audit</a>
          </div>
          <p style={{ fontSize: 13, color: FAINT, marginTop: 18 }}>Free check · no account, no card · results by email</p>
        </div>
        <div id="sample" className="rise"><AuditPreview /></div>
      </section>

      {/* ── 2. Finded Insights — live platform data ── */}
      <section style={{ background: PANEL, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 24 }}>Finded Insights · measured continuously</div>
          {haveData ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 20, textAlign: 'center' }}>
              {[
                [fmt(stats!.restaurants || stats!.audits), 'Restaurants analysed'],
                [fmt(stats!.searches), 'AI searches performed'],
                [fmt(stats!.audits), 'Audits completed'],
                [fmt(stats!.cities), 'Cities covered'],
                [fmt(stats!.cuisines), 'Cuisine types'],
                [`${stats!.models}`, 'AI models tested'],
              ].map(([v, l]) => (
                <div key={l as string}>
                  <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1, color: INK }}>{v}</div>
                  <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', fontSize: 15, color: MUTED, maxWidth: 620, margin: '0 auto', lineHeight: 1.6 }}>
              Our dataset grows with every completed audit. Live platform statistics — restaurants analysed, AI
              searches performed, cities and cuisines covered — appear here as the knowledge base fills.
            </p>
          )}
        </div>
      </section>

      {/* ── 3. Why it matters ── */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '76px 24px 16px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(25px, 3.6vw, 34px)', fontWeight: 800, letterSpacing: -0.9, marginBottom: 16, lineHeight: 1.15 }}>
          Guests no longer only search Google.
        </h2>
        <p style={{ fontSize: 17.5, color: MUTED, lineHeight: 1.65, maxWidth: 620, margin: '0 auto' }}>
          They ask AI where to eat, where to celebrate, which place is romantic. These tools name only a few
          restaurants — if your competitors are mentioned and you aren&rsquo;t, you&rsquo;re missing a discovery
          channel that&rsquo;s quietly growing.
        </p>
      </section>

      {/* ── 4. What your audit measures ── */}
      <section id="measure" style={{ maxWidth: 1040, margin: '0 auto', padding: '56px 24px 72px', scrollMarginTop: 64 }}>
        <SectionTitle title="What your audit actually measures" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            ['AI recommendations', 'Which AI models mention your restaurant, and how often.'],
            ['Competitor comparison', 'Which restaurants AI recommends instead of you.'],
            ['Website analysis', 'Schema, menus, crawlability and content.'],
            ['Google Business Profile', 'Reviews, categories and business attributes.'],
            ['Evidence', 'The exact prompts and AI responses behind each finding.'],
            ['Prioritised action plan', 'The most important improvements first.'],
          ].map(([t, d], i) => (
            <div key={t} className="card-fx" style={card}>
              <div style={{ fontSize: 12, fontWeight: 800, color: GREEN, fontFamily: MONO, marginBottom: 12 }}>{String(i + 1).padStart(2, '0')}</div>
              <h3 style={{ fontSize: 16.5, fontWeight: 800, color: INK, marginBottom: 8 }}>{t}</h3>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.55 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. Why not just ask ChatGPT? ── */}
      <section id="why" style={{ background: PANEL, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, scrollMarginTop: 60 }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '76px 24px' }}>
          <SectionTitle title="Why not just ask ChatGPT yourself?" sub="You can — but a single question gives general advice. Finded turns it into measurement." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, color: MUTED, marginBottom: 14 }}>Asking ChatGPT once</div>
              {['General advice', 'No repeated testing', 'No competitor benchmark', 'No historical tracking', 'No restaurant dataset', 'No measurement'].map((x) => (
                <div key={x} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{ color: FAINT, fontWeight: 800 }}>—</span>
                  <span style={{ fontSize: 14, color: MUTED }}>{x}</span>
                </div>
              ))}
            </div>
            <div className="card-fx" style={{ ...card, border: `1.5px solid ${INK}` }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: INK, marginBottom: 14 }}>Finded</div>
              {['Runs dozens of realistic diner prompts', 'Tests four AI models, repeatedly', 'Measures actual AI recommendations', 'Compares you with competitors', 'Analyses your website & structured data', 'Builds recommendations from real audit data'].map((x) => (
                <div key={x} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{ color: GREEN, fontWeight: 800 }}>✓</span>
                  <span style={{ fontSize: 14, color: INK }}>{x}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. How it works ── */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '76px 24px' }}>
        <SectionTitle kicker="How it works" title="From your website to evidence-based recommendations" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {[
            ['1', 'Website crawl', 'We read your site the way AI does.'],
            ['2', 'AI prompt testing', 'Dozens of real searches across 4 models.'],
            ['3', 'Competitor comparison', 'Who gets named instead, and why.'],
            ['4', 'Evidence', 'The prompts & responses behind each finding.'],
            ['5', 'Recommendations', 'Prioritised, backed by data.'],
            ['6', 'Implementation', 'We help you make the changes.'],
          ].map(([n, t, d]) => (
            <div key={n} className="card-fx" style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: INK, color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{n}</div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: INK, marginBottom: 4 }}>{t}</div>
              <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>{d}</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: FAINT, marginTop: 22 }}>Monthly AI visibility monitoring is coming next — so you can track changes over time.</p>
      </section>

      {/* ── 7. Built from real data + what we're learning ── */}
      <section style={{ background: INK }}>
        <div style={{ maxWidth: 920, margin: '0 auto', padding: '80px 24px', color: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 16 }}>Built from real restaurant data</div>
          <h2 style={{ fontSize: 'clamp(26px, 3.8vw, 36px)', fontWeight: 800, letterSpacing: -1, lineHeight: 1.12, marginBottom: 18 }}>
            We measure how AI recommends restaurants — and learn from every audit.
          </h2>
          <p style={{ fontSize: 17.5, color: '#b9c2cc', lineHeight: 1.7, marginBottom: 28, maxWidth: 700 }}>
            Every completed audit anonymously sharpens our understanding of how AI discovers restaurants. Recommendations
            become evidence-based over time — drawn from patterns across real restaurants, not general SEO advice.
          </p>

          <div style={{ fontSize: 12, fontWeight: 700, color: '#6f8298', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>What we&rsquo;re learning</div>
          {haveBench ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
              {[
                [`${100 - rate('restaurant_schema')}%`, 'are missing Restaurant schema'],
                [`${100 - rate('html_menu')}%`, 'don’t have a crawlable HTML menu'],
                [`${100 - rate('faq_present')}%`, 'have no FAQ content'],
                [`${stats!.pctMentioned != null ? Math.round(stats!.pctMentioned * 100) : 0}%`, 'are recommended by AI at all'],
              ].map(([v, l]) => (
                <div key={l as string} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>{v}</div>
                  <div style={{ fontSize: 13, color: '#9fb0bf', marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 18, fontSize: 14, color: '#9fb0bf', maxWidth: 700 }}>
              As the dataset grows we surface the most common issues here — like how many restaurants are missing
              Restaurant schema, rely on PDF menus, or have no FAQ. These benchmarks become stronger with every audit.
            </div>
          )}
          <p style={{ fontSize: 12, color: '#6f8298', marginTop: 24, lineHeight: 1.6 }}>
            Only aggregate, anonymous statistics — never individual restaurant data. We measure how AI recommends
            restaurants today and help you improve; we don&rsquo;t promise rankings or control AI.
          </p>
        </div>
      </section>

      {/* ── 8. Pricing (lower, outcome-framed) ── */}
      <section id="pricing" style={{ maxWidth: 1080, margin: '0 auto', padding: '80px 24px', scrollMarginTop: 58 }}>
        <SectionTitle kicker="Pricing" title="Start free. Pay only for more depth." sub="Free tells you whether AI recommends you. The audit explains why. Implementation helps you fix it." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, alignItems: 'stretch' }}>
          {[
            { name: 'Free AI Visibility Check', price: '€0', cadence: '', q: 'Is AI recommending my restaurant?',
              features: ['Your AI Visibility Dashboard', 'AI visibility status & score', 'Competitors mentioned instead', 'Top 3 findings + website snapshot', 'Download a summary PDF anytime'],
              cta: 'Open my free dashboard', href: '#check', note: 'No account, no card, no obligation.', highlight: false },
            { name: 'AI Visibility Audit', price: '€49', cadence: 'one-time', q: 'Why do competitors appear more often?',
              features: ['Everything in the free check', 'All four AI models analysed', 'Prompt-level evidence', 'Competitor comparison & why they win', 'Website, menu & structured-data analysis', 'Evidence-backed recommendations', '30-day action plan'],
              cta: 'Get the full audit', href: `mailto:${contactEmail}?subject=AI Visibility Audit`, note: 'Understand exactly why competitors appear more often.', highlight: true },
            { name: 'AI Visibility Implementation', price: '€299', cadence: 'one-time', q: 'Help me actually fix it.',
              features: ['Everything in the audit', 'Restaurant schema implemented', 'FAQ & AI-friendly content', 'Homepage & location improvements', 'Menu & Google Business improvements', 'Follow-up audit (before / after)'],
              cta: 'Discuss implementation', href: `mailto:${contactEmail}?subject=AI Visibility Implementation`, note: 'We make your restaurant easier for AI to understand and recommend.', highlight: false },
          ].map((p) => (
            <div key={p.name} className="card-fx" style={{
              background: p.highlight ? INK : PANEL, color: p.highlight ? '#fff' : INK,
              border: `1px solid ${p.highlight ? INK : BORDER}`, borderRadius: 16, padding: 24,
              display: 'flex', flexDirection: 'column', boxShadow: p.highlight ? '0 28px 56px -30px rgba(17,17,16,0.45)' : 'none',
            }}>
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
              <a href={p.href} className={p.highlight ? 'btn btn-primary' : 'btn'} style={{ marginTop: 'auto', textAlign: 'center', textDecoration: 'none', fontWeight: 700, fontSize: 14, padding: '13px 16px', borderRadius: 9, background: p.highlight ? '#fff' : INK, color: p.highlight ? INK : '#fff' }}>{p.cta}</a>
              <p style={{ fontSize: 12, color: p.highlight ? '#b9b8b3' : FAINT, marginTop: 10, textAlign: 'center', lineHeight: 1.45 }}>{p.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 9. Founder ── */}
      <section style={{ background: PANEL, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '72px 24px', display: 'flex', gap: 'clamp(20px, 4vw, 36px)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ width: 104, height: 104, borderRadius: '50%', background: LGREEN, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: DGREEN }}>{founder.charAt(0)}</span>
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>From the founder</div>
            <p style={{ fontSize: 18, color: INK, lineHeight: 1.65, marginBottom: 12, fontWeight: 600 }}>Hi, I&rsquo;m {founder}.</p>
            <p style={{ fontSize: 16.5, color: INK, lineHeight: 1.65, marginBottom: 12 }}>
              I work with restaurants every day. When people started asking AI where to eat instead of Google, I realised
              owners had no way of knowing whether AI was recommending them — or their competitors. So I built Finded.
            </p>
            <p style={{ fontSize: 15.5, color: MUTED, lineHeight: 1.6, marginBottom: 16 }}>
              Every completed audit improves our understanding of how AI discovers restaurants. If you have questions,
              email me directly — I read every one.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: INK }}>{founder}</span>
              <span style={{ color: FAINT }}>·</span>
              <a href={`mailto:${contactEmail}`} className="lnk" style={{ fontSize: 14, color: DGREEN, fontWeight: 600, textDecoration: 'none' }}>{contactEmail}</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Lead capture ── */}
      <section id="check" style={{ background: INK, scrollMarginTop: 58 }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(26px, 3.8vw, 34px)', fontWeight: 800, letterSpacing: -0.9, marginBottom: 12, color: '#fff' }}>See whether AI recommends your restaurant</h2>
          <p style={{ fontSize: 16.5, color: '#b9b8b3', lineHeight: 1.6, marginBottom: 28 }}>Send your website and city, and we&rsquo;ll email you a link to your free AI Visibility Dashboard.</p>
          <div style={{ background: BG, borderRadius: 16, padding: 'clamp(18px, 3vw, 26px)', textAlign: 'left' }}>
            <LeadForm />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '80px 24px' }}>
        <SectionTitle kicker="FAQ" title="Honest answers" />
        <div style={{ display: 'grid', gap: 12 }}>
          {[
            ['Is the check really free?', 'Yes — the initial check is free and emailed to you. No account, no card, no obligation.'],
            ['How is this different from asking AI myself?', 'We don’t ask AI for advice. We measure how four AI models actually answer real diner searches, repeated across dozens of prompts, then compare you with the competitors they name — and back recommendations with data from other audited restaurants.'],
            ['Do you guarantee AI will recommend me?', 'No, and nobody honestly can. We measure how AI recommends restaurants today, explain why, and show what to improve. It’s measurement, not guaranteed rankings.'],
            ['Can AI answers change over time?', 'They can and do. That’s why we measure across multiple prompts and models and treat results as a snapshot — and why monthly monitoring is on the way.'],
            ['What do you need from me?', 'Just your restaurant’s website, your city, and an email to send the results to.'],
            ['What about my data?', 'We only use your details to prepare your report. Benchmarks are fully anonymous — individual restaurant data is never exposed.'],
          ].map(([q, a]) => (
            <details key={q} style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 18px' }}>
              <summary style={{ fontSize: 15, fontWeight: 700, color: INK, cursor: 'pointer', listStyle: 'none' }}>{q}</summary>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, marginTop: 10 }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
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
            <a href="#check" className="lnk" style={{ color: INK, textDecoration: 'none', display: 'block' }}>Free visibility check</a>
            <a href="#measure" className="lnk" style={{ color: INK, textDecoration: 'none', display: 'block' }}>What we measure</a>
            <a href="#why" className="lnk" style={{ color: INK, textDecoration: 'none', display: 'block' }}>Why Finded</a>
            <a href="#pricing" className="lnk" style={{ color: INK, textDecoration: 'none', display: 'block' }}>Pricing</a>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.9 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FAINT, marginBottom: 6 }}>Company</div>
            <a href={`mailto:${contactEmail}`} className="lnk" style={{ color: INK, textDecoration: 'none', display: 'block' }}>{contactEmail}</a>
            <a href="/privacy" className="lnk" style={{ color: INK, textDecoration: 'none', display: 'block' }}>Privacy policy</a>
            <a href="/terms" className="lnk" style={{ color: INK, textDecoration: 'none', display: 'block' }}>Terms</a>
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
