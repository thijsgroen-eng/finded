-- ============================================================
-- Finded — competitor website crawls (016)
-- ============================================================
-- Stores the crawled website signals for the top competitors AI recommends, so
-- the audit can explain WHY they're recommended instead. Populated by the
-- pipeline (reuses the existing crawler; no external API). Idempotent, additive,
-- deny-by-default RLS (service role only).
-- ============================================================

create table if not exists competitor_audits (
  id              uuid primary key default uuid_generate_v4(),
  audit_id        uuid not null references audits(id) on delete cascade,
  competitor_name text not null,
  normalized_name text,
  website         text,
  signals         jsonb,           -- the website audit result (schema, menu, dietary, …)
  created_at      timestamptz not null default now()
);

create index if not exists competitor_audits_audit_id_idx on competitor_audits(audit_id);

alter table competitor_audits enable row level security;
