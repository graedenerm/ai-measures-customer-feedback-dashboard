-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- companies
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  industry   text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS companies_name_idx ON companies (name);

-- ============================================================
-- locations
-- ============================================================
CREATE TABLE IF NOT EXISTS locations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  original_location_id int  NOT NULL,
  title                text NOT NULL,
  street_name          text,
  street_number        text,
  UNIQUE (company_id, original_location_id)
);

CREATE INDEX IF NOT EXISTS locations_company_id_idx ON locations (company_id);

-- ============================================================
-- pipeline_runs
-- ============================================================
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  version    text NOT NULL,
  run_date   date NOT NULL,
  notes      text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pipeline_runs_company_id_idx ON pipeline_runs (company_id);
CREATE INDEX IF NOT EXISTS pipeline_runs_run_date_idx   ON pipeline_runs (run_date);

-- ============================================================
-- insights
-- ============================================================
CREATE TABLE IF NOT EXISTS insights (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id              uuid NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  location_id         uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  original_id         text NOT NULL,
  type                text NOT NULL,
  priority_score      float,
  savings_kwh_per_year float,
  savings_eur_per_year float,
  confidence          float,
  title               text NOT NULL,
  description         text,
  raw_json            jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS insights_run_id_idx      ON insights (run_id);
CREATE INDEX IF NOT EXISTS insights_location_id_idx ON insights (location_id);
CREATE INDEX IF NOT EXISTS insights_original_id_idx ON insights (original_id);
CREATE INDEX IF NOT EXISTS insights_type_idx        ON insights (type);

-- ============================================================
-- measures
-- ============================================================
CREATE TABLE IF NOT EXISTS measures (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                  uuid NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  insight_id              uuid NOT NULL REFERENCES insights(id) ON DELETE CASCADE,
  location_id             uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  original_insight_id     text,
  title                   text NOT NULL,
  short_description       text,
  description             text,
  yearly_savings_eur_from float,
  yearly_savings_eur_to   float,
  yearly_savings_kwh_from float,
  yearly_savings_kwh_to   float,
  investment_from         float,
  investment_to           float,
  amortisation_months     int,
  confidence              float,
  effort_level            text,
  investment_type         text,
  category                text,
  raw_json                jsonb NOT NULL DEFAULT '{}',
  created_at              timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS measures_run_id_idx     ON measures (run_id);
CREATE INDEX IF NOT EXISTS measures_insight_id_idx ON measures (insight_id);

-- ============================================================
-- evaluations
-- ============================================================
CREATE TABLE IF NOT EXISTS evaluations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type          text NOT NULL CHECK (item_type IN ('insight', 'measure')),
  insight_id         uuid REFERENCES insights(id) ON DELETE CASCADE,
  measure_id         uuid REFERENCES measures(id) ON DELETE CASCADE,
  evaluator_name     text NOT NULL,
  comprehensibility  int  CHECK (comprehensibility BETWEEN 1 AND 5),
  accuracy           int  CHECK (accuracy BETWEEN 1 AND 5),
  relevance          int  CHECK (relevance BETWEEN 1 AND 5),
  overall_rating     int  CHECK (overall_rating BETWEEN 1 AND 5),
  notes              text,
  created_at         timestamptz DEFAULT now(),
  CONSTRAINT evaluations_item_check CHECK (
    (item_type = 'insight' AND insight_id IS NOT NULL AND measure_id IS NULL) OR
    (item_type = 'measure' AND measure_id IS NOT NULL AND insight_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS evaluations_insight_id_idx ON evaluations (insight_id);
CREATE INDEX IF NOT EXISTS evaluations_measure_id_idx ON evaluations (measure_id);
CREATE INDEX IF NOT EXISTS evaluations_item_type_idx  ON evaluations (item_type);
