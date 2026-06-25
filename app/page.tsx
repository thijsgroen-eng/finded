import { LeadForm } from '@/components/landing/lead-form'

// ── Palette (beige / black / green) ───────────────────────────────────────────
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

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

// ── Contact / founder ─────────────────────────────────────────────────────────
const CONTACT_EMAIL = 'Info@finded.com'
const FOUNDER = 'Thijs'

function SectionTitle({ kicker, title, sub, align = 'center' }: { kicker?: string; title: string; sub?: string; align?: 'center' | 'left' }) {
  const centered = align === 'center'
  return (
    <div style={{ textAlign: align, marginBottom: 36, maxWidth: 660, marginLeft: centered ? 'auto' : 0, marginRight: centered ? 'auto' : 0 }}>
      {kicker && <div style={{ fontSize: 11, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{kicker}</div>}
      <h2 style={{ fontSize: 'clamp(23px, 3.4vw, 31px)', fontWeight: 800, letterSpacing: -0.7, color: INK, lineHeight: 1.2 }}>{title}</h2>
      {sub && <p style={{ fontSize: 16, color: MUTED, marginTop: 12, lineHeight: 1.6 }}>{sub}</p>}
    </div>
  )
}

// ── The four AI platforms we test, as clean wordmarks (no copyrighted logos) ──
const PLATFORMS: { name: string; dot: string }[] = [
  { name: 'ChatGPT', dot: '#10a37f' },
  { name: 'Claude', dot: '#d97757' },
  { name: 'Gemini', dot: '#4285f4' },
  { name: 'Perplexity', dot: '#20808d' },
]

function PlatformMark({ name, dot }: { name: string; dot: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: dot, display: 'inline-block' }} />
      <span style={{ fontSize: 15, fontWeight: 700, color: INK, letterSpacing: -0.2 }}>{name}</span>
    </span>
  )
}

