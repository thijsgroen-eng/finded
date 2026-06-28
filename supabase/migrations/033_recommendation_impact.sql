-- ============================================================
-- Finded — recommendation implementation date (033)
-- ============================================================
-- Additive. Captures WHEN a recommendation was implemented so the warehouse can
-- measure its impact (visibility before vs the next audit after). The status
-- field already exists; this records the date the operator/owner marked it done.
-- ============================================================

alter table recommendations add column if not exists implemented_at date;
