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
}
