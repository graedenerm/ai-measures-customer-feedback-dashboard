import type {
  RawInsightJson,
  RawMeasureJson,
  InsertInsight,
  InsertMeasure,
  Location,
} from '@/lib/types'

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
 */
export function extractLocations(
  insights: RawInsightJson[]
): ExtractedLocation[] {
  const seen = new Map<number, ExtractedLocation>()

  for (const insight of insights) {
    const loc = insight.context?.location
    const locationId = loc?.id ?? insight.locationId

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
    const locationId = raw.context?.location?.id ?? raw.locationId
    const dbLocationId = locationMap.get(locationId) ?? ''

    return {
      run_id: runId,
      location_id: dbLocationId,
      original_id: raw.id,
      type: raw.type,
      priority_score: raw.priorityScore ?? null,
      savings_kwh_per_year: raw.savingsKwhPerYear ?? null,
      savings_eur_per_year: raw.savingsEurPerYear ?? null,
      confidence: raw.confidence ?? null,
      title: raw.title,
      description: raw.description ?? null,
      raw_json: raw as unknown as Record<string, unknown>,
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
    const iid = raw.insightId ?? `orphan_loc_${raw.locationId}`
    const dbInsightId = insightMap.get(iid) ?? ''

    // Find location by locationId; fall back to first location
    const locationId = raw.locationId
    const dbLocationId =
      locationMap.get(locationId) ?? locations[0]?.id ?? ''

    return {
      run_id: runId,
      insight_id: dbInsightId,
      location_id: dbLocationId,
      original_insight_id: iid,
      title: raw.title,
      short_description: raw.shortDescription ?? null,
      description: raw.description ?? null,
      yearly_savings_eur_from: raw.yearlySavingsRangeFrom ?? null,
      yearly_savings_eur_to: raw.yearlySavingsRangeTo ?? null,
      yearly_savings_kwh_from: raw.yearlySavingsEnergyRangeFrom ?? null,
      yearly_savings_kwh_to: raw.yearlySavingsEnergyRangeTo ?? null,
      investment_from: raw.investmentRangeFrom ?? null,
      investment_to: raw.investmentRangeTo ?? null,
      amortisation_months: raw.amortisationPeriodInMonths ?? null,
      confidence: raw.confidence ?? null,
      effort_level: raw.effortLevel ?? null,
      investment_type: raw.investmentType ?? null,
      category: raw.category ?? null,
      raw_json: raw as unknown as Record<string, unknown>,
    }
  })
}
