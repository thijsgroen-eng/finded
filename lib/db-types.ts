/**
 * Typed shapes for the JSONB columns and the most-handled table rows (#13).
 *
 * Postgres JSONB is unityped at the boundary; these interfaces document and
 * type the structures Finded reads/writes so call sites can stop using `any`.
 * The canonical definitions for computed payloads live with the code that
 * produces them — re-exported here so there is one import for "DB JSON shapes".
 *
 * Adopt incrementally: import these where a query result is currently `any`.
 * This module is types-only (no runtime), so adding it changes nothing.
 */

import type { AlgoVersions } from '@/lib/versions'
import type { ScoreBreakdown } from '@/lib/engine/scoring'
import type { Reliability } from '@/lib/audit/reliability'

// ── JSONB payloads ─────────────────────────────────────────────
export type { AlgoVersions, ScoreBreakdown, Reliability }

/** `model_runs.parsed_response` — the structured extraction kept for replay. */
export interface ParsedResponseJson {
  entities: unknown[]
  total_mentioned: number
  failed: boolean
}

/** `model_runs.prompt_vars` — the variables that filled the prompt template. */
export interface PromptVarsJson {
  city: string | null
  country: string | null
  cuisine: string | null
  category: string | null
  business_type: string
}

/** `audit_events.data` — small, free-form per-event context. */
export type AuditEventData = Record<string, unknown>

export type ProspectStatus =
  | 'not_audited' | 'audit_queued' | 'audit_complete'
  | 'outreach_ready' | 'contacted' | 'customer' | 'monitoring'

export type AuditStatus = 'queued' | 'running' | 'completed' | 'failed' | 'incomplete' | 'cancelled'
export type Plan = 'free' | 'audit' | 'implementation'
export type ModelName = 'openai' | 'anthropic' | 'gemini' | 'perplexity'

// ── Core rows (the most-handled tables) ────────────────────────
export interface AuditRow {
  id: string
  restaurant_id: string
  status: AuditStatus
  error_message: string | null
  completed_at: string | null
  reliability: Reliability | null
  algo_versions: AlgoVersions | null
  total_prompts: number | null
  total_model_runs: number | null
  created_at: string
}

export interface RestaurantRow {
  id: string
  name: string
  city: string | null
  cuisine: string | null
  country: string | null
  website: string | null
  domain: string | null
  email: string | null
  phone: string | null
  business_type: string | null
  plan: Plan
  report_paid: boolean
  preview_slug: string | null
  prospect_status: ProspectStatus
  tags: string[] | null
  internal_notes: string | null
  next_follow_up: string | null
  created_at: string
}

export interface ModelRunRow {
  id: string
  audit_id: string
  model: ModelName
  prompt_id: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'retried'
  raw_response: string
  parsed_response: ParsedResponseJson | null
  prompt_vars: PromptVarsJson | null
  prompt_version: string | null
  model_version: string | null
  grounded: boolean | null
  sources: string[] | null
  tokens_used: number | null
  duration_ms: number | null
  sample_index: number
  retry_of_run_id: string | null
  created_at: string
}
