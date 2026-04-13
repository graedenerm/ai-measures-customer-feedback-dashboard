'use server'

import { createClient } from '@/lib/supabase/server'
import type { ConsultantEvaluation } from '@/lib/consultant-types'

// ─── Submit ───────────────────────────────────────────────────────────────────

export interface SubmitConsultantEvaluationData {
  consultantInsightId: string
  evaluatorName: string
  // NULL = consultant chose N/A; UI enforces that each field must be set before submit
  verstaendlichkeit: number | null
  plausibilitaet: number | null
  aktionabilitaet: number | null
  gesamteindruck: number | null
  notes?: string
}

export interface SubmitConsultantEvaluationResult {
  success: boolean
  evaluation?: ConsultantEvaluation
  error?: string
}

export async function submitConsultantEvaluation(
  data: SubmitConsultantEvaluationData
): Promise<SubmitConsultantEvaluationResult> {
  try {
    const supabase = await createClient()

    const { data: result, error } = await supabase
      .from('evaluations_consultant')
      .insert({
        consultant_insight_id: data.consultantInsightId,
        evaluator_name: data.evaluatorName,
        verstaendlichkeit: data.verstaendlichkeit,
        plausibilitaet: data.plausibilitaet,
        aktionabilitaet: data.aktionabilitaet,
        gesamteindruck: data.gesamteindruck,
        notes: data.notes?.trim() || null,
      })
      .select('*')
      .single()

    if (error || !result) {
      return { success: false, error: error?.message ?? 'Fehler beim Speichern.' }
    }

    return { success: true, evaluation: result as ConsultantEvaluation }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return { success: false, error: message }
  }
}

// ─── Update (re-evaluation) ───────────────────────────────────────────────────

export async function updateConsultantEvaluation(
  evaluationId: string,
  data: {
    verstaendlichkeit: number | null
    plausibilitaet: number | null
    aktionabilitaet: number | null
    gesamteindruck: number | null
    notes?: string
  }
): Promise<SubmitConsultantEvaluationResult> {
  try {
    const supabase = await createClient()

    const { data: result, error } = await supabase
      .from('evaluations_consultant')
      .update({
        verstaendlichkeit: data.verstaendlichkeit,
        plausibilitaet: data.plausibilitaet,
        aktionabilitaet: data.aktionabilitaet,
        gesamteindruck: data.gesamteindruck,
        notes: data.notes?.trim() || null,
      })
      .eq('id', evaluationId)
      .select('*')
      .single()

    if (error || !result) {
      return { success: false, error: error?.message ?? 'Fehler beim Aktualisieren.' }
    }

    return { success: true, evaluation: result as ConsultantEvaluation }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return { success: false, error: message }
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getEvaluationsForPortal(
  portalId: string
): Promise<ConsultantEvaluation[]> {
  const supabase = await createClient()

  // Get all insight ids for this portal
  const { data: insights } = await supabase
    .from('consultant_insights')
    .select('id')
    .eq('consultant_portal_id', portalId)

  if (!insights || insights.length === 0) return []

  const insightIds = insights.map((i) => i.id)

  const { data, error } = await supabase
    .from('evaluations_consultant')
    .select('*')
    .in('consultant_insight_id', insightIds)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data as ConsultantEvaluation[]
}
