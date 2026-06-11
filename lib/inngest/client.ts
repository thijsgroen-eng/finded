import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'finded',
  name: 'Finded AI Visibility',
})

// Event types
export type AuditRequestedEvent = {
  name: 'audit/requested'
  data: {
    audit_id: string
    restaurant_id: string
  }
}

export type Events = AuditRequestedEvent

