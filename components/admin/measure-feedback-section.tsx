'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChevronDown, ChevronUp, MessageSquare, BarChart3,
  Euro, Zap, Target, Factory, Wrench, Clock, Shield,
  Lightbulb, CheckCircle2, Users, Activity,
} from 'lucide-react'
import { getMeasuresForPortal } from '@/actions/consultant-measures'
import { getMeasureEvaluationsForPortal } from '@/actions/consultant-measure-evaluations'
import type { ConsultantMeasure, ConsultantMeasureEvaluation } from '@/lib/consultant-types'

// ── Helpers (duplicated from consultant-feedback-client for self-containment) ─

const INDUSTRY_DE: Record<string, string> = {
  'Manufacture of basic metals': 'Metallerzeugung',
  'Manufacture of basic pharmaceutical products and pharmaceutical preparations': 'Pharmazeutische Erzeugnisse',
  'Manufacture of beverages': 'Getränkeherstellung',
  'Manufacture of chemicals and chemical products': 'Chemische Erzeugnisse',
  'Manufacture of computer, electronic and optical products': 'Elektronik & Optik',
  'Manufacture of electrical equipment': 'Elektrische Ausrüstungen',
  'Manufacture of fabricated metal products, except machinery and equipment': 'Metallerzeugnisse',
  'Manufacture of food products': 'Nahrungsmittel',
  'Manufacture of furniture': 'Möbelherstellung',
  'Manufacture of leather and related products': 'Leder & Lederwaren',
  'Manufacture of machinery and equipment n.e.c.': 'Maschinenbau',
  'Manufacture of motor vehicles, trailers and semi-trailers': 'Fahrzeugbau',
  'Manufacture of other non-metallic mineral products': 'Mineralerzeugnisse',
  'Manufacture of paper and paper products': 'Papier & Pappe',
  'Manufacture of rubber and plastic products': 'Gummi- & Kunststoffwaren',
  'Manufacture of wood and of products of wood and cork, except furniture; manufacture of articles of straw and plaiting materials': 'Holzwaren',
  'MANUFACTURING_INDUSTRY': 'Verarbeitendes Gewerbe',
  'HOSPITALITY': 'Gastgewerbe',
  'HEALTHCARE': 'Gesundheitswesen',
  'TRANSPORTATION_AND_STORAGE': 'Transport & Lagerei',
  'FOOD_TRADE': 'Lebensmittelhandel',
  'FOOD_PRODUCTION': 'Lebensmittelproduktion',
  'REAL_ESTATE_AND_HOUSING': 'Immobilienwirtschaft',
  'CONSTRUCTION': 'Baugewerbe',
  'TRADE_MOTOR_VEHICLES': 'Kfz-Handel & -Reparatur',
  'MINING': 'Bergbau',
  'TECHNOLOGY': 'Technologie',
}

function formatEur(v: number | null): string {
  if (v === null) return '—'
  return v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function formatKwh(v: number | null): string {
  if (v === null) return '—'
  return v.toLocaleString('de-DE') + ' kWh'
}

function formatMonths(v: number | null): string {
  if (v === null) return '—'
  if (v < 12) return `${v} Monate`
  const years = (v / 12).toFixed(1)
  return `${years} Jahre`
}

function avgScore(values: (number | null)[]): string {
  const nums = values.filter((v): v is number => v !== null)
  if (nums.length === 0) return '—'
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1)
}

function scoreColor(avg: string): string {
  const n = parseFloat(avg)
  if (isNaN(n)) return '#9ca3af'
  if (n >= 4) return '#059669'
  if (n >= 3) return '#b45309'
  return '#dc2626'
}

function effortStyle(level: string | null | undefined) {
  switch (level) {
    case 'LOW':    return { label: 'Gering', bg: 'rgba(5,150,105,0.08)', text: '#059669' }
    case 'MEDIUM': return { label: 'Mittel', bg: 'rgba(234,179,8,0.08)', text: '#b45309' }
    case 'HIGH':   return { label: 'Hoch',   bg: 'rgba(220,38,38,0.08)', text: '#dc2626' }
    default:       return null
  }
}

