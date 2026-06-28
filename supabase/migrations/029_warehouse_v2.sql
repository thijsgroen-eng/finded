-- ============================================================
-- Finded — Observation Engine V2: warehouse schema, Phase 1 step 1 (029)
-- ============================================================
-- Additive + idempotent. Creates the EMPTY analytical warehouse (dims + monthly-
-- partitioned facts). Nothing reads or writes these yet — the existing
-- `observations`/`observation_changes` tables and lib/observations keep working
-- unchanged, so no audit, the Insights page, or recommendations are affected.
--
-- Design: docs/OBSERVATION-ENGINE-V2.md. Append-only, immutable, version-stamped.
-- Facts are PARTITION BY RANGE (observed_at), monthly. Partition key is in every
-- PK (id, observed_at). No cross-fact FKs (warehouse style; integrity enforced in
-- code + parity tests). All tables RLS-enabled (service-role only, like the rest).
-- ============================================================

-- ── Dimensions ──────────────────────────────────────────────

-- Calendar (seeded). day/week/month/quarter/year/season for time grouping.
create table if not exists dim_date (
  date     date primary key,
  year     int  not null,
  quarter  int  not null,
  month    int  not null,
  week     int  not null,
  day      int  not null,
  season   text not null
);
insert into dim_date (date, year, quarter, month, week, day, season)
select d::date,
       extract(year from d)::int,
       extract(quarter from d)::int,
       extract(month from d)::int,
       extract(week from d)::int,
       extract(day from d)::int,
       case when extract(month from d) in (12,1,2) then 'winter'
            when extract(month from d) in (3,4,5)  then 'spring'
            when extract(month from d) in (6,7,8)  then 'summer'
            else 'autumn' end
from generate_series(timestamp '2024-01-01', timestamp '2028-12-31', interval '1 day') d
on conflict (date) do nothing;

-- #1 Provider VERSION is mandatory: one row per (provider, model, version).
create table if not exists dim_provider (
  id         uuid primary key default uuid_generate_v4(),
  provider   text not null check (provider in ('openai','anthropic','gemini','perplexity')),
  model      text not null,
  version    text not null default 'unknown',
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  unique (provider, model, version)
);