// ── A realistic audit preview that reads like a one-page report, not a dashboard ─
function AuditPreview({ size = 'compact' }: { size?: 'compact' | 'large' }) {
  const large = size === 'large'
  const competitors = ['Restaurant A', 'Restaurant B', 'Restaurant C']
  const findings = large
    ? [
        'Your website was never cited as a source.',
        'Competitors have stronger cuisine positioning.',
        'Menu content is hard for AI systems to read.',
      ]
    : [
        'Website not cited by AI',
        'Competitors have stronger location signals',
        'FAQ content missing',
      ]

  const Label = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: MONO }}>{children}</div>
  )
  const Divider = () => <div style={{ height: 1, background: BORDER, margin: large ? '18px 0' : '14px 0' }} />

  return (
    <div>
      <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, boxShadow: '0 24px 56px -32px rgba(17,17,16,0.28)', overflow: 'hidden' }}>
        {/* Report header */}
        <div style={{ padding: large ? '18px 24px' : '14px 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: GREEN }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: INK, letterSpacing: -0.2 }}>Finded</span>
            <span style={{ fontSize: 11, color: FAINT }}>· AI visibility report</span>
          </span>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: FAINT, border: `1px solid ${BORDER}`, borderRadius: 5, padding: '3px 7px' }}>Example</span>
        </div>

        <div style={{ padding: large ? '22px 24px 24px' : '16px 18px 18px' }}>
          {/* Restaurant + status */}
          <Label>Restaurant</Label>
          <div style={{ fontSize: large ? 20 : 17, fontWeight: 800, color: INK, marginTop: 3, letterSpacing: -0.4 }}>Restaurant Name</div>

          <div style={{ marginTop: large ? 16 : 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <Label>AI visibility status</Label>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 5, background: LRED, border: `1px solid #f0cfc9`, borderRadius: 8, padding: '6px 12px' }}>
                <span style={{ color: RED, fontWeight: 800 }}>✕</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: RED }}>Not recommended</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Label>Appeared in</Label>
              <div style={{ marginTop: 5, fontSize: large ? 18 : 16, fontWeight: 800, color: INK }}>
                2 <span style={{ color: FAINT, fontWeight: 600 }}>of</span> 32 <span style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>prompts</span>
              </div>
            </div>
          </div>

          <Divider />

          {/* Competitors */}
          <Label>Top competitors mentioned instead</Label>
          <div style={{ display: 'grid', gap: large ? 8 : 6, marginTop: 10 }}>
            {competitors.map((c, i) => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: BG, border: `1px solid ${BORDER}`, fontSize: 10, fontWeight: 800, color: MUTED, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>{c}</span>
              </div>
            ))}
          </div>

          <Divider />

          {/* Findings */}
          <Label>Top findings</Label>
          <div style={{ display: 'grid', gap: large ? 9 : 7, marginTop: 10 }}>
            {findings.map((f) => (
              <div key={f} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <span style={{ color: RED, fontWeight: 800, fontSize: 13, lineHeight: 1.45 }}>✕</span>
                <span style={{ fontSize: 14, color: INK, lineHeight: 1.45 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: FAINT, textAlign: 'center', marginTop: 10 }}>
        Illustrative example. Your report uses your restaurant&rsquo;s real results.
      </p>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div id="top" style={{ fontFamily: FONT, background: BG, minHeight: '100vh', WebkitFontSmoothing: 'antialiased', color: INK }}>

      {/* ── Nav ── */}
      <nav style={{ background: 'rgba(250,250,248,0.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${BORDER}`, padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5, color: INK, textDecoration: 'none' }}>Finded</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <a href="#sample" style={{ fontSize: 13, fontWeight: 500, color: MUTED, textDecoration: 'none' }}>Sample audit</a>
          <a href="#how" style={{ fontSize: 13, fontWeight: 500, color: MUTED, textDecoration: 'none' }}>How it works</a>
          <a href="#pricing" style={{ fontSize: 13, fontWeight: 500, color: MUTED, textDecoration: 'none' }}>Pricing</a>
          <a href="#check" style={{ fontSize: 13, fontWeight: 700, background: INK, color: '#fff', padding: '8px 16px', borderRadius: 7, textDecoration: 'none' }}>Free visibility check</a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(40px, 5vw, 68px) 24px 52px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'clamp(32px, 5vw, 56px)', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-block', background: LGREEN, color: DGREEN, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, letterSpacing: 0.4, marginBottom: 20 }}>
            AI visibility audits for restaurants
          </div>
          <h1 style={{ fontSize: 'clamp(30px, 4.6vw, 46px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.3, marginBottom: 18 }}>
            Is your restaurant showing up when guests ask AI where to eat?
          </h1>
          <p style={{ fontSize: 'clamp(16px, 2vw, 18px)', color: MUTED, lineHeight: 1.6, marginBottom: 26, maxWidth: 540 }}>
            We test ChatGPT, Claude, Gemini and Perplexity to see whether your restaurant gets recommended,
            which competitors appear instead, and what you can do to improve visibility.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="#check" style={{ background: INK, color: '#fff', fontWeight: 700, fontSize: 15, padding: '13px 22px', borderRadius: 9, textDecoration: 'none' }}>
              Get free AI visibility check
            </a>
            <a href="#sample" style={{ background: PANEL, color: INK, fontWeight: 700, fontSize: 15, padding: '13px 22px', borderRadius: 9, textDecoration: 'none', border: `1px solid ${BORDER}` }}>
              View sample audit
            </a>
          </div>
          <p style={{ fontSize: 13, color: FAINT, marginTop: 16 }}>
            Free check · no account, no card · results by email
          </p>
        </div>
        <AuditPreview size="compact" />
      </section>

      {/* ── Trust: platforms tested ── */}
      <section style={{ background: PANEL, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 18 }}>Tested across major AI platforms</div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'clamp(20px, 5vw, 44px)', flexWrap: 'wrap' }}>
            {PLATFORMS.map((p) => <PlatformMark key={p.name} {...p} />)}
          </div>
          <p style={{ fontSize: 13, color: MUTED, marginTop: 18 }}>Real Dutch and English restaurant searches.</p>
        </div>
      </section>

      {/* ── The problem ── */}
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px 16px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(22px, 3.3vw, 30px)', fontWeight: 800, letterSpacing: -0.6, marginBottom: 16, lineHeight: 1.2 }}>
          Guests no longer only search Google.
        </h2>
        <p style={{ fontSize: 17, color: MUTED, lineHeight: 1.65, maxWidth: 620, margin: '0 auto 22px' }}>
          More people now ask AI tools where to eat, where to celebrate a birthday, which restaurants are
          romantic, or which places locals recommend. If competitors are being named and your restaurant is
          not, you may be missing visibility in a growing discovery channel.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          {['"Beste Italiaans restaurant Haarlem"', '"Waar kan ik een verjaardag vieren in Amsterdam?"', '"Romantisch restaurant Utrecht"'].map((q) => (
            <span key={q} style={{ fontSize: 13, color: INK, background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '7px 12px', fontWeight: 600 }}>{q}</span>
          ))}
        </div>
      </section>

      {/* ── What your audit shows (4 evidence cards) ── */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '56px 24px' }}>
        <SectionTitle kicker="What your audit shows" title="Four questions, answered with evidence" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {[
            ['01', 'Are you recommended?', 'See whether AI tools mention your restaurant when guests ask where to eat.'],
            ['02', 'Who gets recommended instead?', 'See which competitors appear more often than you do.'],
            ['03', 'Why are they winning?', 'Compare visibility signals, website content and authority indicators.'],
            ['04', 'What should you fix?', 'Get a short, prioritised list of practical recommendations.'],
          ].map(([n, q, a]) => (
            <div key={q as string} style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: GREEN, fontFamily: MONO, marginBottom: 12 }}>{n}</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: INK, marginBottom: 8, lineHeight: 1.3 }}>{q}</h3>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.55 }}>{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sample audit (the strongest section) ── */}
      <section id="sample" style={{ background: PANEL, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, scrollMarginTop: 58 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'clamp(32px, 5vw, 52px)', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Sample audit</div>
            <h2 style={{ fontSize: 'clamp(23px, 3.4vw, 31px)', fontWeight: 800, letterSpacing: -0.7, lineHeight: 1.2, marginBottom: 16 }}>
              This is what you receive
            </h2>
            <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.65, marginBottom: 18 }}>
              A clear, plain-language report — not a dashboard to learn. You see your AI visibility status,
              how many searches you appeared in, which competitors were named instead, and the specific
              reasons behind it.
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                ['Visibility status', 'Not recommended'],
                ['Coverage', 'Appeared in 2 of 32 prompts'],
                ['Competitors named instead', 'Restaurant A, Restaurant B, Restaurant C'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: FAINT, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 150 }}>{k}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>{v}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, color: FAINT, marginTop: 18, lineHeight: 1.6 }}>
              Example figures shown for illustration. Every report is built from your restaurant&rsquo;s
              actual results — we never invent scores or statistics.
            </p>
          </div>
          <AuditPreview size="large" />
        </div>
      </section>

      {/* ── How the audit works ── */}
      <section id="how" style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px', scrollMarginTop: 64 }}>
        <SectionTitle kicker="How we test" title="How the audit works" />
        <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.75, textAlign: 'left' }}>
          We run a controlled set of realistic Dutch and English restaurant searches across ChatGPT, Claude,
          Gemini and Perplexity. Because AI answers vary, we measure visibility across multiple prompts and
          models rather than claiming a fixed ranking. Then we compare you against the restaurants that
          <em> do</em> get named, and explain — in plain language — what may be holding you back.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 26 }}>
          {[
            ['4 AI platforms', 'ChatGPT, Claude, Gemini, Perplexity'],
            ['2 languages', 'Dutch and English searches'],
            ['Multiple prompts', 'Repeated so it isn’t a one-off'],
            ['Evidence-based', 'No fixed rankings, no guesses'],
          ].map(([t, d]) => (
            <div key={t as string} style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginBottom: 4 }}>{t}</div>
              <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.45 }}>{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ background: PANEL, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, scrollMarginTop: 58 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '60px 24px' }}>
          <SectionTitle kicker="Pricing" title="Start free. Pay only if you want more." sub="Free tells you whether you’re visible. The audit explains why. The implementation package helps you fix it." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, alignItems: 'stretch' }}>
            {[
              {
                name: 'Free check', price: '€0', cadence: '',
                question: 'Am I visible?',
                features: ['AI visibility status', 'Visibility snapshot', 'Competitors mentioned instead', 'Top 3 findings', 'Website signal snapshot'],
                cta: 'Get free AI visibility check', href: '#check', note: 'No account, no card, no obligation.', highlight: false,
              },
              {
                name: 'Full AI visibility audit', price: '€49', cadence: 'one-time',
                question: 'Why am I not visible?',
                features: [
                  'Everything in Free check',
                  'ChatGPT, Claude, Gemini & Perplexity analysis',
                  'Dutch & English prompt analysis',
                  'Prompt-level evidence',
                  'Competitor comparison & why competitors win',
                  'Sources AI relied on',
                  'Website & menu discoverability analysis',
                  'Authority & structured-data review',
                  'Prioritised recommendations',
                  '30-day action plan',
                ],
                cta: 'Request the full audit', href: `mailto:${CONTACT_EMAIL}?subject=Full AI Visibility Audit`, note: 'For restaurants that want to understand why competitors appear more often.', highlight: true,
              },
              {
                name: 'Implementation package', price: '€299', cadence: 'one-time',
                question: 'Help me fix it.',
                features: [
                  'Everything identified in the audit',
                  'Structured-data package',
                  'FAQ content package',
                  'Website improvement recommendations',
                  'Local authority improvement plan',
                  'Competitor positioning guidance',
                  'Priority roadmap',
                  'Follow-up visibility check',
                ],
                cta: 'Discuss implementation', href: `mailto:${CONTACT_EMAIL}?subject=AI Visibility Implementation Package`, note: 'For restaurants that want help putting the recommendations into practice.', highlight: false,
              },
            ].map((p) => (
              <div key={p.name} style={{
                background: p.highlight ? INK : BG, color: p.highlight ? '#fff' : INK,
                border: `1px solid ${p.highlight ? INK : BORDER}`, borderRadius: 16, padding: 24,
                display: 'flex', flexDirection: 'column', boxShadow: p.highlight ? '0 28px 56px -30px rgba(17,17,16,0.45)' : 'none',
              }}>
                {p.highlight && <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: INK, background: GREEN, padding: '3px 8px', borderRadius: 5, marginBottom: 12 }}>Most popular</span>}
                <div style={{ fontSize: 16, fontWeight: 800 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '8px 0 6px' }}>
                  <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1 }}>{p.price}</span>
                  {p.cadence && <span style={{ fontSize: 13, color: p.highlight ? '#b9b8b3' : MUTED }}>{p.cadence}</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: p.highlight ? GREEN : DGREEN, marginBottom: 16 }}>{p.question}</div>
                <div style={{ display: 'grid', gap: 9, marginBottom: 20 }}>
                  {p.features.map((f) => (
                    <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: GREEN, fontWeight: 800, fontSize: 13, lineHeight: 1.5 }}>✓</span>
                      <span style={{ fontSize: 13.5, color: p.highlight ? '#e7e6e2' : INK, lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <a href={p.href} style={{
                  marginTop: 'auto', textAlign: 'center', textDecoration: 'none', fontWeight: 700, fontSize: 14,
                  padding: '13px 16px', borderRadius: 9,
                  background: p.highlight ? '#fff' : INK, color: p.highlight ? INK : '#fff',
                }}>{p.cta}</a>
                <p style={{ fontSize: 12, color: p.highlight ? '#b9b8b3' : FAINT, marginTop: 10, textAlign: 'center', lineHeight: 1.45 }}>{p.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Founder ── */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 'clamp(24px, 4vw, 36px)', display: 'flex', gap: 'clamp(20px, 4vw, 32px)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Photo placeholder */}
          <div style={{ width: 92, height: 92, borderRadius: '50%', background: LGREEN, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 30, fontWeight: 800, color: DGREEN }}>{FOUNDER.charAt(0)}</span>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Why I built Finded</div>
            <p style={{ fontSize: 17, color: INK, lineHeight: 1.65, marginBottom: 12 }}>
              Restaurant owners spend a lot of time improving their Google visibility, but almost nobody knows
              whether AI tools recommend their restaurant. I built Finded to make that visible — clearly,
              honestly, and without the jargon.
            </p>
            <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.6, marginBottom: 14 }}>
              It&rsquo;s a small, independent project based in the Netherlands — not an agency, and not a
              marketing machine. If you have a question, I read every email.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: INK }}>{FOUNDER}</span>
              <span style={{ color: FAINT }}>·</span>
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ fontSize: 14, color: DGREEN, fontWeight: 600, textDecoration: 'none' }}>{CONTACT_EMAIL}</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Lead capture ── */}
      <section id="check" style={{ background: INK, scrollMarginTop: 58 }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(23px, 3.6vw, 31px)', fontWeight: 800, letterSpacing: -0.6, marginBottom: 12, color: '#fff' }}>
            See whether AI recommends your restaurant
          </h2>
          <p style={{ fontSize: 16, color: '#b9b8b3', lineHeight: 1.6, marginBottom: 26 }}>
            Send your website and city, and we&rsquo;ll email you your free AI visibility check — no account, no card.
          </p>
          <div style={{ background: BG, borderRadius: 16, padding: 'clamp(18px, 3vw, 26px)', textAlign: 'left' }}>
            <LeadForm />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px' }}>
        <SectionTitle kicker="FAQ" title="A few honest answers" />
        <div style={{ display: 'grid', gap: 12 }}>
          {[
            ['Is the check really free?', 'Yes — the initial check is free and we email you the results. No account, no card, no obligation.'],
            ['How do you test this?', 'We ask the major AI tools the kinds of questions guests actually ask — in Dutch and English — and record whether your restaurant appears, repeated across several prompts and models.'],
            ['Can AI answers change?', 'They can, and they do. That’s why we measure across multiple prompts and models and treat the result as a snapshot, not a fixed ranking.'],
            ['What do you need from me?', 'Just your restaurant’s website, your city, and an email address to send the results to.'],
            ['What do you do with my details?', 'We only use them to prepare and send your report. We don’t sell your data or add you to a mailing list.'],
            ['Who’s behind this?', `Finded is a small, independent project based in the Netherlands, run by ${FOUNDER}. You can reach us directly at ${CONTACT_EMAIL}.`],
          ].map(([q, a]) => (
            <details key={q} style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 18px' }}>
              <summary style={{ fontSize: 15, fontWeight: 700, color: INK, cursor: 'pointer', listStyle: 'none' }}>{q}</summary>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, marginTop: 10 }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: PANEL, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px', display: 'flex', flexWrap: 'wrap', gap: 28, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ maxWidth: 320 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: INK, marginBottom: 8 }}>Finded</div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: MUTED }}>
              Built for restaurants in the Netherlands. We check whether ChatGPT, Claude, Gemini and
              Perplexity recommend your restaurant — and what to do about it.
            </p>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.9 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FAINT, marginBottom: 6 }}>Get started</div>
            <a href="#check" style={{ color: INK, textDecoration: 'none', display: 'block' }}>Free visibility check</a>
            <a href="#sample" style={{ color: INK, textDecoration: 'none', display: 'block' }}>Sample audit</a>
            <a href="#pricing" style={{ color: INK, textDecoration: 'none', display: 'block' }}>Pricing</a>
            <a href="#how" style={{ color: INK, textDecoration: 'none', display: 'block' }}>How it works</a>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.9 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FAINT, marginBottom: 6 }}>Company</div>
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: INK, textDecoration: 'none', display: 'block' }}>{CONTACT_EMAIL}</a>
            <a href="/privacy" style={{ color: INK, textDecoration: 'none', display: 'block' }}>Privacy policy</a>
            <a href="/terms" style={{ color: INK, textDecoration: 'none', display: 'block' }}>Terms</a>
            <div style={{ color: MUTED, marginTop: 6 }}>Founded by {FOUNDER} · Netherlands</div>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: '16px 24px', textAlign: 'center', fontSize: 12, color: FAINT }}>
          © {2026} Finded · Built for restaurants in the Netherlands
        </div>
      </footer>
    </div>
  )
}
