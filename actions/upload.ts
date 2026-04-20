'use server'

import { createClient } from '@/lib/supabase/server'
import {
  extractLocations,
  parseInsights,
  parseMeasures,
} from '@/lib/parse-pipeline-output'
import type { RawInsightJson, RawMeasureJson } from '@/lib/types'

export interface UploadFormData {
  companyName: string
  industry: string
  version: string
  runDate: string
  notes: string
  insightsJson: string
  measuresJson: string
}

export interface UploadResult {
  success: boolean
  runId?: string
  error?: string
}

export async function uploadPipelineRun(
  formData: UploadFormData
): Promise<UploadResult> {
  try {
    const supabase = await createClient()

    // 1. Parse JSON strings
    // Accept a bare array or { insights: [...] } / { measures: [...] } wrappers
    function unwrap<T>(parsed: unknown, key: string): T[] {
      if (Array.isArray(parsed)) return parsed as T[]
      if (parsed && typeof parsed === 'object') {
        const inner = (parsed as Record<string, unknown>)[key]
        if (Array.isArray(inner)) return inner as T[]
      }
      return []
    }

    let rawInsights: RawInsightJson[] = []
    let rawMeasures: RawMeasureJson[] = []

    try {
      rawInsights = unwrap<RawInsightJson>(JSON.parse(formData.insightsJson || '[]'), 'insights')
    } catch {
      return { success: false, error: 'Invalid Insights JSON format.' }
    }

    try {
      rawMeasures = unwrap<RawMeasureJson>(JSON.parse(formData.measuresJson || '[]'), 'measures')
    } catch {
      return { success: false, error: 'Invalid Measures JSON format.' }
    }

    // 2. Upsert company by name
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .upsert(
        {
          name: formData.companyName.trim(),
          industry: formData.industry.trim() || null,
        },
        { onConflict: 'name', ignoreDuplicates: false }
      )
      .select('id, name, industry, created_at')
      .single()

    if (companyError || !companyData) {
      return {
        success: false,
        error: `Failed to upsert company: ${companyError?.message ?? 'Unknown error'}`,
      }
    }

    const companyId = companyData.id

    // 3. Extract unique locations from insights
    const extractedLocations = extractLocations(rawInsights)

    // Build locationMap: original_location_id → db uuid
    const locationMap = new Map<number, string>()

    if (extractedLocations.length > 0) {
      for (const loc of extractedLocations) {
        const { data: locData, error: locError } = await supabase
          .from('locations')
          .upsert(
            {
              company_id: companyId,
              original_location_id: loc.original_location_id,
              title: loc.title,
              street_name: loc.street_name,
              street_number: loc.street_number,
            },
            {
              onConflict: 'company_id,original_location_id',
              ignoreDuplicates: false,
            }
          )
          .select('id, original_location_id')
          .single()

        if (locError || !locData) {
          return {
            success: false,
            error: `Failed to upsert location ${loc.title}: ${locError?.message ?? 'Unknown error'}`,
          }
        }

        locationMap.set(loc.original_location_id, locData.id)
      }
    }

    // 3b. Upsert locations referenced by measures but not covered by insights
    if (rawMeasures.length > 0) {
      const seenMeasureLocIds = new Set<number>()
      for (const m of rawMeasures) {
        const mr = m as unknown as Record<string, unknown>
        const locId =
          (typeof mr.locationId  === 'number' ? mr.locationId  : undefined) ??
          (typeof mr.location_id === 'number' ? mr.location_id : undefined) ??
          null
        if (locId != null && !locationMap.has(locId) && !seenMeasureLocIds.has(locId)) {
          seenMeasureLocIds.add(locId)
          const { data: locData, error: locError } = await supabase
            .from('locations')
            .upsert(
              {
                company_id: companyId,
                original_location_id: locId,
                title: `Location ${locId}`,
                street_name: null,
                street_number: null,
              },
              { onConflict: 'company_id,original_location_id', ignoreDuplicates: false }
            )
            .select('id, original_location_id')
            .single()

          if (locError || !locData) {
            return {
              success: false,
              error: `Failed to upsert measure location ${locId}: ${locError?.message ?? 'Unknown error'}`,
            }
          }
          locationMap.set(locId, locData.id)
        }
      }
    }

    // 4. Insert pipeline run
    const { data: runData, error: runError } = await supabase
      .from('pipeline_runs')
      .insert({
        company_id: companyId,
        version: formData.version.trim(),
        run_date: formData.runDate,
        notes: formData.notes.trim() || null,
      })
      .select('id')
      .single()

    if (runError || !runData) {
      return {
        success: false,
        error: `Failed to insert run: ${runError?.message ?? 'Unknown error'}`,
      }
    }

    const runId = runData.id

    // 5. Insert insights and build original_id → db UUID map
    const insightMap = new Map<string, string>()

    if (rawInsights.length > 0) {
      const insightInserts = parseInsights(rawInsights, runId, locationMap)

      const { data: insertedInsights, error: insightError } = await supabase
        .from('insights')
        .insert(insightInserts)
        .select('id, original_id')

      if (insightError) {
        return {
          success: false,
          error: `Failed to insert insights: ${insightError.message}`,
        }
      }

      for (const ins of insertedInsights ?? []) {
        insightMap.set(ins.original_id, ins.id)
      }
    }

    // 5b. Create placeholder insights for measures referencing unknown insightIds
    if (rawMeasures.length > 0) {
      function measureIid(m: RawMeasureJson): string {
        const mr = m as unknown as Record<string, unknown>
        const insightId = (typeof mr.insightId  === 'string' ? mr.insightId  : undefined)
                      ?? (typeof mr.insight_id === 'string' ? mr.insight_id : undefined)
        const locId     = (typeof mr.locationId  === 'number' ? mr.locationId  : undefined)
                      ?? (typeof mr.location_id === 'number' ? mr.location_id : undefined)
        return insightId ?? `orphan_loc_${locId ?? 'unknown'}`
      }

      const missingInsightIds = new Set<string>()
      for (const m of rawMeasures) {
        const iid = measureIid(m)
        if (!insightMap.has(iid)) missingInsightIds.add(iid)
      }

      for (const origInsightId of missingInsightIds) {
        const firstMeasure = rawMeasures.find((m) => measureIid(m) === origInsightId)
        const fmr = firstMeasure as unknown as Record<string, unknown> | undefined
        const locId = fmr
          ? (typeof fmr.locationId  === 'number' ? fmr.locationId  : undefined)
            ?? (typeof fmr.location_id === 'number' ? fmr.location_id : undefined)
            ?? null
          : null
        const dbLocationId = locId != null ? (locationMap.get(locId) ?? '') : ''

        const { data: phData, error: phError } = await supabase
          .from('insights')
          .insert({
            run_id: runId,
            location_id: dbLocationId,
            original_id: origInsightId,
            type: 'placeholder',
            title: `Placeholder (${origInsightId})`,
            raw_json: {},
          })
          .select('id, original_id')
          .single()

        if (phError || !phData) {
          return {
            success: false,
            error: `Failed to insert placeholder insight ${origInsightId}: ${phError?.message ?? 'Unknown error'}`,
          }
        }
        insightMap.set(origInsightId, phData.id)
      }
    }

    // Fetch all locations for this company to help resolve measure location_ids
    const { data: allLocations } = await supabase
      .from('locations')
      .select('*')
      .eq('company_id', companyId)

    const locations = allLocations ?? []

    // 6. Insert measures
    if (rawMeasures.length > 0) {
      const measureInserts = parseMeasures(
        rawMeasures,
        runId,
        locationMap,
        insightMap,
        locations
      )

      const { error: measureError } = await supabase
        .from('measures')
        .insert(measureInserts)

      if (measureError) {
        return {
          success: false,
          error: `Failed to insert measures: ${measureError.message}`,
        }
      }
    }

    return { success: true, runId }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return { success: false, error: message }
  }
}
