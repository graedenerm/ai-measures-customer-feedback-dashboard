'use server'

import { createClient } from '@/lib/supabase/server'
import type {
  ConsultantInsight,
  InsightsCatalog,
  InsertInsightsCatalog,
  InsertConsultantInsight,
} from '@/lib/consultant-types'

type AnyInsightJson = Record<string, unknown>

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadConsultantInsightsResult {
  success: boolean
  count?: number    // total insights in file
  added?: number    // newly assigned to this portal
  skipped?: number  // already assigned to this portal (duplicate)
  error?: string
}

/**
 * Upload insights JSON for a consultant portal.
 *
 * For each insight:
 *  1. Upsert into insights_catalog (deduplicates by original_insight_id)
 *  2. Check if already assigned to this portal → skip if so
 *  3. Insert junction row into consultant_insights
 *
 * Compatible with both the old camelCase format and the new flat snake_case format.
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
  let added = 0
  let skipped = 0

  for (const raw of rawInsights) {
    const originalInsightId =
      (raw.insight_id as string | undefined) ?? (raw.id as string | undefined) ?? null
    const originalLocationId =
      (raw.location_id as number | undefined) ?? (raw.locationId as number | undefined) ?? null
    const title   = (raw.title as string | undefined) ?? ''
    const description = (raw.description as string | undefined) ?? null

    const catalogPayload: InsertInsightsCatalog = {
      original_insight_id:  originalInsightId,
      company_id:           companyId ?? null,
      original_location_id: originalLocationId,
      source_file:          sourceFile,
      insight_title:        title,
      insight_description:  description,
      insight_raw:          raw,
    }

    // ── Step 1: upsert into insights_catalog ──────────────────────────────────
    // If original_insight_id is present, upsert deduplicates on it.
    // If null, always insert a new row (no dedup possible without an ID).

    let catalogId: string

    if (originalInsightId) {
      const { data, error } = await supabase
        .from('insights_catalog')
        .upsert(catalogPayload, { onConflict: 'original_insight_id' })
        .select('id')
        .single()

      if (error || !data) {
        return { success: false, error: `Katalog-Fehler: ${error?.message}` }
      }
      catalogId = data.id
    } else {
      const { data, error } = await supabase
        .from('insights_catalog')
        .insert(catalogPayload)
        .select('id')
        .single()

      if (error || !data) {
        return { success: false, error: `Katalog-Fehler: ${error?.message}` }
      }
      catalogId = data.id
    }

    // ── Step 2: check if already assigned to this portal ─────────────────────
    const { data: existing } = await supabase
      .from('consultant_insights')
      .select('id')
      .eq('consultant_portal_id', portalId)
      .eq('insight_catalog_id', catalogId)
      .maybeSingle()

    if (existing) {
      skipped++
      continue
    }

    // ── Step 3: create junction row ───────────────────────────────────────────
    const junctionPayload: InsertConsultantInsight = {
      consultant_portal_id: portalId,
      insight_catalog_id:   catalogId,
    }

    const { error: junctionError } = await supabase
      .from('consultant_insights')
      .insert(junctionPayload)

    if (junctionError) {
      return { success: false, error: `Zuordnungs-Fehler: ${junctionError.message}` }
    }

    added++
  }

  return { success: true, count: rawInsights.length, added, skipped }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns all insights assigned to a portal.
 * Joins insights_catalog and flattens into the ConsultantInsight shape
 * so all existing UI components work without changes.
 */
export async function getInsightsForPortal(
  portalId: string
): Promise<ConsultantInsight[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('consultant_insights')
    .select(`
      id,
      consultant_portal_id,
      insight_catalog_id,
      created_at,
      insights_catalog (
        original_insight_id,
        original_location_id,
        company_id,
        source_file,
        insight_title,
        insight_description,
        insight_raw,
        companies (
          industry
        )
      )
    `)
    .eq('consultant_portal_id', portalId)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  const insights = data.map((row) => {
    const ic = row.insights_catalog as unknown as (InsightsCatalog & { companies: { industry: string | null } | null }) | null
    return {
      id:                   row.id,
      consultant_portal_id: row.consultant_portal_id,
      insight_catalog_id:   row.insight_catalog_id,
      created_at:           row.created_at,
      original_insight_id:  ic?.original_insight_id  ?? null,
      original_location_id: ic?.original_location_id ?? null,
      company_id:           ic?.company_id            ?? null,
      source_file:          ic?.source_file           ?? '',
      insight_title:        ic?.insight_title         ?? '',
      insight_description:  ic?.insight_description   ?? null,
      insight_raw:          ic?.insight_raw            ?? null,
      industry:             ic?.companies?.industry   ?? null,
    } satisfies ConsultantInsight
  })

  for (let i = insights.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [insights[i], insights[j]] = [insights[j], insights[i]]
  }

  return insights
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
    .select('created_at, insights_catalog(source_file)')
    .eq('consultant_portal_id', portalId)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  const map = new Map<string, { count: number; uploaded_at: string }>()
  for (const row of data) {
    const sourceFile =
      (row.insights_catalog as unknown as { source_file: string } | null)?.source_file ?? 'Unbekannt'
    const existing = map.get(sourceFile)
    if (existing) {
      existing.count++
    } else {
      map.set(sourceFile, { count: 1, uploaded_at: row.created_at })
    }
  }

  return Array.from(map.entries()).map(([source_file, { count, uploaded_at }]) => ({
    source_file,
    count,
    uploaded_at,
  }))
}
