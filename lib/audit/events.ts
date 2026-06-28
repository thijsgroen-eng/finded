import { supabaseAdmin } from '@/lib/supabase/client'

/**
 * Audit event timeline (#3). One row per significant pipeline action, stored in
 * `audit_events` (migration 024) and shown read-only in the admin audit viewer.
 *
 * This is pure observability: emitting an event must NEVER fail an audit, so every
 * write is best-effort and swallows its own errors. Nothing in the control flow
 * reads these back.
 */
export type AuditEventType =
  | 'audit.created'
  | 'audit.queued'
  | 'audit.running'
  | 'crawler.started'
  | 'crawler.finished'
  | 'prompts.generated'
  | 'preflight.finished'
  | 'matrix.started'
  | 'matrix.finished'
  | 'reliability.assessed'
  | 'score.calculated'
  | 'competitors.crawled'
  | 'observation.recorded'
  | 'recommendations.generated'
  | 'dashboard.published'
  | 'email.sent'
  | 'audit.completed'
  | 'audit.incomplete'
  | 'audit.failed'
  | 'audit.cancelled'
  | 'budget.exceeded'

export async function emitEvent(
  auditId: string,
  type: AuditEventType,
  opts: { durationMs?: number; data?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    await supabaseAdmin.from('audit_events').insert({
      audit_id: auditId,
      type,
      duration_ms: opts.durationMs ?? null,
      data: opts.data ?? null,
    })
  } catch {
    // Telemetry only — never let it surface.
  }
}

export interface AuditEventRow {
  id: string
  type: string
  at: string
  duration_ms: number | null
  data: Record<string, unknown> | null
}

/** Load an audit's timeline in chronological order (for the admin viewer). */
export async function loadAuditEvents(auditId: string): Promise<AuditEventRow[]> {
  const { data } = await supabaseAdmin
    .from('audit_events')
    .select('id, type, at, duration_ms, data')
    .eq('audit_id', auditId)
    .order('at', { ascending: true })
  return (data ?? []) as AuditEventRow[]
}
