-- ============================================================
-- Finded — menu & dietary discoverability (015)
-- ============================================================
-- Stores how readable the menu is to AI (format + descriptive richness) and which
-- dietary signals the site exposes. Computed by the website scraper. Idempotent,
-- additive.
-- ============================================================

alter table website_audits add column if not exists menu_format   text;   -- html | pdf | image | none
alter table website_audits add column if not exists menu_richness text;   -- strong | weak | none
alter table website_audits add column if not exists dietary       jsonb;  -- e.g. ["Vegan","Gluten-free"]
