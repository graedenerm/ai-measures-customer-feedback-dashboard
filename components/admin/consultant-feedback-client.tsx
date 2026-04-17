'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChevronDown, ChevronUp, MessageSquare, BarChart3,
  TrendingUp, AlertTriangle, Shield, Euro, Zap,
  Info, Target, Calendar, Activity, Factory, Users,
} from 'lucide-react'
import { getInsightsForPortal } from '@/actions/consultant-insights'
import { getEvaluationsForPortal } from '@/actions/consultant-evaluations'
import type { ConsultantPortalWithStats, ConsultantInsight, ConsultantEvaluation } from '@/lib/consultant-types'

// ── Style helpers (from consultant-insight-card.tsx) ─────────────────────────

function typeStyle(type: string) {
  if (type.includes('anomaly'))
    return { bg: 'rgba(220,38,38,0.08)', text: '#dc2626', label: 'Anomalie', isAnomaly: true, isTrend: false, isChangepoint: false }
  if (type.includes('trend'))
    return { bg: 'rgba(168,85,247,0.08)', text: '#7c3aed', label: 'Trend', isAnomaly: false, isTrend: true, isChangepoint: false }
  if (type.includes('changepoint'))
    return { bg: 'rgba(245,158,11,0.08)', text: '#d97706', label: 'Changepoint', isAnomaly: false, isTrend: false, isChangepoint: true }
  return { bg: 'rgba(26,47,238,0.08)', text: '#1A2FEE', label: 'Strukturell', isAnomaly: false, isTrend: false, isChangepoint: false }
}

function confidenceStyle(c: number | null) {
  if (c === null || c === 0) return null
  const pct = c > 1 ? c : c * 100
  if (pct === 0) return null
  if (pct >= 90) return { bg: 'rgba(5,150,105,0.08)', text: '#059669', label: `${pct.toFixed(0)} %` }
  if (pct >= 70) return { bg: 'rgba(234,179,8,0.08)', text: '#b45309', label: `${pct.toFixed(0)} %` }
  return { bg: 'rgba(220,38,38,0.06)', text: '#dc2626', label: `${pct.toFixed(0)} %` }
}

function hypothesisTypeStyle(type: string) {
  switch (type.toLowerCase()) {
    case 'problem':     return { bg: 'rgba(220,38,38,0.08)', text: '#dc2626', label: 'Problem' }
    case 'benign':      return { bg: 'rgba(5,150,105,0.08)', text: '#059669', label: 'Unproblematisch' }
    case 'opportunity': return { bg: 'rgba(26,47,238,0.08)', text: '#1A2FEE', label: 'Potential' }
    default:            return { bg: 'rgba(0,0,0,0.04)', text: '#737373', label: type }
  }
}

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

