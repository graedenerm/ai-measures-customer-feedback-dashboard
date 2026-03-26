import type { Insight } from '@/lib/types'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface CompareItemProps {
  insightA: Insight | null
  insightB: Insight | null
  label?: string
}

function formatEur(value: number | null): string {
  if (value === null) return '—'
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function formatKwh(value: number | null): string {
  if (value === null) return '—'
  return value.toLocaleString('de-DE') + ' kWh'
}

interface DiffIndicatorProps {
  valueA: number | null
  valueB: number | null
  higherIsBetter?: boolean
  formatter: (v: number | null) => string
}

function DiffIndicator({
  valueA,
  valueB,
  higherIsBetter = true,
  formatter,
}: DiffIndicatorProps) {
  if (valueA === null && valueB === null) return <span>—</span>

  const better =
    valueA !== null && valueB !== null
      ? higherIsBetter
        ? valueB > valueA
          ? 'better'
          : valueB < valueA
          ? 'worse'
          : 'same'
        : valueB < valueA
        ? 'better'
        : valueB > valueA
        ? 'worse'
        : 'same'
      : null

  return (
    <div className="flex items-center gap-1">
      <span>{formatter(valueB)}</span>
      {better === 'better' && (
        <TrendingUp className="size-3.5 text-emerald-500" />
      )}
      {better === 'worse' && <TrendingDown className="size-3.5 text-red-500" />}
      {better === 'same' && <Minus className="size-3.5 text-zinc-400" />}
    </div>
  )
}

export function CompareItem({ insightA, insightB, label }: CompareItemProps) {
  const insight = insightA ?? insightB

  if (!insight) return null

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <p className="text-sm font-semibold leading-snug">{insight.title}</p>
        {label && (
          <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
        )}
      </div>

      {/* Side-by-side metrics */}
      <div className="grid grid-cols-2 divide-x divide-border">
        {/* Run A */}
        <div className="p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Run A {insightA ? '' : '(not present)'}
          </p>
          {insightA ? (
            <div className="flex flex-col gap-2 text-sm">
              {insightA.savings_eur_per_year !== null && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Savings EUR/yr
                  </span>
                  <p className="font-medium text-emerald-700">
                    {formatEur(insightA.savings_eur_per_year)}
                  </p>
                </div>
              )}
              {insightA.savings_kwh_per_year !== null && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Savings kWh/yr
                  </span>
                  <p className="font-medium">
                    {formatKwh(insightA.savings_kwh_per_year)}
                  </p>
                </div>
              )}
              {insightA.priority_score !== null && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Priority
                  </span>
                  <p className="font-medium">
                    {(insightA.priority_score * 100).toFixed(0)}%
                  </p>
                </div>
              )}
              {insightA.confidence !== null && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Confidence
                  </span>
                  <p className="font-medium">
                    {(insightA.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Not in this run
            </p>
          )}
        </div>

        {/* Run B */}
        <div className={cn('p-4', !insightA && 'bg-emerald-50/50')}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Run B {insightB ? '' : '(not present)'}
          </p>
          {insightB ? (
            <div className="flex flex-col gap-2 text-sm">
              {(insightB.savings_eur_per_year !== null ||
                insightA?.savings_eur_per_year !== null) && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Savings EUR/yr
                  </span>
                  <p className="font-medium text-emerald-700">
                    <DiffIndicator
                      valueA={insightA?.savings_eur_per_year ?? null}
                      valueB={insightB.savings_eur_per_year}
                      higherIsBetter={true}
                      formatter={formatEur}
                    />
                  </p>
                </div>
              )}
              {(insightB.savings_kwh_per_year !== null ||
                insightA?.savings_kwh_per_year !== null) && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Savings kWh/yr
                  </span>
                  <p className="font-medium">
                    <DiffIndicator
                      valueA={insightA?.savings_kwh_per_year ?? null}
                      valueB={insightB.savings_kwh_per_year}
                      higherIsBetter={true}
                      formatter={formatKwh}
                    />
                  </p>
                </div>
              )}
              {(insightB.priority_score !== null ||
                insightA?.priority_score !== null) && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Priority
                  </span>
                  <p className="font-medium">
                    <DiffIndicator
                      valueA={insightA?.priority_score ?? null}
                      valueB={insightB.priority_score}
                      higherIsBetter={true}
                      formatter={(v) =>
                        v !== null ? `${(v * 100).toFixed(0)}%` : '—'
                      }
                    />
                  </p>
                </div>
              )}
              {(insightB.confidence !== null ||
                insightA?.confidence !== null) && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Confidence
                  </span>
                  <p className="font-medium">
                    <DiffIndicator
                      valueA={insightA?.confidence ?? null}
                      valueB={insightB.confidence}
                      higherIsBetter={true}
                      formatter={(v) =>
                        v !== null ? `${(v * 100).toFixed(0)}%` : '—'
                      }
                    />
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Not in this run
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
