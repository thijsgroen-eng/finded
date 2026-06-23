-- ============================================================
-- Finded — typed recommendation evidence fields (009)
-- ============================================================
-- The recommendations table stored title/description/impact but dropped the
-- "why" and had no place for the evidence that triggered the recommendation, so
-- reloaded recommendations lost information. Add them. Idempotent; non-destructive.
-- `type` already exists and is now set authoritatively by the backend (a value
-- from lib/engine/fix-types FIX_TYPES), never inferred from text.
-- ============================================================

alter table recommendations add column if not exists why      text; -- why it matters for AI visibility
alter table recommendations add column if not exists evidence text; -- the audit data point that triggered it
