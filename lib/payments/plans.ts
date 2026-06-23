/**
 * Single source of truth for billable plans. Prices live here (in cents), not
 * scattered across components, so the UI and Stripe never disagree. Amounts are
 * inlined as Stripe price_data, so no dashboard Price IDs are required.
 */
export type PlanKey = 'report' | 'monthly' | 'starter' | 'pro'

export interface Plan {
  key: PlanKey
  label: string
  amount: number // cents
  currency: 'eur'
  mode: 'payment' | 'subscription'
  interval?: 'month'
  /** Grants full report access (report_paid) on successful purchase. */
  grantsReport: boolean
}

export const PLANS: Record<PlanKey, Plan> = {
  report:  { key: 'report',  label: 'Full AI visibility report', amount: 4900,  currency: 'eur', mode: 'payment',      grantsReport: true },
  monthly: { key: 'monthly', label: 'Monthly monitoring',        amount: 2900,  currency: 'eur', mode: 'subscription', interval: 'month', grantsReport: true },
  starter: { key: 'starter', label: 'Starter monitoring',        amount: 9900,  currency: 'eur', mode: 'subscription', interval: 'month', grantsReport: true },
  pro:     { key: 'pro',     label: 'Pro monitoring',            amount: 29900, currency: 'eur', mode: 'subscription', interval: 'month', grantsReport: true },
}

export function asPlanKey(value: unknown): PlanKey {
  return value === 'monthly' || value === 'starter' || value === 'pro' ? value : 'report'
}
