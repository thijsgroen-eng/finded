import { LangToggle } from '@/components/lang-toggle'
import { getSettings } from '@/lib/settings'
import { getViewerLang } from '@/lib/i18n-viewer'
import type { Language } from '@/lib/i18n'
import {
  BadgeCheck, GitCompare, Building2, LayoutDashboard,
  Download, ChartColumn, ShieldCheck, ArrowLeft, ArrowRight,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const BG = '#F1E8D7', BG_SOFT = '#E7DAC1', CARD = 'rgba(255,255,255,0.55)'
const BORDER = 'rgba(36,28,19,0.16)', BORDER2 = 'rgba(36,28,19,0.10)'
const INK = '#241C13', MUTED = 'rgba(36,28,19,0.66)'
const GRAD = 'linear-gradient(135deg, #C8804E 0%, #B5683A 50%, #9A5530 100%)'
const TEXT_GRAD = 'linear-gradient(90deg, #B5683A 0%, #8A4A28 100%)'
const ACCENT = '#B5683A'
const FONT = 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

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

const T = {
  en: {
    backHome: 'Back to home',
    contact: 'Get in touch',
    eyebrow: 'Finded for Agencies',
    heroLine: 'You optimise.',
    heroGrad: 'We prove it worked.',
    heroSub: 'Finded is the measurement layer for AI visibility. Agencies make restaurants easier for AI to recommend — Finded shows with evidence whether it actually made a difference.',
    ctaPartner: 'Become a partner',
    ctaDashboard: 'View a live dashboard',
    whatKicker: 'What you get',
    whatTitle: 'Everything to sell, prove, and retain',
    features: [
      { title: 'White-label reports', desc: 'Branded visibility reports you hand straight to clients — your logo, our evidence.', Icon: BadgeCheck },
      { title: 'Before / after comparisons', desc: 'Show the measured change after your work, per AI model and per prompt.', Icon: GitCompare },
      { title: 'Multiple restaurants', desc: 'Manage every client in one place, each with their own monitored dashboard.', Icon: Building2 },
      { title: 'Client dashboards', desc: 'Give every client a live, deterministic dashboard — no spreadsheets, no guesswork.', Icon: LayoutDashboard },
      { title: 'Exports', desc: 'Export evidence, benchmarks, and recommendations for proposals and reviews.', Icon: Download },
      { title: 'Benchmarks', desc: 'Compare every client by cuisine, city, and similar restaurants from the warehouse.', Icon: ChartColumn },
    ],
    howKicker: 'How it works',
    howTitle: 'Measurement that closes deals and proves retention',
    steps: [
      { n: '1', title: 'Baseline measurement', desc: 'We measure how AI recommends the restaurant today — the evidence you pitch with.' },
      { n: '2', title: 'You optimise', desc: 'You make the changes: schema, menus, content, Google Business Profile and more.' },
      { n: '3', title: 'We prove it', desc: 'Monitoring measures again and shows the before/after — the result you report back.' },
    ],
    warehouseTitle: 'Backed by the Observation Warehouse',
    warehouseBody: 'Recommendations and benchmarks are measured across thousands of anonymised observations — not generic SEO advice. Individual restaurant data is never shared. Evidence you can stand behind with a client.',
    ctaTitle: "Let's measure what your work delivers",
    ctaBody: 'Tell us about your agency and the restaurants you work with — we\'ll get you started.',
    ctaBtn: 'Get in touch',
    footerRights: '· We measure how AI recommends restaurants — not rankings.',
  },
  nl: {
    backHome: 'Terug naar home',
    contact: 'Neem contact op',
    eyebrow: 'Finded voor bureaus',
    heroLine: 'Jullie optimaliseren.',
    heroGrad: 'Wij bewijzen dat het werkte.',
    heroSub: 'Finded is de meetlaag voor AI-zichtbaarheid. Bureaus maken restaurants makkelijker aanbeveelbaar voor AI — Finded toont met bewijs of het écht verschil maakte.',
    ctaPartner: 'Word partner',
    ctaDashboard: 'Bekijk een live dashboard',
    whatKicker: 'Wat je krijgt',
    whatTitle: 'Alles om te verkopen, te bewijzen en te behouden',
    features: [
      { title: 'White-label rapporten', desc: 'Gebrande zichtbaarheidsrapporten die je direct aan klanten geeft — jouw logo, ons bewijs.', Icon: BadgeCheck },
      { title: 'Voor / na-vergelijkingen', desc: 'Toon de gemeten verandering na je werk, per AI-model en per prompt.', Icon: GitCompare },
      { title: 'Meerdere restaurants', desc: 'Beheer elke klant op één plek, elk met een eigen gemonitord dashboard.', Icon: Building2 },
      { title: 'Klantdashboards', desc: 'Geef elke klant een live, deterministisch dashboard — geen spreadsheets, geen giswerk.', Icon: LayoutDashboard },
      { title: 'Exports', desc: 'Exporteer bewijs, benchmarks en aanbevelingen voor voorstellen en reviews.', Icon: Download },
      { title: 'Benchmarks', desc: 'Vergelijk elke klant met keuken, stad en vergelijkbare restaurants uit de warehouse.', Icon: ChartColumn },
    ],
    howKicker: 'Hoe het werkt',
    howTitle: 'Meting die deals sluit en retentie bewijst',
    steps: [
      { n: '1', title: 'Nulmeting', desc: 'We meten hoe AI het restaurant vandaag aanbeveelt — het bewijs waarmee je pitcht.' },
      { n: '2', title: 'Jij optimaliseert', desc: "Jij voert de wijzigingen door: schema, menu's, content, Google-bedrijfsprofiel en meer." },
      { n: '3', title: 'Wij bewijzen het', desc: 'Monitoring meet opnieuw en toont het voor/na — het resultaat dat je terugkoppelt.' },
    ],
    warehouseTitle: 'Onderbouwd door de Observation Warehouse',
    warehouseBody: 'Aanbevelingen en benchmarks worden gemeten over duizenden geanonimiseerde observaties — geen generiek SEO-advies. Individuele restaurantdata wordt nooit gedeeld. Bewijs waar je achter kunt staan tegenover een klant.',
    ctaTitle: 'Laten we meten wat jouw werk oplevert',
    ctaBody: 'Vertel ons over je bureau en de restaurants waarmee je werkt — wij zetten je op weg.',
    ctaBtn: 'Neem contact op',
    footerRights: '· We meten hoe AI restaurants aanbeveelt — geen ranglijsten.',
  },
}

export default async function AgenciesPage() {
  const settings = await getSettings()
  const lang: Language = await getViewerLang(settings.defaultLanguage)
  const t = T[lang]
  const contactEmail = settings.contactEmail

  return (
    <div style={{ fontFamily: FONT, background: BG, minHeight: '100vh', color: INK, WebkitFontSmoothing: 'antialiased' }}>
      {/* Nav */}
      <nav style={{ background: 'rgba(241,232,215,0.88)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${BORDER2}`, padding: '0 24px', height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ textDecoration: 'none' }}><Logo /></a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LangToggle current={lang} tone="light" />
          <a href="/" style={{ fontSize: 13.5, color: MUTED, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft style={{ width: 15, height: 15 }} /> {t.backHome}
          </a>
          <a href={`mailto:${contactEmail}?subject=Finded for Agencies`} style={{ fontSize: 13.5, fontWeight: 700, background: GRAD, color: '#fff', padding: '10px 18px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 10px 24px -10px rgba(181,104,58,0.7)' }}>{t.contact}</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', overflow: 'hidden', borderBottom: `1px solid ${BORDER2}` }}>
        <div style={{ position: 'absolute', top: -240, left: '50%', transform: 'translateX(-50%)', width: 1000, height: 560, background: 'radial-gradient(ellipse at center, rgba(181,104,58,0.22), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 920, margin: '0 auto', padding: 'clamp(56px,7vw,96px) 24px', position: 'relative', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', fontSize: 11.5, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: 1.6, marginBottom: 18 }}>{t.eyebrow}</div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.04, letterSpacing: -2, marginBottom: 22 }}>
            {t.heroLine}<br />
            <span style={{ background: TEXT_GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>{t.heroGrad}</span>
          </h1>
          <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: MUTED, lineHeight: 1.6, maxWidth: 640, margin: '0 auto 32px' }}>{t.heroSub}</p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href={`mailto:${contactEmail}?subject=Finded for Agencies`} className="btn" style={{ background: GRAD, color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 26px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 16px 36px -14px rgba(181,104,58,0.8)' }}>{t.ctaPartner}</a>
            <a href="/#sample" className="btn" style={{ background: 'rgba(255,255,255,0.7)', color: INK, fontWeight: 700, fontSize: 15, padding: '14px 26px', borderRadius: 12, textDecoration: 'none', border: `1px solid ${BORDER}`, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {t.ctaDashboard} <ArrowRight style={{ width: 16, height: 16 }} />
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ background: BG_SOFT, borderBottom: `1px solid ${BORDER2}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '80px 24px' }}>
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 48px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: 1.8, marginBottom: 14 }}>{t.whatKicker}</div>
            <h2 style={{ fontSize: 'clamp(26px, 3.6vw, 38px)', fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.1 }}>{t.whatTitle}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
            {t.features.map(({ title, desc, Icon }) => (
              <div key={title} className="card-fx" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 24 }}>
                <span style={{ display: 'inline-flex', width: 42, height: 42, borderRadius: 12, background: 'rgba(181,104,58,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Icon style={{ width: 20, height: 20, color: ACCENT }} />
                </span>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: INK, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.55 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: BG, borderBottom: `1px solid ${BORDER2}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '80px 24px' }}>
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 44px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: 1.8, marginBottom: 14 }}>{t.howKicker}</div>
            <h2 style={{ fontSize: 'clamp(26px, 3.6vw, 38px)', fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.1 }}>{t.howTitle}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
            {t.steps.map(({ n, title, desc }) => (
              <div key={n} className="card-fx" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 24 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: GRAD, color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>{n}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: INK, marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.55 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Warehouse trust */}
      <section style={{ background: BG_SOFT, borderBottom: `1px solid ${BORDER2}`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -120, right: -80, width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(181,104,58,0.18), transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '76px 24px', position: 'relative' }}>
          <span style={{ display: 'inline-flex', width: 44, height: 44, borderRadius: 12, background: 'rgba(181,104,58,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            <ShieldCheck style={{ width: 22, height: 22, color: ACCENT }} />
          </span>
          <h2 style={{ fontSize: 'clamp(24px, 3.4vw, 34px)', fontWeight: 800, letterSpacing: -1, lineHeight: 1.12, marginBottom: 16, maxWidth: '20ch' }}>{t.warehouseTitle}</h2>
          <p style={{ fontSize: 17, color: 'rgba(36,28,19,0.74)', lineHeight: 1.7, maxWidth: '62ch' }}>{t.warehouseBody}</p>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: BG }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '88px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, letterSpacing: -1.2, marginBottom: 14 }}>{t.ctaTitle}</h2>
          <p style={{ fontSize: 17, color: MUTED, lineHeight: 1.6, marginBottom: 28 }}>{t.ctaBody}</p>
          <a href={`mailto:${contactEmail}?subject=Finded for Agencies`} className="btn" style={{ display: 'inline-block', background: GRAD, color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 16px 36px -14px rgba(181,104,58,0.8)' }}>{t.ctaBtn}</a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${BORDER2}`, background: BG }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
          <Logo size={26} />
          <span style={{ fontSize: 12.5, color: 'rgba(36,28,19,0.46)' }}>© {2026} Finded {t.footerRights}</span>
        </div>
      </footer>
    </div>
  )
}
