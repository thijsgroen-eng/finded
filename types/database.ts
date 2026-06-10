export type AuditStatus = 'queued' | 'running' | 'completed' | 'failed'
export type ModelName = 'openai' | 'anthropic' | 'gemini' | 'perplexity'
export type Sentiment = 'positive' | 'neutral' | 'negative'

export interface Restaurant {
  id: string
  name: string
  website: string | null
  city: string
  cuisine: string | null
  email: string | null
  phone: string | null
  created_at: string
}

export interface Audit {
  id: string
  restaurant_id: string
  status: AuditStatus
  created_at: string
  completed_at: string | null
  error_message: string | null
}

export interface Prompt {
  id: string
  category: string
  prompt: string
  city: string
}

export interface ModelRun {
  id: string
  audit_id: string
  model: ModelName
  prompt_id: string
  raw_response: string
  created_at: string
}

export interface Mention {
  id: string
  audit_id: string
  model: ModelName
  prompt_id: string
  restaurant_name: string
  mentioned: boolean
  position: number | null
  sentiment: Sentiment | null
}

export interface WebsiteAudit {
  id: string
  audit_id: string
  schema_present: boolean
  menu_present: boolean
  opening_hours_present: boolean
  reservation_links_present: boolean
  social_links_present: boolean
  review_count: number | null
  meta_title: string | null
  meta_description: string | null
  raw_html_snippet: string | null
}

export interface Report {
  id: string
  audit_id: string
  pdf_url: string | null
  created_at: string
}

export interface Customer {
  id: string
  restaurant_id: string
  subscription_status: string
  created_at: string
}

// Computed metrics (not stored, calculated at query time)
export interface VisibilityMetrics {
  restaurant_id: string
  restaurant_name: string
  city: string
  cuisine: string | null
  mention_frequency: number       // 0-1 float: mentions / prompts
  position_score: number          // weighted average position score
  model_consensus: number         // 0-4 how many models mention
  share_of_voice: number          // 0-1 float within city+cuisine cohort
  total_prompts: number
  total_mentions: number
  audit_id: string
  audit_date: string
}

export interface ModelBreakdown {
  model: ModelName
  mentions: number
  total_prompts: number
  frequency: number
  avg_position: number | null
}

export interface AuditWithRestaurant extends Audit {
  restaurant: Restaurant
}
