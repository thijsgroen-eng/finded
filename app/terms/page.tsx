const BG = '#fafaf8', INK = '#111110', MUTED = '#7a7874', FAINT = '#b0aea8', BORDER = '#e2e1dc', DGREEN = '#0d6b50'
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const CONTACT_EMAIL = 'Info@finded.com'

export const metadata = { title: 'Terms · Finded' }

export default function TermsPage() {
  return (
    <div style={{ fontFamily: FONT, background: BG, minHeight: '100vh', color: INK }}>
      <nav style={{ borderBottom: `1px solid ${BORDER}`, padding: '0 24px', height: 58, display: 'flex', alignItems: 'center' }}>
        <a href="/" style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5, color: INK, textDecoration: 'none' }}>Finded</a>
      </nav>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.8, marginBottom: 8 }}>Terms of service</h1>
        <p style={{ fontSize: 13, color: FAINT, marginBottom: 28 }}>Last updated: June 2026</p>

        {[
          ['The service', 'Finded tests whether AI assistants recommend your restaurant and reports what we find. Audits are an analysis service, not advertising or a ranking guarantee.'],
          ['No guarantees', 'AI answers are non-deterministic and change over time. We measure visibility across multiple prompts and models and present results as a snapshot, not a guaranteed or permanent ranking. We cannot control or guarantee what any AI tool says about your restaurant.'],
          ['Estimates', 'Any figures shown are based on the audit at the time it ran. Where estimates appear, they are illustrative and not a measured promise of results.'],
          ['Payments', 'Paid audits and the implementation package are one-time purchases. The free check has no cost and no obligation.'],
          ['Acceptable use', 'You agree to submit only restaurants you are authorised to represent, and not to misuse the service.'],
          ['Contact', `Questions about these terms? Email ${CONTACT_EMAIL}.`],
        ].map(([h, b]) => (
          <section key={h} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>{h}</h2>
            <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.65 }}>{b}</p>
          </section>
        ))}

        <a href="/" style={{ fontSize: 14, color: DGREEN, fontWeight: 600, textDecoration: 'none' }}>← Back to home</a>
      </main>
    </div>
  )
}
