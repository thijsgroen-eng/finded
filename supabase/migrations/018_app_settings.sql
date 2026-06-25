-- ============================================================
-- Finded — app settings (018)
-- ============================================================
-- A single-row key/value store for operator-configurable defaults (report &
-- audit language, brand/contact details). Read by server code via lib/settings.
-- Singleton (id always 1). Idempotent, additive, deny-by-default RLS.
-- ============================================================

create table if not exists app_settings (
  id          smallint primary key default 1,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

insert into app_settings (id, data) values (1, '{}'::jsonb)
  on conflict (id) do nothing;

alter table app_settings enable row level security;
