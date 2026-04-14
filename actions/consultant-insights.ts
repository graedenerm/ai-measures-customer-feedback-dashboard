'use server'

import { createClient } from '@/lib/supabase/server'
import type { ConsultantInsight, InsertConsultantInsight } from '@/lib/consultant-types'
// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadConsultantInsightsResult {
  success: boolean
  count?: number
  error?: string
}

// Accepts both the old camelCase format and the new flat snake_case format.
type AnyInsightJson = Record<string, unknown>

/**
 * Parse a raw insights JSON string and insert each insight into consultant_insights.
 * Compatible with the old camelCase pipeline format and the new flat snake_case format.
 */
export async function uploadConsultantInsights(
  portalId: string,
  sourceFile: string,
  insightsJson: string,
  companyId?: string | null
): Promise<UploadConsultantInsightsResult> {
  let rawInsights: AnyInsightJson[]

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
    // new format uses insight_id; old format uses id
    original_insight_id: (raw.insight_id as string | undefined) ?? (raw.id as string | undefined) ?? null,
    // new format uses location_id (snake_case); old format uses locationId (camelCase)
    original_location_id: (raw.location_id as number | undefined) ?? (raw.locationId as number | undefined) ?? null,
    company_id: companyId ?? null,
    insight_title: (raw.title as string) ?? '',
    insight_description: (raw.description as string | undefined) ?? null,
    insight_raw: raw,
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
