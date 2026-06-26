-- ============================================================
-- Finded — restaurant plan / tier (022)
-- ============================================================
-- Turns the one-time audit into a tiered platform: the dashboard is the product,
-- unlocked progressively. plan ∈ free | audit | implementation. Backfills the
-- legacy report_paid boolean → 'audit'. Monthly monitoring is a future tier
-- (handled in app code as "coming soon"; no column needed yet). Idempotent.
-- ============================================================

alter table restaurants add column if not exists plan text not null default 'free'
  check (plan in ('free', 'audit', 'implementation'));

-- Anyone who already paid for the report is on at least the audit tier.
update restaurants set plan = 'audit' where plan = 'free' and report_paid = true;
