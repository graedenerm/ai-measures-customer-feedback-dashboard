'use server'

import { createClient } from '@/lib/supabase/server'
import type { Evaluation } from '@/lib/types'

export interface SubmitEvaluationData {
  itemType: 'insight' | 'measure'
  itemId: string
  evaluatorName: string
  // Primary impression — required
  impression: 'positive' | 'negative' | 'neutral'
  // Core ratings — all optional
  comprehensibility?: number | null
  relevance?: number | null
  plausibility?: number | null
  // Detailed ratings — all optional
  ratingTitle?: number | null
  ratingDescription?: number | null
  ratingHypotheses?: number | null   // insights only
  ratingReasoning?: number | null    // measures only
  ratingQuestions?: number | null    // measures only
  notes?: string
}

export interface SubmitEvaluationResult {
  success: boolean
  evaluationId?: string
  error?: string
}

export async function getEvaluationForEvaluator(
  itemType: 'insight' | 'measure',
  itemId: string,
  evaluatorName: string
): Promise<Evaluation | null> {
  try {
    const supabase = await createClient()
    const column = itemType === 'insight' ? 'insight_id' : 'measure_id'

    const { data } = await supabase
      .from('evaluations')
      .select('*')
      .eq('item_type', itemType)
      .eq(column, itemId)
      .eq('evaluator_name', evaluatorName.trim())
      .order('created_at', { ascending: false })
      .limit(1)

    return (data?.[0] as Evaluation) ?? null
  } catch {
    return null
  }
}

export async function submitEvaluation(
  data: SubmitEvaluationData
): Promise<SubmitEvaluationResult> {
  try {
    const supabase = await createClient()
    const column = data.itemType === 'insight' ? 'insight_id' : 'measure_id'

    const payload = {
      item_type: data.itemType,
      insight_id: data.itemType === 'insight' ? data.itemId : null,
      measure_id: data.itemType === 'measure' ? data.itemId : null,
      evaluator_name: data.evaluatorName.trim(),
      impression: data.impression,
      comprehensibility: data.comprehensibility ?? null,
      relevance: data.relevance ?? null,
      plausibility: data.plausibility ?? null,
      rating_title: data.ratingTitle ?? null,
      rating_description: data.ratingDescription ?? null,
      rating_hypotheses: data.ratingHypotheses ?? null,
      rating_reasoning: data.ratingReasoning ?? null,
      rating_questions: data.ratingQuestions ?? null,
      notes: data.notes?.trim() || null,
    }

    // Remove any prior evaluations by this evaluator on this item
    await supabase
      .from('evaluations')
      .delete()
      .eq('item_type', payload.item_type)
      .eq(column, data.itemId)
      .eq('evaluator_name', payload.evaluator_name)

    const { data: result, error } = await supabase
      .from('evaluations')
      .insert(payload)
      .select('id')
      .single()

    if (error || !result) {
      return {
        success: false,
        error: error?.message ?? 'Failed to submit evaluation',
      }
    }

    return { success: true, evaluationId: result.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return { success: false, error: message }
  }
}

export interface EvaluationsForRun {
  byInsight: Record<string, Evaluation[]>
  byMeasure: Record<string, Evaluation[]>
  all: Evaluation[]
}

export async function getEvaluationsForRun(
  runId: string
): Promise<EvaluationsForRun> {
  const supabase = await createClient()

  // Get all insight ids for this run
  const { data: insights } = await supabase
    .from('insights')
    .select('id')
    .eq('run_id', runId)

  const insightIds = (insights ?? []).map((i) => i.id)

  // Get all measure ids for this run
  const { data: measures } = await supabase
    .from('measures')
    .select('id')
    .eq('run_id', runId)

  const measureIds = (measures ?? []).map((m) => m.id)

  const allEvaluations: Evaluation[] = []
  const byInsight: Record<string, Evaluation[]> = {}
  const byMeasure: Record<string, Evaluation[]> = {}

  if (insightIds.length > 0) {
    const { data: insightEvals } = await supabase
      .from('evaluations')
      .select('*')
      .eq('item_type', 'insight')
      .in('insight_id', insightIds)
      .order('created_at', { ascending: false })

    for (const ev of insightEvals ?? []) {
      allEvaluations.push(ev as Evaluation)
      const key = ev.insight_id!
      if (!byInsight[key]) byInsight[key] = []
      byInsight[key].push(ev as Evaluation)
    }
  }

  if (measureIds.length > 0) {
    const { data: measureEvals } = await supabase
      .from('evaluations')
      .select('*')
      .eq('item_type', 'measure')
      .in('measure_id', measureIds)
      .order('created_at', { ascending: false })

    for (const ev of measureEvals ?? []) {
      allEvaluations.push(ev as Evaluation)
      const key = ev.measure_id!
      if (!byMeasure[key]) byMeasure[key] = []
      byMeasure[key].push(ev as Evaluation)
    }
  }

  return { byInsight, byMeasure, all: allEvaluations }
}
