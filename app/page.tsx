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

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

// ── Contact ───────────────────────────────────────────────────────────────────
const CONTACT_EMAIL = 'Info@finded.com'

function SectionTitle({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 36, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>
      {kicker && <div style={{ fontSize: 11, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{kicker}</div>}
      <h2 style={{ fontSize: 'clamp(23px, 3.4vw, 31px)', fontWeight: 800, letterSpacing: -0.7, color: INK }}>{title}</h2>
      {sub && <p style={{ fontSize: 16, color: MUTED, marginTop: 12, lineHeight: 1.6 }}>{sub}</p>}
    </div>
  )
}

// ── A real AI conversation (clearly labelled example) ─────────────────────────
function ConversationMock() {
  const answer = [
    ['Ristorante Toscana', 'Authentic Tuscan cooking near the Grote Markt.'],
    ['Trattoria da Marco', 'Family-run, known for fresh pasta.'],
    ['Osteria Verde', 'Cosy spot popular for date nights.'],
  ]
  return (
    <div>
      <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: '0 24px 48px -28px rgba(17,17,16,0.22)', overflow: 'hidden' }}>
        <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#10a37f', color: '#fff', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>C</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>ChatGPT</span>
          </span>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: FAINT }}>Example</span>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 14 }}>
          {/* user */}
          <div style={{ alignSelf: 'flex-end', maxWidth: '85%', background: INK, color: '#fff', borderRadius: '12px 12px 4px 12px', padding: '10px 14px', fontSize: 14, justifySelf: 'end' }}>
            Wat is een goed Italiaans restaurant in Haarlem?
          </div>
          {/* assistant */}
          <div style={{ maxWidth: '92%', background: BG, border: `1px solid ${BORDER}`, borderRadius: '12px 12px 12px 4px', padding: '12px 14px' }}>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 8 }}>Een paar aanraders in Haarlem:</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {answer.map(([n, d], i) => (
                <div key={n} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>{i + 1}.</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{n}</div>
                    <div style={{ fontSize: 12, color: MUTED }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* verdict */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fbecea', border: '1px solid #f0cfc9', borderRadius: 10, padding: '10px 14px' }}>
            <span style={{ color: RED, fontWeight: 800 }}>✕</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: RED }}>Your restaurant wasn&rsquo;t mentioned.</span>
          </div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: FAINT, textAlign: 'center', marginTop: 10 }}>
        An example of how AI answers a diner&rsquo;s question. We run searches like this and check whether you show up.
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
          <a href="#how" style={{ fontSize: 13, fontWeight: 500, color: MUTED, textDecoration: 'none' }}>How it works</a>
          <a href="#pricing" style={{ fontSize: 13, fontWeight: 500, color: MUTED, textDecoration: 'none' }}>Pricing</a>
          <a href="#check" style={{ fontSize: 13, fontWeight: 700, background: INK, color: '#fff', padding: '8px 16px', borderRadius: 7, textDecoration: 'none' }}>Check my AI visibility</a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(36px, 5vw, 64px) 24px 48px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'clamp(32px, 5vw, 52px)', alignItems: 'start' }}>
        <div>
          <div style={{ display: 'inline-block', background: LGREEN, color: DGREEN, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, letterSpacing: 0.4, marginBottom: 20 }}>
            Built in the Netherlands · for restaurants
          </div>
          <h1 style={{ fontSize: 'clamp(30px, 4.6vw, 46px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.3, marginBottom: 18 }}>
            Is your restaurant showing up when guests ask <span style={{ color: GREEN }}>AI</span> where to eat?
          </h1>
          <p style={{ fontSize: 'clamp(16px, 2vw, 18px)', color: MUTED, lineHeight: 1.6, marginBottom: 22, maxWidth: 520 }}>
            We test ChatGPT, Claude, Gemini and Perplexity to see whether your restaurant gets recommended,
            which competitors appear instead, and what you can do to improve visibility.
          </p>
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, boxShadow: '0 16px 40px -28px rgba(17,17,16,0.35)' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginBottom: 4 }}>Get your free AI visibility check</div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>Send your website and we&rsquo;ll email you what we find — free, no obligation.</div>
            <LeadForm />
            <p style={{ fontSize: 12, color: FAINT, marginTop: 12, textAlign: 'center' }}>
              <a href="#sample" style={{ color: DGREEN, fontWeight: 600, textDecoration: 'none' }}>View a sample audit →</a>
            </p>
          </div>
        </div>
        <ConversationMock />
      </section>

      {/* ── Who we are ── */}
      <section style={{ background: PANEL, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Who we are &amp; what we do</div>
          <p style={{ fontSize: 17, color: INK, lineHeight: 1.65, marginBottom: 14 }}>
            We work with restaurants, and we noticed something. When we asked ChatGPT where to eat in Dutch
            cities, the same handful of places kept coming up — and most owners had no idea whether AI was
            recommending them or their competitors.
          </p>
          <p style={{ fontSize: 17, color: MUTED, lineHeight: 1.65, marginBottom: 16 }}>
            So we built Finded to help restaurants see how they&rsquo;re represented when guests ask AI for a
            recommendation. We&rsquo;re a small, independent team based in the Netherlands — not an agency or a
            marketing machine.
          </p>
          <p style={{ fontSize: 14, color: MUTED }}>
            Questions? Email us directly at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: DGREEN, fontWeight: 600, textDecoration: 'none' }}>{CONTACT_EMAIL}</a>.
          </p>
        </div>
      </section>

      {/* ── Why now ── */}
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 16px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(22px, 3.3vw, 30px)', fontWeight: 800, letterSpacing: -0.6, marginBottom: 14, lineHeight: 1.2 }}>
          Guests don&rsquo;t just search Google anymore
        </h2>
        <p style={{ fontSize: 17, color: MUTED, lineHeight: 1.65, maxWidth: 600, margin: '0 auto 20px' }}>
          More and more people ask AI tools where they should eat. These tools usually name only a few
          restaurants — so if your competitors are mentioned and you aren&rsquo;t, you&rsquo;re missing out
          in a discovery channel that&rsquo;s quietly growing.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          {['"Beste Italiaans restaurant Haarlem"', '"Waar moet ik eten in Amsterdam?"', '"Romantisch restaurant Utrecht"'].map((q) => (
            <span key={q} style={{ fontSize: 13, color: INK, background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '7px 12px', fontWeight: 600 }}>{q}</span>
          ))}
        </div>
      </section>

      {/* ── How this works ── */}
      <section id="how" style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px', textAlign: 'center', scrollMarginTop: 64 }}>
        <SectionTitle kicker="How this works" title="No fixed rankings — just honest checks" />
        <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.75, textAlign: 'left' }}>
          AI tools don&rsquo;t have a fixed ranking like Google, and their answers change over time. So I
          run a consistent set of realistic restaurant searches — in Dutch and English — across the major
          AI platforms, and record whether your restaurant comes up. I repeat each search a few times so the
          result isn&rsquo;t a one-off fluke, then compare you against the restaurants that <em>do</em> get
          named, and point out what on your website might be holding you back.
        </p>
      </section>

      {/* ── What you'll see ── */}
      <section id="sample" style={{ background: PANEL, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, scrollMarginTop: 58 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '56px 24px' }}>
          <SectionTitle kicker="What you'll see" title="Plain answers to four questions" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
            {[
              ['Are we being recommended?', 'How often AI names your restaurant when guests ask where to eat — and which tools do or don’t.'],
              ['Which restaurants appear instead?', 'The places that get recommended in your city, so you can see who’s winning that visibility.'],
              ['Why aren’t we showing up?', 'The website signals AI tools rely on — structured data, menu, hours, content — and what’s missing.'],
              ['What should we fix first?', 'A short, prioritised list of practical changes, in plain language, that you can act on right away.'],
            ].map(([q, a]) => (
              <div key={q as string} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: INK, marginBottom: 8, lineHeight: 1.3 }}>{q}</h3>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.55 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing / what you'll receive ── */}
      <section id="pricing" style={{ background: PANEL, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, scrollMarginTop: 58 }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '56px 24px' }}>
          <SectionTitle kicker="What you'll receive" title="Clear pricing, no surprises" sub="Start free. Pay only if you want a deeper analysis or help implementing it. No hidden fees, no sales calls to get a price." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, alignItems: 'start' }}>
            {[
              {
                name: 'Free AI visibility check', price: '€0', cadence: '',
                desc: 'A quick check to see whether AI tools are recommending your restaurant.',
                features: ['Mentioned / not mentioned in AI recommendations', 'Basic visibility score', 'Competitors mentioned instead', 'Summary of findings', 'Delivered by email'],
                cta: 'Check my AI visibility', href: '#check', note: 'No credit card required. No obligation.', highlight: false,
              },
              {
                name: 'Restaurant AI Audit', price: '€49', cadence: 'one-time',
                desc: 'A detailed analysis for restaurants that want deeper insight into their AI visibility.',
                features: ['Everything in the free check', 'ChatGPT analysis', 'Claude analysis', 'Gemini analysis', 'Perplexity analysis', 'Dutch and English search prompts', 'Competitor comparison', 'Website review', 'Structured-data review', 'Prioritised recommendations', 'Action plan'],
                cta: 'Request a detailed audit', href: `mailto:${CONTACT_EMAIL}?subject=Restaurant AI Audit`, note: 'Ideal for restaurants that want to understand why competitors appear more often in AI recommendations.', highlight: true,
              },
              {
                name: 'AI Visibility Implementation Package', price: '€299', cadence: 'one-time',
                desc: 'We help implement the most important improvements found in your audit.',
                features: ['Structured-data implementation', 'FAQ & AI-friendly content recommendations', 'Website visibility improvements', 'Local SEO & location-signal improvements', 'AI discoverability recommendations', 'Priority implementation guidance', 'Follow-up visibility check'],
                cta: 'Discuss implementation', href: `mailto:${CONTACT_EMAIL}?subject=AI Visibility Implementation Package`, note: 'For restaurants that want help putting the recommendations into practice.', highlight: false,
              },
            ].map((p) => (
              <div key={p.name} style={{
                background: p.highlight ? INK : BG, color: p.highlight ? '#fff' : INK,
                border: `1px solid ${p.highlight ? INK : BORDER}`, borderRadius: 16, padding: 22,
                display: 'flex', flexDirection: 'column', boxShadow: p.highlight ? '0 24px 48px -28px rgba(17,17,16,0.4)' : 'none',
              }}>
                {p.highlight && <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: INK, background: GREEN, padding: '3px 8px', borderRadius: 5, marginBottom: 12 }}>Most popular</span>}
                <div style={{ fontSize: 15, fontWeight: 800 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '8px 0 10px' }}>
                  <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>{p.price}</span>
                  {p.cadence && <span style={{ fontSize: 13, color: p.highlight ? '#b9b8b3' : MUTED }}>{p.cadence}</span>}
                </div>
                <p style={{ fontSize: 13, color: p.highlight ? '#cfcec9' : MUTED, lineHeight: 1.55, marginBottom: 14 }}>{p.desc}</p>
                <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
                  {p.features.map((f) => (
                    <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: GREEN, fontWeight: 800, fontSize: 13, lineHeight: 1.5 }}>✓</span>
                      <span style={{ fontSize: 13, color: p.highlight ? '#e7e6e2' : INK, lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <a href={p.href} style={{
                  marginTop: 'auto', textAlign: 'center', textDecoration: 'none', fontWeight: 700, fontSize: 14,
                  padding: '12px 16px', borderRadius: 9,
                  background: p.highlight ? '#fff' : INK, color: p.highlight ? INK : '#fff',
                }}>{p.cta}</a>
                <p style={{ fontSize: 12, color: p.highlight ? '#b9b8b3' : FAINT, marginTop: 10, textAlign: 'center', lineHeight: 1.45 }}>{p.note}</p>
              </div>
            ))}
          </div>

          {/* Why we offer a free check */}
          <div style={{ maxWidth: 700, margin: '32px auto 0', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Why we offer a free check</div>
            <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.65 }}>
              Most restaurant owners have no way of knowing whether AI tools are recommending them or their
              competitors. The free check helps you understand where you stand <em>before</em> deciding
              whether you want a deeper analysis. There&rsquo;s no obligation to buy anything afterwards.
            </p>
          </div>
        </div>
      </section>

      {/* ── What happens next ── */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px' }}>
        <SectionTitle kicker="What happens next" title="What happens after I submit my restaurant?" />
        <div style={{ display: 'grid', gap: 12 }}>
          {[
            ['1', 'Submit your website and city', 'That’s all we need to start — plus an email to send the results to.'],
            ['2', 'Receive your free AI visibility check', 'We search the AI tools the way a guest would and email you what we find.'],
            ['3', 'Review the results', 'See where you appear, which competitors show up instead, and a summary.'],
            ['4', 'Decide whether you want a detailed audit or implementation support', 'Totally up to you — and only if it’s worth it. No pressure either way.'],
          ].map(([n, t, d]) => (
            <div key={n as string} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: LGREEN, color: DGREEN, fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: INK }}>{t}</div>
                <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.5, marginTop: 2 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: 15, fontWeight: 600, color: DGREEN, marginTop: 20 }}>
          There is absolutely no obligation to purchase anything after receiving your free visibility check.
        </p>
      </section>

      {/* ── What this won't tell you (limitations) ── */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '8px 24px 56px' }}>
        <SectionTitle kicker="Being honest" title="What this won't tell you" sub="We'd rather set expectations than oversell." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {[
            'We can’t guarantee AI will recommend you — nobody can.',
            'We can’t control what ChatGPT or any model says.',
            'AI answers vary over time, so results are a snapshot, not a fixed score.',
            'AI visibility is only one part of how guests find a restaurant.',
          ].map((l) => (
            <div key={l} style={{ display: 'flex', gap: 10, background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px' }}>
              <span style={{ color: FAINT, fontWeight: 800 }}>•</span>
              <span style={{ fontSize: 14, color: MUTED, lineHeight: 1.5 }}>{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Lead capture ── */}
      <section id="check" style={{ background: INK, scrollMarginTop: 58 }}>
        <div style={{ maxWidth: 540, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(23px, 3.6vw, 31px)', fontWeight: 800, letterSpacing: -0.6, marginBottom: 12, color: '#fff' }}>
            Let&rsquo;s check whether AI recommends your restaurant
          </h2>
          <p style={{ fontSize: 16, color: '#b9b8b3', lineHeight: 1.6, marginBottom: 26 }}>
            Send your website and I&rsquo;ll email you what the AI tools are saying — usually within a few days.
          </p>
          <div style={{ background: BG, borderRadius: 16, padding: 'clamp(18px, 3vw, 26px)' }}>
            <LeadForm />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px' }}>
        <SectionTitle kicker="FAQ" title="A few honest answers" />
        <div style={{ display: 'grid', gap: 12 }}>
          {[
            ['Is this really free?', 'Yes — the initial check is free and we email you the results. No account, no card, no obligation.'],
            ['How do you check this?', 'I ask the major AI tools the kinds of questions guests actually ask — in Dutch and English — and record whether your restaurant appears, repeated across several prompts and models.'],
            ['Can AI answers change?', 'They can, and they do. That’s why we measure across multiple prompts and models and treat the result as a snapshot rather than a fixed ranking.'],
            ['What do you need from me?', 'Just your restaurant’s website, your city, and an email address to send the results to.'],
            ['What do you do with my details?', 'We only use them to prepare and send your report. We don’t sell your data or add you to a mailing list.'],
            ['Who’s behind this?', `Finded is a small, independent team based in the Netherlands. You can reach us directly at ${CONTACT_EMAIL}.`],
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
              Built in the Netherlands for restaurants navigating AI search. A small, independent team —
              we check how ChatGPT, Claude, Gemini and Perplexity talk about your restaurant.
            </p>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.9 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FAINT, marginBottom: 6 }}>Get started</div>
            <a href="#check" style={{ color: INK, textDecoration: 'none', display: 'block' }}>Check my AI visibility</a>
            <a href="#pricing" style={{ color: INK, textDecoration: 'none', display: 'block' }}>Pricing</a>
            <a href="#how" style={{ color: INK, textDecoration: 'none', display: 'block' }}>How it works</a>
            <a href="/audit" style={{ color: INK, textDecoration: 'none', display: 'block' }}>Request form</a>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.9 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FAINT, marginBottom: 6 }}>Contact</div>
            <div style={{ color: INK }}>Netherlands</div>
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: INK, textDecoration: 'none', display: 'block' }}>{CONTACT_EMAIL}</a>
            <p style={{ color: FAINT, maxWidth: 240, marginTop: 8, lineHeight: 1.5 }}>
              We only use your details to prepare and send your report, and never sell your data.
            </p>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: '16px 24px', textAlign: 'center', fontSize: 12, color: FAINT }}>
          © {2026} Finded · Built in the Netherlands for restaurants navigating AI search
        </div>
      </footer>
    </div>
  )
}
