import { LangToggle } from '@/components/lang-toggle'
import { getSettings } from '@/lib/settings'
import { getViewerLang } from '@/lib/i18n-viewer'
import type { Language } from '@/lib/i18n'
import {
  ArrowLeft, ArrowRight, BadgeCheck, GitCompare, Building2,
  LayoutDashboard, Download, BarChart3, ShieldCheck,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// Warm system — same trio as the landing page (cream / charcoal / copper).
const BG = '#F1E8D7', BG_SOFT = '#E7DAC1', CARD = 'rgba(255,255,255,0.55)'
const BORDER = 'rgba(36,28,19,0.16)', BORDER2 = 'rgba(36,28,19,0.10)'
const INK = '#241C13', MUTED = 'rgba(36,28,19,0.66)', FAINT = 'rgba(36,28,19,0.46)'
const GRAD = 'linear-gradient(135deg, #C8804E 0%, #B5683A 50%, #9A5530 100%)'
const TEXT_GRAD = 'linear-gradient(90deg, #B5683A 0%, #8A4A28 100%)'
const FONT = 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

const A = {
  en: {
    back: 'Back to home', login: 'Log in', cta: 'Talk to us',
    eyebrow: 'Finded for Agencies',
    title: 'You optimise.', titleGrad: 'We prove it worked.',
    sub: 'Finded is the measurement layer for AI visibility. Agencies make restaurants easier for AI to recommend — Finded shows, with evidence, whether it actually moved the needle.',
    ctaPrimary: 'Become a partner', ctaSecondary: 'See a live dashboard',
    valueKicker: 'What you get',
    valueTitle: 'Everything you need to sell, prove and retain',
    values: [
      ['White-label reports', 'Branded visibility reports you can hand straight to clients — your logo, our evidence.'],
      ['Before / after comparisons', 'Show the measured visibility change after your work, per AI model and per prompt.'],
      ['Multiple restaurants', 'Manage every client from one place, each with its own monitored dashboard.'],
      ['Client dashboards', 'Give each client a live, deterministic dashboard — no spreadsheets, no guesswork.'],
      ['Exports', 'Export evidence, benchmarks and recommendations for proposals and reviews.'],
      ['Benchmarks', 'Compare each client against cuisine, city and similar restaurants from the warehouse.'],
    ],
    howKicker: 'How it works',
    howTitle: 'Measurement that closes deals and proves retention',
    how: [
      ['1', 'Baseline', 'We measure how AI recommends the restaurant today — the evidence you pitch against.'],
      ['2', 'You optimise', 'You implement the changes: schema, menus, content, Google Business, and more.'],
      ['3', 'We prove it', 'Monitoring re-measures and shows the before/after — the result you report back.'],
    ],
    moatTitle: 'Backed by the Observation Warehouse',
    moatBody: 'Recommendations and benchmarks are measured across thousands of anonymised observations — not generic SEO advice. No individual restaurant’s data is ever shared. It’s evidence you can stand behind in front of a client.',
    finalTitle: 'Let’s measure what your work achieves',
    finalSub: 'Tell us about your agency and the restaurants you work with — we’ll set you up.',
    finalCta: 'Talk to us',
    footer: 'We measure how AI recommends restaurants — not rankings.',
  },
  nl: {
    back: 'Terug naar home', login: 'Inloggen', cta: 'Neem contact op',
    eyebrow: 'Finded voor bureaus',
    title: 'Jullie optimaliseren.', titleGrad: 'Wij bewijzen dat het werkte.',
    sub: 'Finded is de meetlaag voor AI-zichtbaarheid. Bureaus maken restaurants makkelijker aanbeveelbaar voor AI — Finded toont met bewijs of het écht verschil maakte.',
    ctaPrimary: 'Word partner', ctaSecondary: 'Bekijk een live dashboard',
    valueKicker: 'Wat je krijgt',
    valueTitle: 'Alles om te verkopen, te bewijzen en te behouden',
    values: [
      ['White-label rapporten', 'Gebrande zichtbaarheidsrapporten die je direct aan klanten geeft — jouw logo, ons bewijs.'],
      ['Voor / na-vergelijkingen', 'Toon de gemeten verandering na je werk, per AI-model en per prompt.'],
      ['Meerdere restaurants', 'Beheer elke klant op één plek, elk met een eigen gemonitord dashboard.'],
      ['Klantdashboards', 'Geef elke klant een live, deterministisch dashboard — geen spreadsheets, geen giswerk.'],
      ['Exports', 'Exporteer bewijs, benchmarks en aanbevelingen voor voorstellen en reviews.'],
      ['Benchmarks', 'Vergelijk elke klant met keuken, stad en vergelijkbare restaurants uit de warehouse.'],
    ],
    howKicker: 'Hoe het werkt',
    howTitle: 'Meting die deals sluit en retentie bewijst',
    how: [
      ['1', 'Nulmeting', 'We meten hoe AI het restaurant vandaag aanbeveelt — het bewijs waarmee je pitcht.'],
      ['2', 'Jij optimaliseert', 'Jij voert de wijzigingen door: schema, menu’s, content, Google-bedrijfsprofiel en meer.'],
      ['3', 'Wij bewijzen het', 'Monitoring meet opnieuw en toont het voor/na — het resultaat dat je terugkoppelt.'],
    ],
    moatTitle: 'Onderbouwd door de Observation Warehouse',
    moatBody: 'Aanbevelingen en benchmarks worden gemeten over duizenden geanonimiseerde observaties — geen generiek SEO-advies. Individuele restaurantdata wordt nooit gedeeld. Bewijs waar je achter kunt staan tegenover een klant.',
    finalTitle: 'Laten we meten wat jouw werk oplevert',
    finalSub: 'Vertel ons over je bureau en de restaurants waarmee je werkt — wij zetten je op weg.',
    finalCta: 'Neem contact op',
    footer: 'We meten hoe AI restaurants aanbeveelt — geen ranglijsten.',
  },
} satisfies Record<Language, unknown>

function Logo({ size = 30 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <span style={{ width: size, height: size, borderRadius: size * 0.28, background: GRAD, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px -6px rgba(181,104,58,0.6)' }}>
        <span style={{ fontSize: size * 0.56, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>F</span>
      </span>
      <span style={{ fontSize: size * 0.62, fontWeight: 700, color: INK, letterSpacing: -0.5 }}>finded</span>
    </span>
  )
}

export default async function AgenciesPage() {
  const settings = await getSettings()
  const lang: Language = await getViewerLang(settings.defaultLanguage)
  const t = A[lang]
  const contactEmail = settings.contactEmail
  const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent('Finded for Agencies')}`
  const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 24 } as const
  const VALUE_ICONS = [BadgeCheck, GitCompare, Building2, LayoutDashboard, Download, BarChart3]

  return (
    <div style={{ fontFamily: FONT, background: BG, minHeight: '100vh', color: INK, WebkitFontSmoothing: 'antialiased' }}>
      {/* Nav */}
      <nav style={{ background: 'rgba(241,232,215,0.82)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${BORDER2}`, padding: '0 24px', height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ textDecoration: 'none' }}><Logo /></a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LangToggle current={lang} tone="light" />
          <a href="/" style={{ fontSize: 13.5, color: MUTED, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}><ArrowLeft style={{ width: 15, height: 15 }} /> {t.back}</a>
          <a href={mailto} style={{ fontSize: 13.5, fontWeight: 700, background: GRAD, color: '#fff', padding: '10px 18px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 10px 24px -10px rgba(181,104,58,0.7)' }}>{t.cta}</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', overflow: 'hidden', borderBottom: `1px solid ${BORDER2}` }}>
        <div style={{ position: 'absolute', top: -240, left: '50%', transform: 'translateX(-50%)', width: 1000, height: 560, background: 'radial-gradient(ellipse at center, rgba(181,104,58,0.22), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 920, margin: '0 auto', padding: 'clamp(56px,7vw,96px) 24px', position: 'relative', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', fontSize: 11.5, fontWeight: 700, color: '#B5683A', textTransform: 'uppercase', letterSpacing: 1.6, marginBottom: 18 }}>{t.eyebrow}</div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.04, letterSpacing: -2, marginBottom: 22 }}>
            {t.title}<br /><span style={{ background: TEXT_GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>{t.titleGrad}</span>
          </h1>
          <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: MUTED, lineHeight: 1.6, maxWidth: 640, margin: '0 auto 32px' }}>{t.sub}</p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href={mailto} className="btn" style={{ background: GRAD, color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 26px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 16px 36px -14px rgba(181,104,58,0.8)' }}>{t.ctaPrimary}</a>
            <a href="/#sample" className="btn" style={{ background: 'rgba(255,255,255,0.7)', color: INK, fontWeight: 700, fontSize: 15, padding: '14px 26px', borderRadius: 12, textDecoration: 'none', border: `1px solid ${BORDER}`, display: 'inline-flex', alignItems: 'center', gap: 8 }}>{t.ctaSecondary} <ArrowRight style={{ width: 16, height: 16 }} /></a>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section style={{ background: BG_SOFT, borderBottom: `1px solid ${BORDER2}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '80px 24px' }}>
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 48px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#B5683A', textTransform: 'uppercase', letterSpacing: 1.8, marginBottom: 14 }}>{t.valueKicker}</div>
            <h2 style={{ fontSize: 'clamp(26px, 3.6vw, 38px)', fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.1 }}>{t.valueTitle}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
            {t.values.map(([title, desc], i) => {
              const Icon = VALUE_ICONS[i]
              return (
                <div key={title} className="card-fx" style={card}>
                  <span style={{ display: 'inline-flex', width: 42, height: 42, borderRadius: 12, background: 'rgba(181,104,58,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Icon style={{ width: 20, height: 20, color: '#B5683A' }} />
                  </span>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: INK, marginBottom: 8 }}>{title}</h3>
                  <p style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.55 }}>{desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: BG, borderBottom: `1px solid ${BORDER2}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '80px 24px' }}>
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 44px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#B5683A', textTransform: 'uppercase', letterSpacing: 1.8, marginBottom: 14 }}>{t.howKicker}</div>
            <h2 style={{ fontSize: 'clamp(26px, 3.6vw, 38px)', fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.1 }}>{t.howTitle}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
            {t.how.map(([n, title, d]) => (
              <div key={n} className="card-fx" style={card}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: GRAD, color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>{n}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: INK, marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.55 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Moat */}
      <section style={{ background: BG_SOFT, borderBottom: `1px solid ${BORDER2}`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -120, right: -80, width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(181,104,58,0.18), transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '76px 24px', position: 'relative' }}>
          <span style={{ display: 'inline-flex', width: 44, height: 44, borderRadius: 12, background: 'rgba(181,104,58,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}><ShieldCheck style={{ width: 22, height: 22, color: '#B5683A' }} /></span>
          <h2 style={{ fontSize: 'clamp(24px, 3.4vw, 34px)', fontWeight: 800, letterSpacing: -1, lineHeight: 1.12, marginBottom: 16, maxWidth: '20ch' }}>{t.moatTitle}</h2>
          <p style={{ fontSize: 17, color: 'rgba(36,28,19,0.74)', lineHeight: 1.7, maxWidth: '62ch' }}>{t.moatBody}</p>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ background: BG }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '88px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, letterSpacing: -1.2, marginBottom: 14 }}>{t.finalTitle}</h2>
          <p style={{ fontSize: 17, color: MUTED, lineHeight: 1.6, marginBottom: 28 }}>{t.finalSub}</p>
          <a href={mailto} className="btn" style={{ display: 'inline-block', background: GRAD, color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 16px 36px -14px rgba(181,104,58,0.8)' }}>{t.finalCta}</a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${BORDER2}`, background: BG }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
          <Logo size={26} />
          <span style={{ fontSize: 12.5, color: FAINT }}>© {2026} Finded · {t.footer}</span>
        </div>
      </footer>
    </div>
  )
}
