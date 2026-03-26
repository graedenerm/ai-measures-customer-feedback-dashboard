import { MeasureCard } from './measure-card'
import type { Measure, Evaluation } from '@/lib/types'

interface MeasureListProps {
  measures: (Measure & { evaluations: Evaluation[] })[]
  onEvaluationSubmitted?: () => void
  compact?: boolean
}

export function MeasureList({ measures, onEvaluationSubmitted, compact }: MeasureListProps) {
  if (measures.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No measures linked to this insight.
      </p>
    )
  }

  return (
    <div className={compact ? 'flex flex-col' : 'flex flex-col gap-3'}>
      {measures.map((measure, i) => (
        <MeasureCard
          key={measure.id}
          measure={measure}
          index={i}
          onEvaluationSubmitted={onEvaluationSubmitted}
          compact={compact}
        />
      ))}
    </div>
  )
}
