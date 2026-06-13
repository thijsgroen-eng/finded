import Link from 'next/link'

export default function LandingPage() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#fafaf8', minHeight: '100vh', WebkitFontSmoothing: 'antialiased', color: '#111110' }}>

      {/* Nav */}
      <nav style={{ background: 'rgba(250,250,248,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e1dc', padding: '0 32px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>Finded</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="#how" style={{ fontSize: 13, fontWeight: 500, color: '#7a7874', textDecoration: 'none' }}>How it works</a>
          <a href="#pricing" style={{ fontSize: 13, fontWeight: 500, color: '#7a7874', textDecoration: 'none' }}>Pricing</a>
          <a href="/admin/dashboard" style={{ fontSize: 13, fontWeight: 600, background: '#111110', color: '#fff', padding: '7px 16px', borderRadius: 6, textDecoration: 'none' }}>Admin →</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: 'clamp(60px, 10vw, 100px) 24px 80px', textAlign: 'center', maxWidth: 780, margin: '0 auto' }}>
        <div style={{ display: 'inline-block', background: '#edf8f3', color: '#0d6b50', fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 20, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 24 }}>
          AI search is the new Google
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 7vw, 64px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: -2, marginBottom: 20, color: '#111110' }}>
          Is your business found<br />by <span style={{ color: '#16a37a' }}>AI?</span>
        </h1>
        <p style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: '#7a7874', maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.65 }}>
          ChatGPT, Gemini, Claude and Perplexity are where people now discover businesses. We measure your AI visibility — and show you exactly how to fix it.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/admin/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#111110', color: '#fff', padding: '13px 28px', borderRadius: 7, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Audit your business →
          </a>
          <a href="#how" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: '#3a3935', padding: '13px 22px', borderRadius: 7, fontSize: 15, fontWeight: 500, textDecoration: 'none', border: '1px solid #e2e1dc' }}>
            See how it works
          </a>
        </div>
        <p style={{ fontSize: 12, color: '#b0aea8', marginTop: 14 }}>Works for any business · Free preview · Results in minutes</p>
      </section>

      {/* Business types */}
      <div style={{ background: '#fff', borderTop: '1px solid #e2e1dc', borderBottom: '1px solid #e2e1dc', padding: '20px 32px', display: 'flex', justifyContent: 'center', gap: 'clamp(16px, 3vw, 40px)', flexWrap: 'wrap' }}>
        {['🍽️ Restaurants', '🦷 Dentists', '⚖️ Lawyers', '🏨 Hotels', '📣 Agencies', '💻 SaaS', '🛒 Ecommerce', '🏢 Any business'].map(label => (
          <span key={label} style={{ fontSize: 13, fontWeight: 500, color: '#7a7874' }}>{label}</span>
        ))}
      </div>

      {/* How it works */}
      <section id="how" style={{ padding: '80px 24px', maxWidth: 860, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#b0aea8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>How it works</div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, letterSpacing: -0.8 }}>From URL to fixed in minutes</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32 }}>
          {[
            { step: '1', title: 'Enter your URL', desc: 'Paste your website. We detect your business type automatically.' },
            { step: '2', title: 'AI audit runs', desc: 'We query ChatGPT, Claude, Gemini and Perplexity with 50+ real searches.' },
            { step: '3', title: 'See your gaps', desc: 'Find out exactly why competitors get recommended and you don\'t.' },
            { step: '4', title: 'Fix Now', desc: 'Generate schema, FAQ pages, and content — publish directly to WordPress.' },
          ].map(({ step, title, desc }) => (
            <div key={step} style={{ textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#111110', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, margin: '0 auto 16px' }}>{step}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 14, color: '#7a7874', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
