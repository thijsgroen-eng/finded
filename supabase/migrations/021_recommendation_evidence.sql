-- ============================================================
-- Finded — recommendation evidence model (021)
-- ============================================================
-- Each recommendation now declares WHERE its support comes from and the measured
-- benchmark behind it, so the report can show "Data source: Direct audit + Finded
-- benchmark" with a real stat ("91% of comparable restaurants recommended by AI
-- have Restaurant schema") instead of generic advice. Computed deterministically
-- from the Observation Engine — never fabricated. Idempotent, additive.
-- ============================================================

alter table recommendations add column if not exists data_source text;  -- e.g. "Direct audit + Finded benchmark"
alter table recommendations add column if not exists benchmark   text;  -- measured benchmark sentence (or "" when none yet)
