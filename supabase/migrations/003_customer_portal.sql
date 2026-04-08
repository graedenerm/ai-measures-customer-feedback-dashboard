-- Migration 003: Customer portal support
-- Adds slug (URL identifier), password (plain text), and active_run_id (which run the customer sees)
-- to the companies table.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS slug        TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS password    TEXT,
  ADD COLUMN IF NOT EXISTS active_run_id UUID;
-- Note: active_run_id intentionally has no FK constraint to pipeline_runs,
-- because companies ↔ pipeline_runs already have a FK in the other direction
-- (pipeline_runs.company_id → companies.id). A circular FK breaks PostgREST joins.

CREATE INDEX IF NOT EXISTS companies_slug_idx ON companies(slug);
