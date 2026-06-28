-- ============================================================
-- Finded — customer portal (passwordless client login), phase A (028)
-- ============================================================
-- Additive + idempotent. Lets RESTAURANT OWNERS (not the Finded team) log in and
-- see their own dashboards. Separate from admin_users (027), which is staff-only.
--
-- Auth is magic-link: a one-time token is emailed, verified, and exchanged for a
-- signed `finded_customer` session cookie. Owners are linked to their
-- restaurant(s) by matching email on first login.
-- ============================================================

create table if not exists customer_users (
  id            uuid primary key default uuid_generate_v4(),
  email         text not null unique,
  last_login_at timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists customer_users_email_idx on customer_users(lower(email));
alter table customer_users enable row level security;

-- Which restaurants an owner can see (one owner → many locations).
create table if not exists customer_restaurants (
  id               uuid primary key default uuid_generate_v4(),
  customer_user_id uuid not null references customer_users(id) on delete cascade,
  restaurant_id    uuid not null references restaurants(id) on delete cascade,
  created_at       timestamptz not null default now(),
  unique (customer_user_id, restaurant_id)
);
create index if not exists customer_restaurants_user_idx on customer_restaurants(customer_user_id);
alter table customer_restaurants enable row level security;

-- One-time magic-link tokens (only the hash is stored).
create table if not exists customer_login_tokens (
  id         uuid primary key default uuid_generate_v4(),
  email      text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists customer_login_tokens_hash_idx on customer_login_tokens(token_hash);
alter table customer_login_tokens enable row level security;
