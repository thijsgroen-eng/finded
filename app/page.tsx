import { LeadForm } from '@/components/landing/lead-form'
import { CountUp } from '@/components/landing/count-up'
import { getSettings } from '@/lib/settings'
import { platformStats } from '@/lib/observations'
import {
  Building2, Search, ClipboardCheck, MapPin, UtensilsCrossed, Cpu,
  Bot, Users, Globe, FileSearch, ListChecks, Check, Database,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// ── Finded identity: warm ivory · deep emerald · soft sage · muted terracotta ──
const IVORY = '#FCFBF8'
const PANEL = '#ffffff'
const INK = '#161616'
const MUTED = '#5f5e59'
const FAINT = '#a39f97'
const BORDER = '#ECE8E2'
const GREEN = '#0B5D56'
const EMERALD = '#0B5D56'
const DEMERALD = '#174E4A'
const GRAPHITE = '#0c1f1c'   // deep forest near-black for dark sections
const MINT = '#DDF4EB'       // soft sage
const SAND = '#F4F0E9'       // warm tint for section rhythm
const TERRA = '#E4A16A'      // warm terracotta accent
const RED = '#c0392b'
const BG = IVORY

const FONT = 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

function SectionTitle({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 52, maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' }}>
      {kicker && <div style={{ fontSize: 11, fontWeight: 700, color: EMERALD, textTransform: 'uppercase', letterSpacing: 1.6, marginBottom: 14 }}>{kicker}</div>}
      <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, letterSpacing: -1.2, color: INK, lineHeight: 1.1 }}>{title}</h2>
      {sub && <p style={{ fontSize: 18, color: MUTED, marginTop: 16, lineHeight: 1.6 }}>{sub}</p>}
    </div>
  )
}

