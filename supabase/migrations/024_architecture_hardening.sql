-- ============================================================
-- Finded — Architecture hardening, phases 1 & 2 (024)
-- ============================================================
-- Additive and idempotent. No behaviour change on its own — these columns/tables
-- are written/read by the hardened pipeline but nothing existing depends on them.
--
--   #1 Versioning        audits.algo_versions, recommendations.algo_version
--   #2 Raw evidence      model_runs.prompt_version / prompt_vars / parsed_response
--   #3 Event timeline    audit_events
--   #4 Job queue         audit_queue.{job_type,payload,last_error,next_retry_at,status}
--   #10 Cost controls    daily_spend, provider_health
-- ============================================================

-- ── #1 Versioning ──────────────────────────────────────────
-- Per-audit snapshot of every deterministic algorithm version (see lib/versions.ts).
alter table audits           add column if not exists algo_versions jsonb;
-- Stamp the recommendation algorithm version on each recommendation row.
alter table recommendations  add column if not exists algo_version text;

-- ── #2 Raw evidence (never overwrite history) ──────────────
alter table model_runs add column if not exists prompt_version  text;   -- prompt template version used
alter table model_runs add column if not exists prompt_vars     jsonb;  -- variables that filled the template
alter table model_runs add column if not exists parsed_response jsonb;  -- structured extraction, kept for replay

-- ── #3 Audit event timeline ────────────────────────────────
-- One row per significant pipeline action. Write-only telemetry; emitting must
-- never fail an audit. Powers the admin timeline + per-stage latency.
create table if not exists audit_events (
  id          uuid primary key default uuid_generate_v4(),
  audit_id    uuid not null references audits(id) on delete cascade,
  type        text not null,            -- e.g. 'crawler.finished', 'provider.finished'
  at          timestamptz not null default now(),
  duration_ms integer,                  -- optional stage duration
  data        jsonb,                    -- small structured context
  created_at  timestamptz not null default now()
);
create index if not exists audit_events_audit_id_idx on audit_events(audit_id, at);

-- ── #4 Generalise the fallback queue (extend, don't replace) ─
alter table audit_queue add column if not exists job_type     text not null default 'audit';
alter table audit_queue add column if not exists payload      jsonb;
alter table audit_queue add column if not exists last_error   text;
alter table audit_queue add column if not exists next_retry_at timestamptz;
alter table audit_queue add column if not exists status       text not null default 'queued'
  check (status in ('queued','processing','done','failed'));
-- Backfill next_retry_at so the new claim query (which orders by it) sees old rows.
update audit_queue set next_retry_at = coalesce(next_retry_at, scheduled_at, now()) where next_retry_at is null;
create index if not exists audit_queue_next_retry_idx on audit_queue(next_retry_at)
  where locked_at is null and status = 'queued';

-- ── #10 Cost controls ──────────────────────────────────────
-- Coarse daily spend ledger (estimated, in cents) for the hard daily budget cap.
create table if not exists daily_spend (
  day            date primary key,
  est_cost_cents integer not null default 0,
  audits_started integer not null default 0,
  updated_at     timestamptz not null default now()
);

-- Provider health cache so preflight isn't re-run on every audit within a TTL.
create table if not exists provider_health (
  model      text primary key check (model in ('openai','anthropic','gemini','perplexity')),
  ok         boolean not null,
  error      text,
  checked_at timestamptz not null default now()
);
