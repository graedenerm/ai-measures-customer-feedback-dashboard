import type { RunDetail, Insight } from '@/lib/types'
import { CompareItem } from './compare-item'
import { Badge } from '@/components/ui/badge'

interface CompareViewProps {
  runA: RunDetail
  runB: RunDetail
}

export function CompareView({ runA, runB }: CompareViewProps) {
  // Index insights by original_id
  const mapA = new Map<string, Insight>(
    runA.insights.map((i) => [i.original_id, i])
  )
  const mapB = new Map<string, Insight>(
    runB.insights.map((i) => [i.original_id, i])
  )

  const allOriginalIds = new Set([
    ...Array.from(mapA.keys()),
    ...Array.from(mapB.keys()),
  ])

  const matching: string[] = []
  const onlyInA: string[] = []
  const onlyInB: string[] = []

  for (const id of allOriginalIds) {
    const inA = mapA.has(id)
    const inB = mapB.has(id)
    if (inA && inB) matching.push(id)
    else if (inA) onlyInA.push(id)
    else onlyInB.push(id)
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Run headers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Run A
          </p>
          <p className="mt-1 font-semibold">{runA.company.name}</p>
          <p className="text-sm text-muted-foreground">
            v{runA.version} —{' '}
            {new Date(runA.run_date).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <Badge variant="secondary" className="mt-2">
            {runA.insights.length} insights
          </Badge>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Run B
          </p>
          <p className="mt-1 font-semibold">{runB.company.name}</p>
          <p className="text-sm text-muted-foreground">
            v{runB.version} —{' '}
            {new Date(runB.run_date).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <Badge variant="secondary" className="mt-2">
            {runB.insights.length} insights
          </Badge>
        </div>
      </div>

      {/* Matching insights */}
      {matching.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold">
              Matching Insights ({matching.length})
            </h3>
            <Badge variant="outline" className="text-xs">
              In both runs
            </Badge>
          </div>
          <div className="flex flex-col gap-3">
            {matching.map((id) => (
              <CompareItem
                key={id}
                insightA={mapA.get(id) ?? null}
                insightB={mapB.get(id) ?? null}
              />
            ))}
          </div>
        </section>
      )}

      {/* New in B */}
      {onlyInB.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold">
              New Insights in Run B ({onlyInB.length})
            </h3>
            <Badge className="bg-emerald-500 text-white text-xs">New</Badge>
          </div>
          <div className="flex flex-col gap-3">
            {onlyInB.map((id) => (
              <div
                key={id}
                className="rounded-lg border border-emerald-200 bg-emerald-50/30"
              >
                <CompareItem
                  insightA={null}
                  insightB={mapB.get(id) ?? null}
                  label="New in Run B"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Removed from A */}
      {onlyInA.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold">
              Removed Insights (only in Run A, {onlyInA.length})
            </h3>
            <Badge variant="destructive" className="text-xs">
              Removed
            </Badge>
          </div>
          <div className="flex flex-col gap-3">
            {onlyInA.map((id) => (
              <div
                key={id}
                className="rounded-lg border border-red-200 bg-red-50/30"
              >
                <CompareItem
                  insightA={mapA.get(id) ?? null}
                  insightB={null}
                  label="Removed in Run B"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {allOriginalIds.size === 0 && (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          Both runs have no insights to compare.
        </div>
      )}
    </div>
  )
}
