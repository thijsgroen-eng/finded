-- ============================================================
-- Finded — Observation Engine V2: entity + recommendation facts (031)
-- ============================================================
-- Additive + idempotent. Adds the two remaining fact grains:
--   fact_entity         1/(response, extracted entity) — competitors + co-occurrence
--   fact_recommendation 1/recommendation — + impact-tracking columns (filled later)
-- Both monthly-partitioned, append-only, version-stamped. Apply after 029/030.
-- ============================================================

create table if not exists fact_entity (
  id              uuid not null default uuid_generate_v4(),
  response_id     uuid,
  audit_id        uuid not null,
  restaurant_id   uuid,
  provider_id     uuid,
  prompt_id       uuid,
  name            text,
  normalized_name text,
  is_target       boolean,
  position        int,
  sentiment       smallint,
  observed_at     timestamptz not null,
  created_at      timestamptz not null default now(),
  primary key (id, observed_at)
) partition by range (observed_at);

create table if not exists fact_recommendation (
  id                    uuid not null default uuid_generate_v4(),
  audit_id              uuid not null,
  restaurant_id         uuid,
  type                  text,
  category              text,
  priority              text,
  difficulty            text,
  confidence            text,
  expected_impact       text,
  -- Impact tracking (back-annotated by a later job).
  implemented           boolean not null default false,
  implementation_date   date,
  verified              boolean not null default false,
  visibility_before     numeric,
  visibility_after      numeric,
  visibility_change     numeric,
  days_until_effect     int,
  experiment_id         uuid,
  scoring_version       text,
  recommendation_version text,
  benchmark_version     text,
  observed_at           timestamptz not null,
  created_at            timestamptz not null default now(),
  primary key (id, observed_at)
) partition by range (observed_at);

-- Default + current/next-month partitions.
do $$
declare t text; m0 date := date_trunc('month', now())::date;
  m1 date := (date_trunc('month', now()) + interval '1 month')::date;
  m2 date := (date_trunc('month', now()) + interval '2 month')::date;
begin
  foreach t in array array['fact_entity','fact_recommendation'] loop
    execute format('create table if not exists %I partition of %I default', t||'_default', t);
    execute format('create table if not exists %I partition of %I for values from (%L) to (%L)', t||'_'||to_char(m0,'YYYY_MM'), t, m0, m1);
    execute format('create table if not exists %I partition of %I for values from (%L) to (%L)', t||'_'||to_char(m1,'YYYY_MM'), t, m1, m2);
  end loop;
end $$;

create index if not exists fe_observed_brin   on fact_entity using brin (observed_at);
create index if not exists fe_audit_idx        on fact_entity (audit_id);
create index if not exists fe_norm_idx         on fact_entity (normalized_name) where is_target = false;
create index if not exists frec_observed_brin  on fact_recommendation using brin (observed_at);
create index if not exists frec_audit_idx      on fact_recommendation (audit_id);
create index if not exists frec_type_idx       on fact_recommendation (type);

alter table fact_entity         enable row level security;
alter table fact_recommendation enable row level security;
