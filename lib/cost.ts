import { supabaseAdmin } from '@/lib/supabase/client'
import type { AppSettings } from '@/lib/settings'

/**
 * Cost controls (#10). Deterministic, coarse-grained guardrails so a careless
 * bulk run can't produce a five-figure provider bill.
 *
 *  - estimateAuditCostCents(): up-front cost estimate from the audit knobs.
 *  - spentTodayCents() / recordSpendCents(): a per-day ledger (daily_spend table)
 *    backing the hard daily budget cap.
 *
 * Estimates are intentionally simple (calls × per-call price, grounded vs not).
 * They never need to be exact — they exist to bound spend, not to bill.
 */

const PROVIDER_COUNT_DEFAULT = 4

/** Estimated cost of one audit, in euro cents. */
export function estimateAuditCostCents(
  settings: Pick<AppSettings, 'grounded' | 'groundedCallCents' | 'ungroundedCallCents'>,
  promptCount: number,
  providerCount: number = PROVIDER_COUNT_DEFAULT,
  samples: number = 1,
): number {
  const perCall = settings.grounded ? settings.groundedCallCents : settings.ungroundedCallCents
  const calls = Math.max(0, promptCount) * Math.max(1, providerCount) * Math.max(1, samples)
  return Math.round(calls * perCall)
}

const today = () => new Date().toISOString().slice(0, 10)

/** Estimated spend recorded so far today, in euro cents. */
export async function spentTodayCents(): Promise<number> {
  try {
    const { data } = await supabaseAdmin
      .from('daily_spend')
      .select('est_cost_cents')
      .eq('day', today())
      .maybeSingle()
    return data?.est_cost_cents ?? 0
  } catch {
    return 0
  }
}

/** Add to today's estimated spend ledger (best-effort, never throws). */
export async function recordSpendCents(cents: number): Promise<void> {
  if (cents <= 0) return
  try {
    const day = today()
    const { data } = await supabaseAdmin
      .from('daily_spend')
      .select('est_cost_cents, audits_started')
      .eq('day', day)
      .maybeSingle()
    await supabaseAdmin.from('daily_spend').upsert({
      day,
      est_cost_cents: (data?.est_cost_cents ?? 0) + cents,
      audits_started: (data?.audits_started ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
  } catch {
    // Ledger is a guardrail, not source of truth — don't fail the audit over it.
  }
}

export interface BudgetCheck {
  allowed: boolean
  budgetCents: number
  spentCents: number
  estimateCents: number
}

/**
 * Would running an audit estimated at `estimateCents` exceed today's budget?
 * A budget of 0 means "no cap" (disabled) — always allowed.
 */
export async function checkDailyBudget(
  settings: Pick<AppSettings, 'dailyBudgetCents'>,
  estimateCents: number,
): Promise<BudgetCheck> {
  const budgetCents = settings.dailyBudgetCents ?? 0
  const spentCents = await spentTodayCents()
  const allowed = budgetCents <= 0 || spentCents + estimateCents <= budgetCents
  return { allowed, budgetCents, spentCents, estimateCents }
}
