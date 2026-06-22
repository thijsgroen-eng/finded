-- ============================================================
-- Finded Platform — v2 schema reconciliation
-- Run AFTER 001_initial_schema.sql and 002_seed_prompts.sql.
--
-- The application (Inngest audit pipeline + admin UI) reads and writes a set
-- of tables and columns that never existed in 001. This migration reconstructs
-- that schema from how the code uses it, so a clean Supabase project matches
-- the application. It is idempotent.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- EXTEND EXISTING TABLES
-- ============================================================

-- restaurants: generalized beyond restaurants + public report slug
alter table restaurants add column if not exists country       text;
alter table restaurants add column if not exists business_type text;
alter table restaurants add column if not exists subtypes      text[];
alter table restaurants add column if not exists preview_slug  text;

create unique index if not exists restaurants_preview_slug_idx
  on restaurants(preview_slug) where preview_slug is not null;

-- audits: summary counters + JSON recommendations blob (backward-compat)
alter table audits add column if not exists total_prompts    integer;
alter table audits add column if not exists total_model_runs integer;
alter table audits add column if not exists recommendations  text;

-- model_runs / mentions: the v2 pipeline keys rows by the prompt generator's
-- text id, not a prompts(id) uuid. Drop the FK and widen the column so both the
-- v1 (real prompts.id uuid) and v2 (generator text id) pipelines are valid.
-- The unused audit_visibility view from 001 reads mentions.prompt_id, which
-- blocks the type change, so drop it first (code computes metrics in the app,
-- not from this view).
drop view if exists audit_visibility;

alter table model_runs drop constraint if exists model_runs_prompt_id_fkey;
alter table model_runs alter column prompt_id drop not null;
alter table model_runs alter column prompt_id type text using prompt_id::text;
alter table model_runs add column if not exists prompt_text_id text;

alter table mentions drop constraint if exists mentions_prompt_id_fkey;
alter table mentions alter column prompt_id drop not null;
alter table mentions alter column prompt_id type text using prompt_id::text;

-- website_audits: universal (any business type) signal columns
alter table website_audits add column if not exists schema_types             text[];
alter table website_audits add column if not exists contact_present          boolean not null default false;
alter table website_audits add column if not exists location_present         boolean not null default false;
alter table website_audits add column if not exists review_signals           boolean not null default false;
alter table website_audits add column if not exists booking_present          boolean not null default false;
alter table website_audits add column if not exists faq_present              boolean not null default false;
alter table website_audits add column if not exists menu_or_services_present boolean not null default false;

-- customers: the dashboard reads plan + status
alter table customers add column if not exists plan   text;
alter table customers add column if not exists status text not null default 'free';

-- ============================================================
-- NEW TABLES
-- ============================================================

-- Prompts generated per audit by the v2 prompt generator (text ids).
create table if not exists prompt_runs (
  id          uuid primary key default uuid_generate_v4(),
  audit_id    uuid not null references audits(id) on delete cascade,
  prompt_id   text not null,
  category    text,
  intent      text,
  prompt_text text,
  created_at  timestamptz not null default now()
);
create index if not exists prompt_runs_audit_id_idx on prompt_runs(audit_id);

-- Every business entity extracted from a model response (target + competitors).
create table if not exists entities (
  id          uuid primary key default uuid_generate_v4(),
  audit_id    uuid not null references audits(id) on delete cascade,
  model       text not null,
  prompt_id   text,
  name        text not null,
  type        text,
  position    integer,
  context     text,
  sentiment   text,
  confidence  numeric,
  created_at  timestamptz not null default now()
);
create index if not exists entities_audit_id_idx on entities(audit_id);
create index if not exists entities_name_idx     on entities(lower(name));

-- Reasons an entity was recommended (one row per reason).
create table if not exists recommendation_reasons (
  id         uuid primary key default uuid_generate_v4(),
  entity_id  uuid references entities(id) on delete cascade,
  audit_id   uuid not null references audits(id) on delete cascade,
  reason     text not null,
  created_at timestamptz not null default now()
);
create index if not exists recommendation_reasons_audit_id_idx on recommendation_reasons(audit_id);

-- Computed visibility metrics per audit (v2 — what the UI actually renders).
create table if not exists visibility_scores (
  id                     uuid primary key default uuid_generate_v4(),
  audit_id               uuid not null references audits(id) on delete cascade,
  restaurant_id          uuid not null references restaurants(id) on delete cascade,
  visibility_score       numeric,
  opportunity_score      numeric,
  opportunity_label      text,
  mention_frequency      numeric,
  prompt_coverage        numeric,
  avg_position           numeric,
  median_position        numeric,
  best_position          numeric,
  worst_position         numeric,
  position_score         numeric,
  model_consensus        integer,
  share_of_voice         numeric,
  total_market_mentions  integer,
  sentiment_score        numeric,
  sentiment_positive     integer,
  sentiment_neutral      integer,
  sentiment_negative     integer,
  visibility_gap         numeric,
  recommendation_gap     numeric,
  estimated_visitors_min integer,
  estimated_visitors_max integer,
  estimated_revenue_min  numeric,
  estimated_revenue_max  numeric,
  total_mentions         integer,
  total_prompts          integer,
  total_model_runs       integer,
  created_at             timestamptz not null default now()
);
create index if not exists visibility_scores_audit_id_idx      on visibility_scores(audit_id);
create index if not exists visibility_scores_restaurant_id_idx on visibility_scores(restaurant_id);

