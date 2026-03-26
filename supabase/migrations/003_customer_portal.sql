-- Migration 003: Customer portal support
-- Adds slug (URL identifier), password (plain text), and active_run_id (which run the customer sees)
-- to the companies table.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS slug        TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS password    TEXT,
  ADD COLUMN IF NOT EXISTS active_run_id UUID REFERENCES pipeline_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS companies_slug_idx ON companies(slug);
