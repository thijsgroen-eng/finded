import { LeadForm } from '@/components/landing/lead-form'
import { CountUp } from '@/components/landing/count-up'
import { getSettings } from '@/lib/settings'
import { platformStats } from '@/lib/observations'
import {
  Building2, Search, ClipboardCheck, MapPin, UtensilsCrossed, Cpu,
  Bot, Users, Globe, FileSearch, ListChecks, Check, Database,
  ShieldCheck, Lock, CircleCheck, Home, Gauge, MessageSquare,
  TrendingUp, FileDown, Sparkles, ArrowRight,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// ── Dark "AI platform" identity: near-black navy · violet→blue gradient ───────
const BG = '#070711'
const BG_SOFT = '#0b0b18'
const CARD = 'rgba(255,255,255,0.035)'
const CARD2 = 'rgba(255,255,255,0.055)'
const BORDER = 'rgba(255,255,255,0.09)'
const BORDER2 = 'rgba(255,255,255,0.06)'
const INK = '#f4f5fa'
const MUTED = '#9a9fb6'
const FAINT = '#646a85'
const VIOLET = '#8b5cf6'
const BLUE = '#4f7cff'
const GREEN = '#34d399'
const AMBER = '#fbbf24'
const GRAD = 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)'
const TEXT_GRAD = 'linear-gradient(90deg, #5b8cff 0%, #a78bfa 100%)'

const FONT = 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

const PROVIDERS: { name: string; color: string }[] = [
  { name: 'ChatGPT', color: '#19c37d' },
  { name: 'Gemini', color: '#4f8cff' },
  { name: 'Claude', color: '#d97757' },
  { name: 'Perplexity', color: '#20b8cd' },
]

function Logo({ size = 30 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <span style={{ width: size, height: size, borderRadius: size * 0.28, background: GRAD, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px -6px rgba(99,102,241,0.7)' }}>
        <span style={{ fontSize: size * 0.56, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>F</span>
      </span>
      <span style={{ fontSize: size * 0.62, fontWeight: 700, color: INK, letterSpacing: -0.5 }}>finded</span>
    </span>
  )
}

function SectionTitle({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 52, maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' }}>
      {kicker && <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1.8, marginBottom: 14 }}>{kicker}</div>}
      <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: -1.4, color: INK, lineHeight: 1.08 }}>{title}</h2>
      {sub && <p style={{ fontSize: 18, color: MUTED, marginTop: 16, lineHeight: 1.6 }}>{sub}</p>}
    </div>
  )
}

// ── Donut ring (SVG) ──────────────────────────────────────────────────────────
function Ring({ pct, size, stroke, label, sub }: { pct: number; size: number; stroke: number; label: string; sub?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  const id = `g${Math.round(pct)}${size}`
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c5cff" />
          <stop offset="100%" stopColor="#4f8cff" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="49%" textAnchor="middle" dominantBaseline="central" style={{ fontFamily: FONT, fontSize: size * 0.26, fontWeight: 800, fill: '#fff' }}>{label}</text>
      {sub && <text x="50%" y="65%" textAnchor="middle" dominantBaseline="central" style={{ fontFamily: FONT, fontSize: size * 0.11, fill: MUTED }}>{sub}</text>}
    </svg>
  )
}

