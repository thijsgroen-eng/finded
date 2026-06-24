-- ============================================================
-- Finded — recommendation prioritisation (014)
-- ============================================================
-- Adds Impact × Effort → priority_rank so recommendations tell the owner exactly
-- where to start (do first / do next / optional). Builds on 009/013 (type, why,
-- evidence, suggested_fix, expected_impact, asset_type). Idempotent, additive.
-- ============================================================

alter table recommendations add column if not exists impact_level  text;  -- low | medium | high
alter table recommendations add column if not exists effort        text;  -- low | medium | high
alter table recommendations add column if not exists priority_rank text;  -- do_first | do_next | optional

create index if not exists recommendations_priority_rank_idx on recommendations(priority_rank);
