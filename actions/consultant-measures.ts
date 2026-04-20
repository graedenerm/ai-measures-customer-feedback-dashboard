'use server'

import { createClient } from '@/lib/supabase/server'
import type {
  ConsultantMeasure,
  MeasuresCatalog,
  InsertMeasuresCatalog,
  InsertConsultantMeasure,
} from '@/lib/consultant-types'

type AnyMeasureJson = Record<string, unknown>

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadConsultantMeasuresResult {
  success: boolean
  count?: number    // total measures in file
  added?: number    // newly assigned to this portal
  skipped?: number  // already assigned to this portal (duplicate)
  error?: string
}

/**
 * Upload measures JSON for a consultant portal.
 *
 * For each measure:
 *  1. Insert a row into measures_catalog (measures have no unique pipeline id,
 *     so we don't upsert — each upload gets fresh catalog rows).
 *  2. Dedup per portal by (source_file + measure_title + original_insight_id):
 *     if an equivalent measure is already assigned to this portal, skip.
 *  3. Insert junction row into consultant_measures.
 *
 * Compatible with both camelCase and snake_case field names.
 */
export async function uploadConsultantMeasures(
  portalId: string,
  sourceFile: string,
  measuresJson: string,
  companyId?: string | null
): Promise<UploadConsultantMeasuresResult> {
  let rawMeasures: AnyMeasureJson[]

  try {
    const parsed = JSON.parse(measuresJson)
    // Accept either a bare array (old format) or { measures: [...] } (new format)
    if (Array.isArray(parsed)) {
      rawMeasures = parsed
    } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { measures?: unknown }).measures)) {
      rawMeasures = (parsed as { measures: AnyMeasureJson[] }).measures
    } else {
      rawMeasures = []
    }
  } catch {
    return { success: false, error: 'Ungültiges JSON-Format.' }
  }

  if (rawMeasures.length === 0) {
    return { success: false, error: 'Keine Maßnahmen in der Datei gefunden.' }
  }

  const supabase = await createClient()
  let added = 0
  let skipped = 0

  // Preload existing assignments (title + insightId pairs) for this portal so we
  // can dedup without one round-trip per row.
  const { data: existingJunctions } = await supabase
    .from('consultant_measures')
    .select('measures_catalog(measure_title, original_insight_id, source_file)')
    .eq('consultant_portal_id', portalId)

  const existingKeys = new Set<string>()
  for (const row of existingJunctions ?? []) {
    const mc = row.measures_catalog as unknown as {
      measure_title: string
      original_insight_id: string | null
      source_file: string
    } | null
    if (mc) existingKeys.add(`${mc.source_file}|${mc.original_insight_id ?? ''}|${mc.measure_title}`)
  }

  for (const raw of rawMeasures) {
    const originalInsightId =
      (raw.insight_id as string | undefined) ??
      (raw.insightId as string | undefined) ?? null
    const originalLocationId =
      (raw.location_id as number | undefined) ??
      (raw.locationId as number | undefined) ?? null
    const title            = (raw.title as string | undefined) ?? ''
    const shortDescription = (raw.short_description as string | undefined) ??
                             (raw.shortDescription as string | undefined) ?? null
    const description      = (raw.description as string | undefined) ?? null

    const dedupKey = `${sourceFile}|${originalInsightId ?? ''}|${title}`
    if (existingKeys.has(dedupKey)) {
      skipped++
      continue
    }

    const catalogPayload: InsertMeasuresCatalog = {
      original_insight_id:       originalInsightId,
      company_id:                companyId ?? null,
      original_location_id:      originalLocationId,
      source_file:               sourceFile,
      measure_title:             title,
      measure_short_description: shortDescription,
      measure_description:       description,
      measure_raw:               raw,
    }

    const { data: catalogRow, error: catalogError } = await supabase
      .from('measures_catalog')
      .insert(catalogPayload)
      .select('id')
      .single()

    if (catalogError || !catalogRow) {
      return { success: false, error: `Katalog-Fehler: ${catalogError?.message}` }
    }

    const junctionPayload: InsertConsultantMeasure = {
      consultant_portal_id: portalId,
      measure_catalog_id:   catalogRow.id,
    }

    const { error: junctionError } = await supabase
      .from('consultant_measures')
      .insert(junctionPayload)

    if (junctionError) {
      return { success: false, error: `Zuordnungs-Fehler: ${junctionError.message}` }
    }

    existingKeys.add(dedupKey)
    added++
  }

  return { success: true, count: rawMeasures.length, added, skipped }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getMeasuresForPortal(
  portalId: string
): Promise<ConsultantMeasure[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('consultant_measures')
    .select(`
      id,
      consultant_portal_id,
      measure_catalog_id,
      created_at,
      measures_catalog (
        original_insight_id,
        original_location_id,
        company_id,
        source_file,
        measure_title,
        measure_short_description,
        measure_description,
        measure_raw,
        companies (
          industry
        )
      )
    `)
    .eq('consultant_portal_id', portalId)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  const measures = data.map((row) => {
    const mc = row.measures_catalog as unknown as
      (MeasuresCatalog & { companies: { industry: string | null } | null }) | null
    return {
      id:                        row.id,
      consultant_portal_id:      row.consultant_portal_id,
      measure_catalog_id:        row.measure_catalog_id,
      created_at:                row.created_at,
      original_insight_id:       mc?.original_insight_id       ?? null,
      original_location_id:      mc?.original_location_id      ?? null,
      company_id:                mc?.company_id                ?? null,
      source_file:               mc?.source_file               ?? '',
      measure_title:             mc?.measure_title             ?? '',
      measure_short_description: mc?.measure_short_description ?? null,
      measure_description:       mc?.measure_description       ?? null,
      measure_raw:               mc?.measure_raw               ?? null,
      industry:                  mc?.companies?.industry       ?? null,
    } satisfies ConsultantMeasure
  })

  // Randomize order to avoid evaluator bias from file ordering
  for (let i = measures.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [measures[i], measures[j]] = [measures[j], measures[i]]
  }

  return measures
}
