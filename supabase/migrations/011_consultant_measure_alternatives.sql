-- 011_consultant_measure_alternatives.sql
-- Adds a second optional free-text field ("Alternative Maßnahmenvorschläge")
-- to the consultant measure evaluation form.
--
-- Run in Supabase SQL Editor.

ALTER TABLE evaluations_consultant_measure
  ADD COLUMN alternative_measures TEXT;
