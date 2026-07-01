const GRAD = 'linear-gradient(135deg, #C8804E 0%, #B5683A 50%, #9A5530 100%)'
const BG = '#F1E8D7'
const INK = '#241C13'
const MUTED = 'rgba(36,28,19,0.66)'

export default function ComingSoon() {
  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-inter), sans-serif', padding: '24px', textAlign: 'center' }}>
      <div style={{ marginBottom: 32 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: GRAD, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 20 }}>F</span>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, color: INK }}>finded</span>
        </span>
      </div>
      <h1 style={{ fontSize: 'clamp(32px,6vw,52px)', fontWeight: 800, letterSpacing: -2, color: INK, marginBottom: 16, lineHeight: 1.1 }}>
        Coming soon
      </h1>
      <p style={{ fontSize: 17, color: MUTED, maxWidth: 420, lineHeight: 1.6, marginBottom: 40 }}>
        We&apos;re putting the finishing touches on something great. Check back shortly.
      </p>
      <a href="mailto:info@finded.ai" style={{ display: 'inline-block', background: GRAD, color: '#fff', fontWeight: 700, fontSize: 15, padding: '13px 28px', borderRadius: 12, textDecoration: 'none' }}>
        Contact us
      </a>
    </div>
  )
}
