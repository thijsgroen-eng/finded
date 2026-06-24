-- ============================================================
-- Finded — audit evidence layer, extend-in-place (013)
-- ============================================================
-- Extends the EXISTING evidence tables rather than creating a parallel audit_*
-- schema (model_runs, prompt_runs, entities, competitors, recommendations are
-- already the evidence backbone — see 001/003/004/005/008/009). This adds the
-- missing run-lifecycle, stored-mention, competitor-provenance, and typed-fix
-- fields so every score/competitor/recommendation traces to stored evidence.
--
-- Idempotent + additive; safe to run / re-run on production. No drops, no type
-- changes, no RLS changes.
-- ============================================================

-- ── model_runs → the "audit_runs" concept: per provider/model/prompt call ─────
-- Today a failed call is stored with raw_response prefixed 'ERROR:' and retries
-- are Inngest-internal. These columns make status/retry first-class so counts
-- ("N prompts / M model runs") are fully explainable.
alter table model_runs add column if not exists status         text;        -- queued|running|completed|failed|retried
alter table model_runs add column if not exists error          text;        -- failure message when status=failed
alter table model_runs add column if not exists started_at     timestamptz; -- when the provider call began
alter table model_runs add column if not exists completed_at   timestamptz; -- when it finished (success or failure)
alter table model_runs add column if not exists retry_of_run_id uuid references model_runs(id) on delete set null;
alter table model_runs add column if not exists restaurant_id  uuid references restaurants(id) on delete set null;
alter table model_runs add column if not exists prompt_text    text;        -- the exact rendered prompt sent
alter table model_runs add column if not exists metadata       jsonb;       -- free-form provenance (temperature, grounding opts, …)

create index if not exists model_runs_status_idx   on model_runs(status);
create index if not exists model_runs_retry_of_idx on model_runs(retry_of_run_id);

-- Backfill status for historical rows so the lifecycle is consistent.
update model_runs
  set status = case when raw_response like 'ERROR:%' then 'failed' else 'completed' end
  where status is null;

-- ── prompt_runs → the "audit_prompts" concept: rendered prompts per audit ─────
alter table prompt_runs add column if not exists language text;
alter table prompt_runs add column if not exists weight   numeric;
alter table prompt_runs add column if not exists active   boolean not null default true;

-- ── entities → the "audit_run_mentions" concept: structured extracted names ───
alter table entities add column if not exists normalized_name      text;
alter table entities add column if not exists is_target            boolean not null default false;
alter table entities add column if not exists matched_restaurant_id uuid references restaurants(id) on delete set null;
alter table entities add column if not exists match_reason         text;
alter table entities add column if not exists evidence_excerpt     text;

create index if not exists entities_is_target_idx       on entities(is_target);
create index if not exists entities_normalized_name_idx on entities(normalized_name);

-- ── competitors → "audit_competitors": add provenance ────────────────────────
alter table competitors add column if not exists normalized_name text;  -- mirrors canonical_key, explicit per spec
alter table competitors add column if not exists providers       jsonb; -- which providers named this competitor
alter table competitors add column if not exists prompt_ids      jsonb; -- which prompts surfaced it
alter table competitors add column if not exists sample_evidence jsonb; -- a few raw excerpts for proof

-- ── recommendations → typed/evidence-backed extras ───────────────────────────
-- (type, priority, title, description, why, evidence, impact, status already exist)
alter table recommendations add column if not exists suggested_fix   text;
alter table recommendations add column if not exists expected_impact text;
alter table recommendations add column if not exists asset_type      text;
