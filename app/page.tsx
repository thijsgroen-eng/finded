import { LeadForm } from '@/components/landing/lead-form'

// ── Palette (beige / black / green, premium) ──────────────────────────────────
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
const AMBER = '#b9770e'

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

function SampleBadge() {
  return (
    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#fff', background: GREEN, padding: '3px 8px', borderRadius: 5 }}>
      Sample
    </span>
  )
}

// ── The above-the-fold product visual: a believable (clearly labelled) report ──
function SampleReportCard() {
  const models = [
    { name: 'ChatGPT', hits: 1, of: 8 },
    { name: 'Claude', hits: 0, of: 8 },
    { name: 'Gemini', hits: 1, of: 8 },
    { name: 'Perplexity', hits: 0, of: 8 },
  ]
  const competitors = [
    { name: 'Trattoria del Centro', n: 11 },
    { name: 'Osteria Amsterdam', n: 9 },
    { name: 'La Vita Italiana', n: 7 },
  ]
  return (
    <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: '0 24px 48px -24px rgba(17,17,16,0.25)', overflow: 'hidden' }}>
      {/* header */}
      <div style={{ background: INK, color: '#fff', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Trattoria Bella · Amsterdam</div>
          <div style={{ fontSize: 10, color: '#9b9a96', textTransform: 'uppercase', letterSpacing: 1 }}>AI Visibility Report</div>
        </div>
        <SampleBadge />
      </div>

      <div style={{ padding: 18, display: 'grid', gap: 16 }}>
        {/* score row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 78, height: 78, borderRadius: '50%', flexShrink: 0, background: `conic-gradient(${RED} 0 34%, #eee 34% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: PANEL, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: INK, lineHeight: 1 }}>34</span>
              <span style={{ fontSize: 9, color: FAINT }}>/ 100</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>Mentioned in 2 of 32 AI answers</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>across 8 prompts × 4 AI models</div>
            <div style={{ fontSize: 11, color: RED, fontWeight: 600, marginTop: 4 }}>Low visibility — high opportunity</div>
          </div>
        </div>

        {/* per-model */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {models.map((m) => {
            const ok = m.hits > 0
            return (
              <div key={m.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '7px 10px' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: INK }}>{m.name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: ok ? DGREEN : RED }}>{m.hits}/{m.of}</span>
              </div>
            )
          })}
        </div>

        {/* competitors */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: FAINT, marginBottom: 6 }}>Recommended instead of you</div>
          {competitors.map((c) => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${BG}` }}>
              <span style={{ fontSize: 12, color: INK }}>{c.name}</span>
              <span style={{ fontSize: 11, color: MUTED }}>{c.n} mentions</span>
            </div>
          ))}
        </div>

        {/* signals + fix */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: RED, background: '#fbecea', borderRadius: 6, padding: '4px 8px' }}>✕ Restaurant schema missing</span>
          <span style={{ fontSize: 11, color: AMBER, background: '#fdf3e3', borderRadius: 6, padding: '4px 8px' }}>! Opening hours weak</span>
          <span style={{ fontSize: 11, color: DGREEN, background: LGREEN, borderRadius: 6, padding: '4px 8px' }}>✓ 5 fixes ready</span>
        </div>
      </div>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 13, fontWeight: 600, color: DGREEN, background: LGREEN, border: `1px solid #d4ede2`, borderRadius: 20, padding: '7px 14px' }}>
      {children}
    </span>
  )
}

