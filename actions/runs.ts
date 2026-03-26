'use server'

import { createClient } from '@/lib/supabase/server'
import type {
  Company,
  RunWithStats,
  RunDetail,
  InsightWithMeasures,
  Evaluation,
} from '@/lib/types'

export async function getCompanies(): Promise<Company[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('getCompanies error:', error)
    return []
  }

  return data ?? []
}

export async function getRunsForCompany(
  companyId: string
): Promise<RunWithStats[]> {
  const supabase = await createClient()

  const { data: runs, error: runsError } = await supabase
    .from('pipeline_runs')
    .select('*, companies(*)')
    .eq('company_id', companyId)
    .order('run_date', { ascending: false })

  if (runsError || !runs) {
    console.error('getRunsForCompany error:', runsError)
    return []
  }

  const result: RunWithStats[] = []

  for (const run of runs) {
    const [
      { count: insightCount },
      { count: measureCount },
      { data: insightIds },
      { data: measureIds },
    ] = await Promise.all([
      supabase.from('insights').select('*', { count: 'exact', head: true }).eq('run_id', run.id),
      supabase.from('measures').select('*', { count: 'exact', head: true }).eq('run_id', run.id),
      supabase.from('insights').select('id').eq('run_id', run.id),
      supabase.from('measures').select('id').eq('run_id', run.id),
    ])

    const iIds = (insightIds ?? []).map((i) => i.id)
    const mIds = (measureIds ?? []).map((m) => m.id)

    // Fetch evaluations for insights and measures separately
    type EvalRow = {
      comprehensibility: number | null
      relevance: number | null
      plausibility: number | null
      impression: 'positive' | 'negative' | 'neutral' | null
      evaluator_name: string
    }
    let insightEvals: EvalRow[] = []
    let measureEvals: EvalRow[] = []

    await Promise.all([
      iIds.length > 0
        ? supabase
            .from('evaluations')
            .select('comprehensibility,relevance,plausibility,impression,evaluator_name')
            .in('insight_id', iIds)
            .then(({ data }) => { insightEvals = (data ?? []) as EvalRow[] })
        : Promise.resolve(),
      mIds.length > 0
        ? supabase
            .from('evaluations')
            .select('comprehensibility,relevance,plausibility,impression,evaluator_name')
            .in('measure_id', mIds)
            .then(({ data }) => { measureEvals = (data ?? []) as EvalRow[] })
        : Promise.resolve(),
    ])

    const allEvals = [...insightEvals, ...measureEvals]

    // Average across core metrics
    const allValues: number[] = []
    for (const ev of allEvals) {
      if (ev.comprehensibility !== null) allValues.push(ev.comprehensibility)
      if (ev.relevance !== null) allValues.push(ev.relevance)
      if (ev.plausibility !== null) allValues.push(ev.plausibility)
    }
    const avgRating =
      allValues.length > 0
        ? allValues.reduce((a, b) => a + b, 0) / allValues.length
        : null

    const raterCount = new Set(allEvals.map((e) => e.evaluator_name)).size

    result.push({
      id: run.id,
      company_id: run.company_id,
      version: run.version,
      run_date: run.run_date,
      notes: run.notes,
      created_at: run.created_at,
      company: run.companies as Company,
      insight_count: insightCount ?? 0,
      measure_count: measureCount ?? 0,
      avg_rating: avgRating,
      eval_count: allEvals.length,
      rater_count: raterCount,
      impression_positive: allEvals.filter((e) => e.impression === 'positive').length,
      impression_negative: allEvals.filter((e) => e.impression === 'negative').length,
      impression_neutral:  allEvals.filter((e) => e.impression === 'neutral').length,
      insight_eval_count: insightEvals.length,
      insight_impression_positive: insightEvals.filter((e) => e.impression === 'positive').length,
      insight_impression_neutral:  insightEvals.filter((e) => e.impression === 'neutral').length,
      insight_impression_negative: insightEvals.filter((e) => e.impression === 'negative').length,
      measure_eval_count: measureEvals.length,
      measure_impression_positive: measureEvals.filter((e) => e.impression === 'positive').length,
      measure_impression_neutral:  measureEvals.filter((e) => e.impression === 'neutral').length,
      measure_impression_negative: measureEvals.filter((e) => e.impression === 'negative').length,
    })
  }

  return result
}

