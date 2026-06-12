export const maxDuration = 300
import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { auditFunction } from '@/lib/inngest/audit-function'
import { fixFunction } from '@/lib/inngest/fix-function'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [auditFunction, fixFunction],
})
