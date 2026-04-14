-- 006_move_company_to_insights.sql
-- Moves company linkage from portal level to insight level.
-- Company is now set per upload batch, not per portal.
-- Run in Supabase SQL Editor.

-- 1. Remove company_id from consultant_portals (added in 005)
ALTER TABLE consultant_portals DROP COLUMN IF EXISTS company_id;

-- 2. Add company_id directly on consultant_insights
ALTER TABLE consultant_insights
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
