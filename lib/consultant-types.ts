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

export interface ConsultantInsight {
  id: string
  consultant_portal_id: string
  source_file: string
  insight_title: string
  insight_description: string | null
  insight_raw: Record<string, unknown> | null
  created_at: string
}

export interface ConsultantEvaluation {
  id: string
  consultant_insight_id: string
  evaluator_name: string
  verstaendlichkeit: number | null   // NULL = N/A
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

// Insert types (omit auto-generated fields)
export type InsertConsultantPortal  = Omit<ConsultantPortal,  'id' | 'created_at'>
export type InsertConsultantInsight = Omit<ConsultantInsight, 'id' | 'created_at'>
export type InsertConsultantEvaluation = Omit<ConsultantEvaluation, 'id' | 'created_at'>

// Admin list view — portal with counts
export interface ConsultantPortalWithStats extends ConsultantPortal {
  insight_count: number
  eval_count: number
}
