// ============================================================
// Database entity types (match Supabase schema exactly)
// ============================================================

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  created_at: string;
  slug: string | null;
  password: string | null;
  active_run_id: string | null;
}

export interface Location {
  id: string;
  company_id: string;
  original_location_id: number;
  title: string;
  street_name: string | null;
  street_number: string | null;
}

export interface PipelineRun {
  id: string;
  company_id: string;
  version: string;
  run_date: string;
  notes: string | null;
  created_at: string;
}

export interface Insight {
  id: string;
  run_id: string;
  location_id: string;
  original_id: string;
  type: string;
  priority_score: number | null;
  savings_kwh_per_year: number | null;
  savings_eur_per_year: number | null;
  confidence: number | null;
  title: string;
  description: string | null;
  raw_json: Record<string, unknown>;
  created_at: string;
}

export interface Measure {
  id: string;
  run_id: string;
  insight_id: string;
  location_id: string;
  original_insight_id: string | null;
  title: string;
  short_description: string | null;
  description: string | null;
  yearly_savings_eur_from: number | null;
  yearly_savings_eur_to: number | null;
  yearly_savings_kwh_from: number | null;
  yearly_savings_kwh_to: number | null;
  investment_from: number | null;
  investment_to: number | null;
  amortisation_months: number | null;
  confidence: number | null;
  effort_level: string | null;
  investment_type: string | null;
  category: string | null;
  raw_json: Record<string, unknown>;
  created_at: string;
}

export interface Evaluation {
  id: string;
  item_type: 'insight' | 'measure';
  insight_id: string | null;
  measure_id: string | null;
  evaluator_name: string;
  // Primary impression
  impression: 'positive' | 'negative' | 'neutral' | null;
  // Core ratings (optional, 1-5)
  comprehensibility: number | null;
  relevance: number | null;
  plausibility: number | null;
  // Detailed ratings (optional, 1-5)
  rating_title: number | null;
  rating_description: number | null;
  rating_hypotheses: number | null;  // insights only
  rating_reasoning: number | null;   // measures only
  rating_questions: number | null;   // measures only
  notes: string | null;
  created_at: string;
}

// ============================================================
// Insert types (omit auto-generated fields)
// ============================================================

export type InsertInsight = Omit<Insight, 'id' | 'created_at'>;
export type InsertMeasure = Omit<Measure, 'id' | 'created_at'>;
export type InsertEvaluation = Omit<Evaluation, 'id' | 'created_at'>;

// ============================================================
// Composite / enriched types used in the UI
// ============================================================

export interface InsightWithMeasures extends Insight {
  measures: MeasureWithEvaluations[];
  location: Location | null;
  evaluations: Evaluation[];
}

export interface MeasureWithEvaluations extends Measure {
  evaluations: Evaluation[];
}

export interface RunWithStats extends PipelineRun {
  company: Company;
  insight_count: number;
  measure_count: number;
  eval_count: number;
  rater_count: number;
  avg_rating: number | null;         // avg of comprehensibility + relevance + plausibility
  impression_positive: number;
  impression_negative: number;
  impression_neutral: number;
  // Split by item type
  insight_impression_positive: number;
  insight_impression_neutral: number;
  insight_impression_negative: number;
  insight_eval_count: number;
  measure_impression_positive: number;
  measure_impression_neutral: number;
  measure_impression_negative: number;
  measure_eval_count: number;
}

export interface RunDetail extends PipelineRun {
  company: Company;
  insights: InsightWithMeasures[];
  locations: Location[];
  evaluations: Evaluation[];
}

export interface CompanyWithRuns extends Company {
  runs: RunWithStats[];
}

// ============================================================
// Raw JSON shapes (from pipeline output)
// ============================================================

export interface RawInsightJson {
  id: string;
  locationId: number;
  findingId?: string;
  type: string;
  priorityScore?: number;
  savingsKwhPerYear?: number;
  savingsEurPerYear?: number;
  confidence?: number;
  title: string;
  description?: string;
  timeContext?: Record<string, unknown>;
  findingDetail?: Record<string, unknown>;
  hypotheses?: unknown[];
  context?: {
    company?: { industry?: string; activities?: unknown[] };
    location?: {
      id: number;
      title: string;
      streetName?: string;
      streetNumber?: string;
    };
    meters?: unknown[];
    callTranscripts?: unknown[];
  };
  deviceAttribution?: unknown;
  plots?: string[];
}

export interface RawMeasureJson {
  locationId: number;
  insightId?: string;
  title: string;
  shortDescription?: string;
  description?: string;
  yearlySavingsRangeFrom?: number;
  yearlySavingsRangeTo?: number;
  yearlySavingsEnergyRangeFrom?: number;
  yearlySavingsEnergyRangeTo?: number;
  investmentRangeFrom?: number;
  investmentRangeTo?: number;
  amortisationPeriodInMonths?: number;
  reasoning?: string;
  questions?: unknown[];
  confidence?: number;
  category?: string;
  investmentType?: string;
  effortLevel?: string;
}

// ============================================================
// Dashboard stats
// ============================================================

export interface DashboardStats {
  totalCompanies: number;
  totalRuns: number;
  totalEvaluations: number;
  avgOverallRating: number | null;
}

export interface TrendDataPoint {
  run_date: string;
  avg_rating: number;
  company_name: string;
  company_id: string;
  version: string;
}
