import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import type { AuditEventRow } from '@/lib/audit/events'

/** Read-only audit event timeline (#3): what happened, when, and how long each
 *  stage took. Pure presentation; data is loaded server-side. */

const LABELS: Record<string, string> = {
  'audit.created': 'Audit created',
  'audit.queued': 'Queued (fallback)',
  'audit.running': 'Audit started',
  'crawler.started': 'Crawler started',
  'crawler.finished': 'Website crawled',
  'prompts.generated': 'Prompts generated',
  'preflight.finished': 'Provider preflight',
  'matrix.started': 'Prompt matrix started',
  'matrix.finished': 'Prompt matrix finished',
  'reliability.assessed': 'Reliability assessed',
  'score.calculated': 'Score calculated',
  'competitors.crawled': 'Competitors crawled',
  'observation.recorded': 'Observation recorded',
  'recommendations.generated': 'Recommendations generated',
  'dashboard.published': 'Dashboard published',
  'email.sent': 'Email sent',
  'audit.completed': 'Audit completed',
  'audit.incomplete': 'Audit incomplete',
  'audit.failed': 'Audit failed',
  'audit.cancelled': 'Audit cancelled',
  'budget.exceeded': 'Daily budget exceeded',
}

const TONE: Record<string, string> = {
  'audit.completed': 'bg-emerald-500',
  'dashboard.published': 'bg-emerald-500',
  'audit.incomplete': 'bg-amber-500',
  'budget.exceeded': 'bg-amber-500',
  'audit.failed': 'bg-red-500',
  'audit.cancelled': 'bg-gray-400',
}

function summarize(e: AuditEventRow): string | null {
  const d = e.data ?? {}
  switch (e.type) {
    case 'crawler.finished': return d.ok ? 'ok' : 'no signals'
    case 'prompts.generated': return `${d.count ?? '?'} prompts`
    case 'preflight.finished': return `${d.healthy ?? '?'} healthy${d.cached ? ' (cached)' : ''}`
    case 'matrix.finished': return `${d.completed ?? '?'}/${d.total ?? '?'} calls ok`
    case 'reliability.assessed': return `${d.band}${d.completionRate != null ? ` · ${Math.round(Number(d.completionRate) * 100)}%` : ''}`
    case 'score.calculated': return d.visibility_score != null ? `score ${Math.round(Number(d.visibility_score))}` : null
    case 'competitors.crawled': return `${d.crawled ?? 0} crawled`
    case 'recommendations.generated': return `${d.count ?? '?'} recs`
    case 'email.sent': return d.sent ? 'sent' : 'skipped'
    case 'audit.incomplete': return d.reason ? String(d.reason) : null
    default: return null
  }
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function AuditTimeline({ events }: { events: AuditEventRow[] }) {
  if (!events || events.length === 0) return null
  const start = new Date(events[0].at).getTime()
  return (
    <Card className="mb-5">
      <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
      <CardContent className="pt-0">
        <ol className="space-y-0">
          {events.map((e, i) => {
            const offsetMs = new Date(e.at).getTime() - start
            const sub = summarize(e)
            return (
              <li key={e.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="flex flex-col items-center pt-1">
                  <span className={`w-2 h-2 rounded-full ${TONE[e.type] ?? 'bg-gray-300'}`} />
                  {i < events.length - 1 && <span className="w-px flex-1 bg-gray-100 mt-1" style={{ minHeight: 12 }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-800">{LABELS[e.type] ?? e.type}</p>
                    <span className="text-xs text-gray-400 tabular-nums shrink-0">{fmtTime(e.at)}</span>
                  </div>
                  {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
                </div>
                <span className="text-xs text-gray-300 tabular-nums shrink-0 pt-0.5">
                  +{(offsetMs / 1000).toFixed(1)}s
                </span>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
