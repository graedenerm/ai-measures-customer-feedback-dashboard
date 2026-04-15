'use client'

import { cn } from '@/lib/utils'

export type MetricValue = number | 'na'

interface MetricRatingProps {
  label: string
  description: string
  value: MetricValue | null
  onChange: (v: MetricValue) => void
  compact?: boolean
}

export function MetricRating({
  label,
  description,
  value,
  onChange,
  compact = false,
}: MetricRatingProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <p className="w-20 shrink-0 text-xs font-medium text-foreground">{label}</p>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={cn(
                  'flex size-6 items-center justify-center rounded border text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  value === n
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-border bg-background text-foreground hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'
                )}
                aria-label={`Rate ${n} out of 5`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onChange('na')}
              className={cn(
                'flex h-6 items-center justify-center rounded border px-1 text-[9px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                value === 'na'
                  ? 'border-zinc-500 bg-zinc-500 text-white'
                  : 'border-border bg-background text-muted-foreground hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-600'
              )}
              aria-label="Not applicable"
            >
              N/A
            </button>
          </div>
          <div className="flex justify-between pr-7 text-[8px] text-muted-foreground/60">
            <span>sehr schlecht</span>
            <span>sehr gut</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div>
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-[10px] leading-tight text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1 flex-wrap">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                'flex size-7 items-center justify-center rounded border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                value === n
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-border bg-background text-foreground hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'
              )}
              aria-label={`Rate ${n} out of 5`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange('na')}
            className={cn(
              'flex h-7 items-center justify-center rounded border px-1.5 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              value === 'na'
                ? 'border-zinc-500 bg-zinc-500 text-white'
                : 'border-border bg-background text-muted-foreground hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-600'
            )}
            aria-label="Not applicable"
          >
            N/A
          </button>
        </div>
        <div className="flex justify-between pr-9 text-[9px] text-muted-foreground/60">
          <span>sehr schlecht</span>
          <span>sehr gut</span>
        </div>
      </div>
    </div>
  )
}
