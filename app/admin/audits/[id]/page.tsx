import { supabaseAdmin } from '@/lib/supabase/client'
import { computeMetrics } from '@/lib/engine/metrics'
import { Card, CardHeader, CardTitle, CardContent, Badge, StatCard } from '@/components/ui'
import { formatDateTime, formatPercent, statusVariant } from '@/lib/utils'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Recommendations } from '@/components/admin/recommendations'

async function getAuditData(id: string) {
  const { data: audit } = await supabaseAdmin
    .from('audits')
    .select('*, restaurant:restaurants(*)')
    .eq('id', id)
    .single()

  if (!audit) return null

  const [
    { data: websiteAudit },
    { data: mentions },
    { data: modelRuns },
  ] = await Promise.all([
    supabaseAdmin.from('website_audits').select('*').eq('audit_id', id).single(),
    supabaseAdmin.from('mentions').select('model, prompt_id, mentioned, position, sentiment').eq('audit_id', id),
    supabaseAdmin.from('model_runs').select('model, duration_ms, tokens_used').eq('audit_id', id),
  ])

  const metrics = computeMetrics(mentions ?? [])

  return { audit, websiteAudit, metrics, modelRuns: modelRuns ?? [] }
}

const MODEL_LABELS: Record<string, string> = {
  openai: 'ChatGPT (OpenAI)',