function formatEur(v: number | null) {
  if (v === null) return '—'
  return v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function formatKwh(v: number | null) {
  if (v === null) return '—'
  return v.toLocaleString('de-DE') + ' kWh'
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

type SortKey = 'index' | 'gesamteindruck' | 'verstaendlichkeit' | 'plausibilitaet' | 'aktionabilitaet' | 'date'

// ── Main Component ──────────────────────────────────────────────────────────

interface Props {
  portals: ConsultantPortalWithStats[]
}

export function ConsultantFeedbackClient({ portals }: Props) {
  const [selectedPortalId, setSelectedPortalId] = useState<string>(portals[0]?.id ?? '')
  const [insights, setInsights] = useState<ConsultantInsight[]>([])
  const [evaluations, setEvaluations] = useState<ConsultantEvaluation[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('index')
  const [sortAsc, setSortAsc] = useState(true)

  const loadData = useCallback(async (portalId: string) => {
    if (!portalId) return
    setLoading(true)
    setExpandedId(null)
    const [ins, evs] = await Promise.all([
      getInsightsForPortal(portalId),
      getEvaluationsForPortal(portalId),
    ])
    setInsights(ins)
    setEvaluations(evs)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (selectedPortalId) loadData(selectedPortalId)
  }, [selectedPortalId, loadData])

  const evalMap = new Map(evaluations.map((e) => [e.consultant_insight_id, e]))
  const ratedInsights = insights.filter((i) => evalMap.has(i.id))
  const selectedPortal = portals.find((p) => p.id === selectedPortalId)

  // Stats
  const withNotes = evaluations.filter((e) => e.notes && e.notes.trim().length > 0).length
  const avgVerst = avgScore(evaluations.map((e) => e.verstaendlichkeit))
  const avgPlaus = avgScore(evaluations.map((e) => e.plausibilitaet))
  const avgAktio = avgScore(evaluations.map((e) => e.aktionabilitaet))
  const avgGesamt = avgScore(evaluations.map((e) => e.gesamteindruck))

  // Sorting
  const sortedInsights = [...ratedInsights].map((ins, origIdx) => ({ ins, origIdx, ev: evalMap.get(ins.id)! }))
  sortedInsights.sort((a, b) => {
    let cmp = 0
    switch (sortKey) {
      case 'index': cmp = a.origIdx - b.origIdx; break
      case 'gesamteindruck': cmp = (a.ev.gesamteindruck ?? 0) - (b.ev.gesamteindruck ?? 0); break
      case 'verstaendlichkeit': cmp = (a.ev.verstaendlichkeit ?? 0) - (b.ev.verstaendlichkeit ?? 0); break
      case 'plausibilitaet': cmp = (a.ev.plausibilitaet ?? 0) - (b.ev.plausibilitaet ?? 0); break
      case 'aktionabilitaet': cmp = (a.ev.aktionabilitaet ?? 0) - (b.ev.aktionabilitaet ?? 0); break
      case 'date': cmp = new Date(a.ev.created_at).getTime() - new Date(b.ev.created_at).getTime(); break
    }
    return sortAsc ? cmp : -cmp
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((p) => !p)
    else { setSortKey(key); setSortAsc(key === 'index') }
  }

  function SortHeader({ label, sortKeyVal, className }: { label: string; sortKeyVal: SortKey; className?: string }) {
    const active = sortKey === sortKeyVal
    return (
      <th
        onClick={() => toggleSort(sortKeyVal)}
        className={className}
        style={{
          padding: '10px 14px', fontSize: '10px', fontWeight: 700, color: active ? '#1A2FEE' : '#AEAEAE',
          textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
        }}
      >
        {label} {active ? (sortAsc ? '↑' : '↓') : ''}
      </th>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Portal selector */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
            Consultant auswählen
          </label>
          <select
            value={selectedPortalId}
            onChange={(e) => setSelectedPortalId(e.target.value)}
            style={{
              borderRadius: '8px', border: '1px solid #e5e5e5', padding: '8px 12px',
              fontSize: '14px', outline: 'none', backgroundColor: '#ffffff', color: '#111827',
              minWidth: '280px',
            }}
          >
            {portals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.evaluator_name} — {p.eval_count}/{p.insight_count} bewertet
              </option>
            ))}
          </select>
        </div>
        {selectedPortal && (
          <p style={{ fontSize: '12px', color: '#9ca3af', paddingBottom: '8px' }}>
            Portal: <code style={{ backgroundColor: 'rgba(0,0,0,0.04)', padding: '1px 6px', borderRadius: '4px' }}>/eval/{selectedPortal.slug}</code>
          </p>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="size-6 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: '#1A2FEE' }} />
        </div>
      )}

      {!loading && evaluations.length > 0 && (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Bewertet" value={`${evaluations.length} / ${insights.length}`} color="#1A2FEE" icon={<BarChart3 className="size-4" />} />
            <StatCard label="Mit Kommentar" value={`${withNotes}`} color="#7c3aed" icon={<MessageSquare className="size-4" />} />
            <StatCard label="Ø Verständl." value={avgVerst} color={scoreColor(avgVerst)} icon={<span className="text-xs font-bold">V</span>} />
            <StatCard label="Ø Plausib." value={avgPlaus} color={scoreColor(avgPlaus)} icon={<span className="text-xs font-bold">P</span>} />
            <StatCard label="Ø Aktionab." value={avgAktio} color={scoreColor(avgAktio)} icon={<span className="text-xs font-bold">A</span>} />
            <StatCard label="Ø Gesamt" value={avgGesamt} color={scoreColor(avgGesamt)} icon={<span className="text-xs font-bold">G</span>} />
          </div>

          {/* Rating distribution */}
          <RatingDistribution evaluations={evaluations} />

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: '#E5E5E5', backgroundColor: '#ffffff' }}>
            <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9ff', borderBottom: '1px solid #E5E5E5' }}>
                  <SortHeader label="#" sortKeyVal="index" />
                  <th style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 700, color: '#AEAEAE', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Typ
                  </th>
                  <th style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 700, color: '#AEAEAE', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Erkenntnis
                  </th>
                  <SortHeader label="Verständl." sortKeyVal="verstaendlichkeit" className="text-center" />
                  <SortHeader label="Plausib." sortKeyVal="plausibilitaet" className="text-center" />
                  <SortHeader label="Aktionab." sortKeyVal="aktionabilitaet" className="text-center" />
                  <SortHeader label="Gesamt" sortKeyVal="gesamteindruck" className="text-center" />
                  <th style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 700, color: '#AEAEAE', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Kommentar
                  </th>
                  <SortHeader label="Datum" sortKeyVal="date" />
                  <th style={{ padding: '10px 6px' }} />
                </tr>
              </thead>
              <tbody>
                {sortedInsights.map(({ ins, origIdx, ev }) => {
                  const isExpanded = expandedId === ins.id
                  return (
                    <InsightRow
                      key={ins.id}
                      insight={ins}
                      evaluation={ev}
                      index={origIdx}
                      isExpanded={isExpanded}
                      onToggle={() => setExpandedId(isExpanded ? null : ins.id)}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && evaluations.length === 0 && selectedPortalId && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Users className="size-8" style={{ color: '#AEAEAE' }} />
          <p className="text-sm" style={{ color: '#AEAEAE' }}>Noch keine Bewertungen für diesen Consultant.</p>
        </div>
      )}
    </div>
  )
}

// ── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-4 py-3"
      style={{ borderColor: '#E5E5E5', backgroundColor: '#ffffff' }}
    >
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}12`, color }}
      >
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

function RatingDistribution({ evaluations }: { evaluations: ConsultantEvaluation[] }) {
  const categories = [
    { key: 'verstaendlichkeit' as const, label: 'Verständlichkeit', color: '#1A2FEE' },
    { key: 'plausibilitaet' as const, label: 'Plausibilität', color: '#7c3aed' },
    { key: 'aktionabilitaet' as const, label: 'Aktionabilität', color: '#d97706' },
    { key: 'gesamteindruck' as const, label: 'Gesamteindruck', color: '#059669' },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
    <span
      className="inline-flex size-7 items-center justify-center rounded text-xs font-bold"
      style={{ backgroundColor: bg, color }}
    >
      {value}
    </span>
  )
}

// ── Insight Row ─────────────────────────────────────────────────────────────

function InsightRow({
  insight, evaluation, index, isExpanded, onToggle,
}: {
  insight: ConsultantInsight
  evaluation: ConsultantEvaluation
  index: number
  isExpanded: boolean
  onToggle: () => void
}) {
  const raw = insight.insight_raw ?? {}
  const type = (raw.finding_type as string | undefined) ?? (raw.type as string | undefined) ?? 'structural'
  const ts = typeStyle(type)

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
        <td style={{ padding: '10px 8px' }}>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap" style={{ backgroundColor: ts.bg, color: ts.text }}>
            {ts.label}
          </span>
        </td>
        <td style={{ padding: '10px 14px', minWidth: '220px', maxWidth: '320px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#00095B', lineHeight: 1.4 }}>
            {insight.insight_title}
          </p>
        </td>
        <td style={{ padding: '10px 14px', textAlign: 'center' }}><ScoreCell value={evaluation.verstaendlichkeit} /></td>
        <td style={{ padding: '10px 14px', textAlign: 'center' }}><ScoreCell value={evaluation.plausibilitaet} /></td>
        <td style={{ padding: '10px 14px', textAlign: 'center' }}><ScoreCell value={evaluation.aktionabilitaet} /></td>
        <td style={{ padding: '10px 14px', textAlign: 'center' }}><ScoreCell value={evaluation.gesamteindruck} /></td>
        <td style={{ padding: '10px 14px', maxWidth: '320px' }}>
          {evaluation.notes ? (
            <p style={{ fontSize: '11px', color: '#737373', lineHeight: 1.4 }}>
              {evaluation.notes}
            </p>
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
          <td colSpan={10} style={{ padding: 0, borderBottom: '1px solid #E5E5E5' }}>
            <ExpandedInsightDetail insight={insight} evaluation={evaluation} />
          </td>
        </tr>
      )}
    </>
  )
}

// ── Expanded Detail ─────────────────────────────────────────────────────────

function ExpandedInsightDetail({ insight, evaluation }: { insight: ConsultantInsight; evaluation: ConsultantEvaluation }) {
  const raw = insight.insight_raw ?? {}

  const type = (raw.finding_type as string | undefined) ?? (raw.type as string | undefined) ?? 'structural'
  const ts = typeStyle(type)
  const confidence = (raw.confidence as number | null | undefined) ?? null
  const cs = confidenceStyle(confidence)
  const savingsEur = (raw.savings_eur as number | null | undefined) ?? (raw.savingsEurPerYear as number | null | undefined) ?? null
  const savingsKwh = (raw.savings_kwh as number | null | undefined) ?? (raw.savingsKwhPerYear as number | null | undefined) ?? null
  const industryLabel = insight.industry ? (INDUSTRY_DE[insight.industry] ?? insight.industry) : null
  const summary = typeof raw.summary === 'string' ? raw.summary : null
  const hypotheses = Array.isArray(raw.hypotheses)
    ? (raw.hypotheses as { type: string; explanation: string }[]).filter((h) => h.type && h.explanation)
    : []

  // Trend-specific
  const trendActive = typeof raw.active === 'boolean' ? raw.active : null
  const trendStartDate = typeof raw.trend_start_date === 'string' ? raw.trend_start_date : null
  const trendEndDate = typeof raw.trend_end_date === 'string' ? raw.trend_end_date : null
  const trendNumPeriods = typeof raw.trend_num_periods === 'number' ? raw.trend_num_periods : null
  const slopePerPeriod = typeof raw.slope_per_period === 'number' ? raw.slope_per_period : null
  const slopePct = typeof raw.slope_percent_per_period === 'number' ? raw.slope_percent_per_period : null
  const periodUnit = typeof raw.period_unit === 'string' ? raw.period_unit : null
  const findingUnit = typeof raw.finding_unit === 'string' ? raw.finding_unit : null
  const hasTrendDetails = trendStartDate !== null || slopePerPeriod !== null || trendActive !== null

  // Changepoint-specific
  const cpOnsetDate = typeof raw.onset_date === 'string' ? raw.onset_date : null
  const cpDelta = typeof raw.delta === 'number' ? raw.delta : null
  const cpDeltaPct = typeof raw.delta_percent === 'number' ? raw.delta_percent : null
  const cpValBefore = typeof raw.value_before === 'number' ? raw.value_before : null
  const cpValAfter = typeof raw.value_after === 'number' ? raw.value_after : null
  const hasChangepointDetails = cpOnsetDate !== null || cpDelta !== null

  return (
    <div style={{ backgroundColor: '#FAFBFF', padding: '20px 24px' }}>
      <div className="flex flex-col gap-5 lg:flex-row lg:gap-8">
        {/* Left: Insight content */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: ts.bg, color: ts.text }}>
              {ts.label}
            </span>
            {cs && !ts.isTrend && !ts.isChangepoint && (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: cs.bg, color: cs.text }}>
                <Shield className="size-2.5" /> Konfidenz {cs.label}
              </span>
            )}
            {trendActive !== null && (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={trendActive
                ? { backgroundColor: 'rgba(5,150,105,0.08)', color: '#059669' }
                : { backgroundColor: 'rgba(0,0,0,0.04)', color: '#737373' }}>
                <Activity className="size-2.5" /> {trendActive ? 'Aktiv' : 'Beendet'}
              </span>
            )}
            {savingsEur !== null && (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'rgba(5,150,105,0.08)', color: '#059669' }}>
                <Euro className="size-2.5" /> {formatEur(savingsEur)}/a
              </span>
            )}
            {industryLabel && (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'rgba(0,0,0,0.04)', color: '#737373' }}>
                <Factory className="size-2.5" /> {industryLabel}
              </span>
            )}
          </div>

          {/* Savings KPIs */}
          {(savingsEur !== null || savingsKwh !== null) && (
            <div className="grid grid-cols-2 gap-3" style={{ maxWidth: '360px' }}>
              {savingsEur !== null && (
                <div className="rounded-lg border px-3 py-2" style={{ borderColor: '#F0F0F0', backgroundColor: '#ffffff' }}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Euro className="size-3" style={{ color: '#059669' }} />
                    <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Einsparung/Jahr</span>
                  </div>
                  <p className="text-sm font-bold font-mono" style={{ color: '#059669' }}>{formatEur(savingsEur)}</p>
                </div>
              )}
              {savingsKwh !== null && (
                <div className="rounded-lg border px-3 py-2" style={{ borderColor: '#F0F0F0', backgroundColor: '#ffffff' }}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Zap className="size-3" style={{ color: '#1A2FEE' }} />
                    <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Energie/Jahr</span>
                  </div>
                  <p className="text-sm font-bold font-mono" style={{ color: '#1A2FEE' }}>{formatKwh(savingsKwh)}</p>
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          {summary && (
            <p className="text-[13px] leading-relaxed" style={{ color: '#444444' }}>{summary}</p>
          )}

          {/* Description */}
          {insight.insight_description && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Target className="size-3.5" style={{ color: '#1A2FEE' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1A2FEE' }}>Detailanalyse</span>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: '#444444' }}>
                {insight.insight_description}
              </p>
            </div>
          )}

          {/* Hypotheses */}
          {hypotheses.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Info className="size-3.5" style={{ color: '#737373' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#737373' }}>Hypothesen</span>
              </div>
              <div className="flex flex-col gap-2">
                {hypotheses.map((h, i) => {
                  const hs = hypothesisTypeStyle(h.type)
                  return (
                    <div key={i} className="flex gap-2.5 rounded-lg border px-3 py-2" style={{ borderColor: '#F0F0F0', backgroundColor: '#ffffff' }}>
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold self-start" style={{ backgroundColor: hs.bg, color: hs.text }}>
                        {hs.label}
                      </span>
                      <p className="text-[12px] leading-relaxed" style={{ color: '#444444' }}>{h.explanation}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Trend details */}
          {hasTrendDetails && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Calendar className="size-3.5" style={{ color: '#737373' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#737373' }}>Trend-Details</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" style={{ maxWidth: '480px' }}>
                {trendStartDate && trendEndDate && (
                  <div className="rounded-lg border px-3 py-2" style={{ borderColor: '#F0F0F0', backgroundColor: '#ffffff' }}>
                    <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: '#AEAEAE' }}>Zeitraum</p>
                    <p className="text-[12px] font-semibold" style={{ color: '#00095B' }}>
                      {new Date(trendStartDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                      {' – '}
                      {new Date(trendEndDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    {trendNumPeriods !== null && (
                      <p className="text-[10px] mt-0.5" style={{ color: '#AEAEAE' }}>{trendNumPeriods} {periodUnit ?? 'Perioden'}</p>
                    )}
                  </div>
                )}
                {slopePerPeriod !== null && (
                  <div className="rounded-lg border px-3 py-2" style={{ borderColor: '#F0F0F0', backgroundColor: '#ffffff' }}>
                    <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: '#AEAEAE' }}>Anstieg / {periodUnit ?? 'Periode'}</p>
                    <p className="text-[12px] font-semibold font-mono" style={{ color: '#00095B' }}>
                      {slopePerPeriod.toLocaleString('de-DE', { maximumFractionDigits: 1 })} {findingUnit ?? ''}
                    </p>
                    {slopePct !== null && (
                      <p className="text-[10px] mt-0.5" style={{ color: '#AEAEAE' }}>+{slopePct.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Changepoint details */}
          {hasChangepointDetails && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="size-3.5" style={{ color: '#737373' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#737373' }}>Changepoint-Details</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" style={{ maxWidth: '480px' }}>
                {cpOnsetDate && (
                  <div className="rounded-lg border px-3 py-2" style={{ borderColor: '#F0F0F0', backgroundColor: '#ffffff' }}>
                    <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: '#AEAEAE' }}>Einsetzdatum</p>
                    <p className="text-[12px] font-semibold" style={{ color: '#00095B' }}>
                      {new Date(cpOnsetDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                )}
                {cpDelta !== null && (
                  <div className="rounded-lg border px-3 py-2" style={{ borderColor: '#F0F0F0', backgroundColor: '#ffffff' }}>
                    <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: '#AEAEAE' }}>Veränderung</p>
                    <p className="text-[12px] font-semibold font-mono" style={{ color: cpDelta >= 0 ? '#dc2626' : '#059669' }}>
                      {cpDelta >= 0 ? '+' : ''}{cpDelta.toLocaleString('de-DE', { maximumFractionDigits: 1 })} {findingUnit ?? ''}
                    </p>
                    {cpDeltaPct !== null && (
                      <p className="text-[10px] mt-0.5" style={{ color: '#AEAEAE' }}>
                        {cpDeltaPct >= 0 ? '+' : ''}{cpDeltaPct.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %
                      </p>
                    )}
                  </div>
                )}
                {cpValBefore !== null && cpValAfter !== null && (
                  <div className="rounded-lg border px-3 py-2" style={{ borderColor: '#F0F0F0', backgroundColor: '#ffffff' }}>
                    <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: '#AEAEAE' }}>Vorher → Nachher</p>
                    <p className="text-[12px] font-semibold font-mono" style={{ color: '#00095B' }}>
                      {cpValBefore.toLocaleString('de-DE', { maximumFractionDigits: 1 })} → {cpValAfter.toLocaleString('de-DE', { maximumFractionDigits: 1 })} {findingUnit ?? ''}
                    </p>
                  </div>
                )}
              </div>
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
                ['Verständlichkeit', evaluation.verstaendlichkeit],
                ['Plausibilität', evaluation.plausibilitaet],
                ['Aktionabilität', evaluation.aktionabilitaet],
                ['Gesamteindruck', evaluation.gesamteindruck],
              ] as const).map(([label, value]) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#AEAEAE' }}>{label}</span>
                  <ScoreCell value={value} />
                </div>
              ))}
            </div>

            {evaluation.notes && (
              <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: '#F0F0F0', backgroundColor: '#FAFAFA' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#AEAEAE' }}>Kommentar</p>
                <p className="text-[12px] leading-relaxed" style={{ color: '#444444' }}>{evaluation.notes}</p>
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
