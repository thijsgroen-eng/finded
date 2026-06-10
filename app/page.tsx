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
          Is your restaurant found<br />by <span style={{ color: '#16a37a' }}>AI?</span>
        </h1>
        <p style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: '#7a7874', maxWidth: 500, margin: '0 auto 36px', lineHeight: 1.65 }}>
          ChatGPT, Gemini and Perplexity are where diners now decide where to eat. We measure your visibility — and show you exactly how to fix it.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="mailto:hello@finded.co?subject=I want an AI visibility report" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#111110', color: '#fff', padding: '13px 28px', borderRadius: 7, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Get your free preview →
          </a>
          <a href="#how" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: '#3a3935', padding: '13px 22px', borderRadius: 7, fontSize: 15, fontWeight: 500, textDecoration: 'none', border: '1px solid #e2e1dc' }}>
            See how it works
          </a>
        </div>
        <p style={{ fontSize: 12, color: '#b0aea8', marginTop: 14 }}>Free preview · No account needed · Results in minutes</p>
      </section>

      {/* Stats */}
      <div style={{ background: '#fff', borderTop: '1px solid #e2e1dc', borderBottom: '1px solid #e2e1dc', padding: '20px 32px', display: 'flex', justifyContent: 'center', gap: 'clamp(24px, 5vw, 64px)', flexWrap: 'wrap' }}>
        {[
          { num: '80%', label: 'of restaurants cited at least once by AI' },
          { num: '15%', label: 'actually get recommended as a top pick' },
          { num: '4×', label: 'higher conversion from AI-referred traffic' },
        ].map(({ num, label }) => (
          <div key={num} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, color: '#111110' }}>{num}</div>
            <div style={{ fontSize: 12, color: '#7a7874', marginTop: 4, maxWidth: 160 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* The problem */}
      <section style={{ padding: '80px 24px', maxWidth: 860, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 48, alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#b0aea8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>The shift</div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.15, marginBottom: 20 }}>
              Search changed.<br /><span style={{ color: '#7a7874', fontWeight: 400 }}>Most restaurants missed it.</span>
            </h2>
            <div style={{ background: '#f7f6f3', border: '1px solid #e2e1dc', borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, color: '#111110', lineHeight: 1 }}>1 in 3</div>
              <div style={{ fontSize: 13, color: '#7a7874', marginTop: 6 }}>diners now use AI to decide where to eat before opening any app or map</div>
            </div>
          </div>
          <div style={{ fontSize: 15, color: '#7a7874', lineHeight: 1.75, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p>For fifteen years, restaurants chased Google rankings. Keywords, reviews, backlinks. The playbook was clear. Then it stopped being enough.</p>
            <p>Today&apos;s diner opens ChatGPT and types <em style={{ color: '#111110' }}>&ldquo;best Italian in Amsterdam for a birthday dinner.&rdquo;</em> They don&apos;t scroll results. They read one answer. Either your restaurant is in it — or it isn&apos;t.</p>
            <p>Finded shows you exactly where the gaps are — and tells you how to fix them.</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ background: '#fff', borderTop: '1px solid #e2e1dc', borderBottom: '1px solid #e2e1dc', padding: '80px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#b0aea8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Process</div>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: -0.8 }}>Your audit in three steps</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
            {[
              { num: '01', icon: '✉️', title: 'We contact you', body: 'Send us your restaurant name and city. We run the audit within minutes — no account, no signup.' },
              { num: '02', icon: '🔍', title: 'We audit your visibility', body: 'We check your data completeness across every signal AI models use — across ChatGPT, Claude, Gemini and Perplexity.' },
              { num: '03', icon: '📊', title: 'You get your report', body: 'A scored report with ranked fixes, a per-model breakdown, competitor comparison, and a step-by-step action plan.' },
            ].map(({ num, icon, title, body }) => (
              <div key={num}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#b0aea8', letterSpacing: 0.5, marginBottom: 12 }}>{num}</div>
                <div style={{ width: 40, height: 40, background: '#f2f1ee', border: '1px solid #e2e1dc', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 14 }}>{icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111110', marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 14, color: '#7a7874', lineHeight: 1.65 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section style={{ padding: '80px 24px', maxWidth: 860, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#b0aea8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>What you get</div>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: -0.8 }}>Everything you need to win AI search</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 2, background: '#e2e1dc', border: '1px solid #e2e1dc', borderRadius: 10, overflow: 'hidden' }}>
          {[
            { icon: '📈', title: 'AI Visibility Score', body: 'A single 0–100 score measuring how likely AI models recommend you. Benchmarked against other restaurants in your city.', tag: 'Free preview', tagColor: '#edf8f3', tagText: '#0d6b50' },
            { icon: '💬', title: 'Per-model breakdown', body: 'See exactly what ChatGPT, Gemini, Perplexity and Claude say when asked for a restaurant like yours.', tag: 'Full report', tagColor: '#fef3e2', tagText: '#7a4f0a' },
            { icon: '🏆', title: 'Competitor analysis', body: 'See which restaurants AI recommends instead of you — and what they do differently.', tag: 'Full report', tagColor: '#fef3e2', tagText: '#7a4f0a' },
            { icon: '⚡', title: 'Prioritised fix plan', body: 'Ranked actions by impact. Each one explains exactly what to change and why it matters for AI discoverability.', tag: 'Full report', tagColor: '#fef3e2', tagText: '#7a4f0a' },
            { icon: '🌐', title: 'Website audit', body: 'We check your site for schema markup, menu detection, booking links and social signals — all signals AI models rely on.', tag: 'Free preview', tagColor: '#edf8f3', tagText: '#0d6b50' },
            { icon: '📅', title: 'Monthly monitoring', body: 'Track your score over time. Get alerted when it drops, and see the impact of every fix you make.', tag: '€29/month', tagColor: '#f7f6f3', tagText: '#7a7874' },
          ].map(({ icon, title, body, tag, tagColor, tagText }) => (
            <div key={title} style={{ background: '#fff', padding: '24px', transition: 'background 0.15s' }}>
              <div style={{ fontSize: 22, marginBottom: 12 }}>{icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111110', marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13, color: '#7a7874', lineHeight: 1.65, marginBottom: 12 }}>{body}</div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: tagColor, color: tagText, textTransform: 'uppercase', letterSpacing: 0.3 }}>{tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ background: '#fff', borderTop: '1px solid #e2e1dc', borderBottom: '1px solid #e2e1dc', padding: '80px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#b0aea8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Pricing</div>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: -0.8, marginBottom: 8 }}>Simple, honest pricing</h2>
          <p style={{ fontSize: 15, color: '#7a7874', marginBottom: 48 }}>Start free. Pay only when you want more.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, textAlign: 'left' }}>
            {/* Free */}
            <div style={{ border: '1px solid #e2e1dc', borderRadius: 10, padding: '24px', background: '#f7f6f3' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#b0aea8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Free preview</div>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>€0</div>
              <div style={{ fontSize: 13, color: '#7a7874', marginBottom: 18 }}>No account needed</div>
              <div style={{ height: 1, background: '#e2e1dc', margin: '0 0 16px' }} />
              {['AI visibility score', 'Website audit', 'Claude data', 'Top 3 action items'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9, fontSize: 13 }}>
                  <span style={{ color: '#16a37a', fontWeight: 700 }}>✓</span> {f}
                </div>
              ))}
              <a href="mailto:hello@finded.co?subject=Free preview request" style={{ display: 'block', marginTop: 20, background: '#e2e1dc', color: '#111110', padding: '10px', borderRadius: 7, fontSize: 14, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                Request free preview
              </a>
            </div>
            {/* Paid */}
            <div style={{ border: '1px solid #111110', borderRadius: 10, padding: '24px', background: '#111110', color: '#fff', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -10, right: 16, background: '#16a37a', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: 0.3 }}>Most popular</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Full report</div>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>€49</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 18 }}>One-time · No subscription</div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '0 0 16px' }} />
              {['Everything in free', 'ChatGPT + Gemini data', 'Competitor analysis', 'Step-by-step fix guide', 'PDF report to share'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                  <span style={{ color: '#16a37a', fontWeight: 700 }}>✓</span> {f}
                </div>
              ))}
              <a href="mailto:hello@finded.co?subject=Full report request" style={{ display: 'block', marginTop: 20, background: '#fff', color: '#111110', padding: '10px', borderRadius: 7, fontSize: 14, fontWeight: 800, textDecoration: 'none', textAlign: 'center' }}>
                Get full report — €49
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center', maxWidth: 580, margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, letterSpacing: -1, lineHeight: 1.1, marginBottom: 16 }}>
          Find out if AI<br /><span style={{ color: '#16a37a' }}>can find you</span>
        </h2>
        <p style={{ fontSize: 16, color: '#7a7874', marginBottom: 32 }}>Get your free AI visibility preview. No account, no credit card.</p>
        <a href="mailto:hello@finded.co?subject=I want an AI visibility report" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#111110', color: '#fff', padding: '14px 32px', borderRadius: 8, fontSize: 15, fontWeight: 800, textDecoration: 'none' }}>
          Request my free report →
        </a>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #e2e1dc', padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.3, color: '#111110' }}>Finded</div>
        <div style={{ fontSize: 12, color: '#b0aea8' }}>AI Visibility for Restaurants · © 2025 Finded</div>
      </footer>

    </div>
  )
}