export async function getRunDetail(runId: string): Promise<RunDetail | null> {
  const supabase = await createClient()

  const { data: run, error: runError } = await supabase
    .from('pipeline_runs')
    .select('*, companies(*)')
    .eq('id', runId)
    .single()

  if (runError || !run) {
    console.error('getRunDetail run error:', runError)
    return null
  }

  // Fetch locations
  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('company_id', run.company_id)

  // Fetch insights for this run
  const { data: insights, error: insightsError } = await supabase
    .from('insights')
    .select('*')
    .eq('run_id', runId)
    .order('priority_score', { ascending: false, nullsFirst: false })

  if (insightsError) {
    console.error('getRunDetail insights error:', insightsError)
    return null
  }

  const insightIds = (insights ?? []).map((i) => i.id)

  // Fetch measures for all insights
  const { data: measures } = await supabase
    .from('measures')
    .select('*')
    .in('insight_id', insightIds.length > 0 ? insightIds : ['__none__'])

  // Fetch evaluations for these insights and measures
  const { data: measureIds } = await supabase
    .from('measures')
    .select('id')
    .eq('run_id', runId)

  const mIds = (measureIds ?? []).map((m) => m.id)

  let evaluations: Evaluation[] = []

  if (insightIds.length > 0 || mIds.length > 0) {
    const queries: Promise<Evaluation[]>[] = []

    if (insightIds.length > 0) {
      queries.push(
        Promise.resolve(
          supabase
            .from('evaluations')
            .select('*')
            .in('insight_id', insightIds)
            .then(({ data }) => (data ?? []) as Evaluation[])
        )
      )
    }

    if (mIds.length > 0) {
      queries.push(
        Promise.resolve(
          supabase
            .from('evaluations')
            .select('*')
            .in('measure_id', mIds)
            .then(({ data }) => (data ?? []) as Evaluation[])
        )
      )
    }

    const results = await Promise.all(queries)
    evaluations = results.flat()
  }

  // Build evaluation maps
  const evalsByInsight: Record<string, Evaluation[]> = {}
  const evalsByMeasure: Record<string, Evaluation[]> = {}

  for (const ev of evaluations) {
    if (ev.insight_id) {
      if (!evalsByInsight[ev.insight_id]) evalsByInsight[ev.insight_id] = []
      evalsByInsight[ev.insight_id].push(ev)
    }
    if (ev.measure_id) {
      if (!evalsByMeasure[ev.measure_id]) evalsByMeasure[ev.measure_id] = []
      evalsByMeasure[ev.measure_id].push(ev)
    }
  }

  // Build location map
  const locationMap = new Map((locations ?? []).map((l) => [l.id, l]))

  // Compose InsightWithMeasures
  const insightsWithMeasures: InsightWithMeasures[] = (insights ?? []).map(
    (insight) => {
      const insightMeasures = (measures ?? [])
        .filter((m) => m.insight_id === insight.id)
        .map((m) => ({
          ...m,
          evaluations: evalsByMeasure[m.id] ?? [],
        }))

      return {
        ...insight,
        measures: insightMeasures,
        location: locationMap.get(insight.location_id) ?? null,
        evaluations: evalsByInsight[insight.id] ?? [],
      }
    }
  )

  return {
    id: run.id,
    company_id: run.company_id,
    version: run.version,
    run_date: run.run_date,
    notes: run.notes,
    created_at: run.created_at,
    company: run.companies as Company,
    insights: insightsWithMeasures,
    locations: locations ?? [],
    evaluations,
  }
}

