-- ============================================================
-- Finded — first-class prompt management (025)
-- ============================================================
-- Additive + idempotent. Turns the prompt override layer (011) into a managed
-- workflow: draft vs published, version history, rollback, and version diffs —
-- all without a deploy.
--
-- Behaviour-safe: every existing prompt_templates row defaults to status
-- 'published' and version 1, so the audit pipeline (which now reads only
-- published rows) sees exactly the same corpus it did before.
--
-- Note on `provider`: the column exists for future provider-specific OVERRIDES,
-- but audit execution stays provider-agnostic on purpose — every model must
-- answer the SAME prompt so cross-model consensus is meaningful. Only
-- provider-null (all-providers) rows are used by audits today.
-- ============================================================

alter table prompt_templates add column if not exists status   text not null default 'published'
  check (status in ('draft','published'));
alter table prompt_templates add column if not exists provider text;   -- null = all providers (reserved)
alter table prompt_templates add column if not exists version  integer not null default 1;

-- Published set is what audits read; index the hot path.
create index if not exists prompt_templates_published_idx
  on prompt_templates(business_type, language, status, enabled);

-- Append-only snapshots of each published set, for rollback + diff.
create table if not exists prompt_template_history (
  id            uuid primary key default uuid_generate_v4(),
  business_type text not null,
  language      text not null,
  version       integer not null,
  note          text,
  -- { "<category>": ["template", ...], ... } — the published override set at this version.
  snapshot      jsonb not null,
  created_at    timestamptz not null default now()
);
create index if not exists prompt_template_history_lookup_idx
  on prompt_template_history(business_type, language, version desc);

alter table prompt_template_history enable row level security;
