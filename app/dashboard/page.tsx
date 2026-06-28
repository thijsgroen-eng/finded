import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { readCustomerSession, listCustomerRestaurants, CUSTOMER_COOKIE } from '@/lib/auth/customer'
import { LogoutButton } from '@/components/portal/logout-button'
import { ArrowRight, Building2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

const BG = '#070711', CARD = 'rgba(255,255,255,0.035)', BORDER = 'rgba(255,255,255,0.09)'
const INK = '#f4f5fa', MUTED = '#9a9fb6', FAINT = '#646a85'
const GRAD = 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)'

function scoreColor(n: number | null) {
  if (n == null) return FAINT
  if (n >= 60) return '#34d399'
  if (n >= 30) return '#fbbf24'
  return '#fb7185'
}
const planLabel = (p: string | null) => p === 'implementation' ? 'Implementation' : p === 'audit' ? 'Audit' : 'Free'

export default async function CustomerDashboard() {
  const session = await readCustomerSession((await cookies()).get(CUSTOMER_COOKIE)?.value)
  if (!session) redirect('/portal/login')

  const restaurants = await listCustomerRestaurants(session.cid)

  return (
    <div style={{ minHeight: '100vh', background: BG, color: INK, fontFamily: 'var(--font-inter), sans-serif' }}>
      <nav style={{ borderBottom: `1px solid ${BORDER}`, padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: GRAD, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 15 }}>F</span>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5 }}>finded</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, color: FAINT }}>{session.email}</span>
          <LogoutButton />
        </div>
      </nav>

      <main style={{ maxWidth: 920, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 'clamp(26px,4vw,34px)', fontWeight: 800, letterSpacing: -1, marginBottom: 6 }}>Your restaurants</h1>
        <p style={{ fontSize: 15, color: MUTED, marginBottom: 32 }}>Open a restaurant to see its AI Visibility dashboard.</p>

        {restaurants.length === 0 ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 40, textAlign: 'center' }}>
            <Building2 style={{ width: 36, height: 36, color: FAINT, margin: '0 auto 14px' }} />
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>No restaurants linked yet</h2>
            <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, maxWidth: 440, margin: '0 auto' }}>
              We link dashboards to the email your audit was requested with. If your audit is still running, or you used a
              different email, it may not appear yet. Start a free check from the homepage, or reply to your audit email and we&rsquo;ll connect it.
            </p>
            <a href="/#check" style={{ display: 'inline-block', marginTop: 20, background: GRAD, color: '#fff', fontWeight: 700, fontSize: 14, padding: '11px 20px', borderRadius: 10, textDecoration: 'none' }}>Start a free check</a>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {restaurants.map((r) => (
              <a key={r.id} href={`/dashboard/${r.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 18, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 24px', textDecoration: 'none', color: INK }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 14, background: 'rgba(124,92,255,0.12)', border: '1px solid rgba(124,92,255,0.25)', flexShrink: 0 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor(r.visibility_score), lineHeight: 1 }}>{r.visibility_score ?? '—'}</span>
                  <span style={{ fontSize: 9, color: FAINT, marginTop: 2 }}>/100</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{r.name}</div>
                  <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>
                    {[r.city, r.cuisine].filter(Boolean).join(' · ') || '—'}
                    {r.last_audit_at ? ` · audited ${new Date(r.last_audit_at).toLocaleDateString()}` : ' · not audited yet'}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', background: 'rgba(124,92,255,0.12)', border: '1px solid rgba(124,92,255,0.25)', borderRadius: 6, padding: '4px 9px' }}>{planLabel(r.plan)}</span>
                <ArrowRight style={{ width: 18, height: 18, color: FAINT, flexShrink: 0 }} />
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