-- #8 Provider release / behaviour-change timeline (operator-curated).
create table if not exists dim_provider_event (
  id         uuid primary key default uuid_generate_v4(),
  provider   text not null,
  model      text,
  version    text,
  event_type text not null,              -- 'model_release' | 'search_update' | 'ranking_change' | ...
  event_date date not null,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists dim_provider_event_date_idx on dim_provider_event (event_date);

-- Distinct prompt (dedup by hash) + intent/category/language.
create table if not exists dim_prompt (
  id           uuid primary key default uuid_generate_v4(),
  prompt_hash  text not null unique,
  category     text,
  intent       text,                     -- Discovery | Romantic | Family | Business | Lunch | ...
  language     text,
  example_text text,
  created_at   timestamptz not null default now()
);

-- Anonymized restaurant attributes (analytics join here, never `restaurants`).
create table if not exists dim_restaurant (
  restaurant_id uuid primary key,
  cuisine       text,
  city          text,
  country       text,
  business_type text,
  price_range   text,
  chain         boolean,
  neighborhood  text,
  updated_at    timestamptz not null default now()
);
create index if not exists dim_restaurant_seg_idx on dim_restaurant (lower(cuisine), lower(city));

-- #4 Reusable website-state snapshot (dedup by hash — not duplicated per call).
create table if not exists dim_feature_snapshot (
  id                 uuid primary key default uuid_generate_v4(),
  restaurant_id      uuid not null,
  website_hash       text not null,
  crawl_version      text not null default 'v1',
  schema_detected    boolean,
  menu_detected      boolean,
  menu_format        text,
  reservation_widget boolean,
  pricing_detected   boolean,
  opening_hours      boolean,
  faq_detected       boolean,
  review_links       boolean,
  social_links       boolean,
  blog               boolean,
  images             boolean,
  languages          int,
  accessibility      boolean,
  observed_at        timestamptz not null default now(),
  unique (restaurant_id, website_hash, crawl_version)
);

-- #9 Experiment registry (control/treatment).
create table if not exists dim_experiment (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  hypothesis text,
  status     text not null default 'draft',   -- draft | running | done
  started_at timestamptz,
  ended_at   timestamptz,
  created_at timestamptz not null default now()
);

-- ── Facts (append-only, monthly RANGE partitions on observed_at) ─────────────

-- 1 row per audit — the rollup grain for benchmarks.
create table if not exists fact_audit (
  id                    uuid not null default uuid_generate_v4(),
  audit_id              uuid not null,
  restaurant_id         uuid,
  feature_snapshot_id   uuid,
  visibility_score      numeric,
  confidence_score      numeric,
  authority_score       numeric,
  citation_score        numeric,
  benchmark_score       numeric,
  opportunity_score     numeric,
  mentioned_any         boolean,
  mention_frequency     numeric,
  quality_score         numeric,          -- #7
  experiment_id         uuid,             -- #9
  arm                   text,
  scoring_version       text,
  parser_version        text,
  recommendation_version text,
  benchmark_version     text,
  extraction_version    text,
  observed_at           timestamptz not null,
  created_at            timestamptz not null default now(),
  primary key (id, observed_at),
  unique (audit_id, observed_at)
) partition by range (observed_at);

-- 1 row per (audit, provider release, prompt, sample) — THE AI interaction fact.
create table if not exists fact_provider_response (
  id                    uuid not null default uuid_generate_v4(),
  response_id           uuid not null default uuid_generate_v4(),  -- stable link for evidence/citations
  audit_id              uuid not null,
  restaurant_id         uuid,
  provider_id           uuid,             -- → dim_provider (provider+model+VERSION)
  prompt_id             uuid,             -- → dim_prompt
  feature_snapshot_id   uuid,             -- → dim_feature_snapshot (#4)
  sample_index          int  not null default 0,
  grounded              boolean,
  mentioned             boolean,
  mention_position      int,
  mention_count         int,
  sentiment             smallint,         -- -1 / 0 / 1
  response_length       int,
  no_result             boolean,
  duplicate_response    boolean,
  error                 text,
  tokens                int,
  cost_cents            numeric,
  duration_ms           int,
  quality_score         numeric,          -- #7
  experiment_id         uuid,             -- #9
  arm                   text,
  prompt_version        text,
  parser_version        text,
  scoring_version       text,
  recommendation_version text,
  benchmark_version     text,
  extraction_version    text,
  observed_at           timestamptz not null,
  created_at            timestamptz not null default now(),
  primary key (id, observed_at)
) partition by range (observed_at);

-- #5 Immutable raw evidence, 1:1 with a response, kept OFF the analytic hot path.
create table if not exists fact_response_evidence (
  id                     uuid not null default uuid_generate_v4(),
  response_id            uuid not null,
  audit_id               uuid not null,
  response_hash          text,
  compressed_raw_response bytea,
  structured_response    jsonb,
  citations              jsonb,
  parsed_entities        jsonb,
  observed_at            timestamptz not null,
  created_at             timestamptz not null default now(),
  primary key (id, observed_at)
) partition by range (observed_at);

-- #6 Citation graph: one denormalized edge per cited URL carries the full chain.
create table if not exists fact_citation (
  id            uuid not null default uuid_generate_v4(),
  response_id   uuid not null,
  audit_id      uuid not null,
  provider_id   uuid,
  prompt_id     uuid,
  restaurant_id uuid,
  entity_name   text,
  domain        text,
  url           text,
  citation_type text,                     -- review | maps | guide | social | own_site | directory | news | other
  is_own_site   boolean,
  observed_at   timestamptz not null,
  created_at    timestamptz not null default now(),
  primary key (id, observed_at)
) partition by range (observed_at);

-- ── Partitions: a DEFAULT catch-all per fact + the current/next month. ───────
-- The default partition guarantees correctness; a monthly cron pre-creates
-- named partitions ahead of time for pruning. (Empty now — safe either way.)
do $$
declare
  t text;
  m0 date := date_trunc('month', now())::date;
  m1 date := (date_trunc('month', now()) + interval '1 month')::date;
  m2 date := (date_trunc('month', now()) + interval '2 month')::date;
begin
  foreach t in array array['fact_audit','fact_provider_response','fact_response_evidence','fact_citation'] loop
    execute format('create table if not exists %I partition of %I default', t || '_default', t);
    execute format('create table if not exists %I partition of %I for values from (%L) to (%L)', t || '_' || to_char(m0,'YYYY_MM'), t, m0, m1);
    execute format('create table if not exists %I partition of %I for values from (%L) to (%L)', t || '_' || to_char(m1,'YYYY_MM'), t, m1, m2);
  end loop;
end $$;

-- ── Indexes (created on the partitioned parents → propagate to partitions) ───
create index if not exists fact_audit_observed_brin   on fact_audit using brin (observed_at);
create index if not exists fact_audit_restaurant_idx  on fact_audit (restaurant_id);

create index if not exists fpr_observed_brin   on fact_provider_response using brin (observed_at);
create index if not exists fpr_provider_idx    on fact_provider_response (provider_id, observed_at);
create index if not exists fpr_prompt_idx      on fact_provider_response (prompt_id);
create index if not exists fpr_restaurant_idx  on fact_provider_response (restaurant_id);
create index if not exists fpr_response_idx    on fact_provider_response (response_id);

create index if not exists fre_observed_brin   on fact_response_evidence using brin (observed_at);
create index if not exists fre_response_idx    on fact_response_evidence (response_id);

create index if not exists fc_observed_brin    on fact_citation using brin (observed_at);
create index if not exists fc_domain_idx       on fact_citation (domain, observed_at);
create index if not exists fc_provider_idx     on fact_citation (provider_id, observed_at);
create index if not exists fc_response_idx     on fact_citation (response_id);

-- ── RLS (service-role only, like the rest of the schema) ─────────────────────
alter table dim_date              enable row level security;
alter table dim_provider          enable row level security;
alter table dim_provider_event    enable row level security;
alter table dim_prompt            enable row level security;
alter table dim_restaurant        enable row level security;
alter table dim_feature_snapshot  enable row level security;
alter table dim_experiment        enable row level security;
alter table fact_audit            enable row level security;
alter table fact_provider_response enable row level security;
alter table fact_response_evidence enable row level security;
alter table fact_citation         enable row level security;
