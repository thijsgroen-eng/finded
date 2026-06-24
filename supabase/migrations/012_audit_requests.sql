-- ============================================================
-- Finded — public audit requests (012)
-- ============================================================
-- Stores audit requests submitted from the PUBLIC funnel (/audit → POST
-- /api/audit-request). These are unqualified leads from restaurant owners, kept
-- separate from the curated `restaurants` table so a public submission never
-- pollutes the audited-entity lists or implies an audit exists. An operator
-- reviews each request in /admin/requests and can create an audit from it (which
-- then links restaurant_id + audit_id back here).
--
-- Idempotent; additive; deny-by-default RLS (service role only, like the rest of
-- the schema) — the public endpoint writes via the service-role client server
-- side, so the table is never reachable from the browser.
-- ============================================================

create table if not exists audit_requests (
  id              uuid primary key default uuid_generate_v4(),
  website         text not null,
  domain          text,
  restaurant_name text,
  city            text,
  email           text not null,
  phone           text,
  note            text,
  source          text not null default 'public_audit_request',
  status          text not null default 'new_request',  -- new_request | contacted | audit_created | archived
  restaurant_id   uuid references restaurants(id) on delete set null,
  audit_id        uuid references audits(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists audit_requests_status_idx  on audit_requests(status);
create index if not exists audit_requests_created_idx on audit_requests(created_at desc);
create index if not exists audit_requests_email_idx   on audit_requests(lower(email));

alter table audit_requests enable row level security;
