-- ============================================================
-- Finded — Observation Engine V2: co-occurrence, recommendation impact,
-- research layer (032). Deterministic. Apply after 031 + a backfill. Idempotent.
-- ============================================================

-- Competitor co-occurrence: how often two competitors appear in the SAME audit.
create materialized view if not exists mv_competitor_cooccurrence as
with comp as (
  select distinct audit_id, normalized_name
  from fact_entity
  where is_target = false and normalized_name is not null and normalized_name <> ''
)
select a.normalized_name as name_a, b.normalized_name as name_b, count(*) as audits_together
from comp a
join comp b on a.audit_id = b.audit_id and a.normalized_name < b.normalized_name
group by a.normalized_name, b.normalized_name
having count(*) >= 3;
create unique index if not exists mv_cooccurrence_uidx on mv_competitor_cooccurrence (name_a, name_b);

-- Competitor frequency leaderboard (who AI names most, across all audits).
create materialized view if not exists mv_competitor_frequency as
select normalized_name, count(distinct audit_id) as audits, count(*) as mentions
from fact_entity
where is_target = false and normalized_name is not null and normalized_name <> ''
group by normalized_name;
create unique index if not exists mv_competitor_frequency_uidx on mv_competitor_frequency (normalized_name);

-- Recommendation impact (avg measured visibility change once verified).
create materialized view if not exists mv_recommendation_impact as
select coalesce(type, 'unknown') as type,
       count(*)                                   as recommended,
       count(*) filter (where implemented)        as implemented,
       count(*) filter (where verified)           as verified_n,
       avg(visibility_change) filter (where verified) as avg_visibility_change
from fact_recommendation
group by coalesce(type, 'unknown');
create unique index if not exists mv_recommendation_impact_uidx on mv_recommendation_impact (type);

-- ── Research layer (versioned, anonymized aggregates for future reports) ─────
create materialized view if not exists research_ai_visibility_index as
select date_trunc('month', observed_at)::date as month,
       count(*) as n,
       avg(visibility_score) as avg_visibility,
       avg((mentioned_any)::int::numeric) as pct_mentioned
from fact_audit
where coalesce(quality_score, 1) >= 0.5
group by date_trunc('month', observed_at);
create unique index if not exists research_index_uidx on research_ai_visibility_index (month);

create materialized view if not exists research_segment_report as
with base as (
  select fa.visibility_score, fa.mentioned_any, date_trunc('month', fa.observed_at)::date as month,
         lower(dr.cuisine) as cuisine, lower(dr.city) as city
  from fact_audit fa left join dim_restaurant dr on dr.restaurant_id = fa.restaurant_id
  where coalesce(fa.quality_score, 1) >= 0.5
)
select 'cuisine'::text as segment_type, cuisine as segment_key, month, count(*) as n,
       avg(visibility_score) as avg_visibility, avg((mentioned_any)::int::numeric) as pct_mentioned
from base where cuisine is not null group by cuisine, month
union all
select 'city', city, month, count(*), avg(visibility_score), avg((mentioned_any)::int::numeric)
from base where city is not null group by city, month;
create unique index if not exists research_segment_uidx on research_segment_report (segment_type, segment_key, month);

-- Refresh entrypoint — now covers every warehouse MV.
create or replace function refresh_warehouse_mvs() returns void language plpgsql as $$
begin
  refresh materialized view concurrently mv_provider_month;
  refresh materialized view concurrently mv_benchmark;
  refresh materialized view concurrently mv_citation_influence;
  refresh materialized view concurrently mv_signal_correlation;
  refresh materialized view concurrently mv_competitor_cooccurrence;
  refresh materialized view concurrently mv_competitor_frequency;
  refresh materialized view concurrently mv_recommendation_impact;
  refresh materialized view concurrently research_ai_visibility_index;
  refresh materialized view concurrently research_segment_report;
end $$;
