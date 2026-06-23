-- ============================================================
-- Finded — editable prompt store (011)
-- ============================================================
-- The audit prompt corpus has lived only in code (lib/engine/prompt-generator.ts).
-- This table lets an operator override the templates per (business_type, language,
-- category) without a deploy. It is an OVERRIDE layer, not a replacement: the code
-- templates remain the canonical fallback, so an empty table changes nothing.
--
-- A category with one or more enabled rows here replaces the code list for that
-- category; categories with no rows fall back to code. Templates use the same
-- placeholders the generator fills: {location}, {subtype}, {businessType}.
--
-- Idempotent; additive; deny-by-default RLS (service role only, like the rest of
-- the schema). Not seeded — admin "Import defaults" writes the current code corpus
-- in when an operator wants to start editing it.
-- ============================================================

create table if not exists prompt_templates (
  id            uuid primary key default uuid_generate_v4(),
  business_type text not null default 'restaurant',
  language      text not null default 'nl',
  -- one of: discovery | category | occasions | problemSolution | trust | geographic
  category      text not null,
  template      text not null,         -- contains {location} / {subtype} / {businessType}
  sort_order    integer not null default 0,
  enabled       boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists prompt_templates_lookup_idx
  on prompt_templates(business_type, language, enabled);

alter table prompt_templates enable row level security;
