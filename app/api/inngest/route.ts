import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { auditFunction } from '@/lib/inngest/audit-function'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [auditFunction],
})
