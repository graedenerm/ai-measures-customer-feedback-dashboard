-- 010_consultant_measures.sql
-- Adds MEASURE support to the consultant portal, parallel to the existing
-- insight flow (insights_catalog / consultant_insights / evaluations_consultant).
--
-- No existing tables are modified. Run in Supabase SQL Editor.

-- ─── 1. measures_catalog ──────────────────────────────────────────────────────
-- Deduplicated measure content. Since measures in the pipeline JSON do NOT carry
-- a reliable unique id, we allow duplicates in the catalog (one row per upload).
-- Dedup-per-portal is enforced by the junction table below.

CREATE TABLE measures_catalog (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  original_insight_id         TEXT,                        -- pipeline insightId this measure belongs to
  company_id                  UUID        REFERENCES companies(id) ON DELETE SET NULL,
  original_location_id        INT,                         -- ecoplanet internal location ID
  source_file                 TEXT        NOT NULL DEFAULT '',
  measure_title               TEXT        NOT NULL,
  measure_short_description   TEXT,
  measure_description         TEXT,
  measure_raw                 JSONB,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX measures_catalog_original_insight_idx ON measures_catalog (original_insight_id);
CREATE INDEX measures_catalog_company_idx          ON measures_catalog (company_id);

-- ─── 2. consultant_measures (junction) ────────────────────────────────────────

CREATE TABLE consultant_measures (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_portal_id  UUID        NOT NULL REFERENCES consultant_portals(id) ON DELETE CASCADE,
  measure_catalog_id    UUID        NOT NULL REFERENCES measures_catalog(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX consultant_measures_portal_idx  ON consultant_measures (consultant_portal_id);
CREATE INDEX consultant_measures_catalog_idx ON consultant_measures (measure_catalog_id);

-- ─── 3. evaluations_consultant_measure ────────────────────────────────────────
-- Consultant ratings for measures. Five categories (1–5). NULL = N/A.

CREATE TABLE evaluations_consultant_measure (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_measure_id    UUID        NOT NULL REFERENCES consultant_measures(id) ON DELETE CASCADE,
  evaluator_name           TEXT        NOT NULL,
  verstaendlichkeit        INT         CHECK (verstaendlichkeit BETWEEN 1 AND 5),
  plausibilitaet           INT         CHECK (plausibilitaet BETWEEN 1 AND 5),
  wirtschaftlichkeit       INT         CHECK (wirtschaftlichkeit BETWEEN 1 AND 5),
  umsetzbarkeit            INT         CHECK (umsetzbarkeit BETWEEN 1 AND 5),
  gesamteindruck           INT         CHECK (gesamteindruck BETWEEN 1 AND 5),
  notes                    TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX evaluations_consultant_measure_ref_idx
  ON evaluations_consultant_measure (consultant_measure_id);
