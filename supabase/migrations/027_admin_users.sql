-- ============================================================
-- Finded — admin users, roles & audit log, phase 5 (027)
-- ============================================================
-- Additive + idempotent. Replaces the single shared admin password with proper
-- per-user accounts and roles, WITHOUT breaking the bootstrap: if no users
-- exist, the shared ADMIN_PASSWORD still logs in as an admin (see lib/auth).
--
-- Roles: admin (full, incl. user management) > operator (normal backoffice) >
-- viewer (read-only). Enforced in route guards; adopt incrementally.
--
-- admin_audit_log records who did what — the "who changed/deleted/exported what"
-- that the shared password could never provide.
-- ============================================================

create table if not exists admin_users (
  id            uuid primary key default uuid_generate_v4(),
  email         text not null unique,
  password_hash text not null,           -- pbkdf2$iterations$salt$hash
  role          text not null default 'operator' check (role in ('admin','operator','viewer')),
  active        boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists admin_users_email_idx on admin_users(lower(email));
alter table admin_users enable row level security;

create table if not exists admin_audit_log (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid references admin_users(id) on delete set null,
  email     text,                        -- denormalized actor (survives user deletion)
  action    text not null,               -- e.g. 'login', 'settings.update', 'plan.set'
  target    text,                        -- the affected entity (id / slug / name)
  data      jsonb,                       -- small structured context
  at        timestamptz not null default now()
);
create index if not exists admin_audit_log_at_idx on admin_audit_log(at desc);
alter table admin_audit_log enable row level security;
