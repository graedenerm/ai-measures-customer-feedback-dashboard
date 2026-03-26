-- Migration 002: redesign evaluation schema
-- Run this in your Supabase SQL Editor BEFORE deploying the new code.

-- 1. Add new columns
ALTER TABLE evaluations
  ADD COLUMN IF NOT EXISTS impression         text CHECK (impression IN ('positive', 'negative', 'neutral')),
  ADD COLUMN IF NOT EXISTS plausibility       int  CHECK (plausibility       BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rating_title       int  CHECK (rating_title       BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rating_description int  CHECK (rating_description BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rating_hypotheses  int  CHECK (rating_hypotheses  BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rating_reasoning   int  CHECK (rating_reasoning   BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rating_questions   int  CHECK (rating_questions   BETWEEN 1 AND 5);

-- 2. Remove old columns that no longer fit the model
--    (comment these out if you want to preserve historic data)
ALTER TABLE evaluations
  DROP COLUMN IF EXISTS accuracy,
  DROP COLUMN IF EXISTS overall_rating;
