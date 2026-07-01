import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { readCustomerSession, listCustomerRestaurants, CUSTOMER_COOKIE } from '@/lib/auth/customer'
import { getViewerLang } from '@/lib/i18n-viewer'
import { getSettings } from '@/lib/settings'
import { PORTAL } from '@/lib/portal-copy'
import { LogoutButton } from '@/components/portal/logout-button'
import { LangToggle } from '@/components/lang-toggle'
import { ArrowRight, Building2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

const BG = '#F1E8D7', CARD = 'rgba(255,255,255,0.65)', BORDER = 'rgba(36,28,19,0.14)'
const INK = '#241C13', MUTED = 'rgba(36,28,19,0.66)', FAINT = 'rgba(36,28,19,0.46)'
const GRAD = 'linear-gradient(135deg, #C8804E 0%, #B5683A 50%, #9A5530 100%)'

function scoreColor(n: number | null) {
  if (n == null) return FAINT
  if (n >= 60) return '#16a34a'
  if (n >= 30) return '#d97706'
  return '#dc2626'
}

export default async function CustomerDashboard() {
  const session = await readCustomerSession((await cookies()).get(CUSTOMER_COOKIE)?.value)
  if (!session) redirect('/portal/login')

  const lang = await getViewerLang((await getSettings()).defaultLanguage)
  const t = PORTAL[lang].list
  const restaurants = await listCustomerRestaurants(session.cid)
  const planLabel = (p: string | null) => t.plan[p ?? 'free'] ?? t.plan.free

  return (
    <div style={{ minHeight: '100vh', background: BG, color: INK, fontFamily: 'var(--font-inter), sans-serif' }}>
      <nav style={{ borderBottom: `1px solid ${BORDER}`, padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(241,232,215,0.88)', backdropFilter: 'blur(14px)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: GRAD, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 15 }}>F</span>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5, color: INK }}>finded</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LangToggle current={lang} tone="light" />
          <span style={{ fontSize: 13, color: FAINT }}>{session.email}</span>
          <LogoutButton label={t.logout} />
        </div>
      </nav>

      <main style={{ maxWidth: 920, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 'clamp(26px,4vw,34px)', fontWeight: 800, letterSpacing: -1, marginBottom: 6 }}>{t.title}</h1>
        <p style={{ fontSize: 15, color: MUTED, marginBottom: 32 }}>{t.sub}</p>

        {restaurants.length === 0 ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 40, textAlign: 'center' }}>
            <Building2 style={{ width: 36, height: 36, color: FAINT, margin: '0 auto 14px' }} />
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{t.emptyTitle}</h2>
            <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, maxWidth: 440, margin: '0 auto' }}>{t.emptyBody}</p>
            <a href="/#check" style={{ display: 'inline-block', marginTop: 20, background: GRAD, color: '#fff', fontWeight: 700, fontSize: 14, padding: '11px 20px', borderRadius: 10, textDecoration: 'none' }}>{t.startCheck}</a>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {restaurants.map((r) => (
              <a key={r.id} href={`/dashboard/${r.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 18, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 24px', textDecoration: 'none', color: INK }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 14, background: 'rgba(181,104,58,0.12)', border: '1px solid rgba(181,104,58,0.25)', flexShrink: 0 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor(r.visibility_score), lineHeight: 1 }}>{r.visibility_score ?? '—'}</span>
                  <span style={{ fontSize: 9, color: FAINT, marginTop: 2 }}>/100</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{r.name}</div>
                  <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>
                    {[r.city, r.cuisine].filter(Boolean).join(' · ') || '—'}
                    {r.last_audit_at ? ` · ${t.auditedOn(new Date(r.last_audit_at).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-GB'))}` : ` · ${t.notAudited}`}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#B5683A', background: 'rgba(181,104,58,0.12)', border: '1px solid rgba(181,104,58,0.25)', borderRadius: 6, padding: '4px 9px' }}>{planLabel(r.plan)}</span>
                <ArrowRight style={{ width: 18, height: 18, color: FAINT, flexShrink: 0 }} />
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
