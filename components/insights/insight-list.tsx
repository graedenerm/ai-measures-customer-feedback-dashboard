import { InsightCard } from './insight-card'
import type { InsightWithMeasures } from '@/lib/types'

interface InsightListProps {
  insights: InsightWithMeasures[]
  onEvaluationSubmitted?: () => void
}

export function InsightList({ insights, onEvaluationSubmitted }: InsightListProps) {
  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          No insights found for this location.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {insights.map((insight, i) => (
        <InsightCard
          key={insight.id}
          insight={insight}
          index={i}
          onEvaluationSubmitted={onEvaluationSubmitted}
        />
      ))}
    </div>
  )
}
