'use client'

import { useState, useEffect } from 'react'
import { LayoutList, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react'
import { ConsultantInsightCard } from './consultant-insight-card'
import { RatedInsightsList } from './rated-insights-list'
import type { ConsultantInsight, ConsultantEvaluation } from '@/lib/consultant-types'

type Tab = 'toRate' | 'rated'
type Layout = 'list' | 'card'

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
  const [layout, setLayout] = useState<Layout>('list')
  const [cardIndex, setCardIndex] = useState(0)

  const ratedIds = new Set(evaluations.map((e) => e.consultant_insight_id))
  const toRate = insights.filter((i) => !ratedIds.has(i.id))
  const rated = insights.filter((i) => ratedIds.has(i.id))
  const evalMap = new Map(evaluations.map((e) => [e.consultant_insight_id, e]))

  const ratedCount = rated.length
  const totalCount = insights.length
  const progress = totalCount > 0 ? Math.round((ratedCount / totalCount) * 100) : 0

  // Reset card index when toRate list changes
  useEffect(() => {
    if (cardIndex >= toRate.length && toRate.length > 0) {
      setCardIndex(Math.max(0, toRate.length - 1))
    }
  }, [toRate.length, cardIndex])

  function handleRated(evaluation: ConsultantEvaluation) {
    setEvaluations((prev) => [...prev, evaluation])
    // In card view: auto-advance after a brief pause
    if (layout === 'card') {
      setTimeout(() => {
        setCardIndex((prev) => prev) // stay — the list will shrink, index auto-adjusts
      }, 800)
    }
  }

  // Switch to "rated" tab automatically when everything is done
  useEffect(() => {
    if (totalCount > 0 && ratedCount === totalCount && tab === 'toRate') {
      setTab('rated')
    }
  }, [ratedCount, totalCount, tab])

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
          {/* Progress */}
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
            <span
              className="rounded-full px-3 py-1 text-xs font-bold"
              style={{ backgroundColor: 'rgba(226,236,43,0.9)', color: '#00095B' }}
            >
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Hero wave ── */}
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
            {/* Stats */}
            <div className="shrink-0 rounded-xl border px-5 py-3" style={{ backgroundColor: '#0D1166', borderColor: 'rgba(26,47,238,0.25)' }}>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#AEAEAE' }}>Gesamt</p>
                  <p className="mt-0.5 font-mono text-2xl font-bold text-white">{totalCount}</p>
                </div>
                <div className="w-px" style={{ backgroundColor: 'rgba(26,47,238,0.25)' }} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#AEAEAE' }}>Bewertet</p>
                  <p className="mt-0.5 font-mono text-2xl font-bold" style={{ color: '#059669' }}>{ratedCount}</p>
                </div>
                <div className="w-px" style={{ backgroundColor: 'rgba(26,47,238,0.25)' }} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#AEAEAE' }}>Offen</p>
                  <p className="mt-0.5 font-mono text-2xl font-bold" style={{ color: 'rgba(226,236,43,0.9)' }}>{toRate.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Wave divider */}
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
          {/* Tabs */}
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

          {/* Layout toggle — only in "to rate" tab */}
          {tab === 'toRate' && toRate.length > 0 && (
            <div className="flex rounded-xl border p-1" style={{ backgroundColor: '#ffffff', borderColor: '#E5E5E5' }}>
              {[
                { key: 'list' as Layout, icon: LayoutList, title: 'Listenansicht' },
                { key: 'card' as Layout, icon: CreditCard, title: 'Kartenansicht (eine nach der anderen)' },
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
              /* ── List view: all remaining insights ── */
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
              /* ── Card view: one at a time ── */
              <div className="flex flex-col gap-4">
                {/* Navigation */}
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

                {/* Current card */}
                {currentCardInsight && (
                  <ConsultantInsightCard
                    key={currentCardInsight.id}
                    insight={currentCardInsight}
                    index={insights.indexOf(currentCardInsight)}
                    evaluation={null}
                    evaluatorName={evaluatorName}
                    onRated={(ev) => {
                      handleRated(ev)
                      // Advance after brief pause (the card will disappear from toRate)
                      setTimeout(() => {
                        setCardIndex((prev) => {
                          const nextLen = toRate.length - 1  // after removal
                          return Math.min(prev, Math.max(0, nextLen - 1))
                        })
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
          <RatedInsightsList insights={insights} evaluations={evaluations} />
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{ backgroundColor: '#00095B' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-10">
          <p className="text-xs font-bold text-white">ecoplanet</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Energie-Intelligence für die Industrie
          </p>
        </div>
      </footer>
    </div>
  )
}
