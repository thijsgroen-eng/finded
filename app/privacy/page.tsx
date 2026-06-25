const BG = '#fafaf8', INK = '#111110', MUTED = '#7a7874', FAINT = '#b0aea8', BORDER = '#e2e1dc', DGREEN = '#0d6b50'
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const CONTACT_EMAIL = 'Info@finded.com'

export const metadata = { title: 'Privacy policy · Finded' }

export default function PrivacyPage() {
  return (
    <div style={{ fontFamily: FONT, background: BG, minHeight: '100vh', color: INK }}>
      <nav style={{ borderBottom: `1px solid ${BORDER}`, padding: '0 24px', height: 58, display: 'flex', alignItems: 'center' }}>
        <a href="/" style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5, color: INK, textDecoration: 'none' }}>Finded</a>
      </nav>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.8, marginBottom: 8 }}>Privacy policy</h1>
        <p style={{ fontSize: 13, color: FAINT, marginBottom: 28 }}>Last updated: June 2026</p>

        {[
          ['What we collect', 'When you request a visibility check we collect the details you submit — your restaurant’s website, city and an email address — plus basic technical data needed to deliver the service.'],
          ['Why we use it', 'We use your details only to prepare and send your AI visibility report and to reply to you. We do not sell your data, and we do not add you to a marketing list without your consent.'],
          ['Public AI sources', 'Our audit queries publicly available AI assistants and your publicly accessible website. We do not access private or password-protected systems.'],
          ['Data retention', 'We keep your audit data for as long as needed to provide and improve the service. You can ask us to delete your data at any time.'],
          ['Your rights', 'Under the GDPR you can request access to, correction of, or deletion of your personal data. Email us and we’ll action it.'],
          ['Contact', `Questions about privacy? Email ${CONTACT_EMAIL}.`],
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
