-- ============================================================
-- Finded — recommendation confidence (020)
-- ============================================================
-- Each recommendation now carries a confidence band (High/Medium/Low) derived
-- from Finded's Observation Engine — how strongly the measured data supports the
-- expected impact. Stored so the report can show evidence-backed confidence
-- rather than generic advice. Idempotent, additive.
-- ============================================================

alter table recommendations add column if not exists confidence text;  -- High | Medium | Low
