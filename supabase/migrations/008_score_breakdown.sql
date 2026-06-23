-- ============================================================
-- Finded — transparent score breakdown (008)
-- ============================================================
-- Stores the explainable, component-level breakdown behind visibility_score so the
-- report can show exactly how the number was derived, plus an overall confidence.
-- Idempotent + non-destructive. New migration (003 is applied; never edit it).
-- ============================================================

alter table visibility_scores add column if not exists score_breakdown jsonb;   -- { components[], visibility_score, confidence_score, method_version, formula }
alter table visibility_scores add column if not exists confidence_score numeric; -- 0–1 overall confidence in the score
