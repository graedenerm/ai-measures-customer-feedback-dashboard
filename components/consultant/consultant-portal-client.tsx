'use client'

import { useState, useEffect } from 'react'
import { LayoutList, CreditCard, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { ConsultantInsightCard } from './consultant-insight-card'
import { RatedInsightsList } from './rated-insights-list'
import type { ConsultantInsight, ConsultantEvaluation } from '@/lib/consultant-types'
import type { InitialRatingValues } from './consultant-rating-form'

type Tab = 'toRate' | 'rated'
type Layout = 'list' | 'card'

interface ReEvalTarget {
  insight: ConsultantInsight
  evaluation: ConsultantEvaluation
}

interface ConsultantPortalClientProps {
  portalId: string
  portalSlug: string
  evaluatorName: string
  insights: ConsultantInsight[]
  initialEvaluations: ConsultantEvaluation[]
}

export function ConsultantPortalClient({
  portalId: _portalId,
  portalSlug: _portalSlug,
  evaluatorName,
  insights,
  initialEvaluations,
}: ConsultantPortalClientProps) {
  const [evaluations, setEvaluations] = useState<ConsultantEvaluation[]>(initialEvaluations)
  const [tab, setTab] = useState<Tab>('toRate')
  const [layout, setLayout] = useState<Layout>('card')
  const [cardIndex, setCardIndex] = useState(0)
  const [reEvalTarget, setReEvalTarget] = useState<ReEvalTarget | null>(null)

  const ratedIds = new Set(evaluations.map((e) => e.consultant_insight_id))
  const toRate = insights.filter((i) => !ratedIds.has(i.id))
  const evalMap = new Map(evaluations.map((e) => [e.consultant_insight_id, e]))

  const ratedCount = evaluations.length  // one evaluation per insight
  const totalCount = insights.length
  const progress = totalCount > 0 ? Math.round((ratedCount / totalCount) * 100) : 0

  useEffect(() => {
    if (cardIndex >= toRate.length && toRate.length > 0) {
      setCardIndex(Math.max(0, toRate.length - 1))
    }
  }, [toRate.length, cardIndex])

  // New evaluation submitted
  function handleRated(evaluation: ConsultantEvaluation) {
    setEvaluations((prev) => [...prev, evaluation])
    if (layout === 'card') {
      setTimeout(() => setCardIndex((p) => p), 800)
    }
  }

  // Existing evaluation updated via modal
  function handleUpdated(updatedEvaluation: ConsultantEvaluation) {
    setEvaluations((prev) =>
      prev.map((e) => (e.id === updatedEvaluation.id ? updatedEvaluation : e))
    )
    setReEvalTarget(null)
  }

  useEffect(() => {
    if (totalCount > 0 && ratedCount === totalCount && tab === 'toRate') {
      setTab('rated')
    }
  }, [ratedCount, totalCount, tab])

  // Close modal on Escape
  useEffect(() => {
    if (!reEvalTarget) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setReEvalTarget(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reEvalTarget])

  const currentCardInsight = toRate[cardIndex] ?? null

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#f8f9ff' }}>

      {/* ── Header ── */}
      <div className="border-b shadow-sm" style={{ backgroundColor: '#00095B', borderColor: 'rgba(26,47,238,0.25)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
          <div>
            <p className="text-base font-bold text-white">ecoplanet</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Erkenntnis-Evaluierung · {evaluatorName}</p>
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
                Qualitätsbewertung KI-Erkenntnisse
              </p>
              <h1 className="text-2xl font-bold text-white md:text-3xl">{evaluatorName}</h1>
              <p className="mt-2 text-sm" style={{ color: '#AEAEAE' }}>
                Bitte bewerten Sie jede Erkenntnis anhand der vier Qualitätskriterien.
              </p>
            </div>
            <div className="shrink-0 rounded-xl border px-5 py-3" style={{ backgroundColor: '#0D1166', borderColor: 'rgba(26,47,238,0.25)' }}>
              <div className="flex gap-6">
                {[
                  { label: 'Gesamt', value: totalCount, color: 'text-white' },
                  { label: 'Bewertet', value: ratedCount, color: '#059669' },
                  { label: 'Offen', value: toRate.length, color: 'rgba(226,236,43,0.9)' },
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

        {/* Tab bar + layout toggle */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex rounded-xl border p-1" style={{ backgroundColor: '#ffffff', borderColor: '#E5E5E5' }}>
            {[
              { key: 'toRate' as Tab, label: `Zu bewerten (${toRate.length})` },
              { key: 'rated' as Tab, label: `Bereits bewertet (${ratedCount})` },
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

          {tab === 'toRate' && toRate.length > 0 && (
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

        {/* ── "Zu bewerten" tab ── */}
        {tab === 'toRate' && (
          <>
            {toRate.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <p className="text-2xl">✓</p>
                <p className="text-base font-bold" style={{ color: '#059669' }}>Alle Erkenntnisse bewertet!</p>
                <p className="text-sm" style={{ color: '#737373' }}>
                  Wechseln Sie zum Tab "Bereits bewertet" um alle Bewertungen einzusehen.
                </p>
                <button
                  type="button"
                  onClick={() => setTab('rated')}
                  className="mt-2 rounded-xl px-6 py-2.5 text-sm font-bold"
                  style={{ backgroundColor: '#1A2FEE', color: '#ffffff' }}
                >
                  Bewertungen ansehen
                </button>
              </div>
            ) : layout === 'list' ? (
              <div className="flex flex-col gap-6">
                {insights.map((insight, idx) => (
                  <ConsultantInsightCard
                    key={insight.id}
                    insight={insight}
                    index={idx}
                    evaluation={evalMap.get(insight.id) ?? null}
                    evaluatorName={evaluatorName}
                    onRated={handleRated}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    disabled={cardIndex === 0}
                    onClick={() => setCardIndex((p) => Math.max(0, p - 1))}
                    className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition-all disabled:opacity-30"
                    style={{ borderColor: '#E5E5E5', color: '#374151', backgroundColor: '#ffffff' }}
                  >
                    <ChevronLeft className="size-4" /> Zurück
                  </button>
                  <span className="text-sm font-medium" style={{ color: '#737373' }}>
                    {cardIndex + 1} / {toRate.length} noch zu bewerten
                  </span>
                  <button
                    type="button"
                    disabled={cardIndex >= toRate.length - 1}
                    onClick={() => setCardIndex((p) => Math.min(toRate.length - 1, p + 1))}
                    className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition-all disabled:opacity-30"
                    style={{ borderColor: '#E5E5E5', color: '#374151', backgroundColor: '#ffffff' }}
                  >
                    Weiter <ChevronRight className="size-4" />
                  </button>
                </div>
                {currentCardInsight && (
                  <ConsultantInsightCard
                    key={currentCardInsight.id}
                    insight={currentCardInsight}
                    index={insights.indexOf(currentCardInsight)}
                    evaluation={null}
                    evaluatorName={evaluatorName}
                    onRated={(ev) => {
                      handleRated(ev)
                      setTimeout(() => {
                        setCardIndex((prev) => Math.min(prev, Math.max(0, toRate.length - 2)))
                      }, 1000)
                    }}
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* ── "Bereits bewertet" tab ── */}
        {tab === 'rated' && (
          <RatedInsightsList
            insights={insights}
            evaluations={evaluations}
            onReEvaluate={(insight, evaluation) => setReEvalTarget({ insight, evaluation })}
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

      {/* ── Re-evaluate modal ── */}
      {reEvalTarget && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8"
          style={{ backgroundColor: 'rgba(0,9,91,0.6)', backdropFilter: 'blur(2px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setReEvalTarget(null) }}
        >
          <div className="w-full max-w-5xl">
            {/* Modal header */}
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Bewertung ändern</p>
              <button
                type="button"
                onClick={() => setReEvalTarget(null)}
                className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                <X className="size-4" />
              </button>
            </div>

            {/* The insight card in re-rate mode */}
            <ConsultantInsightCard
              insight={reEvalTarget.insight}
              index={insights.indexOf(reEvalTarget.insight)}
              evaluation={null}
              evaluatorName={evaluatorName}
              onRated={handleUpdated}
              existingEvaluationId={reEvalTarget.evaluation.id}
              initialValues={{
                verstaendlichkeit: reEvalTarget.evaluation.verstaendlichkeit,
                plausibilitaet:    reEvalTarget.evaluation.plausibilitaet,
                aktionabilitaet:   reEvalTarget.evaluation.aktionabilitaet,
                gesamteindruck:    reEvalTarget.evaluation.gesamteindruck,
                notes:             reEvalTarget.evaluation.notes,
              } satisfies InitialRatingValues}
            />
          </div>
        </div>
      )}

    </div>
  )
}
