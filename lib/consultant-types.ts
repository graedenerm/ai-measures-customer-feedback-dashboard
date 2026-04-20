// ============================================================
// Consultant portal types — completely separate from customer types
// ============================================================

export interface ConsultantPortal {
  id: string
  slug: string
  password: string
  evaluator_name: string
  created_at: string
}

// ─── insights_catalog ────────────────────────────────────────────────────────
// Deduplicated insight content. One row per unique insight (keyed on
// original_insight_id). Shared across portals — no duplicate content storage.

export interface InsightsCatalog {
  id: string
  original_insight_id: string | null   // pipeline UUID (insight_id or id field)
  company_id: string | null            // FK → companies.id
  original_location_id: number | null  // ecoplanet internal location ID
  source_file: string                  // filename of first upload
  insight_title: string
  insight_description: string | null
  insight_raw: Record<string, unknown> | null
  created_at: string
}

// ─── consultant_insights ─────────────────────────────────────────────────────
// Junction table: which portal has been assigned which catalog insight.
// evaluations_consultant.consultant_insight_id still points to this table's id.
//
// The type is intentionally kept flat (catalog fields inlined) so that all
// existing UI components work without changes — the action layer joins and
// flattens before returning.

export interface ConsultantInsight {
  id: string                           // junction row id — used by evaluations FK
  consultant_portal_id: string
  insight_catalog_id: string           // FK → insights_catalog.id
  // Content fields — populated from insights_catalog via JOIN:
  original_insight_id: string | null
  original_location_id: number | null
  company_id: string | null
  source_file: string
  insight_title: string
  insight_description: string | null
  insight_raw: Record<string, unknown> | null
  industry: string | null
  created_at: string                   // junction row created_at (when assigned)
}

export interface ConsultantEvaluation {
  id: string
  consultant_insight_id: string        // FK → consultant_insights.id (unchanged)
  evaluator_name: string
  verstaendlichkeit: number | null     // NULL = N/A
  plausibilitaet: number | null
  aktionabilitaet: number | null
  gesamteindruck: number | null
  notes: string | null
  created_at: string
}

// Enriched type used in the portal UI
export interface ConsultantInsightWithEvaluation extends ConsultantInsight {
  evaluation: ConsultantEvaluation | null
}

// Insert types
export type InsertConsultantPortal     = Omit<ConsultantPortal,     'id' | 'created_at'>
export type InsertInsightsCatalog      = Omit<InsightsCatalog,      'id' | 'created_at'>
export type InsertConsultantEvaluation = Omit<ConsultantEvaluation, 'id' | 'created_at'>

// Junction insert — content lives in catalog, not here
export interface InsertConsultantInsight {
  consultant_portal_id: string
  insight_catalog_id: string
}

// Admin list view — portal with counts
export interface ConsultantPortalWithStats extends ConsultantPortal {
  insight_count: number
  eval_count: number
  measure_count: number
  measure_eval_count: number
}

// ============================================================
// MEASURE support — parallel to the insight types above.
// Tables: measures_catalog, consultant_measures, evaluations_consultant_measure
// ============================================================

// ─── measures_catalog ────────────────────────────────────────────────────────
// Deduplicated measure content. Unlike insights, measures do not carry a unique
// pipeline id, so the catalog allows duplicate rows — dedup happens per portal.

export interface MeasuresCatalog {
  id: string
  original_insight_id: string | null   // pipeline insightId this measure belongs to
  company_id: string | null
  original_location_id: number | null
  source_file: string
  measure_title: string
  measure_short_description: string | null
  measure_description: string | null
  measure_raw: Record<string, unknown> | null
  created_at: string
}

// ─── consultant_measures (junction) ──────────────────────────────────────────
// Flattened to include catalog fields (joined in the action layer) so UI code
// can stay simple.

export interface ConsultantMeasure {
  id: string                            // junction row id — FK target for evaluations
  consultant_portal_id: string
  measure_catalog_id: string
  // Content fields — populated via JOIN with measures_catalog:
  original_insight_id: string | null
  original_location_id: number | null
  company_id: string | null
  source_file: string
  measure_title: string
  measure_short_description: string | null
  measure_description: string | null
  measure_raw: Record<string, unknown> | null
  industry: string | null
  created_at: string
}

// ─── evaluations_consultant_measure ──────────────────────────────────────────

export interface ConsultantMeasureEvaluation {
  id: string
  consultant_measure_id: string
  evaluator_name: string
  verstaendlichkeit: number | null
  plausibilitaet: number | null
  wirtschaftlichkeit: number | null
  umsetzbarkeit: number | null
  gesamteindruck: number | null
  notes: string | null
  created_at: string
}

// Enriched type for the UI
export interface ConsultantMeasureWithEvaluation extends ConsultantMeasure {
  evaluation: ConsultantMeasureEvaluation | null
}

// Insert types
export type InsertMeasuresCatalog               = Omit<MeasuresCatalog,               'id' | 'created_at'>
export type InsertConsultantMeasureEvaluation   = Omit<ConsultantMeasureEvaluation,   'id' | 'created_at'>

export interface InsertConsultantMeasure {
  consultant_portal_id: string
  measure_catalog_id: string
}
