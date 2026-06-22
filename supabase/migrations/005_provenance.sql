-- ============================================================
-- Finded — provenance & identity columns (005)
-- ============================================================
-- Builds on 003_v2_schema.sql (which already reconstructs the 12 previously
-- untracked tables: entities, competitors, visibility_scores, score_history,
-- prompt_runs, recommendation_reasons, signal_gaps, signal_snapshots,
-- recommendations, monitoring_schedules, generated_assets, lead_statuses) and
-- 004_sampling.sql (model_runs.sample_index/grounded, mentions.mention_frequency).
--
-- This migration ONLY ADDS new provenance/identity columns + indexes. It does
-- not create tables (003 already did) and is fully idempotent + non-destructive:
-- safe to run on production and safe to re-run. No DROPs, no type changes, no RLS
-- policy changes (so the invalid `CREATE POLICY IF NOT EXISTS` gotcha is avoided).
--
-- NOTE — code-inferred, please sanity-check: the live Supabase project could not
-- be introspected from this environment (restricted network egress), so existing
-- table definitions come from the committed 003/004 migrations and were validated
-- against a local Postgres 16. Because every statement below is ADD ... IF NOT
-- EXISTS, any extra columns the live project may have are left untouched. Worth a
-- 2-minute glance at the Supabase dashboard to confirm nothing else has drifted.
--
-- Filename is 005 (not "003_provenance_and_sampling") because 003 and 004 already
-- exist on this branch / in the open PR.
--
-- OUT OF SCOPE (next task): the pipeline still needs to actually populate these
-- columns (run each prompt N times, record model_version/temperature/locale/
-- sources). This migration only makes the schema able to hold that data.
-- ============================================================

-- ── model_runs: provenance for each raw model call ──────────────────────────
alter table model_runs add column if not exists model_version text;             -- exact model id used (e.g. claude-haiku-4-5-20251001)
alter table model_runs add column if not exists temperature   numeric;          -- sampling temperature used for the call
alter table model_runs add column if not exists sample_index  integer default 0; -- already added in 004; kept here for completeness/idempotency
alter table model_runs add column if not exists locale        text;             -- prompt language/locale (e.g. 'nl', 'en')
alter table model_runs add column if not exists sources       jsonb;            -- parsed citation/grounding URLs from the response

-- ── mentions / entities: which sample produced the row ──────────────────────
alter table mentions add column if not exists sample_index integer default 0;
alter table entities add column if not exists sample_index integer default 0;

-- ── restaurants: canonical identity keys ────────────────────────────────────
alter table restaurants add column if not exists place_id text;  -- Google Places id (stable identity across audits)
alter table restaurants add column if not exists domain   text;  -- normalized website domain (identity / dedupe)

-- ── competitors: identity/dedupe key ────────────────────────────────────────
alter table competitors add column if not exists canonical_key text; -- normalized key for competitor identity resolution

-- ── indexes (idempotent) ────────────────────────────────────────────────────
create index if not exists entities_sample_index_idx on entities(sample_index);
create index if not exists restaurants_place_id_idx  on restaurants(place_id);
