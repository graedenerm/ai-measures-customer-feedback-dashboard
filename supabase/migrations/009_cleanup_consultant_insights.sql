-- 009_cleanup_consultant_insights.sql
-- Drop redundant content columns from consultant_insights.
-- Content now lives exclusively in insights_catalog.
-- Also adds the UNIQUE constraint to prevent double-assigning the same
-- catalog insight to the same portal.
--
-- Run in Supabase SQL Editor.

ALTER TABLE consultant_insights
  DROP COLUMN IF EXISTS original_insight_id,
  DROP COLUMN IF EXISTS original_location_id,
  DROP COLUMN IF EXISTS company_id,
  DROP COLUMN IF EXISTS source_file,
  DROP COLUMN IF EXISTS insight_title,
  DROP COLUMN IF EXISTS insight_description,
  DROP COLUMN IF EXISTS insight_raw;

ALTER TABLE consultant_insights
  ADD CONSTRAINT unique_portal_catalog_insight
  UNIQUE (consultant_portal_id, insight_catalog_id);
