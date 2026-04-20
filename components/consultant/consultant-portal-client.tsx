'use client'

import { useState, useEffect } from 'react'
import { LayoutList, CreditCard, ChevronLeft, ChevronRight, X, Lightbulb, Wrench } from 'lucide-react'
import { ConsultantInsightCard } from './consultant-insight-card'
import { RatedInsightsList } from './rated-insights-list'
import { ConsultantMeasureCard } from './consultant-measure-card'
import { RatedMeasuresList } from './rated-measures-list'
import type {
  ConsultantInsight,
  ConsultantEvaluation,
  ConsultantMeasure,
  ConsultantMeasureEvaluation,
} from '@/lib/consultant-types'
import type { InitialRatingValues } from './consultant-rating-form'
import type { InitialMeasureRatingValues } from './consultant-measure-rating-form'

type ContentType = 'insights' | 'measures'
type Tab = 'toRate' | 'rated'
type Layout = 'list' | 'card'
type TypeFilter = 'all' | 'anomaly' | 'trend' | 'changepoint' | 'structural'
type ConfidenceFilter = 'all' | '0-25' | '25-50' | '50-75' | '75-100'
type ActiveFilter = 'all' | 'active' | 'ended'
type EffortFilter = 'all' | 'LOW' | 'MEDIUM' | 'HIGH'

// ── Insight filter helpers ────────────────────────────────────────────────────

function getRawType(raw: Record<string, unknown> | null): TypeFilter {
  const t = ((raw?.finding_type ?? raw?.type ?? '') as string).toLowerCase()
  if (t.includes('anomaly'))     return 'anomaly'
  if (t.includes('trend'))       return 'trend'
  if (t.includes('changepoint')) return 'changepoint'
  return 'structural'
}

function getRawConfidencePct(raw: Record<string, unknown> | null): number | null {
  const c = raw?.confidence
  if (typeof c !== 'number') return null
  return c > 1 ? c : c * 100
}

function getRawActive(raw: Record<string, unknown> | null): boolean | null {
  const a = raw?.active
  return typeof a === 'boolean' ? a : null
}

interface InsightReEvalTarget {
  insight: ConsultantInsight
  evaluation: ConsultantEvaluation
}

interface MeasureReEvalTarget {
  measure: ConsultantMeasure
  evaluation: ConsultantMeasureEvaluation
}

interface ConsultantPortalClientProps {
  portalId: string
  portalSlug: string
  evaluatorName: string
  insights: ConsultantInsight[]
  initialEvaluations: ConsultantEvaluation[]
  measures: ConsultantMeasure[]
  initialMeasureEvaluations: ConsultantMeasureEvaluation[]
}

