/**
 * Client health score (0–100) — a deterministic, explainable churn/engagement
 * signal for the Clients CRM. Pure (testable); no LLM. Higher = healthier.
 *
 * Signals (weights): plan tier, login recency, audit count, visibility, and how
 * recently the last audit ran. Bands: ≥70 healthy · 40–69 steady · <40 at-risk.
 */

export interface HealthInput {
  plan: string | null
  auditCount: number
  visibilityScore: number | null
  lastAuditAt: string | null
  lastLoginAt: string | null
  now?: number
}

export type HealthBand = 'healthy' | 'steady' | 'at_risk'
export interface Health { score: number; band: HealthBand; reasons: string[] }

const DAY = 86_400_000
function daysSince(iso: string | null, now: number): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  return (now - t) / DAY
}

export function clientHealth(i: HealthInput): Health {
  const now = i.now ?? Date.now()
  const reasons: string[] = []
  let score = 0

  // Plan tier — paying customers are healthier by default.
  if (i.plan === 'implementation') { score += 30; reasons.push('Implementation plan') }
  else if (i.plan === 'audit') { score += 22; reasons.push('Audit plan') }
  else { score += 8 }

  // Login recency — are they actually using the dashboard?
  const loginDays = daysSince(i.lastLoginAt, now)
  if (loginDays == null) reasons.push('Never logged in')
  else if (loginDays <= 30) { score += 25; reasons.push('Active in last 30 days') }
  else if (loginDays <= 90) { score += 14 }
  else { score += 6; reasons.push('Not logged in for 90+ days') }

  // Audit count — engagement depth.
  if (i.auditCount >= 3) score += 20
  else if (i.auditCount >= 1) score += 11
  else reasons.push('No audits yet')

  // Visibility outcome — are they getting value?
  if (i.visibilityScore == null) score += 0
  else if (i.visibilityScore >= 60) { score += 15 }
  else if (i.visibilityScore >= 30) { score += 9 }
  else { score += 4; reasons.push('Low AI visibility') }

  // Audit recency — stale data is a risk signal.
  const auditDays = daysSince(i.lastAuditAt, now)
  if (auditDays != null && auditDays <= 60) score += 10
  else if (auditDays != null && auditDays <= 180) score += 5
  else if (auditDays != null) reasons.push('Last audit is stale')

  score = Math.max(0, Math.min(100, Math.round(score)))
  const band: HealthBand = score >= 70 ? 'healthy' : score >= 40 ? 'steady' : 'at_risk'
  return { score, band, reasons: reasons.slice(0, 3) }
}
