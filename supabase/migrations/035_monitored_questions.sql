-- ============================================================
-- Finded — Saved Customer Questions (architecture prep, 035). Additive, idempotent.
-- ============================================================
-- Prepares for prompt-level monitoring: customers save the guest-style questions
-- they care about (e.g. "best Italian restaurant Amsterdam") and a future job
-- runs them on a cadence and writes the results into the SAME warehouse facts
-- (fact_provider_response / fact_entity / fact_citation) as audits do.
--
-- No execution is wired yet — this table only stores the saved prompts. Safe to
-- apply now so the dashboard feature can light up later without a schema change.

create table if not exists monitored_questions (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null,
  prompt_text   text not null,
  locale        text not null default 'nl',         -- nl | en
  cadence       text not null default 'monthly',    -- monthly | weekly | manual
  status        text not null default 'active',     -- active | paused
  last_run_at   timestamptz,                         -- set by the future runner
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists monitored_questions_restaurant_idx
  on monitored_questions (restaurant_id);
create index if not exists monitored_questions_due_idx
  on monitored_questions (status, cadence, last_run_at);