export function ConsultantPortalClient({
  portalId: _portalId,
  portalSlug: _portalSlug,
  evaluatorName,
  insights,
  initialEvaluations,
  measures,
  initialMeasureEvaluations,
}: ConsultantPortalClientProps) {
  // Start on whichever content type has items; prefer insights if both exist
  const [contentType, setContentType] = useState<ContentType>(
    insights.length > 0 ? 'insights' : (measures.length > 0 ? 'measures' : 'insights')
  )

  // ── Insight state ──
  const [evaluations, setEvaluations] = useState<ConsultantEvaluation[]>(initialEvaluations)
  const [insightTab, setInsightTab] = useState<Tab>('toRate')
  const [insightLayout, setInsightLayout] = useState<Layout>('card')
  const [insightCardIndex, setInsightCardIndex] = useState(0)
  const [insightReEvalTarget, setInsightReEvalTarget] = useState<InsightReEvalTarget | null>(null)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('all')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')

  // ── Measure state ──
  const [measureEvaluations, setMeasureEvaluations] = useState<ConsultantMeasureEvaluation[]>(initialMeasureEvaluations)
  const [measureTab, setMeasureTab] = useState<Tab>('toRate')
  const [measureLayout, setMeasureLayout] = useState<Layout>('card')
  const [measureCardIndex, setMeasureCardIndex] = useState(0)
  const [measureReEvalTarget, setMeasureReEvalTarget] = useState<MeasureReEvalTarget | null>(null)
  const [effortFilter, setEffortFilter] = useState<EffortFilter>('all')

  // ── Insight computed ──
  const insightRatedIds = new Set(evaluations.map((e) => e.consultant_insight_id))
  const insightToRate = insights.filter((i) => !insightRatedIds.has(i.id))
  const insightRatedCount = evaluations.length
  const insightTotalCount = insights.length

  const filteredInsights = insights.filter((insight) => {
    const raw = insight.insight_raw ?? {}
    if (typeFilter !== 'all' && getRawType(raw) !== typeFilter) return false
    if (confidenceFilter !== 'all') {
      const pct = getRawConfidencePct(raw)
      if (pct !== null) {
        if (confidenceFilter === '0-25'  && !(pct >= 0  && pct <= 25)) return false
        if (confidenceFilter === '25-50' && !(pct >  25 && pct <= 50)) return false
        if (confidenceFilter === '50-75' && !(pct >  50 && pct <= 75)) return false
        if (confidenceFilter === '75-100'&& !(pct >  75             )) return false
      }
    }
    if (activeFilter !== 'all' && (typeFilter === 'trend' || typeFilter === 'changepoint')) {
      const active = getRawActive(raw)
      if (activeFilter === 'active' && active !== true)  return false
      if (activeFilter === 'ended'  && active !== false) return false
    }
    return true
  })
  const filteredInsightToRate = filteredInsights.filter((i) => !insightRatedIds.has(i.id))

  // ── Measure computed ──
  const measureRatedIds = new Set(measureEvaluations.map((e) => e.consultant_measure_id))
  const measureToRate = measures.filter((m) => !measureRatedIds.has(m.id))
  const measureRatedCount = measureEvaluations.length
  const measureTotalCount = measures.length

  const filteredMeasures = measures.filter((m) => {
    if (effortFilter !== 'all') {
      const raw = m.measure_raw ?? {}
      const level = ((raw as Record<string, unknown>).effort_level as string | undefined)
                 ?? ((raw as Record<string, unknown>).effortLevel as string | undefined)
                 ?? null
      if (level !== effortFilter) return false
    }
    return true
  })
  const filteredMeasureToRate = filteredMeasures.filter((m) => !measureRatedIds.has(m.id))

  // ── Progress (depends on contentType) ──
  const totalCount = contentType === 'insights' ? insightTotalCount : measureTotalCount
  const ratedCount = contentType === 'insights' ? insightRatedCount : measureRatedCount
  const toRateCount = contentType === 'insights' ? insightToRate.length : measureToRate.length
  const progress = totalCount > 0 ? Math.round((ratedCount / totalCount) * 100) : 0

  useEffect(() => {
    if (insightCardIndex >= insightToRate.length && insightToRate.length > 0) {
      setInsightCardIndex(Math.max(0, insightToRate.length - 1))
    }
  }, [insightToRate.length, insightCardIndex])
  useEffect(() => { setInsightCardIndex(0) }, [typeFilter, confidenceFilter, activeFilter])

  useEffect(() => {
    if (measureCardIndex >= measureToRate.length && measureToRate.length > 0) {
      setMeasureCardIndex(Math.max(0, measureToRate.length - 1))
    }
  }, [measureToRate.length, measureCardIndex])
  useEffect(() => { setMeasureCardIndex(0) }, [effortFilter])

  function handleInsightRated(evaluation: ConsultantEvaluation) {
    setEvaluations((prev) => [...prev, evaluation])
    if (insightLayout === 'card') {
      setTimeout(() => setInsightCardIndex((p) => p), 800)
    }
  }
  function handleInsightUpdated(updated: ConsultantEvaluation) {
    setEvaluations((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    setInsightReEvalTarget(null)
  }

  function handleMeasureRated(evaluation: ConsultantMeasureEvaluation) {
    setMeasureEvaluations((prev) => [...prev, evaluation])
    if (measureLayout === 'card') {
      setTimeout(() => setMeasureCardIndex((p) => p), 800)
    }
  }
  function handleMeasureUpdated(updated: ConsultantMeasureEvaluation) {
    setMeasureEvaluations((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    setMeasureReEvalTarget(null)
  }

  // Auto-switch to rated tab when complete
  useEffect(() => {
    if (contentType === 'insights' && insightTotalCount > 0 && insightRatedCount === insightTotalCount && insightTab === 'toRate') {
      setInsightTab('rated')
    }
  }, [insightRatedCount, insightTotalCount, insightTab, contentType])
  useEffect(() => {
    if (contentType === 'measures' && measureTotalCount > 0 && measureRatedCount === measureTotalCount && measureTab === 'toRate') {
      setMeasureTab('rated')
    }
  }, [measureRatedCount, measureTotalCount, measureTab, contentType])

  // Close modals on Escape
  useEffect(() => {
    if (!insightReEvalTarget && !measureReEvalTarget) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setInsightReEvalTarget(null)
        setMeasureReEvalTarget(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [insightReEvalTarget, measureReEvalTarget])

  const currentInsightCard = filteredInsightToRate[insightCardIndex] ?? null
  const currentMeasureCard = filteredMeasureToRate[measureCardIndex] ?? null

  // Active inner tab and layout based on contentType
  const tab = contentType === 'insights' ? insightTab : measureTab
  const setTab = contentType === 'insights' ? setInsightTab : setMeasureTab
  const layout = contentType === 'insights' ? insightLayout : measureLayout
  const setLayout = contentType === 'insights' ? setInsightLayout : setMeasureLayout
  const innerToRateCount = contentType === 'insights' ? filteredInsightToRate.length : filteredMeasureToRate.length

  const showContentSwitcher = insightTotalCount > 0 && measureTotalCount > 0

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#f8f9ff' }}>

      {/* ── Header ── */}
      <div className="border-b shadow-sm" style={{ backgroundColor: '#00095B', borderColor: 'rgba(26,47,238,0.25)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
          <div>
            <p className="text-base font-bold text-white">ecoplanet</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {contentType === 'insights' ? 'Erkenntnis-Evaluierung' : 'Maßnahmen-Evaluierung'} · {evaluatorName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-xs font-semibold text-white">{ratedCount} / {totalCount} bewertet</p>
              <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#059669' : 'rgba(226,236,43,0.9)' }}
                />
              </div>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: 'rgba(226,236,43,0.9)', color: '#00095B' }}>
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden" style={{ backgroundColor: '#00095B' }}>
        <div className="relative mx-auto max-w-6xl px-6 pb-10 pt-6 md:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: '#AEAEAE' }}>
                {contentType === 'insights'
                  ? 'Qualitätsbewertung KI-Erkenntnisse'
                  : 'Qualitätsbewertung KI-Maßnahmen'}
              </p>
              <h1 className="text-2xl font-bold text-white md:text-3xl">{evaluatorName}</h1>
              <p className="mt-2 text-sm" style={{ color: '#AEAEAE' }}>
                {contentType === 'insights'
                  ? 'Bitte bewerten Sie jede Erkenntnis anhand der vier Qualitätskriterien.'
                  : 'Bitte bewerten Sie jede Maßnahme anhand der fünf Qualitätskriterien.'}
              </p>
            </div>
            <div className="shrink-0 rounded-xl border px-5 py-3" style={{ backgroundColor: '#0D1166', borderColor: 'rgba(26,47,238,0.25)' }}>
              <div className="flex gap-6">
                {[
                  { label: 'Gesamt', value: totalCount, color: 'text-white' },
                  { label: 'Bewertet', value: ratedCount, color: '#059669' },
                  { label: 'Offen', value: toRateCount, color: 'rgba(226,236,43,0.9)' },
                ].map(({ label, value, color }, i, arr) => (
                  <div key={label} className="flex gap-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#AEAEAE' }}>{label}</p>
                      <p className="mt-0.5 font-mono text-2xl font-bold" style={{ color: color === 'text-white' ? '#ffffff' : color }}>{value}</p>
                    </div>
                    {i < arr.length - 1 && <div className="w-px self-stretch" style={{ backgroundColor: 'rgba(26,47,238,0.25)' }} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="relative h-10">
          <svg viewBox="0 0 1440 40" fill="none" className="absolute bottom-0 w-full" preserveAspectRatio="none">
            <path d="M0 20C240 40 480 40 720 20C960 0 1200 0 1440 20V40H0V20Z" fill="#f8f9ff" />
          </svg>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 md:px-10">

        {/* Content type switcher — only when both have items */}
        {showContentSwitcher && (
          <div className="mb-5 flex justify-center">
            <div className="flex rounded-xl border p-1" style={{ backgroundColor: '#ffffff', borderColor: '#E5E5E5' }}>
              {[
                { key: 'insights' as ContentType, icon: Lightbulb, label: 'Erkenntnisse', count: insightTotalCount, rated: insightRatedCount },
                { key: 'measures' as ContentType, icon: Wrench,    label: 'Maßnahmen',    count: measureTotalCount, rated: measureRatedCount },
              ].map(({ key, icon: Icon, label, count, rated }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setContentType(key)}
                  className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all"
                  style={contentType === key
                    ? { backgroundColor: '#1A2FEE', color: '#ffffff' }
                    : { backgroundColor: 'transparent', color: '#737373' }}
                >
                  <Icon className="size-4" />
                  {label} ({rated}/{count})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab bar + layout toggle ── */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex rounded-xl border p-1" style={{ backgroundColor: '#ffffff', borderColor: '#E5E5E5' }}>
            {[
              { key: 'toRate' as Tab, label: `Zu bewerten (${toRateCount})` },
              { key: 'rated' as Tab,  label: `Bereits bewertet (${ratedCount})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className="rounded-lg px-4 py-2 text-xs font-semibold transition-all"
                style={tab === key
                  ? { backgroundColor: '#1A2FEE', color: '#ffffff' }
                  : { backgroundColor: 'transparent', color: '#737373' }}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'toRate' && toRateCount > 0 && (
            <div className="flex rounded-xl border p-1" style={{ backgroundColor: '#ffffff', borderColor: '#E5E5E5' }}>
              {[
                { key: 'list' as Layout, icon: LayoutList, title: 'Listenansicht' },
                { key: 'card' as Layout, icon: CreditCard, title: 'Kartenansicht' },
              ].map(({ key, icon: Icon, title }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLayout(key)}
                  title={title}
                  className="rounded-lg p-2 transition-all"
                  style={layout === key
                    ? { backgroundColor: '#1A2FEE', color: '#ffffff' }
                    : { backgroundColor: 'transparent', color: '#737373' }}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Filters (insights) ── */}
        {contentType === 'insights' && (
          <div className="mb-5 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider w-20 shrink-0" style={{ color: '#AEAEAE' }}>Typ</span>
              {([
                { key: 'all',          label: 'Alle' },
                { key: 'anomaly',      label: 'Anomalie' },
                { key: 'trend',        label: 'Trend' },
                { key: 'changepoint',  label: 'Changepoint' },
                { key: 'structural',   label: 'Strukturell' },
              ] as { key: TypeFilter; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setTypeFilter(key)
                    if (key !== 'trend' && key !== 'changepoint') setActiveFilter('all')
                  }}
                  className="rounded-full px-3 py-1 text-xs font-semibold transition-all"
                  style={typeFilter === key
                    ? { backgroundColor: '#1A2FEE', color: '#ffffff' }
                    : { backgroundColor: '#ffffff', color: '#737373', border: '1px solid #E5E5E5' }}
                >
                  {label}
                </button>
              ))}
            </div>

            {(typeFilter === 'trend' || typeFilter === 'changepoint') && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider w-20 shrink-0" style={{ color: '#AEAEAE' }}>Status</span>
                {([
                  { key: 'all',    label: 'Alle' },
                  { key: 'active', label: 'Aktiv' },
                  { key: 'ended',  label: 'Beendet' },
                ] as { key: ActiveFilter; label: string }[]).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveFilter(key)}
                    className="rounded-full px-3 py-1 text-xs font-semibold transition-all"
                    style={activeFilter === key
                      ? { backgroundColor: '#1A2FEE', color: '#ffffff' }
                      : { backgroundColor: '#ffffff', color: '#737373', border: '1px solid #E5E5E5' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {(typeFilter !== 'all' || activeFilter !== 'all') && (
              <p className="text-[11px]" style={{ color: '#9ca3af' }}>
                {filteredInsights.length} von {insights.length} Erkenntnissen entsprechen den Filtern
              </p>
            )}
          </div>
        )}

        {/* ── Filters (measures) ── */}
        {contentType === 'measures' && (
          <div className="mb-5 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider w-20 shrink-0" style={{ color: '#AEAEAE' }}>Aufwand</span>
              {([
                { key: 'all',    label: 'Alle' },
                { key: 'LOW',    label: 'Gering' },
                { key: 'MEDIUM', label: 'Mittel' },
                { key: 'HIGH',   label: 'Hoch' },
              ] as { key: EffortFilter; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setEffortFilter(key)}
                  className="rounded-full px-3 py-1 text-xs font-semibold transition-all"
                  style={effortFilter === key
                    ? { backgroundColor: '#1A2FEE', color: '#ffffff' }
                    : { backgroundColor: '#ffffff', color: '#737373', border: '1px solid #E5E5E5' }}
                >
                  {label}
                </button>
              ))}
            </div>
            {effortFilter !== 'all' && (
              <p className="text-[11px]" style={{ color: '#9ca3af' }}>
                {filteredMeasures.length} von {measures.length} Maßnahmen entsprechen dem Filter
              </p>
            )}
          </div>
        )}

        {/* ── Insights content ── */}
        {contentType === 'insights' && tab === 'toRate' && (
          <>
            {filteredInsightToRate.length === 0 ? (
              <EmptyState
                label={insightRatedCount === insightTotalCount && insightTotalCount > 0 ? 'Alle Erkenntnisse bewertet!' : 'Keine Erkenntnisse vorhanden'}
                onSwitchToRated={() => setInsightTab('rated')}
                hasRated={insightRatedCount > 0}
              />
            ) : insightLayout === 'list' ? (
              <div className="flex flex-col gap-6">
                {filteredInsightToRate.map((insight, idx) => (
                  <ConsultantInsightCard
                    key={insight.id}
                    insight={insight}
                    index={idx}
                    evaluation={null}
                    evaluatorName={evaluatorName}
                    onRated={handleInsightRated}
                  />
                ))}
              </div>
            ) : (
              <CardViewNav
                index={insightCardIndex}
                total={filteredInsightToRate.length}
                onPrev={() => setInsightCardIndex((p) => Math.max(0, p - 1))}
                onNext={() => setInsightCardIndex((p) => Math.min(filteredInsightToRate.length - 1, p + 1))}
              >
                {currentInsightCard && (
                  <ConsultantInsightCard
                    key={currentInsightCard.id}
                    insight={currentInsightCard}
                    index={filteredInsights.indexOf(currentInsightCard)}
                    evaluation={null}
                    evaluatorName={evaluatorName}
                    onRated={(ev) => {
                      handleInsightRated(ev)
                      setTimeout(() => {
                        setInsightCardIndex((prev) => Math.min(prev, Math.max(0, filteredInsightToRate.length - 2)))
                      }, 1000)
                    }}
                  />
                )}
              </CardViewNav>
            )}
          </>
        )}

        {contentType === 'insights' && tab === 'rated' && (
          <RatedInsightsList
            insights={insights}
            evaluations={evaluations}
            onReEvaluate={(insight, evaluation) => setInsightReEvalTarget({ insight, evaluation })}
          />
        )}

        {/* ── Measures content ── */}
        {contentType === 'measures' && tab === 'toRate' && (
          <>
            {filteredMeasureToRate.length === 0 ? (
              <EmptyState
                label={measureRatedCount === measureTotalCount && measureTotalCount > 0 ? 'Alle Maßnahmen bewertet!' : 'Keine Maßnahmen vorhanden'}
                onSwitchToRated={() => setMeasureTab('rated')}
                hasRated={measureRatedCount > 0}
              />
            ) : measureLayout === 'list' ? (
              <div className="flex flex-col gap-6">
                {filteredMeasureToRate.map((measure, idx) => (
                  <ConsultantMeasureCard
                    key={measure.id}
                    measure={measure}
                    index={idx}
                    evaluation={null}
                    evaluatorName={evaluatorName}
                    onRated={handleMeasureRated}
                  />
                ))}
              </div>
            ) : (
              <CardViewNav
                index={measureCardIndex}
                total={filteredMeasureToRate.length}
                onPrev={() => setMeasureCardIndex((p) => Math.max(0, p - 1))}
                onNext={() => setMeasureCardIndex((p) => Math.min(filteredMeasureToRate.length - 1, p + 1))}
              >
                {currentMeasureCard && (
                  <ConsultantMeasureCard
                    key={currentMeasureCard.id}
                    measure={currentMeasureCard}
                    index={filteredMeasures.indexOf(currentMeasureCard)}
                    evaluation={null}
                    evaluatorName={evaluatorName}
                    onRated={(ev) => {
                      handleMeasureRated(ev)
                      setTimeout(() => {
                        setMeasureCardIndex((prev) => Math.min(prev, Math.max(0, filteredMeasureToRate.length - 2)))
                      }, 1000)
                    }}
                  />
                )}
              </CardViewNav>
            )}
          </>
        )}

        {contentType === 'measures' && tab === 'rated' && (
          <RatedMeasuresList
            measures={measures}
            evaluations={measureEvaluations}
            onReEvaluate={(measure, evaluation) => setMeasureReEvalTarget({ measure, evaluation })}
          />
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{ backgroundColor: '#00095B' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-10">
          <p className="text-xs font-bold text-white">ecoplanet</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Energie-Intelligence für die Industrie</p>
        </div>
      </footer>

      {/* ── Re-evaluate insight modal ── */}
      {insightReEvalTarget && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8"
          style={{ backgroundColor: 'rgba(0,9,91,0.6)', backdropFilter: 'blur(2px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setInsightReEvalTarget(null) }}
        >
          <div className="w-full max-w-5xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Bewertung ändern</p>
              <button
                type="button"
                onClick={() => setInsightReEvalTarget(null)}
                className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                <X className="size-4" />
              </button>
            </div>

            <ConsultantInsightCard
              insight={insightReEvalTarget.insight}
              index={insights.indexOf(insightReEvalTarget.insight)}
              evaluation={null}
              evaluatorName={evaluatorName}
              onRated={handleInsightUpdated}
              existingEvaluationId={insightReEvalTarget.evaluation.id}
              initialValues={{
                verstaendlichkeit: insightReEvalTarget.evaluation.verstaendlichkeit,
                plausibilitaet:    insightReEvalTarget.evaluation.plausibilitaet,
                aktionabilitaet:   insightReEvalTarget.evaluation.aktionabilitaet,
                gesamteindruck:    insightReEvalTarget.evaluation.gesamteindruck,
                notes:             insightReEvalTarget.evaluation.notes,
              } satisfies InitialRatingValues}
            />
          </div>
        </div>
      )}

      {/* ── Re-evaluate measure modal ── */}
      {measureReEvalTarget && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8"
          style={{ backgroundColor: 'rgba(0,9,91,0.6)', backdropFilter: 'blur(2px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setMeasureReEvalTarget(null) }}
        >
          <div className="w-full max-w-5xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Bewertung ändern</p>
              <button
                type="button"
                onClick={() => setMeasureReEvalTarget(null)}
                className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                <X className="size-4" />
              </button>
            </div>

            <ConsultantMeasureCard
              measure={measureReEvalTarget.measure}
              index={measures.indexOf(measureReEvalTarget.measure)}
              evaluation={null}
              evaluatorName={evaluatorName}
              onRated={handleMeasureUpdated}
              existingEvaluationId={measureReEvalTarget.evaluation.id}
              initialValues={{
                verstaendlichkeit:  measureReEvalTarget.evaluation.verstaendlichkeit,
                plausibilitaet:     measureReEvalTarget.evaluation.plausibilitaet,
                wirtschaftlichkeit: measureReEvalTarget.evaluation.wirtschaftlichkeit,
                umsetzbarkeit:      measureReEvalTarget.evaluation.umsetzbarkeit,
                gesamteindruck:     measureReEvalTarget.evaluation.gesamteindruck,
                notes:              measureReEvalTarget.evaluation.notes,
              } satisfies InitialMeasureRatingValues}
            />
          </div>
        </div>
      )}

    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function EmptyState({ label, onSwitchToRated, hasRated }: {
  label: string
  onSwitchToRated: () => void
  hasRated: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="text-2xl">✓</p>
      <p className="text-base font-bold" style={{ color: '#059669' }}>{label}</p>
      {hasRated && (
        <>
          <p className="text-sm" style={{ color: '#737373' }}>
            Wechseln Sie zum Tab &quot;Bereits bewertet&quot; um alle Bewertungen einzusehen.
          </p>
          <button
            type="button"
            onClick={onSwitchToRated}
            className="mt-2 rounded-xl px-6 py-2.5 text-sm font-bold"
            style={{ backgroundColor: '#1A2FEE', color: '#ffffff' }}
          >
            Bewertungen ansehen
          </button>
        </>
      )}
    </div>
  )
}

function CardViewNav({
  index, total, onPrev, onNext, children,
}: {
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={index === 0}
          onClick={onPrev}
          className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition-all disabled:opacity-30"
          style={{ borderColor: '#E5E5E5', color: '#374151', backgroundColor: '#ffffff' }}
        >
          <ChevronLeft className="size-4" /> Zurück
        </button>
        <span className="text-sm font-medium" style={{ color: '#737373' }}>
          {index + 1} / {total} noch zu bewerten
        </span>
        <button
          type="button"
          disabled={index >= total - 1}
          onClick={onNext}
          className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition-all disabled:opacity-30"
          style={{ borderColor: '#E5E5E5', color: '#374151', backgroundColor: '#ffffff' }}
        >
          Weiter <ChevronRight className="size-4" />
        </button>
      </div>
      {children}
    </div>
  )
}