-- Competitor entities surfaced alongside the target, per audit.
create table if not exists competitors (
  id              uuid primary key default uuid_generate_v4(),
  audit_id        uuid not null references audits(id) on delete cascade,
  name            text not null,
  mention_count   integer,
  avg_position    numeric,
  sentiment_score numeric,
  share_of_voice  numeric,
  top_reasons     text[],
  created_at      timestamptz not null default now()
);
create index if not exists competitors_audit_id_idx on competitors(audit_id);

-- Time series of scores for trend charts.
create table if not exists score_history (
  id                 uuid primary key default uuid_generate_v4(),
  restaurant_id      uuid not null references restaurants(id) on delete cascade,
  audit_id           uuid references audits(id) on delete cascade,
  visibility_score   numeric,
  opportunity_score  numeric,
  mention_frequency  numeric,
  model_consensus    integer,
  total_mentions     integer,
  snapshot_date      timestamptz not null default now(),
  created_at         timestamptz not null default now()
);
create index if not exists score_history_restaurant_id_idx on score_history(restaurant_id);

-- AI-generated improvement recommendations per audit.
create table if not exists recommendations (
  id            uuid primary key default uuid_generate_v4(),
  audit_id      uuid not null references audits(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete cascade,
  type          text,
  title         text,
  description   text,
  priority      text,
  impact        text,
  difficulty    text,
  status        text not null default 'pending',
  created_at    timestamptz not null default now()
);
create index if not exists recommendations_audit_id_idx on recommendations(audit_id);

-- Generated fix assets (schema markup, FAQ HTML, etc.).
create table if not exists generated_assets (
  id                uuid primary key default uuid_generate_v4(),
  restaurant_id     uuid references restaurants(id) on delete cascade,
  recommendation_id uuid references recommendations(id) on delete cascade,
  audit_id          uuid references audits(id) on delete cascade,
  type              text,
  title             text,
  content           text,
  format            text,
  status            text not null default 'draft',
  version           integer not null default 1,
  created_at        timestamptz not null default now()
);
create index if not exists generated_assets_recommendation_id_idx on generated_assets(recommendation_id);

-- CRM-style lead status, one row per restaurant (upsert on restaurant_id).
create table if not exists lead_statuses (
  id                uuid primary key default uuid_generate_v4(),
  restaurant_id     uuid not null unique references restaurants(id) on delete cascade,
  status            text,
  notes             text,
  next_followup_at  timestamptz,
  last_contacted_at timestamptz,
  updated_at        timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

-- Recurring audit schedules.
create table if not exists monitoring_schedules (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  frequency     text not null default 'weekly',
  status        text not null default 'active',
  next_run_at   timestamptz,
  last_run_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists monitoring_schedules_due_idx
  on monitoring_schedules(next_run_at) where status = 'active';

-- External "signal gaps" (knowledge graph, directories, reviews, etc.).
create table if not exists signal_gaps (
  id               uuid primary key default uuid_generate_v4(),
  restaurant_id    uuid not null references restaurants(id) on delete cascade,
  gap_type         text,
  severity         text,
  title            text,
  explanation      text,
  evidence         text,
  benchmark        text,
  affected_intents text[],
  fix_available    boolean not null default false,
  fix_type         text,
  expected_impact  text,
  created_at       timestamptz not null default now()
);
create index if not exists signal_gaps_restaurant_id_idx on signal_gaps(restaurant_id);

-- Daily snapshot of external signal posture (upsert on restaurant_id+date).
create table if not exists signal_snapshots (
  id                       uuid primary key default uuid_generate_v4(),
  restaurant_id            uuid not null references restaurants(id) on delete cascade,
  overall_score            numeric,
  recommendation_readiness text,
  wikipedia_found          boolean,
  directory_coverage       numeric,
  review_platforms         integer,
  total_external_reviews   integer,
  reddit_found             boolean,
  gaps_critical            integer,
  gaps_high                integer,
  gaps_medium              integer,
  snapshot_date            date not null default current_date,
  created_at               timestamptz not null default now(),
  unique (restaurant_id, snapshot_date)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- The application only ever talks to the database with the service role key,
-- which bypasses RLS. The anon key is never used. 001 shipped wide-open
-- "using (true)" policies that also grant the public anon role full read/write;
-- drop them so anon/authenticated are denied by default, and enable (policy-less,
-- deny-by-default) RLS on every new table.

drop policy if exists "service_role_all" on restaurants;
drop policy if exists "service_role_all" on audits;
drop policy if exists "service_role_all" on prompts;
drop policy if exists "service_role_all" on model_runs;
drop policy if exists "service_role_all" on mentions;
drop policy if exists "service_role_all" on website_audits;
drop policy if exists "service_role_all" on reports;
drop policy if exists "service_role_all" on customers;
drop policy if exists "service_role_all" on audit_queue;

alter table prompt_runs            enable row level security;
alter table entities               enable row level security;
alter table recommendation_reasons enable row level security;
alter table visibility_scores      enable row level security;
alter table competitors            enable row level security;
alter table score_history          enable row level security;
alter table recommendations        enable row level security;
alter table generated_assets       enable row level security;
alter table lead_statuses          enable row level security;
alter table monitoring_schedules   enable row level security;
alter table signal_gaps            enable row level security;
alter table signal_snapshots       enable row level security;
