import type {
  RawInsightJson,
  RawMeasureJson,
  InsertInsight,
  InsertMeasure,
  Location,
} from '@/lib/types'

// ============================================================
// Field access helpers
// ============================================================
// Pipeline JSON has gone through multiple schema revisions. Accept both the
// legacy camelCase layout (with nested context.location) and the newer flat
// snake_case layout. These helpers read whichever key is present.

function readNum(raw: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = raw[k]
    if (typeof v === 'number') return v
  }
  return null
}

function readStr(raw: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = raw[k]
    if (typeof v === 'string') return v
  }
  return null
}

// ============================================================
// Location extraction
// ============================================================

export interface ExtractedLocation {
  original_location_id: number
  title: string
  street_name: string | null
  street_number: string | null
}

/**
 * Extract unique locations from a list of raw insights.
 * Deduplication is by original_location_id.
 * Supports: nested context.location (old), flat locationId (old), flat location_id (new).
 */
export function extractLocations(
  insights: RawInsightJson[]
): ExtractedLocation[] {
  const seen = new Map<number, ExtractedLocation>()

  for (const insight of insights) {
    const raw = insight as unknown as Record<string, unknown>
    const loc = (raw.context as { location?: { id: number; title?: string; streetName?: string; streetNumber?: string } } | undefined)?.location

    const locationId =
      loc?.id ??
      (readNum(raw, 'locationId', 'location_id') as number | null)

    if (locationId === null || locationId === undefined) continue
    if (seen.has(locationId)) continue

    seen.set(locationId, {
      original_location_id: locationId,
      title: loc?.title ?? `Location ${locationId}`,
      street_name: loc?.streetName ?? null,
      street_number: loc?.streetNumber ?? null,
    })
  }

  return Array.from(seen.values())
}

// ============================================================
// Insight parsing
// ============================================================

export function parseInsights(
  rawInsights: RawInsightJson[],
  runId: string,
  locationMap: Map<number, string> // original_location_id → db uuid
): InsertInsight[] {
  return rawInsights.map((raw) => {
    const r = raw as unknown as Record<string, unknown>
    const contextLoc = (r.context as { location?: { id: number } } | undefined)?.location
    const locationId =
      contextLoc?.id ??
      (readNum(r, 'locationId', 'location_id') as number | null) ??
      0
    const dbLocationId = locationMap.get(locationId) ?? ''

    const originalId = readStr(r, 'id', 'insight_id') ?? ''
    const type       = readStr(r, 'type', 'finding_type') ?? ''

    return {
      run_id: runId,
      location_id: dbLocationId,
      original_id: originalId,
      type,
      priority_score:       readNum(r, 'priorityScore',       'priority_score'),
      savings_kwh_per_year: readNum(r, 'savingsKwhPerYear',   'savings_kwh_per_year', 'savings_kwh'),
      savings_eur_per_year: readNum(r, 'savingsEurPerYear',   'savings_eur_per_year', 'savings_eur'),
      confidence:           readNum(r, 'confidence'),
      title:                readStr(r, 'title') ?? '',
      description:          readStr(r, 'description'),
      raw_json: r,
    }
  })
}

// ============================================================
// Measure parsing
// ============================================================

export function parseMeasures(
  rawMeasures: RawMeasureJson[],
  runId: string,
  locationMap: Map<number, string>, // original_location_id → db uuid
  insightMap: Map<string, string>, // original_id → db uuid
  locations: Location[]
): InsertMeasure[] {
  return rawMeasures.map((raw) => {
    const r = raw as unknown as Record<string, unknown>
    const locationId = readNum(r, 'locationId', 'location_id') ?? 0
    const dbLocationId =
      locationMap.get(locationId) ?? locations[0]?.id ?? ''

    const insightIdFromRaw = readStr(r, 'insightId', 'insight_id')
    const iid = insightIdFromRaw ?? `orphan_loc_${locationId}`
    const dbInsightId = insightMap.get(iid) ?? ''

    return {
      run_id: runId,
      insight_id: dbInsightId,
      location_id: dbLocationId,
      original_insight_id: iid,
      title:             readStr(r, 'title') ?? '',
      short_description: readStr(r, 'shortDescription', 'short_description'),
      description:       readStr(r, 'description'),
      yearly_savings_eur_from: readNum(r, 'yearlySavingsRangeFrom',       'yearly_savings_range_from'),
      yearly_savings_eur_to:   readNum(r, 'yearlySavingsRangeTo',         'yearly_savings_range_to'),
      yearly_savings_kwh_from: readNum(r, 'yearlySavingsEnergyRangeFrom', 'yearly_savings_energy_range_from'),
      yearly_savings_kwh_to:   readNum(r, 'yearlySavingsEnergyRangeTo',   'yearly_savings_energy_range_to'),
      investment_from:         readNum(r, 'investmentRangeFrom',          'investment_range_from'),
      investment_to:           readNum(r, 'investmentRangeTo',            'investment_range_to'),
      amortisation_months:     readNum(r, 'amortisationPeriodInMonths',   'amortisation_period_in_months'),
      confidence:              readNum(r, 'confidence'),
      effort_level:            readStr(r, 'effortLevel',                  'effort_level'),
      investment_type:         readStr(r, 'investmentType',               'investment_type'),
      category:                readStr(r, 'category'),
      raw_json: r,
    }
  })
}
