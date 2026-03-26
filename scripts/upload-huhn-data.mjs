/**
 * One-time upload script: inserts Heinrich Huhn data into Supabase.
 * Run: node scripts/upload-huhn-data.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://xaguubezlvbsvooxbvat.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_XLphKgdn9MohYVH5FKD7EQ_Rh21oOmM'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── Config ────────────────────────────────────────────────────────────────────
const COMPANY_NAME = 'Heinrich Huhn Deutschland GmbH'
const INDUSTRY = 'Automobilzulieferer / Metallverarbeitung'
const VERSION = '1.0'
const RUN_DATE = '2026-03-23'
const NOTES = 'Erstbewertung – Standort Drolshagen (23.03.2026)'

const INSIGHTS_FILE = join(__dirname, '../Huhn 23.03/statistical_insights (3).json')
const MEASURES_FILE = join(__dirname, '../Huhn 23.03/measures_output (5).json')

// ── Retry helper ─────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function withRetry(fn, retries = 5, delayMs = 1500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const result = await fn()
    const { error } = result
    if (!error) return result
    const isNetwork = error.message?.includes('fetch failed') || error.message?.includes('ECONNRESET') || error.message?.includes('timeout')
    if (!isNetwork || attempt === retries) return result
    console.log(`    Retry ${attempt}/${retries} after network error…`)
    await sleep(delayMs * attempt)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractLocations(insights) {
  const seen = new Map()
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

function parseInsights(rawInsights, runId, locationMap) {
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
      raw_json: raw,
    }
  })
}

function parseMeasures(rawMeasures, runId, locationMap, insightMap, locations) {
  return rawMeasures.map((raw) => {
    const iid = raw.insightId ?? `orphan_loc_${raw.locationId}`
    const dbInsightId = insightMap.get(iid) ?? ''
    const locationId = raw.locationId
    const dbLocationId = locationMap.get(locationId) ?? locations[0]?.id ?? ''
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
      raw_json: raw,
    }
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Reading JSON files…')
  const rawInsights = JSON.parse(readFileSync(INSIGHTS_FILE, 'utf8'))
  const rawMeasures = JSON.parse(readFileSync(MEASURES_FILE, 'utf8'))
  console.log(`  Insights: ${rawInsights.length}, Measures: ${rawMeasures.length}`)

  // 1. Upsert company
  console.log('\nUpserting company…')
  const { data: companyData, error: companyError } = await withRetry(() =>
    supabase.from('companies')
      .upsert({ name: COMPANY_NAME, industry: INDUSTRY }, { onConflict: 'name', ignoreDuplicates: false })
      .select('id, name')
      .single()
  )

  if (companyError || !companyData) {
    console.error('Company upsert failed:', companyError)
    process.exit(1)
  }
  const companyId = companyData.id
  console.log(`  Company ID: ${companyId} (${companyData.name})`)
  await sleep(500)

  // 2. Extract & upsert locations
  console.log('\nUpserting locations…')
  const extractedLocations = extractLocations(rawInsights)
  const locationMap = new Map()

  for (const loc of extractedLocations) {
    const { data: locData, error: locError } = await withRetry(() =>
      supabase.from('locations')
        .upsert(
          { company_id: companyId, original_location_id: loc.original_location_id, title: loc.title, street_name: loc.street_name, street_number: loc.street_number },
          { onConflict: 'company_id,original_location_id', ignoreDuplicates: false }
        )
        .select('id, original_location_id')
        .single()
    )

    if (locError || !locData) {
      console.error('Location upsert failed:', locError)
      process.exit(1)
    }
    locationMap.set(locData.original_location_id, locData.id)
    console.log(`  Location ${locData.original_location_id}: ${loc.title}`)
    await sleep(300)
  }

  // Also upsert any measure-only locations
  for (const m of rawMeasures) {
    if (m.locationId != null && !locationMap.has(m.locationId)) {
      const { data: locData } = await withRetry(() =>
        supabase.from('locations')
          .upsert(
            { company_id: companyId, original_location_id: m.locationId, title: `Location ${m.locationId}`, street_name: null, street_number: null },
            { onConflict: 'company_id,original_location_id', ignoreDuplicates: false }
          )
          .select('id, original_location_id')
          .single()
      )
      if (locData) locationMap.set(locData.original_location_id, locData.id)
    }
  }

  // 3. Insert pipeline run
  console.log('\nInserting pipeline run…')
  await sleep(500)
  const { data: runData, error: runError } = await withRetry(() =>
    supabase.from('pipeline_runs')
      .insert({ company_id: companyId, version: VERSION, run_date: RUN_DATE, notes: NOTES })
      .select('id')
      .single()
  )

  if (runError || !runData) {
    console.error('Run insert failed:', runError)
    process.exit(1)
  }
  const runId = runData.id
  console.log(`  Run ID: ${runId}`)
  await sleep(500)

  // 4. Insert insights
  console.log('\nInserting insights…')
  const insightInserts = parseInsights(rawInsights, runId, locationMap)
  const { data: insertedInsights, error: insightError } = await withRetry(() =>
    supabase.from('insights').insert(insightInserts).select('id, original_id')
  )

  if (insightError) {
    console.error('Insights insert failed:', insightError)
    process.exit(1)
  }

  const insightMap = new Map()
  for (const ins of insertedInsights ?? []) {
    insightMap.set(ins.original_id, ins.id)
  }
  console.log(`  Inserted ${insertedInsights?.length ?? 0} insights`)
  await sleep(500)

  // 5. Insert measures
  console.log('\nInserting measures…')
  const { data: allLocations } = await withRetry(() =>
    supabase.from('locations').select('*').eq('company_id', companyId)
  )
  const measureInserts = parseMeasures(rawMeasures, runId, locationMap, insightMap, allLocations ?? [])

  const { error: measureError } = await withRetry(() =>
    supabase.from('measures').insert(measureInserts)
  )
  if (measureError) {
    console.error('Measures insert failed:', measureError)
    process.exit(1)
  }
  console.log(`  Inserted ${measureInserts.length} measures`)

  console.log(`\n✓ Upload complete!`)
  console.log(`  Company ID : ${companyId}`)
  console.log(`  Run ID     : ${runId}`)
  console.log(`  View at    : /companies/${companyId}`)
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
