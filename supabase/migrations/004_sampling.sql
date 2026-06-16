-- ============================================================
-- Finded — N-sampling support
-- Run AFTER 003_v2_schema.sql. Idempotent.
--
-- Each prompt is now sampled multiple times per provider. mentions gains a
-- graded frequency, and model_runs records which sample/grounding produced each
-- raw response.
-- ============================================================

-- Graded mention frequency (0–1) across sampled runs for a (model, prompt).
-- `mentioned` remains a majority-threshold boolean for backward compatibility.
alter table mentions add column if not exists mention_frequency numeric;

-- Which sample produced this raw response, and whether web-search grounding was on.
alter table model_runs add column if not exists sample_index integer;
alter table model_runs add column if not exists grounded     boolean;
