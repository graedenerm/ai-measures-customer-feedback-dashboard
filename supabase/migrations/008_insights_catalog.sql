-- 008_insights_catalog.sql
-- Introduces insights_catalog as the deduplicated content store.
-- consultant_insights becomes a pure junction table (portal ↔ catalog entry).
-- evaluations_consultant is UNCHANGED — it still references consultant_insights.id.
--
-- Run in Supabase SQL Editor.

-- ─── 1. Create insights_catalog ───────────────────────────────────────────────

CREATE TABLE insights_catalog (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  original_insight_id  TEXT,                        -- pipeline-generated UUID; unique when present
  company_id           UUID        REFERENCES companies(id) ON DELETE SET NULL,
  original_location_id INT,                         -- ecoplanet internal location ID
  source_file          TEXT        NOT NULL DEFAULT '',
  insight_title        TEXT        NOT NULL,
  insight_description  TEXT,
  insight_raw          JSONB,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Deduplicate by original_insight_id only when it is present (NULLs are always unique)
CREATE UNIQUE INDEX insights_catalog_original_id_idx
  ON insights_catalog (original_insight_id)
  WHERE original_insight_id IS NOT NULL;

-- ─── 2. Add catalog FK to consultant_insights ─────────────────────────────────

ALTER TABLE consultant_insights
  ADD COLUMN insight_catalog_id UUID REFERENCES insights_catalog(id) ON DELETE CASCADE;

-- ─── 3. Migrate existing rows into catalog (deduplicate by original_insight_id) ─

DO $$
DECLARE
  r              RECORD;
  new_catalog_id UUID;
BEGIN
  FOR r IN SELECT * FROM consultant_insights ORDER BY created_at ASC LOOP

    INSERT INTO insights_catalog (
      original_insight_id,
      company_id,
      original_location_id,
      source_file,
      insight_title,
      insight_description,
      insight_raw,
      created_at
    ) VALUES (
      r.original_insight_id,
      r.company_id,
      r.original_location_id,
      COALESCE(r.source_file, ''),
      r.insight_title,
      r.insight_description,
      r.insight_raw,
      r.created_at
    )
    -- If this original_insight_id already exists (from an earlier row in this loop),
    -- update the raw JSON to the latest and return the existing row's id.
    ON CONFLICT (original_insight_id)
    WHERE original_insight_id IS NOT NULL
    DO UPDATE SET
      insight_raw         = EXCLUDED.insight_raw,
      insight_description = EXCLUDED.insight_description
    RETURNING id INTO new_catalog_id;

    UPDATE consultant_insights
    SET insight_catalog_id = new_catalog_id
    WHERE id = r.id;

  END LOOP;
END $$;

-- ─── 4. Optional cleanup (run manually after verifying migration) ─────────────
-- Once you are satisfied the migration is correct, you can drop the redundant
-- content columns from consultant_insights (they are now in insights_catalog):
--
-- ALTER TABLE consultant_insights
--   DROP COLUMN original_insight_id,
--   DROP COLUMN original_location_id,
--   DROP COLUMN company_id,
--   DROP COLUMN source_file,
--   DROP COLUMN insight_title,
--   DROP COLUMN insight_description,
--   DROP COLUMN insight_raw;
--
-- And add a uniqueness constraint to prevent double-assigning the same insight
-- to the same portal (safe once duplicates within a portal are cleaned up):
--
-- ALTER TABLE consultant_insights
--   ADD CONSTRAINT unique_portal_catalog_insight
--   UNIQUE (consultant_portal_id, insight_catalog_id);
