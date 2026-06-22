-- ============================================================
-- Finded — reliability-test grouping (007)
-- ============================================================
-- Tags audits that belong to a between-audit reliability test so the K runs for
-- one restaurant can be grouped and compared (see /api/reliability-test).
--
-- NOTE: the task called this "migration 004", but 004/005/006 already exist on
-- this branch, so it is numbered 007. Idempotent + non-destructive; nullable
-- columns, so existing audits and the normal audit path are unaffected.
-- Not applied automatically — run it in the Supabase SQL editor.
-- ============================================================

alter table audits add column if not exists reliability_group     text;
alter table audits add column if not exists reliability_run_index integer;

create index if not exists audits_reliability_group_idx
  on audits(reliability_group) where reliability_group is not null;
