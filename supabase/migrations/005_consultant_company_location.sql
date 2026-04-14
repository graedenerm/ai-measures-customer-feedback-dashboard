-- 005_consultant_company_location.sql
-- Links consultant portals to companies and preserves location IDs on insights.
-- Run in Supabase SQL Editor. Safe to run on existing data (both columns are nullable).

-- 1. Link each consultant portal to a company (optional — older portals stay NULL)
ALTER TABLE consultant_portals
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- 2. Store the numeric location ID from the uploaded JSON on each insight
ALTER TABLE consultant_insights
  ADD COLUMN IF NOT EXISTS original_location_id INT;
