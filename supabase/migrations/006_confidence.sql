-- ============================================================
-- Finded — frequency-band confidence on visibility_scores (006)
-- ============================================================
-- Adds the columns the sampling/metrics work needs to store a confidence band
-- for mention_frequency (Wilson score interval) plus the number of samples it was
-- computed over. mention_frequency itself already exists (from 003).
--
-- This is a NEW migration on purpose: migration 003 has already been applied to
-- the live database, so editing it would diverge the repo from production and
-- wouldn't re-run. Idempotent + non-destructive (safe on prod, safe to re-run).
-- Not applied automatically — run it in the Supabase SQL editor.
-- ============================================================

alter table visibility_scores add column if not exists confidence_lo numeric;  -- Wilson interval low (0–1)
alter table visibility_scores add column if not exists confidence_hi numeric;  -- Wilson interval high (0–1)
alter table visibility_scores add column if not exists sample_count  integer;  -- total sampled cells the band is over
