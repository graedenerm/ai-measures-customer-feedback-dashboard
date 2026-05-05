'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, ChevronRight, Lightbulb, Wrench, Activity } from 'lucide-react'
import { InsightList } from '@/components/insights/insight-list'
import { MeasureInlineCard } from '@/components/measures/measure-inline-card'
import type { RunDetail } from '@/lib/types'

type CategoryKey = 'trend' | 'changepoint' | 'anomaly' | 'structural'

const CATEGORY_META: Record<CategoryKey, { label: string; color: string; bg: string }> = {
  trend:       { label: 'Trend',         color: '#7c3aed', bg: 'rgba(168,85,247,0.08)' },
  changepoint: { label: 'Niveauwechsel', color: '#ea580c', bg: 'rgba(234,88,12,0.08)' },
  anomaly:     { label: 'Anomalie',      color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  structural:  { label: 'Strukturell',   color: '#1A2FEE', bg: 'rgba(26,47,238,0.08)' },
}
const CATEGORY_ORDER: CategoryKey[] = ['trend', 'changepoint', 'anomaly', 'structural']

function categoryOf(type: string): CategoryKey {
  if (type.includes('anomaly')) return 'anomaly'
  if (type.includes('changepoint')) return 'changepoint'
  if (type.includes('trend')) return 'trend'
  return 'structural'
}

function activeOf(raw: unknown): boolean | null {
  if (raw && typeof raw === 'object' && 'active' in raw) {
    const v = (raw as { active?: unknown }).active
    if (typeof v === 'boolean') return v
  }
  return null
}

interface RunDetailClientProps {
  run: RunDetail
}

export function RunDetailClient({ run }: RunDetailClientProps) {
  const router = useRouter()

  const locationIds = useMemo(() => {
    const ids = new Set<string>()
    for (const insight of run.insights) ids.add(insight.location_id)
    return Array.from(ids)
  }, [run.insights])

  const locationMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const loc of run.locations) map.set(loc.id, loc.title)
    return map
  }, [run.locations])

  const [activeLocation, setActiveLocation] = useState<string>('all')
  const [selectedCategories, setSelectedCategories] = useState<Set<CategoryKey>>(new Set())
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'ended'>('all')
  const [view, setView] = useState<'insights' | 'measures'>('insights')

  const handleEvaluationSubmitted = () => router.refresh()

  const locationFiltered = useMemo(
    () =>
      activeLocation === 'all'
        ? run.insights
        : run.insights.filter((i) => i.location_id === activeLocation),
    [run.insights, activeLocation]
  )

  const categoryCounts = useMemo(() => {
    const counts = new Map<CategoryKey, number>()
    for (const i of locationFiltered) {
      const k = categoryOf(i.type)
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    return counts
  }, [locationFiltered])

  const presentCategories = useMemo(
    () => CATEGORY_ORDER.filter((k) => (categoryCounts.get(k) ?? 0) > 0),
    [categoryCounts]
  )

  const statusCounts = useMemo(() => {
    let active = 0
    let ended = 0
    let total = 0
    for (const i of locationFiltered) {
      const a = activeOf(i.raw_json)
      if (a === true) active++
      else if (a === false) ended++
      if (a !== null) total++
    }
    return { active, ended, total }
  }, [locationFiltered])

  const showStatusFilter = statusCounts.total > 0

  const visibleInsights = useMemo(() => {
    return locationFiltered.filter((i) => {
      if (selectedCategories.size > 0 && !selectedCategories.has(categoryOf(i.type))) return false
      if (statusFilter !== 'all') {
        const a = activeOf(i.raw_json)
        if (statusFilter === 'active' && a !== true) return false
        if (statusFilter === 'ended' && a !== false) return false
      }
      return true
    })
  }, [locationFiltered, selectedCategories, statusFilter])

  const visibleMeasures = useMemo(
    () => visibleInsights.flatMap((i) => i.measures),
    [visibleInsights]
  )

  const toggleCategory = (k: CategoryKey) =>
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  if (run.insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center m-6" style={{ borderColor: '#E5E5E5' }}>
        <p className="text-sm font-medium" style={{ color: '#737373' }}>
          Keine Erkenntnisse für diesen Durchlauf verfügbar.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto w-full">

      {/* ── Location selector (always shown) ── */}
      {locationIds.length > 0 && (
        <div className="mb-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#AEAEAE' }}>
            Standort auswählen
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {/* "All" option */}
            <button
              onClick={() => setActiveLocation('all')}
              className="group flex items-center gap-3 rounded-xl border-2 px-5 py-3.5 text-left transition-all"
              style={{
                borderColor: activeLocation === 'all' ? '#1A2FEE' : '#E5E5E5',
                backgroundColor: activeLocation === 'all' ? 'rgba(26,47,238,0.06)' : '#FFFFFF',
                boxShadow: activeLocation === 'all' ? '0 0 0 3px rgba(26,47,238,0.12)' : 'none',
              }}
            >
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: activeLocation === 'all' ? 'rgba(26,47,238,0.12)' : 'rgba(0,0,0,0.04)' }}
              >
                <MapPin className="size-5" style={{ color: activeLocation === 'all' ? '#1A2FEE' : '#AEAEAE' }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: activeLocation === 'all' ? '#00095B' : '#444444' }}>
                  Alle Standorte
                </p>
                <p className="text-xs" style={{ color: '#AEAEAE' }}>
                  {run.insights.length} Erkenntnisse
                </p>
              </div>
              <ChevronRight
                className="ml-auto size-4"
                style={{ color: activeLocation === 'all' ? '#1A2FEE' : '#AEAEAE' }}
              />
            </button>

            {/* Individual locations */}
            {locationIds.map((locId) => {
              const title = locationMap.get(locId) ?? locId
              const count = run.insights.filter((i) => i.location_id === locId).length
              const isActive = activeLocation === locId
              return (
                <button
                  key={locId}
                  onClick={() => setActiveLocation(locId)}
                  className="group flex items-center gap-3 rounded-xl border-2 px-5 py-3.5 text-left transition-all"
                  style={{
                    borderColor: isActive ? '#1A2FEE' : '#E5E5E5',
                    backgroundColor: isActive ? 'rgba(26,47,238,0.06)' : '#FFFFFF',
                    boxShadow: isActive ? '0 0 0 3px rgba(26,47,238,0.12)' : 'none',
                  }}
                >
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: isActive ? 'rgba(26,47,238,0.12)' : 'rgba(0,0,0,0.04)' }}
                  >
                    <MapPin className="size-5" style={{ color: isActive ? '#1A2FEE' : '#AEAEAE' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: isActive ? '#00095B' : '#444444' }}>
                      {title}
                    </p>
                    <p className="text-xs" style={{ color: '#AEAEAE' }}>
                      {count} Erkenntnisse
                    </p>
                  </div>
                  <ChevronRight
                    className="ml-auto size-4"
                    style={{ color: isActive ? '#1A2FEE' : '#AEAEAE' }}
                  />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Category & status filters ── */}
      {(presentCategories.length > 1 || showStatusFilter) && (
        <div className="mb-6 flex flex-col gap-4">

          {presentCategories.length > 1 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: '#AEAEAE' }}>
                Kategorie
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategories(new Set())}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-all"
                  style={{
                    borderColor: selectedCategories.size === 0 ? '#1A2FEE' : '#E5E5E5',
                    backgroundColor: selectedCategories.size === 0 ? 'rgba(26,47,238,0.06)' : '#FFFFFF',
                    color: selectedCategories.size === 0 ? '#1A2FEE' : '#737373',
                  }}
                >
                  Alle ({locationFiltered.length})
                </button>
                {presentCategories.map((k) => {
                  const meta = CATEGORY_META[k]
                  const isOn = selectedCategories.has(k)
                  return (
                    <button
                      key={k}
                      onClick={() => toggleCategory(k)}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-all"
                      style={{
                        borderColor: isOn ? meta.color : '#E5E5E5',
                        backgroundColor: isOn ? meta.bg : '#FFFFFF',
                        color: isOn ? meta.color : '#737373',
                      }}
                    >
                      {meta.label} ({categoryCounts.get(k) ?? 0})
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {showStatusFilter && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: '#AEAEAE' }}>
                Status
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { key: 'all',    label: 'Alle',    color: '#1A2FEE', bg: 'rgba(26,47,238,0.06)' },
                    { key: 'active', label: 'Aktiv',   color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
                    { key: 'ended',  label: 'Beendet', color: '#737373', bg: 'rgba(0,0,0,0.05)' },
                  ] as const
                ).map(({ key, label, color, bg }) => {
                  const isOn = statusFilter === key
                  return (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(key)}
                      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all"
                      style={{
                        borderColor: isOn ? color : '#E5E5E5',
                        backgroundColor: isOn ? bg : '#FFFFFF',
                        color: isOn ? color : '#737373',
                      }}
                    >
                      {key !== 'all' && <Activity className="size-3" />}
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── View toggle ── */}
      <div className="mb-6 flex gap-2">
        {(
          [
            { key: 'insights', label: 'Erkenntnisse', Icon: Lightbulb, count: visibleInsights.length },
            { key: 'measures', label: 'Maßnahmen',    Icon: Wrench,    count: visibleMeasures.length },
          ] as const
        ).map(({ key, label, Icon, count }) => {
          const active = view === key
          return (
            <button
              key={key}
              onClick={() => setView(key)}
              className="flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all"
              style={{
                borderColor: active ? '#1A2FEE' : '#E5E5E5',
                backgroundColor: active ? 'rgba(26,47,238,0.06)' : '#FFFFFF',
                color: active ? '#1A2FEE' : '#737373',
                boxShadow: active ? '0 0 0 3px rgba(26,47,238,0.1)' : 'none',
              }}
            >
              <Icon className="size-4" />
              {label}
              <span
                className="rounded-full px-1.5 py-0.5 text-[11px] font-bold"
                style={{
                  backgroundColor: active ? '#1A2FEE' : '#F0F0F0',
                  color: active ? '#FFFFFF' : '#737373',
                }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Content ── */}
      {view === 'insights' ? (
        <InsightList insights={visibleInsights} onEvaluationSubmitted={handleEvaluationSubmitted} />
      ) : (
        <div className="flex flex-col gap-4">
          {visibleMeasures.length === 0 ? (
            <div className="flex items-center justify-center rounded-xl border border-dashed p-16 text-center" style={{ borderColor: '#E5E5E5' }}>
              <p className="text-sm" style={{ color: '#737373' }}>Keine Maßnahmen verfügbar.</p>
            </div>
          ) : (
            visibleMeasures.map((measure, i) => (
              <MeasureInlineCard
                key={measure.id}
                measure={measure}
                index={i}
                onEvaluationSubmitted={handleEvaluationSubmitted}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
