-- ============================================================
-- Finded — Observation Engine V2: materialized views, Phase 1 step 4 (030)
-- ============================================================
-- Deterministic analytics over the warehouse facts (029). No LLMs. Quality-gated
-- (only rows with quality_score >= 0.5, or null treated as 1). The dashboard
-- queries these small pre-aggregated views, never the 600M-row facts directly.
-- Refresh via refresh_warehouse_mvs() (cron). Apply AFTER 029 and after a
-- backfill so the views populate. Idempotent.
-- ============================================================

-- Provider drift: per (provider, model, VERSION, month). Answers
-- "did GPT-5.1 change restaurant recommendations?" — group by version.
create materialized view if not exists mv_provider_month as
select dp.provider, dp.model, dp.version,
       date_trunc('month', f.observed_at)::date            as month,
       count(*)                                             as responses,
       count(*) filter (where f.mentioned)                 as mentions,
       avg(case when f.mentioned then 1.0 else 0.0 end)    as mention_rate,
       avg(f.mention_position) filter (where f.mentioned)  as avg_position
from fact_provider_response f
join dim_provider dp on dp.id = f.provider_id
where coalesce(f.quality_score, 1) >= 0.5
group by dp.provider, dp.model, dp.version, date_trunc('month', f.observed_at);
create unique index if not exists mv_provider_month_uidx on mv_provider_month (provider, model, version, month);

-- Benchmarks: overall + per cuisine + per city, with percentiles.
create materialized view if not exists mv_benchmark as
with base as (
  select fa.visibility_score, fa.mentioned_any, lower(dr.cuisine) as cuisine, lower(dr.city) as city
  from fact_audit fa
  left join dim_restaurant dr on dr.restaurant_id = fa.restaurant_id
  where coalesce(fa.quality_score, 1) >= 0.5
)
select 'overall'::text as segment_type, 'all'::text as segment_key, count(*) as n,
       avg(visibility_score) as avg_vis,
       percentile_cont(0.5)  within group (order by visibility_score) as median_vis,
       percentile_cont(0.9)  within group (order by visibility_score) as p90,
       percentile_cont(0.75) within group (order by visibility_score) as p75,
       percentile_cont(0.25) within group (order by visibility_score) as p25,
       avg((mentioned_any)::int::numeric) as pct_mentioned
from base
union all
select 'cuisine', cuisine, count(*), avg(visibility_score),
       percentile_cont(0.5)  within group (order by visibility_score),
       percentile_cont(0.9)  within group (order by visibility_score),
       percentile_cont(0.75) within group (order by visibility_score),
       percentile_cont(0.25) within group (order by visibility_score),
       avg((mentioned_any)::int::numeric)
from base where cuisine is not null group by cuisine
union all
select 'city', city, count(*), avg(visibility_score),
       percentile_cont(0.5)  within group (order by visibility_score),
       percentile_cont(0.9)  within group (order by visibility_score),
       percentile_cont(0.75) within group (order by visibility_score),
       percentile_cont(0.25) within group (order by visibility_score),
       avg((mentioned_any)::int::numeric)
from base where city is not null group by city;
create unique index if not exists mv_benchmark_uidx on mv_benchmark (segment_type, segment_key);

-- Citation influence: which sources each provider cites, how often.
create materialized view if not exists mv_citation_influence as
select dp.provider, c.domain, c.citation_type,
       count(*)                  as citations,
       count(distinct c.audit_id) as audits
from fact_citation c
join dim_provider dp on dp.id = c.provider_id
group by dp.provider, c.domain, c.citation_type;
create unique index if not exists mv_citation_influence_uidx on mv_citation_influence (provider, domain, citation_type);

-- Correlation engine (deterministic): for each website signal, mention/visibility
-- with vs without + sample sizes. The reader applies the significance + min-n gate.
create materialized view if not exists mv_signal_correlation as
with base as (
  select fa.visibility_score, fa.mentioned_any, s.*
  from fact_audit fa join dim_feature_snapshot s on s.id = fa.feature_snapshot_id
  where coalesce(fa.quality_score, 1) >= 0.5
),
sig(signal, flag) as (
  values ('schema_detected'), ('menu_detected'), ('reservation_widget'),
         ('opening_hours'), ('faq_detected'), ('review_links'), ('social_links')
)
select s.signal,
  count(*) filter (where b.has)                                          as n_with,
  count(*) filter (where not b.has)                                      as n_without,
  avg(b.visibility_score) filter (where b.has)                           as vis_with,
  avg(b.visibility_score) filter (where not b.has)                       as vis_without,
  avg((b.mentioned_any)::int::numeric) filter (where b.has)              as ment_with,
  avg((b.mentioned_any)::int::numeric) filter (where not b.has)          as ment_without
from sig s
cross join lateral (
  select base.visibility_score, base.mentioned_any,
    case s.signal
      when 'schema_detected'    then coalesce(base.schema_detected, false)
      when 'menu_detected'      then coalesce(base.menu_detected, false)
      when 'reservation_widget' then coalesce(base.reservation_widget, false)
      when 'opening_hours'      then coalesce(base.opening_hours, false)
      when 'faq_detected'       then coalesce(base.faq_detected, false)
      when 'review_links'       then coalesce(base.review_links, false)
      when 'social_links'       then coalesce(base.social_links, false)
    end as has
  from base
) b
group by s.signal;
create unique index if not exists mv_signal_correlation_uidx on mv_signal_correlation (signal);

-- Refresh entrypoint (cron). CONCURRENTLY needs the unique indexes above + a
-- prior populate (these are created WITH DATA, so the first concurrent refresh works).
create or replace function refresh_warehouse_mvs() returns void language plpgsql as $$
begin
  refresh materialized view concurrently mv_provider_month;
  refresh materialized view concurrently mv_benchmark;
  refresh materialized view concurrently mv_citation_influence;
  refresh materialized view concurrently mv_signal_correlation;
end $$;
