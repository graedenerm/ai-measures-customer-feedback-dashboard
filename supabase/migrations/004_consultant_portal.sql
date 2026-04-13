-- 004_consultant_portal.sql
-- Creates tables for consultant insight evaluation portals.
-- Run this entire script in your Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- No existing tables are modified.

-- ─── 1. Consultant portals ────────────────────────────────────────────────────
-- One row per consultant portal (analogous to "companies" for customer portals).
CREATE TABLE consultant_portals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT UNIQUE NOT NULL,       -- URL: /eval/{slug}
  password       TEXT NOT NULL,             -- access password (shown to consultant)
  evaluator_name TEXT NOT NULL,             -- e.g. "Dr. Müller" — fixed, never entered by consultant
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Consultant insights ───────────────────────────────────────────────────
-- Insights uploaded by the admin for a specific consultant portal.
-- Stores the parsed fields needed for display + the full raw JSON for rendering.
CREATE TABLE consultant_insights (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_portal_id UUID NOT NULL REFERENCES consultant_portals(id) ON DELETE CASCADE,
  source_file          TEXT NOT NULL,         -- original filename (for admin traceability)
  insight_title        TEXT NOT NULL,
  insight_description  TEXT,
  insight_raw          JSONB,                 -- full pipeline JSON for rendering hypotheses etc.
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. Consultant evaluations ────────────────────────────────────────────────
-- The consultant's ratings. Completely separate from the "evaluations" table.
-- NULL on a rating column means the consultant chose N/A.
-- The UI enforces that each category must be actively set (1–5 or N/A) before submit.
CREATE TABLE evaluations_consultant (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_insight_id UUID NOT NULL REFERENCES consultant_insights(id) ON DELETE CASCADE,
  evaluator_name        TEXT NOT NULL,         -- copied from consultant_portals.evaluator_name
  verstaendlichkeit     INT CHECK (verstaendlichkeit BETWEEN 1 AND 5),
  plausibilitaet        INT CHECK (plausibilitaet BETWEEN 1 AND 5),
  aktionabilitaet       INT CHECK (aktionabilitaet BETWEEN 1 AND 5),
  gesamteindruck        INT CHECK (gesamteindruck BETWEEN 1 AND 5),
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