function categoryLabel(c: string | null | undefined): string | null {
  switch (c) {
    case 'HEATING':          return 'Wärme'
    case 'PRESSURIZED_AIR':  return 'Druckluft'
    case 'OTHER':            return 'Sonstiges'
    default:                 return null
  }
}

function rawNum(raw: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = raw[k]
    if (typeof v === 'number') return v
  }
  return null
}

function rawStr(raw: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = raw[k]
    if (typeof v === 'string') return v
  }
  return null
}

type SortKey =
  | 'index' | 'date'
  | 'verstaendlichkeit' | 'plausibilitaet'
  | 'wirtschaftlichkeit' | 'umsetzbarkeit' | 'gesamteindruck'

// ── Component ───────────────────────────────────────────────────────────────

interface Props {
  portalId: string
}

export function MeasureFeedbackSection({ portalId }: Props) {
  const [measures, setMeasures] = useState<ConsultantMeasure[]>([])
  const [evaluations, setEvaluations] = useState<ConsultantMeasureEvaluation[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('index')
  const [sortAsc, setSortAsc] = useState(true)

  const load = useCallback(async (id: string) => {
    if (!id) return
    setLoading(true)
    setExpandedId(null)
    const [meas, evs] = await Promise.all([
      getMeasuresForPortal(id),
      getMeasureEvaluationsForPortal(id),
    ])
    // Stable order by created_at (getMeasuresForPortal randomizes on purpose for the rating UI)
    const sorted = [...meas].sort((a, b) => a.created_at.localeCompare(b.created_at))
    setMeasures(sorted)
    setEvaluations(evs)
    setLoading(false)
  }, [])

  useEffect(() => { load(portalId) }, [portalId, load])

  const evalMap = new Map(evaluations.map((e) => [e.consultant_measure_id, e]))
  const ratedMeasures = measures.filter((m) => evalMap.has(m.id))

  // Stats
  const withNotes = evaluations.filter((e) => e.notes && e.notes.trim().length > 0).length
  const withAlt = evaluations.filter((e) => e.alternative_measures && e.alternative_measures.trim().length > 0).length
  const avgVerst = avgScore(evaluations.map((e) => e.verstaendlichkeit))
  const avgPlaus = avgScore(evaluations.map((e) => e.plausibilitaet))
  const avgWirt  = avgScore(evaluations.map((e) => e.wirtschaftlichkeit))
  const avgUmset = avgScore(evaluations.map((e) => e.umsetzbarkeit))
  const avgGesamt= avgScore(evaluations.map((e) => e.gesamteindruck))

  // Sort
  const sorted = ratedMeasures.map((m, origIdx) => ({ m, origIdx, ev: evalMap.get(m.id)! }))
  sorted.sort((a, b) => {
    let cmp = 0
    switch (sortKey) {
      case 'index':              cmp = a.origIdx - b.origIdx; break
      case 'date':               cmp = new Date(a.ev.created_at).getTime() - new Date(b.ev.created_at).getTime(); break
      case 'verstaendlichkeit':  cmp = (a.ev.verstaendlichkeit ?? 0)  - (b.ev.verstaendlichkeit ?? 0);  break
      case 'plausibilitaet':     cmp = (a.ev.plausibilitaet ?? 0)     - (b.ev.plausibilitaet ?? 0);     break
      case 'wirtschaftlichkeit': cmp = (a.ev.wirtschaftlichkeit ?? 0) - (b.ev.wirtschaftlichkeit ?? 0); break
      case 'umsetzbarkeit':      cmp = (a.ev.umsetzbarkeit ?? 0)      - (b.ev.umsetzbarkeit ?? 0);      break
      case 'gesamteindruck':     cmp = (a.ev.gesamteindruck ?? 0)     - (b.ev.gesamteindruck ?? 0);     break
    }
    return sortAsc ? cmp : -cmp
  })

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc((p) => !p)
    else { setSortKey(k); setSortAsc(k === 'index') }
  }

  function SortHeader({ label, sortKeyVal, className }: { label: string; sortKeyVal: SortKey; className?: string }) {
    const active = sortKey === sortKeyVal
    return (
      <th
        onClick={() => toggleSort(sortKeyVal)}
        className={className}
        style={{
          padding: '10px 14px', fontSize: '10px', fontWeight: 700,
          color: active ? '#1A2FEE' : '#AEAEAE',
          textTransform: 'uppercase', letterSpacing: '0.05em',
          whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
        }}
      >
        {label} {active ? (sortAsc ? '↑' : '↓') : ''}
      </th>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="size-6 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: '#1A2FEE' }} />
      </div>
    )
  }

  if (evaluations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Users className="size-8" style={{ color: '#AEAEAE' }} />
        <p className="text-sm" style={{ color: '#AEAEAE' }}>Noch keine Maßnahmen-Bewertungen für diesen Consultant.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <StatCard label="Bewertet"      value={`${evaluations.length} / ${measures.length}`} color="#1A2FEE" icon={<BarChart3 className="size-4" />} />
        <StatCard label="Mit Kommentar" value={`${withNotes}`}  color="#7c3aed" icon={<MessageSquare className="size-4" />} />
        <StatCard label="Mit Alt."      value={`${withAlt}`}    color="#d97706" icon={<Lightbulb className="size-4" />} />
        <StatCard label="Ø Verständl."  value={avgVerst}  color={scoreColor(avgVerst)}  icon={<span className="text-xs font-bold">V</span>} />
        <StatCard label="Ø Plausib."    value={avgPlaus}  color={scoreColor(avgPlaus)}  icon={<span className="text-xs font-bold">P</span>} />
        <StatCard label="Ø Wirtsch."    value={avgWirt}   color={scoreColor(avgWirt)}   icon={<span className="text-xs font-bold">W</span>} />
        <StatCard label="Ø Umsetzb."    value={avgUmset}  color={scoreColor(avgUmset)}  icon={<span className="text-xs font-bold">U</span>} />
      </div>

      {/* Extra Gesamt card on its own row (or extend to 8 cols on large screens) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Ø Gesamt" value={avgGesamt} color={scoreColor(avgGesamt)} icon={<span className="text-xs font-bold">G</span>} />
      </div>

      {/* Distribution */}
      <RatingDistribution evaluations={evaluations} />

      {/* Timeline (collapsible) */}
      <RatingTimeline evaluations={evaluations} />

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: '#E5E5E5', backgroundColor: '#ffffff' }}>
        <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9ff', borderBottom: '1px solid #E5E5E5' }}>
              <SortHeader label="#" sortKeyVal="index" />
              <th style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 700, color: '#AEAEAE', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Maßnahme
              </th>
              <SortHeader label="Verständl." sortKeyVal="verstaendlichkeit"  className="text-center" />
              <SortHeader label="Plausib."   sortKeyVal="plausibilitaet"     className="text-center" />
              <SortHeader label="Wirtsch."   sortKeyVal="wirtschaftlichkeit" className="text-center" />
              <SortHeader label="Umsetzb."   sortKeyVal="umsetzbarkeit"      className="text-center" />
              <SortHeader label="Gesamt"     sortKeyVal="gesamteindruck"     className="text-center" />
              <th style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 700, color: '#AEAEAE', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Kommentar
              </th>
              <th style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 700, color: '#AEAEAE', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Alt. Vorschläge
              </th>
              <SortHeader label="Datum" sortKeyVal="date" />
              <th style={{ padding: '10px 6px' }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ m, origIdx, ev }) => (
              <MeasureRow
                key={m.id}
                measure={m}
                evaluation={ev}
                index={origIdx}
                isExpanded={expandedId === m.id}
                onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: '#E5E5E5', backgroundColor: '#ffffff' }}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}12`, color }}>
        {icon}
      </div>
      <div>
        <p className="text-lg font-bold font-mono" style={{ color, lineHeight: 1.2 }}>{value}</p>
        <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>{label}</p>
      </div>
    </div>
  )
}

// ── Rating Distribution ─────────────────────────────────────────────────────

function RatingDistribution({ evaluations }: { evaluations: ConsultantMeasureEvaluation[] }) {
  const categories = [
    { key: 'verstaendlichkeit'  as const, label: 'Verständlichkeit',  color: '#1A2FEE' },
    { key: 'plausibilitaet'     as const, label: 'Plausibilität',     color: '#7c3aed' },
    { key: 'wirtschaftlichkeit' as const, label: 'Wirtschaftlichkeit',color: '#d97706' },
    { key: 'umsetzbarkeit'      as const, label: 'Umsetzbarkeit',     color: '#059669' },
    { key: 'gesamteindruck'     as const, label: 'Gesamteindruck',    color: '#dc2626' },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {categories.map(({ key, label, color }) => {
        const values = evaluations.map((e) => e[key]).filter((v): v is number => v !== null)
        const dist = [1, 2, 3, 4, 5].map((n) => values.filter((v) => v === n).length)
        const max = Math.max(...dist, 1)
        const naCount = evaluations.length - values.length

        return (
          <div key={key} className="rounded-xl border px-4 py-3" style={{ borderColor: '#E5E5E5', backgroundColor: '#ffffff' }}>
            <p className="text-[11px] font-semibold mb-2" style={{ color }}>{label}</p>
            <div className="flex items-end gap-1.5" style={{ height: '48px' }}>
              {dist.map((count, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded-sm transition-all"
                    style={{
                      height: `${Math.max((count / max) * 40, 2)}px`,
                      backgroundColor: count > 0 ? color : '#E5E5E5',
                      opacity: count > 0 ? 0.7 : 0.3,
                    }}
                  />
                  <span style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 600 }}>{i + 1}</span>
                </div>
              ))}
            </div>
            {naCount > 0 && (
              <p style={{ fontSize: '9px', color: '#AEAEAE', marginTop: '4px' }}>{naCount}× N/A</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Score Cell ──────────────────────────────────────────────────────────────

function ScoreCell({ value }: { value: number | null }) {
  if (value === null) return <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500 }}>N/A</span>
  const bg = value >= 4 ? 'rgba(5,150,105,0.08)' : value >= 3 ? 'rgba(234,179,8,0.08)' : 'rgba(220,38,38,0.08)'
  const color = value >= 4 ? '#059669' : value >= 3 ? '#b45309' : '#dc2626'
  return (
    <span className="inline-flex size-7 items-center justify-center rounded text-xs font-bold" style={{ backgroundColor: bg, color }}>
      {value}
    </span>
  )
}

// ── Row ─────────────────────────────────────────────────────────────────────

function MeasureRow({
  measure, evaluation, index, isExpanded, onToggle,
}: {
  measure: ConsultantMeasure
  evaluation: ConsultantMeasureEvaluation
  index: number
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        style={{ borderBottom: isExpanded ? 'none' : '1px solid #F0F0F0', cursor: 'pointer', transition: 'background-color 0.1s' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafcff')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
      >
        <td style={{ padding: '10px 14px', fontSize: '12px', color: '#AEAEAE', fontWeight: 600 }}>
          {index + 1}
        </td>
        <td style={{ padding: '10px 14px', minWidth: '220px', maxWidth: '320px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#00095B', lineHeight: 1.4 }}>
            {measure.measure_title}
          </p>
          {measure.measure_short_description && (
            <p style={{ fontSize: '11px', color: '#9ca3af', lineHeight: 1.3, marginTop: '2px' }}>
              {measure.measure_short_description.length > 80
                ? measure.measure_short_description.slice(0, 80) + '…'
                : measure.measure_short_description}
            </p>
          )}
        </td>
        <td style={{ padding: '10px 14px', textAlign: 'center' }}><ScoreCell value={evaluation.verstaendlichkeit} /></td>
        <td style={{ padding: '10px 14px', textAlign: 'center' }}><ScoreCell value={evaluation.plausibilitaet} /></td>
        <td style={{ padding: '10px 14px', textAlign: 'center' }}><ScoreCell value={evaluation.wirtschaftlichkeit} /></td>
        <td style={{ padding: '10px 14px', textAlign: 'center' }}><ScoreCell value={evaluation.umsetzbarkeit} /></td>
        <td style={{ padding: '10px 14px', textAlign: 'center' }}><ScoreCell value={evaluation.gesamteindruck} /></td>
        <td style={{ padding: '10px 14px', maxWidth: '220px' }}>
          {evaluation.notes ? (
            <p style={{ fontSize: '11px', color: '#737373', lineHeight: 1.4 }}>{evaluation.notes}</p>
          ) : (
            <span style={{ fontSize: '11px', color: '#AEAEAE' }}>—</span>
          )}
        </td>
        <td style={{ padding: '10px 14px', maxWidth: '220px' }}>
          {evaluation.alternative_measures ? (
            <p style={{ fontSize: '11px', color: '#737373', lineHeight: 1.4 }}>{evaluation.alternative_measures}</p>
          ) : (
            <span style={{ fontSize: '11px', color: '#AEAEAE' }}>—</span>
          )}
        </td>
        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
          <p style={{ fontSize: '11px', color: '#9ca3af' }}>
            {new Date(evaluation.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
          </p>
        </td>
        <td style={{ padding: '10px 6px' }}>
          {isExpanded ? <ChevronUp className="size-4" style={{ color: '#1A2FEE' }} /> : <ChevronDown className="size-4" style={{ color: '#AEAEAE' }} />}
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={11} style={{ padding: 0, borderBottom: '1px solid #E5E5E5' }}>
            <ExpandedMeasureDetail measure={measure} evaluation={evaluation} />
          </td>
        </tr>
      )}
    </>
  )
}

// ── Expanded Detail ─────────────────────────────────────────────────────────

function ExpandedMeasureDetail({ measure, evaluation }: { measure: ConsultantMeasure; evaluation: ConsultantMeasureEvaluation }) {
  const raw = (measure.measure_raw ?? {}) as Record<string, unknown>

  const savingsEurFrom = rawNum(raw, 'yearly_savings_range_from',        'yearlySavingsRangeFrom')
  const savingsEurTo   = rawNum(raw, 'yearly_savings_range_to',          'yearlySavingsRangeTo')
  const savingsKwhFrom = rawNum(raw, 'yearly_savings_energy_range_from', 'yearlySavingsEnergyRangeFrom')
  const savingsKwhTo   = rawNum(raw, 'yearly_savings_energy_range_to',   'yearlySavingsEnergyRangeTo')
  const investFrom     = rawNum(raw, 'investment_range_from',            'investmentRangeFrom')
  const investTo       = rawNum(raw, 'investment_range_to',              'investmentRangeTo')
  const amortMonths    = rawNum(raw, 'amortisation_period_in_months',    'amortisationPeriodInMonths')
  const effortLevel    = rawStr(raw, 'effort_level',                     'effortLevel')
  const category       = rawStr(raw, 'category')
  const reasoning      = rawStr(raw, 'reasoning')
  const evidences      = Array.isArray(raw.evidences)
    ? (raw.evidences as unknown[]).filter((e): e is string => typeof e === 'string')
    : []

  const es = effortStyle(effortLevel)
  const catLabel = categoryLabel(category)
  const industryLabel = measure.industry ? (INDUSTRY_DE[measure.industry] ?? measure.industry) : null

  const savingsEur = savingsEurTo ?? savingsEurFrom
  const savingsKwh = savingsKwhTo ?? savingsKwhFrom

  return (
    <div style={{ backgroundColor: '#FAFBFF', padding: '20px 24px' }}>
      <div className="flex flex-col gap-5 lg:flex-row lg:gap-8">
        {/* Left */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {catLabel && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'rgba(26,47,238,0.08)', color: '#1A2FEE' }}>
                {catLabel}
              </span>
            )}
            {es && (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: es.bg, color: es.text }}>
                <Wrench className="size-2.5" /> Aufwand {es.label}
              </span>
            )}
            {savingsEur !== null && (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'rgba(5,150,105,0.08)', color: '#059669' }}>
                <Euro className="size-2.5" /> {formatEur(savingsEur)}/a
              </span>
            )}
            {amortMonths !== null && (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'rgba(0,0,0,0.04)', color: '#737373' }}>
                <Clock className="size-2.5" /> Amort. {formatMonths(amortMonths)}
              </span>
            )}
            {industryLabel && (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'rgba(0,0,0,0.04)', color: '#737373' }}>
                <Factory className="size-2.5" /> {industryLabel}
              </span>
            )}
          </div>

          {/* KPIs */}
          {(savingsEur !== null || savingsKwh !== null || investFrom !== null) && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" style={{ maxWidth: '540px' }}>
              {savingsEur !== null && (
                <div className="rounded-lg border px-3 py-2" style={{ borderColor: '#F0F0F0', backgroundColor: '#ffffff' }}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Euro className="size-3" style={{ color: '#059669' }} />
                    <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Einsparung/Jahr</span>
                  </div>
                  <p className="text-sm font-bold font-mono" style={{ color: '#059669' }}>
                    {savingsEurFrom !== null && savingsEurTo !== null && savingsEurFrom !== savingsEurTo
                      ? `${formatEur(savingsEurFrom)} – ${formatEur(savingsEurTo)}`
                      : formatEur(savingsEur)}
                  </p>
                </div>
              )}
              {savingsKwh !== null && (
                <div className="rounded-lg border px-3 py-2" style={{ borderColor: '#F0F0F0', backgroundColor: '#ffffff' }}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Zap className="size-3" style={{ color: '#1A2FEE' }} />
                    <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Energie/Jahr</span>
                  </div>
                  <p className="text-sm font-bold font-mono" style={{ color: '#1A2FEE' }}>
                    {savingsKwhFrom !== null && savingsKwhTo !== null && savingsKwhFrom !== savingsKwhTo
                      ? `${formatKwh(savingsKwhFrom)} – ${formatKwh(savingsKwhTo)}`
                      : formatKwh(savingsKwh)}
                  </p>
                </div>
              )}
              {(investFrom !== null || investTo !== null) && (
                <div className="rounded-lg border px-3 py-2" style={{ borderColor: '#F0F0F0', backgroundColor: '#ffffff' }}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Shield className="size-3" style={{ color: '#b45309' }} />
                    <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Investition</span>
                  </div>
                  <p className="text-sm font-bold font-mono" style={{ color: '#b45309' }}>
                    {investFrom !== null && investTo !== null && investFrom !== investTo
                      ? `${formatEur(investFrom)} – ${formatEur(investTo)}`
                      : formatEur(investTo ?? investFrom)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {measure.measure_description && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Target className="size-3.5" style={{ color: '#1A2FEE' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1A2FEE' }}>Beschreibung</span>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: '#444444' }}>
                {measure.measure_description}
              </p>
            </div>
          )}

          {/* Reasoning */}
          {reasoning && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lightbulb className="size-3.5" style={{ color: '#7c3aed' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7c3aed' }}>Begründung</span>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: '#444444', borderLeft: '3px solid #7c3aed', paddingLeft: '12px' }}>
                {reasoning}
              </p>
            </div>
          )}

          {/* Evidences */}
          {evidences.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="size-3.5" style={{ color: '#059669' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#059669' }}>Datenpunkte</span>
              </div>
              <ul className="flex flex-col gap-1.5 rounded-lg border px-4 py-3" style={{ backgroundColor: '#FAFAFA', borderColor: '#F0F0F0' }}>
                {evidences.map((ev, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-3 shrink-0" style={{ color: '#059669' }} />
                    <span className="text-[12px] leading-relaxed" style={{ color: '#444444' }}>{ev}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: Evaluation panel */}
        <div className="lg:w-72 shrink-0">
          <div className="rounded-xl border p-4" style={{ borderColor: '#E5E5E5', backgroundColor: '#ffffff' }}>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#059669' }}>
              Bewertung von {evaluation.evaluator_name}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              {([
                ['Verständlichkeit',    evaluation.verstaendlichkeit],
                ['Plausibilität',       evaluation.plausibilitaet],
                ['Wirtschaftlichkeit',  evaluation.wirtschaftlichkeit],
                ['Umsetzbarkeit',       evaluation.umsetzbarkeit],
                ['Gesamteindruck',      evaluation.gesamteindruck],
              ] as const).map(([label, value]) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-center" style={{ color: '#AEAEAE' }}>{label}</span>
                  <ScoreCell value={value} />
                </div>
              ))}
            </div>

            {evaluation.notes && (
              <div className="rounded-lg border px-3 py-2.5 mb-2" style={{ borderColor: '#F0F0F0', backgroundColor: '#FAFAFA' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#AEAEAE' }}>Kommentar</p>
                <p className="text-[12px] leading-relaxed" style={{ color: '#444444' }}>{evaluation.notes}</p>
              </div>
            )}

            {evaluation.alternative_measures && (
              <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: '#F0F0F0', backgroundColor: '#FAFAFA' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#AEAEAE' }}>Alternative Vorschläge</p>
                <p className="text-[12px] leading-relaxed" style={{ color: '#444444' }}>{evaluation.alternative_measures}</p>
              </div>
            )}

            <p className="text-[10px] mt-3" style={{ color: '#AEAEAE' }}>
              {new Date(evaluation.created_at).toLocaleDateString('de-DE', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Rating Timeline (collapsible) ────────────────────────────────────────────
// Scatter plot of Gesamteindruck over real wall-clock time, with a running
// average line and shaded bands highlighting long gaps (e.g. lunch breaks).

function RatingTimeline({ evaluations }: { evaluations: ConsultantMeasureEvaluation[] }) {
  const [open, setOpen] = useState(false)

  // Sort by time + drop ratings without a gesamteindruck value (can't be plotted)
  const points = evaluations
    .map((e) => ({ t: new Date(e.created_at).getTime(), score: e.gesamteindruck, ev: e }))
    .filter((p): p is { t: number; score: number; ev: ConsultantMeasureEvaluation } => p.score !== null)
    .sort((a, b) => a.t - b.t)

  if (points.length < 2) {
    return (
      <div className="rounded-xl border px-4 py-3" style={{ borderColor: '#E5E5E5', backgroundColor: '#ffffff' }}>
        <p className="text-[11px]" style={{ color: '#AEAEAE' }}>
          Zu wenige Bewertungen mit Gesamteindruck für einen Zeitverlauf.
        </p>
      </div>
    )
  }

  const t0 = points[0].t
  const tEnd = points[points.length - 1].t
  const totalMs = Math.max(tEnd - t0, 1)

  // Cumulative average over time (each point's running mean)
  let sum = 0
  const running = points.map((p, i) => {
    sum += p.score
    return { ...p, avg: sum / (i + 1) }
  })

  const overallAvg = sum / points.length

  // Gap detection: any interval > GAP_MINUTES minutes = interesting pause
  const GAP_MINUTES = 20
  const gaps: { startT: number; endT: number; minutes: number }[] = []
  for (let i = 1; i < points.length; i++) {
    const dt = points[i].t - points[i - 1].t
    const min = dt / 60000
    if (min > GAP_MINUTES) {
      gaps.push({ startT: points[i - 1].t, endT: points[i].t, minutes: min })
    }
  }

  // Split averages into before/after the first significant gap, to quantify
  // whether the consultant rated differently after the break.
  let beforeAvg: number | null = null
  let afterAvg: number | null = null
  let gapLabel: string | null = null
  if (gaps.length > 0) {
    const mainGap = gaps.reduce((a, b) => (b.minutes > a.minutes ? b : a))
    const before = points.filter((p) => p.t <= mainGap.startT)
    const after = points.filter((p) => p.t >= mainGap.endT)
    if (before.length > 0) beforeAvg = before.reduce((a, b) => a + b.score, 0) / before.length
    if (after.length > 0)  afterAvg  = after.reduce((a, b) => a + b.score, 0) / after.length
    gapLabel = `Längste Pause: ${Math.round(mainGap.minutes)} min (${new Date(mainGap.startT).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} → ${new Date(mainGap.endT).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })})`
  }

  // SVG geometry
  const W = 900
  const H = 240
  const PAD_L = 32
  const PAD_R = 12
  const PAD_T = 12
  const PAD_B = 28
  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B

  const xFor = (t: number) => PAD_L + ((t - t0) / totalMs) * plotW
  const yFor = (score: number) => PAD_T + (1 - (score - 1) / 4) * plotH

  // Build running-average path
  const avgPath = running
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.t).toFixed(1)} ${yFor(p.avg).toFixed(1)}`)
    .join(' ')

  // X axis ticks — one tick per distinct ~30-min slot within the span
  const xTicks: number[] = [t0, tEnd]
  const stepMs = 30 * 60 * 1000
  for (let t = Math.ceil(t0 / stepMs) * stepMs; t < tEnd; t += stepMs) xTicks.push(t)
  xTicks.sort((a, b) => a - b)

  return (
    <div className="rounded-xl border" style={{ borderColor: '#E5E5E5', backgroundColor: '#ffffff' }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-blue-50/30"
      >
        <div className="flex items-center gap-2">
          <Activity className="size-4" style={{ color: '#1A2FEE' }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#00095B' }}>
            Zeitverlauf der Bewertungen
          </span>
          <span className="text-[11px]" style={{ color: '#AEAEAE' }}>
            · Ø {overallAvg.toFixed(2)} über {points.length} Bewertungen
          </span>
        </div>
        {open ? <ChevronUp className="size-4" style={{ color: '#737373' }} /> : <ChevronDown className="size-4" style={{ color: '#737373' }} />}
      </button>

      {open && (
        <div className="border-t px-4 py-4" style={{ borderColor: '#F0F0F0' }}>
          {/* Summary line */}
          {gapLabel && (
            <p className="mb-3 text-[11px]" style={{ color: '#737373' }}>
              {gapLabel}
              {beforeAvg !== null && afterAvg !== null && (
                <>
                  {' · '}
                  <span style={{ color: '#00095B', fontWeight: 600 }}>
                    Ø vor Pause: {beforeAvg.toFixed(2)} → Ø nach Pause: {afterAvg.toFixed(2)}
                  </span>
                  {' '}
                  <span style={{ color: afterAvg > beforeAvg ? '#059669' : afterAvg < beforeAvg ? '#dc2626' : '#737373' }}>
                    ({afterAvg >= beforeAvg ? '+' : ''}{(afterAvg - beforeAvg).toFixed(2)})
                  </span>
                </>
              )}
            </p>
          )}

          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
            {/* Y grid lines 1..5 */}
            {[1, 2, 3, 4, 5].map((score) => (
              <g key={score}>
                <line
                  x1={PAD_L} x2={W - PAD_R}
                  y1={yFor(score)} y2={yFor(score)}
                  stroke="#F0F0F0" strokeWidth={1}
                />
                <text x={PAD_L - 6} y={yFor(score) + 3} textAnchor="end" fontSize={10} fill="#AEAEAE">{score}</text>
              </g>
            ))}

            {/* Gap bands */}
            {gaps.map((g, i) => (
              <rect
                key={i}
                x={xFor(g.startT)}
                y={PAD_T}
                width={Math.max(xFor(g.endT) - xFor(g.startT), 1)}
                height={plotH}
                fill="#FEF3C7"
                opacity={0.6}
              />
            ))}

            {/* Overall average line */}
            <line
              x1={PAD_L} x2={W - PAD_R}
              y1={yFor(overallAvg)} y2={yFor(overallAvg)}
              stroke="#AEAEAE" strokeDasharray="4 4" strokeWidth={1}
            />

            {/* Running average path */}
            <path d={avgPath} fill="none" stroke="#1A2FEE" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {/* Scatter dots */}
            {running.map((p, i) => (
              <circle
                key={i}
                cx={xFor(p.t)}
                cy={yFor(p.score)}
                r={3.5}
                fill={p.score >= 4 ? '#059669' : p.score >= 3 ? '#b45309' : '#dc2626'}
                fillOpacity={0.7}
                stroke="#ffffff"
                strokeWidth={1}
              >
                <title>
                  {new Date(p.t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} · Gesamt {p.score} · Ø bisher {p.avg.toFixed(2)}
                </title>
              </circle>
            ))}

            {/* X axis ticks */}
            {xTicks.map((t, i) => (
              <g key={i}>
                <line x1={xFor(t)} x2={xFor(t)} y1={H - PAD_B} y2={H - PAD_B + 4} stroke="#AEAEAE" strokeWidth={1} />
                <text
                  x={xFor(t)}
                  y={H - PAD_B + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#737373"
                >
                  {new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </text>
              </g>
            ))}
          </svg>

          {/* Legend */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]" style={{ color: '#737373' }}>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-0.5 w-4" style={{ backgroundColor: '#1A2FEE' }} /> kumulativer Durchschnitt
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-0.5 w-4" style={{ backgroundColor: '#AEAEAE', borderTop: '1px dashed #AEAEAE' }} /> Gesamtdurchschnitt
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-2 rounded-full" style={{ backgroundColor: '#FEF3C7', border: '1px solid #D1D5DB' }} /> Pause &gt; {GAP_MINUTES} min
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-2 rounded-full" style={{ backgroundColor: '#059669' }} /> ≥ 4
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-2 rounded-full" style={{ backgroundColor: '#b45309' }} /> = 3
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-2 rounded-full" style={{ backgroundColor: '#dc2626' }} /> ≤ 2
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
