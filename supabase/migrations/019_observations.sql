-- ============================================================
-- Finded — Observation Engine (019)
-- ============================================================
-- The proprietary moat: one anonymized fact-record per completed audit. Over
-- many audits this becomes a knowledge base that powers benchmarks, pattern
-- insights ("HTML menus were mentioned 2.1× more often"), recommendation
-- confidence and industry reports — things ChatGPT cannot answer because they
-- require Finded's own repeated measurements.
--
-- Anonymized by design: aggregation only ever reads facts/segments, never the
-- restaurant identity. restaurant_id is kept (set null on delete) for ops/dedup
-- but is never exposed in any aggregate output. One row per audit (idempotent).
-- ============================================================

create table if not exists observations (
  id                uuid primary key default uuid_generate_v4(),
  audit_id          uuid not null references audits(id) on delete cascade,
  restaurant_id     uuid references restaurants(id) on delete set null,
  -- Segmentation dimensions (lowercased on read for grouping).
  city              text,
  cuisine           text,
  country           text,
  business_type     text,
  -- Outcome measures.
  visibility_score  numeric,
  mention_frequency numeric,
  mentioned_any     boolean,
  -- Anonymized signal facts: { restaurant_schema, menu_format, faq_present,
  -- dietary_present, reviews_present, opening_hours_present, location_present,
  -- mentioned_openai, mentioned_anthropic, mentioned_gemini, mentioned_perplexity, ... }
  facts             jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  unique (audit_id)
);

create index if not exists observations_segment_idx on observations (lower(cuisine), lower(city));
create index if not exists observations_created_idx on observations (created_at desc);

alter table observations enable row level security;
