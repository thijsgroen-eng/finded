-- ============================================================
-- Finded Platform — Full Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- RESTAURANTS
-- ============================================================
create table if not exists restaurants (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  website      text,
  city         text not null,
  cuisine      text,
  email        text,
  phone        text,
  created_at   timestamptz not null default now()
);

create index if not exists restaurants_city_idx     on restaurants(city);
create index if not exists restaurants_cuisine_idx  on restaurants(cuisine);
create index if not exists restaurants_name_idx     on restaurants(lower(name));

-- ============================================================
-- AUDITS
-- ============================================================
create table if not exists audits (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references restaurants(id) on delete cascade,
  status          text not null default 'queued'
                    check (status in ('queued','running','completed','failed')),
  error_message   text,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index if not exists audits_restaurant_id_idx on audits(restaurant_id);
create index if not exists audits_status_idx        on audits(status);
create index if not exists audits_created_at_idx    on audits(created_at desc);

-- ============================================================
-- PROMPTS
-- ============================================================
create table if not exists prompts (
  id          uuid primary key default uuid_generate_v4(),
  category    text not null,
  prompt      text not null,
  city        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists prompts_city_idx     on prompts(city);
create index if not exists prompts_category_idx on prompts(category);

-- ============================================================
-- MODEL RUNS (raw responses stored here)
-- ============================================================
create table if not exists model_runs (
  id           uuid primary key default uuid_generate_v4(),
  audit_id     uuid not null references audits(id) on delete cascade,
  model        text not null check (model in ('openai','anthropic','gemini','perplexity')),
  prompt_id    uuid not null references prompts(id),
  raw_response text not null,
  tokens_used  integer,
  duration_ms  integer,
  created_at   timestamptz not null default now()
);

create index if not exists model_runs_audit_id_idx on model_runs(audit_id);
create index if not exists model_runs_model_idx    on model_runs(model);

-- ============================================================
-- MENTIONS (parsed from model runs)
-- ============================================================
create table if not exists mentions (
  id               uuid primary key default uuid_generate_v4(),
  audit_id         uuid not null references audits(id) on delete cascade,
  model            text not null check (model in ('openai','anthropic','gemini','perplexity')),
  prompt_id        uuid not null references prompts(id),
  restaurant_name  text not null,
  mentioned        boolean not null default false,
  position         integer,  -- 1 = first mention, null = not mentioned
  sentiment        text check (sentiment in ('positive','neutral','negative')),
  created_at       timestamptz not null default now()
);

create index if not exists mentions_audit_id_idx   on mentions(audit_id);
create index if not exists mentions_mentioned_idx  on mentions(mentioned);
create index if not exists mentions_model_idx      on mentions(model);

-- ============================================================
-- WEBSITE AUDITS
-- ============================================================
create table if not exists website_audits (
  id                        uuid primary key default uuid_generate_v4(),
  audit_id                  uuid not null references audits(id) on delete cascade,
  schema_present            boolean not null default false,
  menu_present              boolean not null default false,
  opening_hours_present     boolean not null default false,
  reservation_links_present boolean not null default false,
  social_links_present      boolean not null default false,
  review_count              integer,
  meta_title                text,
  meta_description          text,
  raw_html_snippet          text,
  created_at                timestamptz not null default now()
);

create index if not exists website_audits_audit_id_idx on website_audits(audit_id);

-- ============================================================
-- REPORTS
-- ============================================================
create table if not exists reports (
  id          uuid primary key default uuid_generate_v4(),
  audit_id    uuid not null references audits(id) on delete cascade,
  pdf_url     text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- CUSTOMERS (stub — expanded later)
-- ============================================================
create table if not exists customers (
  id                   uuid primary key default uuid_generate_v4(),
  restaurant_id        uuid not null references restaurants(id) on delete cascade,
  subscription_status  text not null default 'free',
  created_at           timestamptz not null default now()
);

-- ============================================================
-- AUDIT QUEUE (lightweight async queue using Supabase)
-- ============================================================
create table if not exists audit_queue (
  id            uuid primary key default uuid_generate_v4(),
  audit_id      uuid not null references audits(id) on delete cascade,
  attempts      integer not null default 0,
  max_attempts  integer not null default 3,
  scheduled_at  timestamptz not null default now(),
  locked_at     timestamptz,
  locked_by     text,
  created_at    timestamptz not null default now()
);

create index if not exists audit_queue_scheduled_idx on audit_queue(scheduled_at)
  where locked_at is null;

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Aggregated visibility metrics per audit
create or replace view audit_visibility as
select
  a.id                                           as audit_id,
  a.restaurant_id,
  r.name                                         as restaurant_name,
  r.city,
  r.cuisine,
  a.created_at                                   as audit_date,
  count(m.id)                                    as total_mentions,
  count(distinct m.prompt_id)                    as total_prompts_run,
  round(
    count(m.id)::numeric /
    nullif(count(distinct m.prompt_id), 0), 4
  )                                              as mention_frequency,
  -- Position score: weighted average
  round(
    avg(case
      when m.position = 1 then 100
      when m.position = 2 then 70
      when m.position = 3 then 50
      when m.position >= 4 then 20
      else 0
    end)::numeric, 2
  )                                              as avg_position_score,
  -- Model consensus: distinct models that mentioned
  count(distinct case when m.mentioned = true then m.model end) as model_consensus
from audits a
join restaurants r on r.id = a.restaurant_id
left join mentions m on m.audit_id = a.id and m.mentioned = true
where a.status = 'completed'
group by a.id, a.restaurant_id, r.name, r.city, r.cuisine, a.created_at;

-- ============================================================
-- ROW LEVEL SECURITY (basic — expand for multi-tenant)
-- ============================================================
alter table restaurants    enable row level security;
alter table audits         enable row level security;
alter table prompts        enable row level security;
alter table model_runs     enable row level security;
alter table mentions       enable row level security;
alter table website_audits enable row level security;
alter table reports        enable row level security;
alter table customers      enable row level security;
alter table audit_queue    enable row level security;

-- Service role has full access (used by API routes)
create policy "service_role_all" on restaurants    for all using (true);
create policy "service_role_all" on audits         for all using (true);
create policy "service_role_all" on prompts        for all using (true);
create policy "service_role_all" on model_runs     for all using (true);
create policy "service_role_all" on mentions       for all using (true);
create policy "service_role_all" on website_audits for all using (true);
create policy "service_role_all" on reports        for all using (true);
create policy "service_role_all" on customers      for all using (true);
create policy "service_role_all" on audit_queue    for all using (true);
