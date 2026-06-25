-- ============================================================
-- Finded — reliability gating (017)
-- ============================================================
-- Adds an 'incomplete' audit status for runs that did not reach the minimum
-- share of successful model calls (see lib/audit/reliability.ts). Such audits
-- must NOT present a visibility score, recommendations or conclusions as facts —
-- they are marked incomplete and a rerun is requested. Also stores a durable
-- reliability snapshot so the admin list/detail can explain why without
-- recomputing. Idempotent + additive.
-- ============================================================

-- Allow the new 'incomplete' status. The original inline CHECK is auto-named
-- audits_status_check; drop + recreate with the extra value.
alter table audits drop constraint if exists audits_status_check;
alter table audits add constraint audits_status_check
  check (status in ('queued','running','completed','failed','incomplete'));

-- Durable reliability snapshot: { band, completionRate, completed, total,
-- providersWithData, deadProviders, ... } as computed at scoring time.
alter table audits add column if not exists reliability jsonb;
