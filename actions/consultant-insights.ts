'use server'

import { createClient } from '@/lib/supabase/server'
import type { ConsultantInsight, InsertConsultantInsight } from '@/lib/consultant-types'
import type { RawInsightJson } from '@/lib/types'

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadConsultantInsightsResult {
  success: boolean
  count?: number
  error?: string
}

/**
 * Parse a raw insights JSON string and insert each insight into consultant_insights.
 * Uses the same JSON format as the customer pipeline output.
 */
export async function uploadConsultantInsights(
  portalId: string,
  sourceFile: string,
  insightsJson: string
): Promise<UploadConsultantInsightsResult> {
  let rawInsights: RawInsightJson[]

  try {
    const parsed = JSON.parse(insightsJson)
    rawInsights = Array.isArray(parsed) ? parsed : []
  } catch {
    return { success: false, error: 'Ungültiges JSON-Format.' }
  }

  if (rawInsights.length === 0) {
    return { success: false, error: 'Keine Erkenntnisse in der Datei gefunden.' }
  }

  const supabase = await createClient()

  const inserts: InsertConsultantInsight[] = rawInsights.map((raw) => ({
    consultant_portal_id: portalId,
    source_file: sourceFile,
    insight_title: raw.title,
    insight_description: raw.description ?? null,
    insight_raw: raw as unknown as Record<string, unknown>,
  }))

  const { error } = await supabase
    .from('consultant_insights')
    .insert(inserts)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, count: inserts.length }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getInsightsForPortal(
  portalId: string
): Promise<ConsultantInsight[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('consultant_insights')
    .select('*')
    .eq('consultant_portal_id', portalId)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data as ConsultantInsight[]
}

// ─── Admin: insights grouped by source file ───────────────────────────────────

export interface InsightFileGroup {
  source_file: string
  count: number
  uploaded_at: string
}

export async function getInsightFileGroupsForPortal(
  portalId: string
): Promise<InsightFileGroup[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('consultant_insights')
    .select('source_file, created_at')
    .eq('consultant_portal_id', portalId)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  // Group by source_file — track first upload time and count
  const map = new Map<string, { count: number; uploaded_at: string }>()
  for (const row of data) {
    const existing = map.get(row.source_file)
    if (existing) {
      existing.count++
    } else {
      map.set(row.source_file, { count: 1, uploaded_at: row.created_at })
    }
  }

  return Array.from(map.entries()).map(([source_file, { count, uploaded_at }]) => ({
    source_file,
    count,
    uploaded_at,
  }))
}
