-- ============================================================
-- Finded — observation expansion + monitoring plumbing, phase 4 (026)
-- ============================================================
-- Additive + idempotent. Behaviour-safe: new columns default to existing
-- behaviour and the new table is write-only telemetry.
--
--   #11 Observation expansion: stamp methodology versions on each observation so
--       trends/benchmarks can be segmented by algorithm version; capture the
--       per-audit signal/provider CHANGES so longitudinal questions can be
--       answered without re-running audits.
--   #12 Monitoring plumbing: tag where an audit came from (manual vs monitoring).
-- ============================================================

-- #11 — methodology stamps on observations (benchmark/confidence evolution).
alter table observations add column if not exists algo_versions    jsonb;
alter table observations add column if not exists scoring_version  text;
alter table observations add column if not exists benchmark_version text;

-- #11 — append-only signal-change log between consecutive audits of a restaurant.
create table if not exists observation_changes (
  id                       uuid primary key default uuid_generate_v4(),
  restaurant_id            uuid references restaurants(id) on delete cascade,
  audit_id                 uuid not null references audits(id) on delete cascade,
  prev_audit_id            uuid references audits(id) on delete set null,
  visibility_delta         numeric,   -- current - previous visibility_score
  mention_frequency_delta  numeric,
  -- { "<fact>": { "from": bool, "to": bool }, ... } — only facts that flipped.
  facts_changed            jsonb,
  -- { "<provider>": { "from": bool, "to": bool }, ... } — mention changes per model.
  providers_changed        jsonb,
  created_at               timestamptz not null default now()
);
create index if not exists observation_changes_restaurant_idx
  on observation_changes(restaurant_id, created_at desc);
create unique index if not exists observation_changes_audit_uidx
  on observation_changes(audit_id);
alter table observation_changes enable row level security;

-- #12 — provenance of an audit (manual operator/public request vs monitoring rerun).
alter table audits add column if not exists source text not null default 'manual';