// ── The product, recreated as live markup (the hero centrepiece) ──────────────
function DashboardMock() {
  const navItems = [
    { icon: Home, label: 'Overview', active: true },
    { icon: Gauge, label: 'AI Visibility Score' },
    { icon: Bot, label: 'AI Mentions' },
    { icon: Users, label: 'Competitors' },
    { icon: ListChecks, label: 'Recommendations' },
    { icon: Globe, label: 'Website Audit' },
    { icon: TrendingUp, label: 'Trends (Beta)' },
  ]
  const competitors = [
    ['1', 'La Bella Italia', 82, false],
    ['2', 'Casa di Roma', 75, true],
    ['3', 'Trattoria Milano', 68, false],
    ['4', 'Osteria da Vinci', 63, false],
    ['5', 'Il Gusto', 58, false],
  ] as const
  const months = ['Jun 24', 'Jul 24', 'Aug 24', 'Sep 24', 'Oct 24', 'Nov 24', 'Dec 24']
  const vals = [38, 52, 66, 64, 71, 75, 72]
  const X = (i: number) => 44 + i * (456 / 6)
  const Y = (v: number) => 150 - v * 1.3
  const line = vals.map((v, i) => `${X(i)},${Y(v)}`).join(' ')
  const area = `${line} ${X(6)},150 ${X(0)},150`

  const cardBox = { background: CARD, border: `1px solid ${BORDER2}`, borderRadius: 14, padding: 18 } as const
  const eyebrow = { fontSize: 10.5, fontWeight: 700, color: FAINT, textTransform: 'uppercase' as const, letterSpacing: 1 }

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 20, background: 'linear-gradient(180deg, #0e0e1d, #0a0a15)', boxShadow: '0 60px 120px -50px rgba(80,60,200,0.45), 0 0 0 1px rgba(255,255,255,0.03)', overflow: 'hidden', display: 'grid', gridTemplateColumns: 'minmax(0, 210px) 1fr' }}>
      {/* Sidebar */}
      <aside style={{ borderRight: `1px solid ${BORDER2}`, padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 4, background: 'rgba(255,255,255,0.015)' }}>
        <div style={{ padding: '2px 8px 16px' }}><Logo size={24} /></div>
        {navItems.map(({ icon: Icon, label, active }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 9, fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#fff' : MUTED, background: active ? 'rgba(124,92,255,0.16)' : 'transparent', border: active ? '1px solid rgba(124,92,255,0.3)' : '1px solid transparent' }}>
            <Icon style={{ width: 15, height: 15, color: active ? '#a78bfa' : FAINT }} /> {label}
          </div>
        ))}
        <div style={{ borderTop: `1px solid ${BORDER2}`, margin: '10px 0', paddingTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', fontSize: 13, color: MUTED }}>
            <FileDown style={{ width: 15, height: 15, color: FAINT }} /> Export PDF
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ padding: 18, display: 'grid', gap: 14 }}>
        {/* Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr 1fr', gap: 14 }}>
          {/* Score */}
          <div style={cardBox}>
            <div style={eyebrow}>AI Visibility Score</div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 10 }}>
              <Ring pct={72} size={104} stroke={11} label="72" sub="/100" />
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: GREEN, background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.3)', padding: '3px 9px', borderRadius: 6 }}>Good</span>
                <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, margin: '10px 0 0' }}>You&rsquo;re visible in AI recommendations, but there&rsquo;s room to grow.</p>
                <div style={{ fontSize: 12, fontWeight: 700, color: GREEN, marginTop: 8 }}>↑ 18 points <span style={{ color: FAINT, fontWeight: 500 }}>vs. last audit</span></div>
              </div>
            </div>
          </div>
          {/* Mentioned */}
          <div style={cardBox}>
            <div style={eyebrow}>Mentioned by AI</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 10 }}>
              <Ring pct={67} size={84} stroke={10} label="67%" />
              <div>
                <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, margin: 0 }}>You&rsquo;re mentioned in 67% of relevant AI responses.</p>
                <div style={{ fontSize: 11, color: FAINT, marginTop: 10 }}>Industry avg. <strong style={{ color: MUTED }}>48%</strong></div>
              </div>
            </div>
          </div>
          {/* Competitors */}
          <div style={cardBox}>
            <div style={eyebrow}>Top Competitors</div>
            <div style={{ marginTop: 10, display: 'grid', gap: 2 }}>
              {competitors.map(([rank, name, score, hot]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 7px', borderRadius: 7, background: hot ? 'rgba(124,92,255,0.12)' : 'transparent' }}>
                  <span style={{ fontSize: 11, color: FAINT, width: 10 }}>{rank}</span>
                  <span style={{ fontSize: 12.5, color: INK, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: hot ? '#a78bfa' : MUTED }}>{score}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: '#a78bfa', fontWeight: 600, marginTop: 10 }}>View full comparison →</div>
          </div>
        </div>

        {/* Row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
          {/* Chart */}
          <div style={cardBox}>
            <div style={eyebrow}>Visibility over time</div>
            <svg viewBox="0 0 520 175" style={{ width: '100%', height: 'auto', marginTop: 8 }}>
              <defs>
                <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(124,92,255,0.35)" />
                  <stop offset="100%" stopColor="rgba(124,92,255,0)" />
                </linearGradient>
                <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#5b8cff" /><stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
              {[0, 25, 50, 75, 100].map((g) => (
                <g key={g}>
                  <line x1={44} y1={Y(g)} x2={510} y2={Y(g)} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
                  <text x={32} y={Y(g) + 3} textAnchor="end" style={{ fontFamily: FONT, fontSize: 9, fill: FAINT }}>{g}</text>
                </g>
              ))}
              <polygon points={area} fill="url(#area)" />
              <polyline points={line} fill="none" stroke="url(#stroke)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              {vals.map((v, i) => <circle key={i} cx={X(i)} cy={Y(v)} r={2.6} fill="#a78bfa" />)}
              <circle cx={X(6)} cy={Y(72)} r={4.5} fill="#fff" stroke="#a78bfa" strokeWidth={2} />
              <g transform={`translate(${X(6) - 14}, ${Y(72) - 24})`}>
                <rect width={30} height={17} rx={4} fill="#7c5cff" /><text x={15} y={12} textAnchor="middle" style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, fill: '#fff' }}>72</text>
              </g>
              {months.map((m, i) => <text key={m} x={X(i)} y={170} textAnchor="middle" style={{ fontFamily: FONT, fontSize: 9, fill: FAINT }}>{m}</text>)}
            </svg>
          </div>
          {/* Key insight + reliability */}
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ ...cardBox, background: 'linear-gradient(135deg, rgba(124,92,255,0.16), rgba(79,124,255,0.06))', border: '1px solid rgba(124,92,255,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, ...eyebrow, color: '#a78bfa' }}><Sparkles style={{ width: 13, height: 13 }} /> Key insight</div>
              <p style={{ fontSize: 12.5, color: INK, lineHeight: 1.5, margin: '10px 0 0' }}>Restaurants with a crawlable HTML menu are mentioned <strong>2.1×</strong> more often by AI assistants.</p>
              <div style={{ fontSize: 11.5, color: '#a78bfa', fontWeight: 600, marginTop: 10 }}>See all insights →</div>
            </div>
            <div style={cardBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={eyebrow}>Reliability</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: GREEN }}>High</span>
              </div>
              <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.08)', marginTop: 10, overflow: 'hidden' }}>
                <div style={{ width: '86%', height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${GREEN}, #6ee7b7)` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
                <span style={{ fontSize: 10.5, color: FAINT }}>All systems normal</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: INK }}>86%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function LandingPage() {
  const settings = await getSettings()
  const contactEmail = settings.contactEmail
  const founder = settings.founderName

  const stats = await platformStats().catch(() => null)
  const haveData = !!stats && stats.audits > 0
  const haveBench = !!stats && stats.n >= 20
  const rate = (k: 'restaurant_schema' | 'html_menu' | 'faq_present') => stats ? Math.round((stats.factRates[k] ?? 0) * 100) : 0

  const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 26 } as const

  const statCards = stats ? [
    { icon: Building2, value: stats.restaurants || stats.audits, label: 'Restaurants analysed' },
    { icon: Search, value: stats.searches, label: 'AI searches performed' },
    { icon: ClipboardCheck, value: stats.audits, label: 'Audits completed' },
    { icon: MapPin, value: stats.cities, label: 'Cities covered' },
    { icon: UtensilsCrossed, value: stats.cuisines, label: 'Cuisine types' },
    { icon: Cpu, value: stats.models, label: 'AI models tested' },
  ] : []

  const measure = [
    { icon: Bot, t: 'AI recommendations', d: 'Which AI models mention your restaurant, and how often.', ex: 'e.g. Claude names you, ChatGPT doesn’t.' },
    { icon: Users, t: 'Competitor comparison', d: 'Which restaurants AI recommends instead of you.', ex: 'e.g. 3 rivals appear in 18/32 searches.' },
    { icon: Globe, t: 'Website analysis', d: 'Schema, menus, crawlability and content.', ex: 'e.g. menu is a PDF AI can’t read.' },
    { icon: MapPin, t: 'Google Business Profile', d: 'Reviews, categories and business attributes.', ex: 'e.g. cuisine category missing.' },
    { icon: FileSearch, t: 'Evidence', d: 'The exact prompts and AI responses behind each finding.', ex: 'e.g. the 12 prompts you’re absent from.' },
    { icon: ListChecks, t: 'Prioritised action plan', d: 'The most important improvements first.', ex: 'e.g. add Restaurant schema — do first.' },
  ]

  const navLink = { fontSize: 14, fontWeight: 500, color: MUTED, textDecoration: 'none' } as const
  const trust = [
    { icon: ShieldCheck, t: '100% evidence-backed', d: 'No guesswork. Ever.' },
    { icon: Lock, t: 'Your data is private', d: 'We never share or sell data.' },
    { icon: CircleCheck, t: 'Audit in ~24 hours', d: 'Full report delivered by email.' },
  ]

  return (
    <div id="top" style={{ fontFamily: FONT, background: BG, minHeight: '100vh', WebkitFontSmoothing: 'antialiased', color: INK, position: 'relative', zIndex: 1 }}>

      {/* ── Nav ── */}
      <nav style={{ background: 'rgba(7,7,17,0.72)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${BORDER2}`, padding: '0 24px', height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ textDecoration: 'none' }}><Logo /></a>
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <a href="#measure" style={navLink}>Product</a>
          <a href="#how" style={navLink}>How it works</a>
          <a href="#pricing" style={navLink}>Pricing</a>
          <a href="#data" style={navLink}>Resources</a>
          <a href={`mailto:${contactEmail}?subject=Finded for Agencies`} style={navLink}>For Agencies</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/portal/login" style={{ ...navLink, fontWeight: 600 }}>Log in</a>
          <a href="#check" style={{ fontSize: 13.5, fontWeight: 700, background: GRAD, color: '#fff', padding: '10px 18px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 10px 24px -10px rgba(99,102,241,0.7)' }}>Get your free check</a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', borderBottom: `1px solid ${BORDER2}` }}>
        <div style={{ position: 'absolute', top: -260, left: '50%', transform: 'translateX(-50%)', width: 1100, height: 620, background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.28), rgba(124,92,255,0.10) 40%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(48px,6vw,84px) 24px 0', position: 'relative', textAlign: 'center' }}>
          <div className="rise" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: MUTED, fontSize: 11.5, fontWeight: 700, padding: '7px 16px', borderRadius: 20, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 30 }}>
            The AI Visibility Platform for restaurants
          </div>
          <h1 className="rise" style={{ fontSize: 'clamp(40px, 7vw, 78px)', fontWeight: 800, lineHeight: 1.0, letterSpacing: -2.6, marginBottom: 26 }}>
            See how AI recommends<br /><span style={{ background: TEXT_GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>your restaurant</span>
          </h1>
          <p className="rise rise-2" style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: MUTED, lineHeight: 1.6, margin: '0 auto 36px', maxWidth: 640 }}>
            Finded audits how ChatGPT, Gemini, Claude and Perplexity talk about restaurants like yours.
            Get your AI Visibility Score, see the gaps, and grow your visibility.
          </p>

          <div className="rise rise-2" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href="#check" className="btn" style={{ display: 'flex', alignItems: 'center', gap: 11, background: GRAD, color: '#fff', padding: '14px 26px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 16px 36px -14px rgba(99,102,241,0.8)' }}>
              <Sparkles style={{ width: 18, height: 18 }} />
              <span style={{ textAlign: 'left' }}><span style={{ display: 'block', fontSize: 15.5, fontWeight: 700 }}>Start your free Visibility Check</span><span style={{ display: 'block', fontSize: 11.5, opacity: 0.85 }}>No card required · 2 minutes</span></span>
            </a>
            <a href="#sample" className="btn" style={{ display: 'flex', alignItems: 'center', gap: 11, background: CARD2, color: INK, padding: '14px 26px', borderRadius: 12, textDecoration: 'none', border: `1px solid ${BORDER}` }}>
              <FileSearch style={{ width: 18, height: 18, color: MUTED }} />
              <span style={{ textAlign: 'left' }}><span style={{ display: 'block', fontSize: 15.5, fontWeight: 700 }}>View a sample report</span><span style={{ display: 'block', fontSize: 11.5, color: FAINT }}>See what you&rsquo;ll get</span></span>
            </a>
          </div>

          {/* Trust row */}
          <div className="rise rise-3" style={{ display: 'flex', gap: 'clamp(24px,5vw,64px)', justifyContent: 'center', flexWrap: 'wrap', margin: '44px 0 8px' }}>
            {trust.map(({ icon: Icon, t, d }) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 11, textAlign: 'left' }}>
                <span style={{ display: 'inline-flex', width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, alignItems: 'center', justifyContent: 'center' }}><Icon style={{ width: 17, height: 17, color: '#a78bfa' }} /></span>
                <span><span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: INK }}>{t}</span><span style={{ display: 'block', fontSize: 12, color: FAINT }}>{d}</span></span>
              </div>
            ))}
          </div>

          {/* Providers */}
          <div style={{ marginTop: 46 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1.6, marginBottom: 18 }}>Audits across all major AI assistants</div>
            <div style={{ display: 'flex', gap: 'clamp(20px,4vw,46px)', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
              {PROVIDERS.map((p) => (
                <span key={p.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 16, fontWeight: 700, color: '#cfd2e0' }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: p.color, display: 'inline-block', boxShadow: `0 0 16px -2px ${p.color}` }} />
                  {p.name}
                </span>
              ))}
            </div>
          </div>

          {/* Dashboard mock */}
          <div id="sample" className="rise rise-3" style={{ marginTop: 46, scrollMarginTop: 80 }}>
            <DashboardMock />
            <p style={{ fontSize: 13, color: FAINT, marginTop: 24 }}>
              Trusted by restaurant owners in <span style={{ color: MUTED }}>Amsterdam · Rotterdam · Utrecht</span> and across the Netherlands
            </p>
          </div>
        </div>
      </section>

      {/* ── Finded Insights — live platform stats ── */}
      <section style={{ borderBottom: `1px solid ${BORDER2}`, background: BG_SOFT }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '56px 24px' }}>
          <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1.8, marginBottom: 28 }}>Finded Insights · measured continuously</div>
          {haveData ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
              {statCards.map(({ icon: Icon, value, label }) => (
                <div key={label} className="card-fx" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 18px', textAlign: 'center' }}>
                  <span style={{ display: 'inline-flex', width: 34, height: 34, borderRadius: 9, background: 'rgba(124,92,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Icon style={{ width: 17, height: 17, color: '#a78bfa' }} />
                  </span>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, color: INK }}><CountUp value={value} /></div>
                  <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', fontSize: 15.5, color: MUTED, maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>
              Our dataset grows with every completed audit. Live platform statistics — restaurants analysed, AI
              searches performed, cities and cuisines covered — appear here as the knowledge base fills.
            </p>
          )}
        </div>
      </section>

      {/* ── Why it matters ── */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '92px 24px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(26px, 3.8vw, 38px)', fontWeight: 800, letterSpacing: -1.2, marginBottom: 18, lineHeight: 1.12 }}>
          Guests no longer only search Google.
        </h2>
        <p style={{ fontSize: 18, color: MUTED, lineHeight: 1.65, maxWidth: 620, margin: '0 auto' }}>
          They ask AI where to eat, where to celebrate, which place is romantic. These tools name only a few
          restaurants — if your competitors are mentioned and you aren&rsquo;t, you&rsquo;re missing a discovery
          channel that&rsquo;s quietly growing.
        </p>
      </section>

      {/* ── What your audit measures ── */}
      <section id="measure" style={{ maxWidth: 1080, margin: '0 auto', padding: '64px 24px 96px', scrollMarginTop: 70 }}>
        <SectionTitle title="What your audit actually measures" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
          {measure.map(({ icon: Icon, t, d, ex }) => (
            <div key={t} className="card-fx" style={card}>
              <span style={{ display: 'inline-flex', width: 42, height: 42, borderRadius: 12, background: 'rgba(124,92,255,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Icon style={{ width: 20, height: 20, color: '#a78bfa' }} />
              </span>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: INK, marginBottom: 8 }}>{t}</h3>
              <p style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.55, marginBottom: 12 }}>{d}</p>
              <div style={{ fontSize: 12.5, color: '#a78bfa', background: 'rgba(124,92,255,0.08)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '7px 10px' }}>{ex}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 24px 96px', scrollMarginTop: 70 }}>
        <SectionTitle kicker="How it works" title="From your website to evidence-based recommendations" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
          {[
            ['1', 'Website crawl', 'We read your site the way AI does.'],
            ['2', 'AI prompt testing', 'Dozens of real searches across 4 models.'],
            ['3', 'Competitor comparison', 'Who gets named instead, and why.'],
            ['4', 'Evidence', 'The prompts & responses behind each finding.'],
            ['5', 'Recommendations', 'Prioritised, backed by data.'],
            ['6', 'Implementation', 'We help you make the changes.'],
          ].map(([n, t, d]) => (
            <div key={n} className="card-fx" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 18 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: GRAD, color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>{n}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: INK, marginBottom: 4 }}>{t}</div>
              <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>{d}</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: FAINT, marginTop: 24 }}>Monthly AI visibility monitoring is coming next — so you can track changes over time.</p>
      </section>

      {/* ── Built from real data ── */}
      <section id="data" style={{ background: BG_SOFT, borderTop: `1px solid ${BORDER2}`, borderBottom: `1px solid ${BORDER2}`, position: 'relative', overflow: 'hidden', scrollMarginTop: 60 }}>
        <div style={{ position: 'absolute', top: -120, right: -80, width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,255,0.22), transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 940, margin: '0 auto', padding: '100px 24px', position: 'relative' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1.8, marginBottom: 18 }}>Built from real restaurant data</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, letterSpacing: -1.3, lineHeight: 1.1, marginBottom: 20 }}>
            We measure how AI recommends restaurants — and learn from every audit.
          </h2>
          <p style={{ fontSize: 18, color: MUTED, lineHeight: 1.7, marginBottom: 32, maxWidth: 720 }}>
            Every completed audit anonymously sharpens our understanding of how AI discovers restaurants. Recommendations
            become evidence-based over time — drawn from patterns across real restaurants, not general SEO advice.
          </p>
          <div style={{ fontSize: 12, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>What we&rsquo;re learning</div>
          {haveBench ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
              {[
                [`${100 - rate('restaurant_schema')}%`, 'are missing Restaurant schema'],
                [`${100 - rate('html_menu')}%`, 'don’t have a crawlable HTML menu'],
                [`${100 - rate('faq_present')}%`, 'have no FAQ content'],
                [`${stats!.pctMentioned != null ? Math.round(stats!.pctMentioned * 100) : 0}%`, 'are recommended by AI at all'],
              ].map(([v, l]) => (
                <div key={l as string} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1, color: '#fff' }}>{v}</div>
                  <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, fontSize: 14.5, color: MUTED, maxWidth: 720 }}>
              As the dataset grows we surface the most common issues here — like how many restaurants are missing
              Restaurant schema, rely on PDF menus, or have no FAQ. These benchmarks become stronger with every audit.
            </div>
          )}
          <p style={{ fontSize: 12, color: FAINT, marginTop: 26, lineHeight: 1.6 }}>
            Only aggregate, anonymous statistics — never individual restaurant data. We measure how AI recommends
            restaurants today and help you improve; we don&rsquo;t promise rankings or control AI.
          </p>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ scrollMarginTop: 60 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 24px' }}>
          <SectionTitle kicker="Pricing" title="Start free. Pay only for more depth." sub="Free tells you whether AI recommends you. The audit explains why. Implementation helps you fix it." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'stretch' }}>
            {[
              { name: 'Free AI Visibility Check', price: '€0', cadence: '', q: 'Is AI recommending my restaurant?', badge: '',
                features: ['Your AI Visibility Dashboard', 'AI visibility status & score', 'Competitors mentioned instead', 'Top 3 findings + website snapshot', 'Download a summary PDF anytime'],
                cta: 'Open my free dashboard', href: '#check', note: 'No account, no card, no obligation.', highlight: false },
              { name: 'AI Visibility Audit', price: '€49', cadence: 'one-time', q: 'Why do competitors appear more often?', badge: 'Most popular',
                features: ['Everything in the free check', 'All four AI models analysed', 'Prompt-level evidence', 'Competitor comparison & why they win', 'Website, menu & structured-data analysis', 'Evidence-backed recommendations', '30-day action plan'],
                cta: 'Get the full audit', href: `mailto:${contactEmail}?subject=AI Visibility Audit`, note: 'Understand exactly why competitors appear more often.', highlight: true },
              { name: 'AI Visibility Implementation', price: '€299', cadence: 'one-time', q: 'Help me actually fix it.', badge: 'Best value',
                features: ['Everything in the audit', 'Restaurant schema implemented', 'FAQ & AI-friendly content', 'Homepage & location improvements', 'Menu & Google Business improvements', 'Follow-up audit (before / after)'],
                cta: 'Discuss implementation', href: `mailto:${contactEmail}?subject=AI Visibility Implementation`, note: 'We make your restaurant easier for AI to understand and recommend.', highlight: false },
            ].map((p) => (
              <div key={p.name} className="card-fx" style={{
                background: p.highlight ? 'linear-gradient(180deg, rgba(124,92,255,0.14), rgba(79,124,255,0.05))' : CARD,
                color: INK, border: `1px solid ${p.highlight ? 'rgba(124,92,255,0.4)' : BORDER}`, borderRadius: 20, padding: 26,
                display: 'flex', flexDirection: 'column', boxShadow: p.highlight ? '0 30px 70px -40px rgba(124,92,255,0.6)' : 'none',
              }}>
                {p.badge && <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: '#fff', background: GRAD, padding: '4px 9px', borderRadius: 6, marginBottom: 14 }}>{p.badge}</span>}
                <div style={{ fontSize: 16, fontWeight: 800 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '10px 0 6px' }}>
                  <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1.5 }}>{p.price}</span>
                  {p.cadence && <span style={{ fontSize: 13, color: MUTED }}>{p.cadence}</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', marginBottom: 18 }}>{p.q}</div>
                <div style={{ display: 'grid', gap: 10, marginBottom: 22 }}>
                  {p.features.map((f) => (
                    <div key={f} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                      <Check style={{ width: 15, height: 15, color: '#a78bfa', flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 13.5, color: '#d7dae6', lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <a href={p.href} className="btn" style={{ marginTop: 'auto', textAlign: 'center', textDecoration: 'none', fontWeight: 700, fontSize: 14.5, padding: '14px 16px', borderRadius: 11, background: p.highlight ? GRAD : CARD2, color: '#fff', border: p.highlight ? 'none' : `1px solid ${BORDER}`, boxShadow: p.highlight ? '0 14px 30px -12px rgba(99,102,241,0.7)' : 'none' }}>{p.cta}</a>
                <p style={{ fontSize: 12, color: FAINT, marginTop: 12, textAlign: 'center', lineHeight: 1.45 }}>{p.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Founder ── */}
      <section style={{ borderTop: `1px solid ${BORDER2}`, background: BG_SOFT }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '92px 24px', display: 'flex', gap: 'clamp(24px, 4vw, 48px)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 150, height: 150, borderRadius: 24, background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 24px 60px -28px rgba(124,92,255,0.7)' }}>
              <span style={{ fontSize: 52, fontWeight: 800, color: '#fff' }}>{founder.charAt(0)}</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14 }}>From the founder</div>
            <p style={{ fontSize: 'clamp(20px, 2.4vw, 26px)', color: INK, lineHeight: 1.35, marginBottom: 14, fontWeight: 700, letterSpacing: -0.6 }}>
              “Hi, I&rsquo;m {founder}. I work with restaurants every day — and I built Finded because owners had no way of knowing whether AI recommends them, or their competitors.”
            </p>
            <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.65, marginBottom: 18 }}>
              Every completed audit improves how well we understand the way AI discovers restaurants. It&rsquo;s a small,
              independent platform built in the Netherlands. If you have a question, email me — I read every one.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: INK }}>{founder}</span>
              <span style={{ color: FAINT }}>·</span>
              <a href={`mailto:${contactEmail}`} style={{ fontSize: 14, color: '#a78bfa', fontWeight: 600, textDecoration: 'none' }}>{contactEmail}</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Lead capture ── */}
      <section id="check" style={{ position: 'relative', overflow: 'hidden', scrollMarginTop: 60, borderTop: `1px solid ${BORDER2}` }}>
        <div style={{ position: 'absolute', top: -160, left: '50%', transform: 'translateX(-50%)', width: 900, height: 500, background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.25), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '96px 24px', textAlign: 'center', position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, letterSpacing: -1.2, marginBottom: 14, color: '#fff' }}>See whether AI recommends your restaurant</h2>
          <p style={{ fontSize: 17, color: MUTED, lineHeight: 1.6, marginBottom: 30 }}>Send your website and city, and we&rsquo;ll email you a link to your free AI Visibility Dashboard.</p>
          <div style={{ background: '#fff', borderRadius: 18, padding: 'clamp(20px, 3vw, 28px)', textAlign: 'left', boxShadow: '0 40px 80px -30px rgba(0,0,0,0.7)' }}>
            <LeadForm />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ borderTop: `1px solid ${BORDER2}`, background: BG_SOFT }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '92px 24px' }}>
          <SectionTitle kicker="FAQ" title="Honest answers" />
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              ['Is the check really free?', 'Yes — the initial check is free and emailed to you. No account, no card, no obligation.'],
              ['How is this different from asking AI myself?', 'We don’t ask AI for advice. We measure how four AI models actually answer real diner searches, repeated across dozens of prompts, then compare you with the competitors they name — and back recommendations with data from other audited restaurants.'],
              ['Do you guarantee AI will recommend me?', 'No, and nobody honestly can. We measure how AI recommends restaurants today, explain why, and show what to improve. It’s measurement, not guaranteed rankings.'],
              ['Can AI answers change over time?', 'They can and do. That’s why we measure across multiple prompts and models and treat results as a snapshot — and why monthly monitoring is on the way.'],
              ['What do you need from me?', 'Just your restaurant’s website, your city, and an email to send the results to.'],
              ['What about my data?', 'We only use your details to prepare your report. Benchmarks are fully anonymous — individual restaurant data is never exposed.'],
            ].map(([q, a]) => (
              <details key={q} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px 20px' }}>
                <summary style={{ fontSize: 15, fontWeight: 700, color: INK, cursor: 'pointer', listStyle: 'none' }}>{q}</summary>
                <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, marginTop: 10 }}>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${BORDER2}`, background: BG }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px', display: 'flex', flexWrap: 'wrap', gap: 28, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ maxWidth: 340 }}>
            <div style={{ marginBottom: 10 }}><Logo /></div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: MUTED }}>
              The AI Visibility Platform for restaurants. We measure how ChatGPT, Claude, Gemini and Perplexity
              recommend restaurants — and help you improve.
            </p>
          </div>
          <div style={{ fontSize: 13, lineHeight: 2 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FAINT, marginBottom: 6 }}>Product</div>
            <a href="#check" style={{ color: '#cfd2e0', textDecoration: 'none', display: 'block' }}>Free visibility check</a>
            <a href="#measure" style={{ color: '#cfd2e0', textDecoration: 'none', display: 'block' }}>What we measure</a>
            <a href="#how" style={{ color: '#cfd2e0', textDecoration: 'none', display: 'block' }}>How it works</a>
            <a href="#pricing" style={{ color: '#cfd2e0', textDecoration: 'none', display: 'block' }}>Pricing</a>
          </div>
          <div style={{ fontSize: 13, lineHeight: 2 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FAINT, marginBottom: 6 }}>Company</div>
            <a href={`mailto:${contactEmail}`} style={{ color: '#cfd2e0', textDecoration: 'none', display: 'block' }}>{contactEmail}</a>
            <a href="/privacy" style={{ color: '#cfd2e0', textDecoration: 'none', display: 'block' }}>Privacy policy</a>
            <a href="/terms" style={{ color: '#cfd2e0', textDecoration: 'none', display: 'block' }}>Terms</a>
            <div style={{ color: MUTED, marginTop: 6 }}>Built in the Netherlands</div>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${BORDER2}`, padding: '16px 24px', textAlign: 'center', fontSize: 12, color: FAINT }}>
          © {2026} Finded · We measure how AI recommends restaurants — not rankings.
        </div>
      </footer>
    </div>
  )
}
