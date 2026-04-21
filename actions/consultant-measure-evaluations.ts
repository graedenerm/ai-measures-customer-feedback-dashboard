'use server'

import { createClient } from '@/lib/supabase/server'
import type { ConsultantMeasureEvaluation } from '@/lib/consultant-types'

// ─── Submit ───────────────────────────────────────────────────────────────────

export interface SubmitConsultantMeasureEvaluationData {
  consultantMeasureId: string
  evaluatorName: string
  // NULL = consultant chose N/A; UI enforces that each field must be set before submit
  verstaendlichkeit: number | null
  plausibilitaet: number | null
  wirtschaftlichkeit: number | null
  umsetzbarkeit: number | null
  gesamteindruck: number | null
  notes?: string
  alternativeMeasures?: string
}

export interface SubmitConsultantMeasureEvaluationResult {
  success: boolean
  evaluation?: ConsultantMeasureEvaluation
  error?: string
}

export async function submitConsultantMeasureEvaluation(
  data: SubmitConsultantMeasureEvaluationData
): Promise<SubmitConsultantMeasureEvaluationResult> {
  try {
    const supabase = await createClient()

    const { data: result, error } = await supabase
      .from('evaluations_consultant_measure')
      .insert({
        consultant_measure_id: data.consultantMeasureId,
        evaluator_name:        data.evaluatorName,
        verstaendlichkeit:     data.verstaendlichkeit,
        plausibilitaet:        data.plausibilitaet,
        wirtschaftlichkeit:    data.wirtschaftlichkeit,
        umsetzbarkeit:         data.umsetzbarkeit,
        gesamteindruck:        data.gesamteindruck,
        notes:                 data.notes?.trim() || null,
        alternative_measures:  data.alternativeMeasures?.trim() || null,
      })
      .select('*')
      .single()

    if (error || !result) {
      return { success: false, error: error?.message ?? 'Fehler beim Speichern.' }
    }

    return { success: true, evaluation: result as ConsultantMeasureEvaluation }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return { success: false, error: message }
  }
}

// ─── Update (re-evaluation) ───────────────────────────────────────────────────

export async function updateConsultantMeasureEvaluation(
  evaluationId: string,
  data: {
    verstaendlichkeit: number | null
    plausibilitaet: number | null
    wirtschaftlichkeit: number | null
    umsetzbarkeit: number | null
    gesamteindruck: number | null
    notes?: string
    alternativeMeasures?: string
  }
): Promise<SubmitConsultantMeasureEvaluationResult> {
  try {
    const supabase = await createClient()

    const { data: result, error } = await supabase
      .from('evaluations_consultant_measure')
      .update({
        verstaendlichkeit:    data.verstaendlichkeit,
        plausibilitaet:       data.plausibilitaet,
        wirtschaftlichkeit:   data.wirtschaftlichkeit,
        umsetzbarkeit:        data.umsetzbarkeit,
        gesamteindruck:       data.gesamteindruck,
        notes:                data.notes?.trim() || null,
        alternative_measures: data.alternativeMeasures?.trim() || null,
      })
      .eq('id', evaluationId)
      .select('*')
      .single()

    if (error || !result) {
      return { success: false, error: error?.message ?? 'Fehler beim Aktualisieren.' }
    }

    return { success: true, evaluation: result as ConsultantMeasureEvaluation }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return { success: false, error: message }
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getMeasureEvaluationsForPortal(
  portalId: string
): Promise<ConsultantMeasureEvaluation[]> {
  const supabase = await createClient()

  const { data: measures } = await supabase
    .from('consultant_measures')
    .select('id')
    .eq('consultant_portal_id', portalId)

  if (!measures || measures.length === 0) return []

  const measureIds = measures.map((m) => m.id)

  const { data, error } = await supabase
    .from('evaluations_consultant_measure')
    .select('*')
    .in('consultant_measure_id', measureIds)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data as ConsultantMeasureEvaluation[]
}
