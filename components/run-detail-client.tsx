'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, ChevronRight } from 'lucide-react'
import { InsightList } from '@/components/insights/insight-list'
import type { RunDetail } from '@/lib/types'

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

  const hasMultipleLocations = locationIds.length > 1
  const [activeLocation, setActiveLocation] = useState<string>('all')

  const handleEvaluationSubmitted = () => router.refresh()

  if (run.insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center m-6" style={{ borderColor: '#E5E5E5' }}>
        <p className="text-sm font-medium" style={{ color: '#737373' }}>
          Keine Erkenntnisse für diesen Durchlauf verfügbar.
        </p>
      </div>
    )
  }

  const visibleInsights =
    activeLocation === 'all'
      ? run.insights
      : run.insights.filter((i) => i.location_id === activeLocation)

  return (
    <div className="p-6 max-w-6xl mx-auto w-full">

      {/* ── Location selector ── */}
      {hasMultipleLocations && (
        <div className="mb-8">
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

      {/* ── Insight list ── */}
      <InsightList insights={visibleInsights} onEvaluationSubmitted={handleEvaluationSubmitted} />
    </div>
  )
}
