'use client'

import { useState, useEffect } from 'react'
import { RunSelector } from '@/components/runs/run-selector'
import { CompareView } from '@/components/compare/compare-view'
import type { RunWithStats, RunDetail } from '@/lib/types'
import { getRunDetail } from '@/actions/runs'
import { Loader2, ArrowLeftRight } from 'lucide-react'

interface ComparePageClientProps {
  companyId: string
  runs: RunWithStats[]
  initialRunAId?: string
  initialRunBId?: string
}

export function ComparePageClient({
  runs,
  initialRunAId,
  initialRunBId,
}: ComparePageClientProps) {
  const [runAId, setRunAId] = useState(initialRunAId ?? '')
  const [runBId, setRunBId] = useState(initialRunBId ?? '')
  const [runADetail, setRunADetail] = useState<RunDetail | null>(null)
  const [runBDetail, setRunBDetail] = useState<RunDetail | null>(null)
  const [loadingA, setLoadingA] = useState(false)
  const [loadingB, setLoadingB] = useState(false)

  useEffect(() => {
    if (!runAId) {
      setRunADetail(null)
      return
    }
    setLoadingA(true)
    getRunDetail(runAId)
      .then((detail) => setRunADetail(detail))
      .finally(() => setLoadingA(false))
  }, [runAId])

  useEffect(() => {
    if (!runBId) {
      setRunBDetail(null)
      return
    }
    setLoadingB(true)
    getRunDetail(runBId)
      .then((detail) => setRunBDetail(detail))
      .finally(() => setLoadingB(false))
  }, [runBId])

  const bothSelected = runAId && runBId
  const bothLoaded = runADetail && runBDetail
  const loading = loadingA || loadingB

  return (
    <div className="flex flex-col gap-6">
      {/* Selectors */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Run A (Baseline)
          </p>
          <RunSelector
            runs={runs}
            value={runAId}
            onChange={setRunAId}
            placeholder="Select Run A…"
          />
        </div>

        <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted">
          <ArrowLeftRight className="size-4 text-muted-foreground" />
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Run B (Comparison)
          </p>
          <RunSelector
            runs={runs}
            value={runBId}
            onChange={setRunBId}
            placeholder="Select Run B…"
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading run details…
        </div>
      )}

      {/* Prompt to select runs */}
      {!bothSelected && !loading && (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          Select two runs above to start comparing.
        </div>
      )}

      {/* Same run selected */}
      {bothSelected && runAId === runBId && !loading && (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          Please select two different runs to compare.
        </div>
      )}

      {/* Compare view */}
      {bothSelected &&
        runAId !== runBId &&
        bothLoaded &&
        !loading && (
          <CompareView runA={runADetail} runB={runBDetail} />
        )}
    </div>
  )
}
