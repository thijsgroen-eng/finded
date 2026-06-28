-- ============================================================
-- Finded — Observation Engine V2: citation trends over time (034).
-- Deterministic. Apply after 029–032 + a backfill. Idempotent.
-- ============================================================
-- Powers the Citations tab's "trend over time" view in the intelligence hub.
-- Per (domain, citation_type, month): how often AI cited a source over time.

create materialized view if not exists mv_citation_month as
select c.domain, c.citation_type,
       date_trunc('month', c.observed_at)::date as month,
       count(*)                                 as citations,
       count(distinct c.audit_id)               as audits
from fact_citation c
where c.domain is not null and c.domain <> ''
group by c.domain, c.citation_type, date_trunc('month', c.observed_at);
create unique index if not exists mv_citation_month_uidx
  on mv_citation_month (domain, citation_type, month);

-- Refresh entrypoint — now includes the citation trend view.
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
  refresh materialized view concurrently mv_citation_month;
end $$;