function SectionTitle({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 40, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>
      {kicker && <div style={{ fontSize: 11, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{kicker}</div>}
      <h2 style={{ fontSize: 'clamp(24px, 3.6vw, 34px)', fontWeight: 800, letterSpacing: -0.8, color: INK }}>{title}</h2>
      {sub && <p style={{ fontSize: 16, color: MUTED, marginTop: 12, lineHeight: 1.6 }}>{sub}</p>}
    </div>
  )
}

export default function LandingPage() {
  return (
    <div style={{ fontFamily: FONT, background: BG, minHeight: '100vh', WebkitFontSmoothing: 'antialiased', color: INK }}>

      {/* ── Nav ── */}
      <nav style={{ background: 'rgba(250,250,248,0.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${BORDER}`, padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>Finded</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="#sample" style={{ fontSize: 13, fontWeight: 500, color: MUTED, textDecoration: 'none' }}>Sample report</a>
          <a href="#check" style={{ fontSize: 13, fontWeight: 700, background: INK, color: '#fff', padding: '8px 16px', borderRadius: 7, textDecoration: 'none' }}>Get your free audit</a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(40px, 6vw, 72px) 24px 56px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'clamp(32px, 5vw, 56px)', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-block', background: LGREEN, color: DGREEN, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 20 }}>
            Built for restaurants · Netherlands
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 50px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.5, marginBottom: 18 }}>
            Is your restaurant showing up when guests ask <span style={{ color: GREEN }}>AI</span> where to eat?
          </h1>
          <p style={{ fontSize: 'clamp(16px, 2vw, 18px)', color: MUTED, lineHeight: 1.6, marginBottom: 28, maxWidth: 520 }}>
            We test how ChatGPT, Claude, Gemini and Perplexity recommend restaurants in your city — then show
            which competitors appear instead of you, and exactly what to fix on your website.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="#check" style={{ background: INK, color: '#fff', padding: '14px 26px', borderRadius: 8, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
              Get your free AI visibility audit →
            </a>
            <a href="#sample" style={{ background: 'transparent', color: INK, padding: '14px 22px', borderRadius: 8, fontSize: 15, fontWeight: 600, textDecoration: 'none', border: `1px solid ${BORDER}` }}>
              View sample report
            </a>
          </div>
          <p style={{ fontSize: 12, color: FAINT, marginTop: 16 }}>Free · Dutch &amp; English prompts · report sent to your inbox</p>
        </div>
        <div>
          <SampleReportCard />
        </div>
      </section>

      {/* ── AI platform strip + what we test ── */}
      <div style={{ background: PANEL, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px' }}>
          <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
            We test your visibility across
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(16px, 4vw, 44px)', flexWrap: 'wrap', marginBottom: 18 }}>
            {['ChatGPT', 'Claude', 'Gemini', 'Perplexity'].map((m) => (
              <span key={m} style={{ fontSize: 'clamp(16px, 2.4vw, 22px)', fontWeight: 800, color: INK, letterSpacing: -0.4 }}>{m}</span>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            {['Dutch prompts', 'English prompts', 'City-based searches', 'Cuisine-based searches'].map((t) => (
              <span key={t} style={{ fontSize: 13, color: MUTED, background: BG, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '5px 12px' }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pain ── */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(22px, 3.4vw, 30px)', fontWeight: 800, letterSpacing: -0.6, marginBottom: 16, lineHeight: 1.2 }}>
          Guests no longer only search Google Maps.<br />
          <span style={{ color: GREEN }}>They ask AI where to eat tonight.</span>
        </h2>
        <p style={{ fontSize: 17, color: MUTED, lineHeight: 1.65, maxWidth: 600, margin: '0 auto' }}>
          When ChatGPT or Gemini names three restaurants for &ldquo;beste Italiaans in Amsterdam&rdquo; and
          yours isn&rsquo;t one of them, you&rsquo;re invisible in a fast-growing discovery channel — and you
          can&rsquo;t fix what you can&rsquo;t see.
        </p>
      </section>

      {/* ── What your audit shows (4 cards = sample report preview) ── */}
      <section id="sample" style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px' }}>
        <SectionTitle
          kicker="Your report"
          title="What your audit shows"
          sub="A concrete deliverable — not a score in a vacuum. Every number traces back to the AI answers we recorded."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
          {/* 1. Visibility score */}
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: FAINT }}>Visibility score</span>
              <SampleBadge />
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, color: RED, lineHeight: 1 }}>34<span style={{ fontSize: 16, color: FAINT, fontWeight: 600 }}>/100</span></div>
            <p style={{ fontSize: 13, color: MUTED, marginTop: 8 }}>Mentioned in 2 of 32 answers · 1 of 4 models · confidence band shown.</p>
          </div>

          {/* 2. Prompt evidence */}
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: FAINT }}>Prompt evidence</span>
            <div style={{ marginTop: 12, display: 'grid', gap: 7 }}>
              {[['"beste Italiaans Amsterdam"', false], ['"romantisch diner centrum"', false], ['"waar pasta eten Amsterdam"', true]].map(([q, hit]) => (
                <div key={q as string} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: hit ? DGREEN : RED, fontWeight: 700, fontSize: 13 }}>{hit ? '✓' : '✕'}</span>
                  <span style={{ fontSize: 12, color: INK }}>{q}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: MUTED, marginTop: 10 }}>Exact prompt, model, and whether you appeared.</p>
          </div>

          {/* 3. Competitors */}
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: FAINT }}>Competitors AI picks instead</span>
            <div style={{ marginTop: 12, display: 'grid', gap: 7 }}>
              {[['Trattoria del Centro', 11], ['Osteria Amsterdam', 9], ['La Vita Italiana', 7]].map(([n, c]) => (
                <div key={n as string} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: INK }}>{n}</span>
                  <span style={{ fontSize: 12, color: MUTED }}>{c}×</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: MUTED, marginTop: 10 }}>Who gets recommended, by which model, how often.</p>
          </div>

          {/* 4. Recommended fixes */}
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: FAINT }}>Recommended fixes</span>
            <div style={{ marginTop: 12, display: 'grid', gap: 7 }}>
              {['Add Restaurant schema markup', 'Make the menu crawlable', 'Add an FAQ with cuisine + city'].map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: DGREEN, fontWeight: 700, fontSize: 13 }}>→</span>
                  <span style={{ fontSize: 12, color: INK }}>{f}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: MUTED, marginTop: 10 }}>Prioritised, copy-paste-ready, tied to the evidence.</p>
          </div>
        </div>

        {/* outcome-focused proof chips */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 28 }}>
          {['8 Dutch dining prompts', '4 AI platforms tested', 'Competitor mention tracking', 'Website signal scan', 'Structured-data analysis', 'Fix-ready recommendations'].map((c) => (
            <Chip key={c}>{c}</Chip>
          ))}
        </div>
      </section>

      {/* ── Before / After ── */}
      <section style={{ background: PANEL, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '56px 24px' }}>
          <SectionTitle kicker="Example" title="From invisible to recommended" sub="An illustrative example of how fixing website signals changes AI visibility." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, alignItems: 'stretch' }}>
            {/* before */}
            <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: RED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Before</div>
              <p style={{ fontSize: 14, color: INK, marginBottom: 6 }}>Not mentioned for:</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: INK }}>&ldquo;beste Italiaans restaurant Amsterdam&rdquo;</p>
              <p style={{ fontSize: 13, color: MUTED, marginTop: 10 }}>0 of 4 models named the restaurant. Schema missing, menu not crawlable.</p>
            </div>
            {/* fixes */}
            <div style={{ background: INK, color: '#fff', borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: GREEN, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Fixes applied</div>
              {['Added Restaurant structured data', 'Added FAQ content (cuisine + city)', 'Improved location-specific copy'].map((f) => (
                <div key={f} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span style={{ color: GREEN }}>✓</span><span style={{ fontSize: 13, color: '#e7e6e2' }}>{f}</span>
                </div>
              ))}
            </div>
            {/* after */}
            <div style={{ background: LGREEN, border: `1px solid #cde9dd`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: DGREEN, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>After</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: INK }}>Visibility improved across tracked prompts</p>
              <p style={{ fontSize: 13, color: DGREEN, marginTop: 10 }}>Now named by multiple models for cuisine + city queries.</p>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: 12, color: FAINT, marginTop: 16 }}>Illustrative demonstration — your report shows your own measured results.</p>
        </div>
      </section>

      {/* ── Methodology ── */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px', textAlign: 'center' }}>
        <SectionTitle kicker="Methodology" title="Measured, not guessed" />
        <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.7 }}>
          We run a controlled set of realistic Dutch and English prompts across the major AI tools.
          AI responses can vary over time, so we measure visibility across <strong style={{ color: INK }}>multiple
          prompts and models</strong> — with a confidence band — rather than claiming a single exact ranking.
          Every figure in your report links back to the actual answers we recorded.
        </p>
      </section>

      {/* ── Lead capture ── */}
      <section id="check" style={{ background: PANEL, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, letterSpacing: -0.8, marginBottom: 12 }}>
            See your restaurant&rsquo;s AI visibility
          </h2>
          <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.6, marginBottom: 28 }}>
            Enter your website and we&rsquo;ll prepare your free report and email the results.
          </p>
          <LeadForm />
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px' }}>
        <SectionTitle kicker="FAQ" title="Questions, answered" />
        <div style={{ display: 'grid', gap: 12 }}>
          {[
            ['What exactly do I get?', 'A report showing your AI visibility score, the exact prompts and models you were (or weren’t) named in, the competitors AI recommends instead, your website signal scan, and prioritised fixes.'],
            ['How is this measured?', 'We send a controlled set of realistic Dutch and English diner prompts to ChatGPT, Claude, Gemini and Perplexity, repeat them, and record who gets named — with a confidence band.'],
            ['Can AI answers change over time?', 'Yes — that’s why we sample multiple prompts and models instead of claiming one fixed ranking, and we re-measure on each audit so you can track change.'],
            ['Is it really free?', 'The initial AI visibility audit is free. We email you the results.'],
            ['What do you need from me?', 'Just your restaurant website, city, and an email to send the report to.'],
            ['What do you do with my data?', 'We use your details only to prepare and send your audit. We don’t sell your data.'],
          ].map(([q, a]) => (
            <details key={q} style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 18px' }}>
              <summary style={{ fontSize: 15, fontWeight: 700, color: INK, cursor: 'pointer', listStyle: 'none' }}>{q}</summary>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, marginTop: 10 }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: INK, color: '#cdccc7' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px', display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ maxWidth: 300 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Finded</div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#9b9a96' }}>
              AI visibility audits built for restaurants in the Netherlands. See how ChatGPT, Claude,
              Gemini and Perplexity recommend restaurants in your city — and what to fix.
            </p>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.9 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#75746f', marginBottom: 6 }}>Get started</div>
            <a href="#check" style={{ color: '#cdccc7', textDecoration: 'none', display: 'block' }}>Free AI visibility audit</a>
            <a href="#sample" style={{ color: '#cdccc7', textDecoration: 'none', display: 'block' }}>Sample report</a>
            <a href="/audit" style={{ color: '#cdccc7', textDecoration: 'none', display: 'block' }}>Full request form</a>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.9 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#75746f', marginBottom: 6 }}>Contact</div>
            <a href="mailto:hello@finded.app" style={{ color: '#cdccc7', textDecoration: 'none', display: 'block' }}>hello@finded.app</a>
            <p style={{ color: '#75746f', maxWidth: 240, marginTop: 8, lineHeight: 1.5 }}>
              Privacy: we use your details only to prepare and send your audit, and never sell your data.
            </p>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #2a2a28', padding: '16px 24px', textAlign: 'center', fontSize: 12, color: '#75746f' }}>
          © {2026} Finded · Built for restaurants in the Netherlands
        </div>
      </footer>
    </div>
  )
}
