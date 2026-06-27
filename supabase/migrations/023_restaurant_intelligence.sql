-- ============================================================
-- Finded — Restaurant Intelligence Platform, phase 1 (023)
-- ============================================================
-- Makes the restaurant (not the audit) the primary entity for the backoffice:
-- a prospecting pipeline status + lightweight CRM fields, and an efficient
-- overview view that joins each restaurant to its latest audit + visibility
-- score + audit count, for a scalable Restaurant Database list. Idempotent.
-- ============================================================

-- Prospecting / sales pipeline status.
alter table restaurants add column if not exists prospect_status text not null default 'not_audited'
  check (prospect_status in ('not_audited','audit_queued','audit_complete','outreach_ready','contacted','customer','monitoring'));
-- Lightweight CRM.
alter table restaurants add column if not exists tags           text[];
alter table restaurants add column if not exists internal_notes text;
alter table restaurants add column if not exists next_follow_up date;

create index if not exists restaurants_prospect_status_idx on restaurants(prospect_status);
create index if not exists restaurants_city_lower_idx       on restaurants(lower(city));
create index if not exists restaurants_cuisine_lower_idx    on restaurants(lower(cuisine));

-- Backfill pipeline status from existing data.
update restaurants set prospect_status = 'audit_complete'
  where prospect_status = 'not_audited'
    and exists (select 1 from audits a where a.restaurant_id = restaurants.id and a.status = 'completed');
update restaurants set prospect_status = 'customer'
  where plan in ('audit','implementation') or report_paid = true;

-- Efficient one-row-per-restaurant overview for the Restaurant Database list.
create or replace view restaurant_overview as
select
  r.*,
  la.id          as last_audit_id,
  la.status      as last_audit_status,
  la.created_at  as last_audit_at,
  ac.audit_count,
  vs.visibility_score
from restaurants r
left join lateral (
  select id, status, created_at from audits a
  where a.restaurant_id = r.id order by a.created_at desc limit 1
) la on true
left join lateral (
  select count(*)::int as audit_count from audits a where a.restaurant_id = r.id
) ac on true
left join lateral (
  select v.visibility_score from visibility_scores v
  join audits a2 on a2.id = v.audit_id
  where a2.restaurant_id = r.id
  order by v.created_at desc limit 1
) vs on true;
