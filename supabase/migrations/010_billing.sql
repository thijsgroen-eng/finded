-- ============================================================
-- Finded — billing (010)
-- ============================================================
-- Adds the report_paid flag the report paywall reads (it was read but never
-- created → everyone was treated as unpaid) and a payments audit table the Stripe
-- webhook writes. Idempotent; non-destructive; deny-by-default RLS (service role
-- only, like the rest of the schema).
-- ============================================================

alter table restaurants add column if not exists report_paid boolean not null default false;

create table if not exists payments (
  id                 uuid primary key default uuid_generate_v4(),
  restaurant_id      uuid references restaurants(id) on delete set null,
  plan               text,
  mode               text,        -- 'payment' | 'subscription'
  amount             integer,     -- cents
  currency           text,
  stripe_session_id  text unique, -- idempotency key for the webhook
  status             text,
  created_at         timestamptz not null default now()
);
create index if not exists payments_restaurant_id_idx on payments(restaurant_id);

alter table payments enable row level security;
