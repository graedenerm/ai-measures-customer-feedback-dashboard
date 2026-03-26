import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'
import type { RunWithStats } from '@/lib/types'
import { CalendarDays, Lightbulb, Wrench, Users, ThumbsUp, ThumbsDown, Minus } from 'lucide-react'

function ImpressionBlock({
  pos,
  neu,
  neg,
  total,
}: {
  pos: number
  neu: number
  neg: number
  total: number
}) {
  if (total === 0) {
    return <p className="text-xs text-muted-foreground">No ratings yet</p>
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-emerald-600">
          <ThumbsUp className="size-3.5" />
          <span className="text-xs font-medium">Positive</span>
        </div>
        <span className="text-xs font-bold tabular-nums">{pos}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <Minus className="size-3.5" />
          <span className="text-xs font-medium">Neutral</span>
        </div>
        <span className="text-xs font-bold tabular-nums">{neu}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-red-500">
          <ThumbsDown className="size-3.5" />
          <span className="text-xs font-medium">Negative</span>
        </div>
        <span className="text-xs font-bold tabular-nums">{neg}</span>
      </div>
    </div>
  )
}

interface RunCardProps {
  run: RunWithStats
}

export function RunCard({ run }: RunCardProps) {
  const formattedDate = new Date(run.run_date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const runDetailHref = `/companies/${run.company_id}/runs/${run.id}`
  const compareHref = `/companies/${run.company_id}/compare?runB=${run.id}`

  return (
    <Card className="flex flex-col">
      {/* Header: version + date */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
              Version
            </p>
            <CardTitle className="text-xl font-bold">{run.version}</CardTitle>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <CalendarDays className="size-3.5 shrink-0" />
            {formattedDate}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Insight + measure counts — big and prominent */}
        <div className="grid grid-cols-2 divide-x divide-border rounded-lg border border-border bg-muted/40">
          <div className="flex flex-col items-center py-3 gap-0.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Lightbulb className="size-3.5 text-amber-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Insights
              </span>
            </div>
            <span className="text-3xl font-bold leading-none tabular-nums">
              {run.insight_count}
            </span>
          </div>
          <div className="flex flex-col items-center py-3 gap-0.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Wrench className="size-3.5 text-blue-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Measures
              </span>
            </div>
            <span className="text-3xl font-bold leading-none tabular-nums">
              {run.measure_count}
            </span>
          </div>
        </div>

        {/* Rating section */}
        {run.eval_count > 0 ? (
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Impressions
              </span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="size-3.5" />
                {run.rater_count} rater{run.rater_count !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Split columns: Insights | Measures */}
            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="flex flex-col gap-1.5 pr-3">
                <div className="flex items-center gap-1 mb-0.5">
                  <Lightbulb className="size-3 text-amber-500" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Insights
                  </span>
                </div>
                <ImpressionBlock
                  pos={run.insight_impression_positive}
                  neu={run.insight_impression_neutral}
                  neg={run.insight_impression_negative}
                  total={run.insight_eval_count}
                />
              </div>
              <div className="flex flex-col gap-1.5 pl-3">
                <div className="flex items-center gap-1 mb-0.5">
                  <Wrench className="size-3 text-blue-500" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Measures
                  </span>
                </div>
                <ImpressionBlock
                  pos={run.measure_impression_positive}
                  neu={run.measure_impression_neutral}
                  neg={run.measure_impression_negative}
                  total={run.measure_eval_count}
                />
              </div>
            </div>

            {/* Avg metric score (secondary) */}
            {run.avg_rating !== null && (
              <p className="text-[10px] text-muted-foreground border-t pt-2">
                Avg score {run.avg_rating.toFixed(1)}/5 across all metrics
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-4">
            <p className="text-xs text-muted-foreground">Not yet evaluated</p>
          </div>
        )}

        {/* Notes */}
        {run.notes && (
          <p className="text-xs text-muted-foreground line-clamp-2 border-t pt-3">
            {run.notes}
          </p>
        )}
      </CardContent>

      <CardFooter className="mt-auto pt-0">
        <div className="flex w-full items-center gap-2">
          <LinkButton href={runDetailHref} size="sm" className="flex-1">
            View & Rate
          </LinkButton>
          <LinkButton href={compareHref} size="sm" variant="outline">
            Compare
          </LinkButton>
        </div>
      </CardFooter>
    </Card>
  )
}