// ── The product, as the hero: a real screenshot of the dashboard ─────────────
function AuditPreview() {
  return (
    <div>
      <div className="glass" style={{ border: `1px solid ${BORDER}`, borderRadius: 20, boxShadow: '0 50px 100px -50px rgba(11,40,36,0.45), 0 8px 24px -12px rgba(17,24,39,0.12)', overflow: 'hidden' }}>
        {/* window chrome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 16px', background: 'rgba(244,243,240,0.8)', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
          <span style={{ marginLeft: 10, fontSize: 10.5, color: FAINT, fontFamily: MONO }}>finded.app/dashboard</span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dashboard-hero.png" alt="Finded AI Visibility Dashboard" style={{ display: 'block', width: '100%', height: 'auto' }} />
      </div>
      <p style={{ fontSize: 12, color: FAINT, textAlign: 'center', marginTop: 12 }}>A real Finded dashboard. Yours uses your restaurant&rsquo;s own results.</p>
    </div>
  )
}

export default async function LandingPage() {
  const settings = await getSettings()
  const contactEmail = settings.contactEmail
  const founder = settings.founderName

  const stats = await platformStats().catch(() => null)
  const haveData = !!stats && stats.audits > 0
  const haveBench = !!stats && stats.n >= 20
  const rate = (k: 'restaurant_schema' | 'html_menu' | 'faq_present') => stats ? Math.round((stats.factRates[k] ?? 0) * 100) : 0

  const card = { background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 26 } as const

  const statCards = stats ? [
    { icon: Building2, value: stats.restaurants || stats.audits, label: 'Restaurants analysed' },
    { icon: Search, value: stats.searches, label: 'AI searches performed' },
    { icon: ClipboardCheck, value: stats.audits, label: 'Audits completed' },
    { icon: MapPin, value: stats.cities, label: 'Cities covered' },
    { icon: UtensilsCrossed, value: stats.cuisines, label: 'Cuisine types' },
    { icon: Cpu, value: stats.models, label: 'AI models tested' },
  ] : []

  const measure = [
    { icon: Bot, t: 'AI recommendations', d: 'Which AI models mention your restaurant, and how often.', ex: 'e.g. Claude names you, ChatGPT doesn’t.' },
    { icon: Users, t: 'Competitor comparison', d: 'Which restaurants AI recommends instead of you.', ex: 'e.g. 3 rivals appear in 18/32 searches.' },
    { icon: Globe, t: 'Website analysis', d: 'Schema, menus, crawlability and content.', ex: 'e.g. menu is a PDF AI can’t read.' },
    { icon: MapPin, t: 'Google Business Profile', d: 'Reviews, categories and business attributes.', ex: 'e.g. cuisine category missing.' },
    { icon: FileSearch, t: 'Evidence', d: 'The exact prompts and AI responses behind each finding.', ex: 'e.g. the 12 prompts you’re absent from.' },
    { icon: ListChecks, t: 'Prioritised action plan', d: 'The most important improvements first.', ex: 'e.g. add Restaurant schema — do first.' },
  ]

  return (
    <div id="top" style={{ fontFamily: FONT, background: BG, minHeight: '100vh', WebkitFontSmoothing: 'antialiased', color: INK, position: 'relative', zIndex: 1 }}>

      {/* ── Nav ── */}
      <nav style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${BORDER}`, padding: '0 24px', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5, color: INK, textDecoration: 'none' }}>Finded</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <a href="#measure" className="lnk" style={{ fontSize: 13, fontWeight: 500, color: MUTED, textDecoration: 'none' }}>What we measure</a>
          <a href="#why" className="lnk" style={{ fontSize: 13, fontWeight: 500, color: MUTED, textDecoration: 'none' }}>Why Finded</a>
          <a href="#pricing" className="lnk" style={{ fontSize: 13, fontWeight: 500, color: MUTED, textDecoration: 'none' }}>Pricing</a>
          <a href="#check" className="btn btn-primary" style={{ fontSize: 13, fontWeight: 700, background: GRAPHITE, color: '#fff', padding: '10px 18px', borderRadius: 10, textDecoration: 'none' }}>Check my AI visibility</a>
        </div>
      </nav>

      {/* ── 1. Hero ── */}
      <section className="hero-bg" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: 'clamp(56px, 6.5vw, 104px) 24px 72px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'clamp(40px, 5vw, 72px)', alignItems: 'center' }}>
          <div className="rise">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fff', border: `1px solid ${BORDER}`, color: EMERALD, fontSize: 11.5, fontWeight: 700, padding: '6px 14px', borderRadius: 20, letterSpacing: 0.2, marginBottom: 26, boxShadow: '0 2px 8px -4px rgba(12,31,28,0.12)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: TERRA }} /> The first AI Visibility Platform for restaurants
            </div>
            <h1 style={{ fontSize: 'clamp(38px, 5.6vw, 62px)', fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, marginBottom: 24 }}>
              Every day AI recommends restaurants.<br /><span style={{ color: EMERALD }}>Is yours one of them?</span>
            </h1>
            <p style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: MUTED, lineHeight: 1.62, marginBottom: 32, maxWidth: 560 }}>
              Guests increasingly ask ChatGPT, Claude, Gemini and Perplexity where they should eat. Finded measures
              exactly how those AI systems recommend restaurants, compares you with competitors, and shows what to improve.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="#check" className="btn btn-primary" style={{ background: EMERALD, color: '#fff', fontWeight: 700, fontSize: 15.5, padding: '15px 28px', borderRadius: 12, textDecoration: 'none' }}>Check my AI visibility</a>
              <a href="#sample" className="btn" style={{ background: '#fff', color: INK, fontWeight: 700, fontSize: 15.5, padding: '15px 28px', borderRadius: 12, textDecoration: 'none', border: `1px solid ${BORDER}` }}>See a real audit</a>
            </div>
            <p style={{ fontSize: 13, color: FAINT, marginTop: 20 }}>Free check · no account, no card · results by email</p>
          </div>
          <div id="sample" className="rise rise-2"><AuditPreview /></div>
        </div>
      </section>

      {/* ── 2. Finded Insights — premium stat cards ── */}
      <section className="sand" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '52px 24px' }}>
          <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: EMERALD, textTransform: 'uppercase', letterSpacing: 1.6, marginBottom: 28 }}>Finded Insights · measured continuously</div>
          {haveData ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
              {statCards.map(({ icon: Icon, value, label }) => (
                <div key={label} className="card-fx" style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 18px', textAlign: 'center' }}>
                  <span style={{ display: 'inline-flex', width: 34, height: 34, borderRadius: 9, background: MINT, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Icon style={{ width: 17, height: 17, color: EMERALD }} />
                  </span>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, color: INK }}><CountUp value={value} /></div>
                  <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', fontSize: 15.5, color: MUTED, maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>
              Our dataset grows with every completed audit. Live platform statistics — restaurants analysed, AI
              searches performed, cities and cuisines covered — appear here as the knowledge base fills.
            </p>
          )}
        </div>
      </section>

      {/* ── 3. Why it matters ── */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '92px 24px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(26px, 3.8vw, 36px)', fontWeight: 800, letterSpacing: -1.1, marginBottom: 18, lineHeight: 1.12 }}>
          Guests no longer only search Google.
        </h2>
        <p style={{ fontSize: 18, color: MUTED, lineHeight: 1.65, maxWidth: 620, margin: '0 auto' }}>
          They ask AI where to eat, where to celebrate, which place is romantic. These tools name only a few
          restaurants — if your competitors are mentioned and you aren&rsquo;t, you&rsquo;re missing a discovery
          channel that&rsquo;s quietly growing.
        </p>
      </section>

      {/* ── 4. What your audit measures — feature cards ── */}
      <section id="measure" style={{ maxWidth: 1080, margin: '0 auto', padding: '64px 24px 96px', scrollMarginTop: 64 }}>
        <SectionTitle title="What your audit actually measures" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
          {measure.map(({ icon: Icon, t, d, ex }) => (
            <div key={t} className="card-fx" style={card}>
              <span style={{ display: 'inline-flex', width: 42, height: 42, borderRadius: 12, background: MINT, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Icon style={{ width: 20, height: 20, color: EMERALD }} />
              </span>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: INK, marginBottom: 8 }}>{t}</h3>
              <p style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.55, marginBottom: 12 }}>{d}</p>
              <div style={{ fontSize: 12.5, color: EMERALD, background: SAND, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '7px 10px' }}>{ex}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. Why not just ask ChatGPT? — premium comparison ── */}
      <section id="why" className="mint-tint" style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, scrollMarginTop: 60 }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '92px 24px' }}>
          <SectionTitle title="Why not just ask ChatGPT yourself?" sub="You can — but a single question gives general advice. Finded turns it into measurement." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <div style={{ ...card, background: SAND }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: MUTED, marginBottom: 16 }}>Asking ChatGPT once</div>
              {['General advice', 'No repeated testing', 'No competitor benchmark', 'No historical tracking', 'No restaurant dataset', 'No measurement'].map((x) => (
                <div key={x} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#eceae6', color: FAINT, fontWeight: 800, fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>–</span>
                  <span style={{ fontSize: 14.5, color: MUTED }}>{x}</span>
                </div>
              ))}
            </div>
            <div className="card-fx glow" style={{ ...card, border: `1.5px solid ${EMERALD}`, background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: EMERALD }}>Finded</span>
                <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6, color: '#fff', background: EMERALD, borderRadius: 5, padding: '3px 7px' }}>Measurement</span>
              </div>
              {['Runs dozens of realistic diner prompts', 'Tests four AI models, repeatedly', 'Measures actual AI recommendations', 'Compares you with competitors', 'Analyses your website & structured data', 'Builds recommendations from real audit data'].map((x) => (
                <div key={x} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: MINT, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check style={{ width: 13, height: 13, color: EMERALD }} /></span>
                  <span style={{ fontSize: 14.5, color: INK, fontWeight: 500 }}>{x}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. How it works ── */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '92px 24px' }}>
        <SectionTitle kicker="How it works" title="From your website to evidence-based recommendations" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
          {[
            ['1', 'Website crawl', 'We read your site the way AI does.'],
            ['2', 'AI prompt testing', 'Dozens of real searches across 4 models.'],
            ['3', 'Competitor comparison', 'Who gets named instead, and why.'],
            ['4', 'Evidence', 'The prompts & responses behind each finding.'],
            ['5', 'Recommendations', 'Prioritised, backed by data.'],
            ['6', 'Implementation', 'We help you make the changes.'],
          ].map(([n, t, d]) => (
            <div key={n} className="card-fx" style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 18 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: GRAPHITE, color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>{n}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: INK, marginBottom: 4 }}>{t}</div>
              <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>{d}</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: FAINT, marginTop: 24 }}>Monthly AI visibility monitoring is coming next — so you can track changes over time.</p>
      </section>

      {/* ── 7. Built from real data + what we're learning ── */}
      <section style={{ background: GRAPHITE, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -120, right: -80, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(15,118,110,0.35), transparent 65%)', filter: 'blur(20px)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 940, margin: '0 auto', padding: '100px 24px', color: '#fff', position: 'relative' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#5eead4', textTransform: 'uppercase', letterSpacing: 1.6, marginBottom: 18 }}>Built from real restaurant data</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.1, marginBottom: 20 }}>
            We measure how AI recommends restaurants — and learn from every audit.
          </h2>
          <p style={{ fontSize: 18, color: '#aab4c2', lineHeight: 1.7, marginBottom: 32, maxWidth: 720 }}>
            Every completed audit anonymously sharpens our understanding of how AI discovers restaurants. Recommendations
            become evidence-based over time — drawn from patterns across real restaurants, not general SEO advice.
          </p>

          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7688', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>What we&rsquo;re learning</div>
          {haveBench ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
              {[
                [`${100 - rate('restaurant_schema')}%`, 'are missing Restaurant schema'],
                [`${100 - rate('html_menu')}%`, 'don’t have a crawlable HTML menu'],
                [`${100 - rate('faq_present')}%`, 'have no FAQ content'],
                [`${stats!.pctMentioned != null ? Math.round(stats!.pctMentioned * 100) : 0}%`, 'are recommended by AI at all'],
              ].map(([v, l]) => (
                <div key={l as string} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1, color: '#fff' }}>{v}</div>
                  <div style={{ fontSize: 13, color: '#aab4c2', marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: 20, fontSize: 14.5, color: '#aab4c2', maxWidth: 720 }}>
              As the dataset grows we surface the most common issues here — like how many restaurants are missing
              Restaurant schema, rely on PDF menus, or have no FAQ. These benchmarks become stronger with every audit.
            </div>
          )}
          <p style={{ fontSize: 12, color: '#6b7688', marginTop: 26, lineHeight: 1.6 }}>
            Only aggregate, anonymous statistics — never individual restaurant data. We measure how AI recommends
            restaurants today and help you improve; we don&rsquo;t promise rankings or control AI.
          </p>
        </div>
      </section>

      {/* ── 7b. The data advantage ── */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '96px 24px' }}>
        <SectionTitle kicker="The data advantage" title="Powered by one of the largest restaurant website datasets available"
          sub="Finded doesn’t simply ask ChatGPT. We compare recommendations against thousands of restaurant websites and continuously build benchmark data from every completed audit — a moat that compounds with each one." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
          {[
            { icon: Globe, t: 'Read the way AI reads', d: 'We analyse restaurant websites — schema, menus, crawlability — exactly as AI systems interpret them.' },
            { icon: Search, t: 'Real AI searches, repeated', d: 'Dozens of realistic diner prompts across four models, measured over and over — not a one-off question.' },
            { icon: Database, t: 'Benchmarks that compound', d: 'Every completed audit adds anonymous signals, so our recommendations get sharper over time.' },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="card-fx" style={card}>
              <span style={{ display: 'inline-flex', width: 42, height: 42, borderRadius: 12, background: MINT, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Icon style={{ width: 20, height: 20, color: EMERALD }} />
              </span>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: INK, marginBottom: 8 }}>{t}</h3>
              <p style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.55 }}>{d}</p>
            </div>
          ))}
        </div>
        {haveBench && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginTop: 22 }}>
            {[
              [`${100 - rate('restaurant_schema')}%`, 'are missing Restaurant schema'],
              [`${100 - rate('html_menu')}%`, 'still rely on a non-crawlable menu'],
              [`${100 - rate('faq_present')}%`, 'have no FAQ content'],
            ].map(([v, l]) => (
              <div key={l as string} style={{ ...card, textAlign: 'center' }}>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1, color: EMERALD }}>{v}</div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
        )}
        <p style={{ textAlign: 'center', fontSize: 12.5, color: FAINT, marginTop: 18 }}>Benchmarks are aggregate &amp; anonymous, and grow with every completed audit.</p>
      </section>

      {/* ── 8. Pricing — premium tiers ── */}
      <section id="pricing" className="sand" style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, scrollMarginTop: 58 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 24px' }}>
          <SectionTitle kicker="Pricing" title="Start free. Pay only for more depth." sub="Free tells you whether AI recommends you. The audit explains why. Implementation helps you fix it." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'stretch' }}>
            {[
              { name: 'Free AI Visibility Check', price: '€0', cadence: '', q: 'Is AI recommending my restaurant?', badge: '',
                features: ['Your AI Visibility Dashboard', 'AI visibility status & score', 'Competitors mentioned instead', 'Top 3 findings + website snapshot', 'Download a summary PDF anytime'],
                cta: 'Open my free dashboard', href: '#check', note: 'No account, no card, no obligation.', highlight: false },
              { name: 'AI Visibility Audit', price: '€49', cadence: 'one-time', q: 'Why do competitors appear more often?', badge: 'Most popular',
                features: ['Everything in the free check', 'All four AI models analysed', 'Prompt-level evidence', 'Competitor comparison & why they win', 'Website, menu & structured-data analysis', 'Evidence-backed recommendations', '30-day action plan'],
                cta: 'Get the full audit', href: `mailto:${contactEmail}?subject=AI Visibility Audit`, note: 'Understand exactly why competitors appear more often.', highlight: true },
              { name: 'AI Visibility Implementation', price: '€299', cadence: 'one-time', q: 'Help me actually fix it.', badge: 'Best value',
                features: ['Everything in the audit', 'Restaurant schema implemented', 'FAQ & AI-friendly content', 'Homepage & location improvements', 'Menu & Google Business improvements', 'Follow-up audit (before / after)'],
                cta: 'Discuss implementation', href: `mailto:${contactEmail}?subject=AI Visibility Implementation`, note: 'We make your restaurant easier for AI to understand and recommend.', highlight: false },
            ].map((p) => (
              <div key={p.name} className={p.highlight ? 'card-fx glow' : 'card-fx'} style={{
                background: p.highlight ? GRAPHITE : '#fff', color: p.highlight ? '#fff' : INK,
                border: `1px solid ${p.highlight ? GRAPHITE : BORDER}`, borderRadius: 20, padding: 26,
                display: 'flex', flexDirection: 'column',
              }}>
                {p.badge && <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: p.highlight ? GRAPHITE : EMERALD, background: p.highlight ? '#5eead4' : MINT, padding: '4px 9px', borderRadius: 6, marginBottom: 14 }}>{p.badge}</span>}
                <div style={{ fontSize: 16, fontWeight: 800 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '10px 0 6px' }}>
                  <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1.5 }}>{p.price}</span>
                  {p.cadence && <span style={{ fontSize: 13, color: p.highlight ? '#9aa6b6' : MUTED }}>{p.cadence}</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: p.highlight ? '#5eead4' : EMERALD, marginBottom: 18 }}>{p.q}</div>
                <div style={{ display: 'grid', gap: 10, marginBottom: 22 }}>
                  {p.features.map((f) => (
                    <div key={f} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                      <Check style={{ width: 15, height: 15, color: p.highlight ? '#5eead4' : EMERALD, flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 13.5, color: p.highlight ? '#e6eaf0' : INK, lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <a href={p.href} className={p.highlight ? 'btn btn-emerald' : 'btn btn-primary'} style={{ marginTop: 'auto', textAlign: 'center', textDecoration: 'none', fontWeight: 700, fontSize: 14.5, padding: '14px 16px', borderRadius: 11, background: p.highlight ? '#5eead4' : GRAPHITE, color: p.highlight ? GRAPHITE : '#fff' }}>{p.cta}</a>
                <p style={{ fontSize: 12, color: p.highlight ? '#9aa6b6' : FAINT, marginTop: 12, textAlign: 'center', lineHeight: 1.45 }}>{p.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── Founder — personal, human ── */}
      <section style={{ background: PANEL, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '92px 24px', display: 'flex', gap: 'clamp(24px, 4vw, 48px)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 150, height: 150, borderRadius: 24, background: `linear-gradient(160deg, ${MINT}, #ffffff)`, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 24px 48px -30px rgba(11,93,86,0.35)' }}>
              <span style={{ fontSize: 52, fontWeight: 800, color: EMERALD }}>{founder.charAt(0)}</span>
            </div>
            <span style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: FAINT, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>Photo soon</span>
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: EMERALD, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14 }}>From the founder</div>
            <p style={{ fontSize: 'clamp(20px, 2.4vw, 26px)', color: INK, lineHeight: 1.35, marginBottom: 14, fontWeight: 700, letterSpacing: -0.6 }}>
              “Hi, I&rsquo;m {founder}. I work with restaurants every day — and I built Finded because owners had no way of knowing whether AI recommends them, or their competitors.”
            </p>
            <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.65, marginBottom: 18 }}>
              Every completed audit improves how well we understand the way AI discovers restaurants. It&rsquo;s a small,
              independent platform built in the Netherlands. If you have a question, email me — I read every one.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: INK }}>{founder}</span>
              <span style={{ color: FAINT }}>·</span>
              <a href={`mailto:${contactEmail}`} className="lnk" style={{ fontSize: 14, color: EMERALD, fontWeight: 600, textDecoration: 'none' }}>{contactEmail}</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Lead capture ── */}
      <section id="check" style={{ background: GRAPHITE, position: 'relative', overflow: 'hidden', scrollMarginTop: 58 }}>
        <div style={{ position: 'absolute', bottom: -140, left: -60, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(15,118,110,0.32), transparent 65%)', filter: 'blur(20px)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '96px 24px', textAlign: 'center', position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 800, letterSpacing: -1.1, marginBottom: 14, color: '#fff' }}>See whether AI recommends your restaurant</h2>
          <p style={{ fontSize: 17, color: '#aab4c2', lineHeight: 1.6, marginBottom: 30 }}>Send your website and city, and we&rsquo;ll email you a link to your free AI Visibility Dashboard.</p>
          <div style={{ background: '#fff', borderRadius: 18, padding: 'clamp(20px, 3vw, 28px)', textAlign: 'left', boxShadow: '0 30px 60px -30px rgba(0,0,0,0.5)' }}>
            <LeadForm />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="sand" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '92px 24px' }}>
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
              <details key={q} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px 20px' }}>
                <summary style={{ fontSize: 15, fontWeight: 700, color: INK, cursor: 'pointer', listStyle: 'none' }}>{q}</summary>
                <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, marginTop: 10 }}>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#fff', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px', display: 'flex', flexWrap: 'wrap', gap: 28, justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