export async function getRunsForComparison(
  runId1: string,
  runId2: string
): Promise<[RunDetail | null, RunDetail | null]> {
  const [run1, run2] = await Promise.all([
    getRunDetail(runId1),
    getRunDetail(runId2),
  ])
  return [run1, run2]
}

export interface DashboardData {
  totalCompanies: number
  totalRuns: number
  totalEvaluations: number
  avgOverallRating: number | null
  trendData: Array<{
    run_date: string
    avg_rating: number | null
    company_name: string
    company_id: string
    version: string
    run_id: string
    insight_count: number
    measure_count: number
  }>
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient()

  const [
    { count: totalCompanies },
    { count: totalRuns },
    { count: totalEvaluations },
    { data: allEvals },
    { data: allRuns },
    { data: allInsightRunIds },
    { data: allMeasureRunIds },
  ] = await Promise.all([
    supabase
      .from('companies')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('pipeline_runs')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('evaluations')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('evaluations')
      .select('comprehensibility,relevance,plausibility'),
    supabase
      .from('pipeline_runs')
      .select('id, run_date, version, company_id, companies(name)')
      .order('run_date', { ascending: true }),
    supabase.from('insights').select('run_id'),
    supabase.from('measures').select('run_id'),
  ])

  // Build count maps: run_id → count
  const insightCountByRun = new Map<string, number>()
  for (const row of allInsightRunIds ?? []) {
    insightCountByRun.set(row.run_id, (insightCountByRun.get(row.run_id) ?? 0) + 1)
  }
  const measureCountByRun = new Map<string, number>()
  for (const row of allMeasureRunIds ?? []) {
    measureCountByRun.set(row.run_id, (measureCountByRun.get(row.run_id) ?? 0) + 1)
  }

  const coreValues: number[] = []
  for (const ev of allEvals ?? []) {
    if (ev.comprehensibility) coreValues.push(ev.comprehensibility)
    if (ev.relevance) coreValues.push(ev.relevance)
    if (ev.plausibility) coreValues.push(ev.plausibility)
  }
  const avgOverallRating =
    coreValues.length > 0
      ? coreValues.reduce((a, b) => a + b, 0) / coreValues.length
      : null

  // Build trend data: per run, avg rating of insight evaluations
  const trendData: DashboardData['trendData'] = []

  for (const run of allRuns ?? []) {
    const { data: insightIds } = await supabase
      .from('insights')
      .select('id')
      .eq('run_id', run.id)

    const ids = (insightIds ?? []).map((i) => i.id)
    let avg: number | null = null

    if (ids.length > 0) {
      const { data: runEvals } = await supabase
        .from('evaluations')
        .select('comprehensibility,relevance,plausibility')
        .in('insight_id', ids)

      const runValues: number[] = []
      for (const ev of runEvals ?? []) {
        if (ev.comprehensibility) runValues.push(ev.comprehensibility)
        if (ev.relevance) runValues.push(ev.relevance)
        if (ev.plausibility) runValues.push(ev.plausibility)
      }
      const runRatings = runValues

      if (runRatings.length > 0) {
        avg = runRatings.reduce((a, b) => a + b, 0) / runRatings.length
      }
    }

    const company = (run.companies as unknown) as { name: string } | null

    trendData.push({
      run_date: run.run_date,
      avg_rating: avg,
      company_name: company?.name ?? 'Unknown',
      company_id: run.company_id,
      version: run.version,
      run_id: run.id,
      insight_count: insightCountByRun.get(run.id) ?? 0,
      measure_count: measureCountByRun.get(run.id) ?? 0,
    })
  }

  return {
    totalCompanies: totalCompanies ?? 0,
    totalRuns: totalRuns ?? 0,
    totalEvaluations: totalEvaluations ?? 0,
    avgOverallRating,
    trendData,
  }
}
