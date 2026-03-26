'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { InsightList } from '@/components/insights/insight-list'
import { ViewModeProvider, useViewMode } from '@/lib/view-mode-context'
import type { RunDetail } from '@/lib/types'
import { AlignJustify, LayoutList } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RunDetailClientProps {
  run: RunDetail
}

function ViewToggle() {
  const { viewMode, setViewMode } = useViewMode()
  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-muted p-0.5">
      <button
        onClick={() => setViewMode('compact')}
        className={cn(
          'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
          viewMode === 'compact'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <AlignJustify className="size-3.5" />
        Compact
      </button>
      <button
        onClick={() => setViewMode('detailed')}
        className={cn(
          'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
          viewMode === 'detailed'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <LayoutList className="size-3.5" />
        Detailed
      </button>
    </div>
  )
}

function RunDetailContent({ run }: RunDetailClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>('all')

  const locationMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const loc of run.locations) {
      map.set(loc.id, loc.title)
    }
    return map
  }, [run.locations])

  const locationIds = useMemo(() => {
    const ids = new Set<string>()
    for (const insight of run.insights) {
      ids.add(insight.location_id)
    }
    return Array.from(ids)
  }, [run.insights])

  const hasMultipleLocations = locationIds.length > 1

  const handleEvaluationSubmitted = () => {
    router.refresh()
  }

  if (run.insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-16 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          No insights found for this run.
        </p>
      </div>
    )
  }

  if (!hasMultipleLocations) {
    return (
      <InsightList
        insights={run.insights}
        onEvaluationSubmitted={handleEvaluationSubmitted}
      />
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-4">
        <TabsTrigger value="all">All ({run.insights.length})</TabsTrigger>
        {locationIds.map((locId) => {
          const title = locationMap.get(locId) ?? locId
          const count = run.insights.filter((i) => i.location_id === locId).length
          return (
            <TabsTrigger key={locId} value={locId}>
              {title} ({count})
            </TabsTrigger>
          )
        })}
      </TabsList>

      <TabsContent value="all">
        <InsightList
          insights={run.insights}
          onEvaluationSubmitted={handleEvaluationSubmitted}
        />
      </TabsContent>

      {locationIds.map((locId) => (
        <TabsContent key={locId} value={locId}>
          <InsightList
            insights={run.insights.filter((i) => i.location_id === locId)}
            onEvaluationSubmitted={handleEvaluationSubmitted}
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}

export function RunDetailClient({ run }: RunDetailClientProps) {
  return (
    <ViewModeProvider>
      {/* Sticky view-mode bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-background px-6 py-2">
        <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
          <p className="text-xs text-muted-foreground">
            {run.insights.length} insight{run.insights.length !== 1 ? 's' : ''}
            {' · '}
            {run.insights.reduce((acc, i) => acc + i.measures.length, 0)} measures
          </p>
          <ViewToggle />
        </div>
      </div>
      <div className="p-6 max-w-5xl mx-auto w-full">
        <RunDetailContent run={run} />
      </div>
    </ViewModeProvider>
  )
}
