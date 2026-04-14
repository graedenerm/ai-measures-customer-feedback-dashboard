'use client'

import { useState } from 'react'
import {
  TrendingUp, AlertTriangle, Shield, Euro, Zap,
  Info, Target, ChevronDown, ChevronUp, CheckCircle2,
  Calendar, Activity,
} from 'lucide-react'
import { ConsultantRatingForm, type InitialRatingValues } from './consultant-rating-form'
import type { ConsultantInsight, ConsultantEvaluation } from '@/lib/consultant-types'

// ── Style helpers (mirrors the existing insight-card.tsx helpers) ──────────────

function typeStyle(type: string) {
  if (type.includes('anomaly'))
    return { bg: 'rgba(220,38,38,0.08)',  text: '#dc2626', label: 'Anomalie',    isAnomaly: true,  isTrend: false, isChangepoint: false }
  if (type.includes('trend'))
    return { bg: 'rgba(168,85,247,0.08)', text: '#7c3aed', label: 'Trend',       isAnomaly: false, isTrend: true,  isChangepoint: false }
  if (type.includes('changepoint'))
    return { bg: 'rgba(245,158,11,0.08)', text: '#d97706', label: 'Changepoint', isAnomaly: false, isTrend: false, isChangepoint: true  }
  return   { bg: 'rgba(26,47,238,0.08)',  text: '#1A2FEE', label: 'Strukturell', isAnomaly: false, isTrend: false, isChangepoint: false }
}

function confidenceStyle(c: number | null) {
  if (c === null) return null
  const pct = c > 1 ? c : c * 100
  if (pct >= 90) return { bg: 'rgba(5,150,105,0.08)', text: '#059669', label: `${pct.toFixed(0)} %` }
  if (pct >= 70) return { bg: 'rgba(234,179,8,0.08)', text: '#b45309', label: `${pct.toFixed(0)} %` }
  return { bg: 'rgba(220,38,38,0.06)', text: '#dc2626', label: `${pct.toFixed(0)} %` }
}

function hypothesisTypeStyle(type: string) {
  switch (type.toLowerCase()) {
    case 'problem':     return { bg: 'rgba(220,38,38,0.08)',  text: '#dc2626', label: 'Problem' }
    case 'benign':      return { bg: 'rgba(5,150,105,0.08)',  text: '#059669', label: 'Unproblematisch' }
    case 'opportunity': return { bg: 'rgba(26,47,238,0.08)', text: '#1A2FEE', label: 'Potential' }
    default:            return { bg: 'rgba(0,0,0,0.04)',      text: '#737373', label: type }
  }
}

function formatEur(v: number | null) {
  if (v === null) return '—'
  return v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}
function formatKwh(v: number | null) {
  if (v === null) return '—'
  return v.toLocaleString('de-DE') + ' kWh'
}

// ── Main component ─────────────────────────────────────────────────────────────

interface ConsultantInsightCardProps {
  insight: ConsultantInsight
  index: number
  evaluation: ConsultantEvaluation | null
  evaluatorName: string
  onRated: (evaluation: ConsultantEvaluation) => void
  // When set, shows the rating form pre-filled for re-evaluation (UPDATE mode)
  existingEvaluationId?: string
  initialValues?: InitialRatingValues
}

export function ConsultantInsightCard({
  insight,
  index,
  evaluation,
  evaluatorName,
  onRated,
  existingEvaluationId,
  initialValues,
}: ConsultantInsightCardProps) {
  // Detailanalyse open by default (as requested)
  const [detailOpen, setDetailOpen] = useState(true)

  const raw = insight.insight_raw ?? {}

  // Support both old camelCase format and new flat snake_case format
  const type = (raw.finding_type as string | undefined) ?? (raw.type as string | undefined) ?? 'structural'
  const ts = typeStyle(type)
  const confidence = (raw.confidence as number | null | undefined) ?? null
  const cs = confidenceStyle(confidence)
  const savingsEur = (raw.savings_eur as number | null | undefined) ?? (raw.savingsEurPerYear as number | null | undefined) ?? null
  const savingsKwh = (raw.savings_kwh as number | null | undefined) ?? (raw.savingsKwhPerYear as number | null | undefined) ?? null
  const summary = typeof raw.summary === 'string' ? raw.summary : null
  const hypotheses = Array.isArray(raw.hypotheses)
    ? (raw.hypotheses as { type: string; explanation: string }[]).filter((h) => h.type && h.explanation)
    : []

  // Trend-specific fields
  const trendActive = typeof raw.active === 'boolean' ? raw.active : null
  const trendStartDate = typeof raw.trend_start_date === 'string' ? raw.trend_start_date : null
  const trendEndDate = typeof raw.trend_end_date === 'string' ? raw.trend_end_date : null
  const trendNumPeriods = typeof raw.trend_num_periods === 'number' ? raw.trend_num_periods : null
  const slopePerPeriod = typeof raw.slope_per_period === 'number' ? raw.slope_per_period : null
  const slopePct = typeof raw.slope_percent_per_period === 'number' ? raw.slope_percent_per_period : null
  const periodUnit = typeof raw.period_unit === 'string' ? raw.period_unit : null
  const findingUnit = typeof raw.finding_unit === 'string' ? raw.finding_unit : null
  const hasTrendDetails = trendStartDate !== null || slopePerPeriod !== null || trendActive !== null

  // Changepoint-specific fields
  const cpOnsetDate  = typeof raw.onset_date    === 'string' ? raw.onset_date    : null
  const cpDelta      = typeof raw.delta         === 'number' ? raw.delta         : null
  const cpDeltaPct   = typeof raw.delta_percent === 'number' ? raw.delta_percent : null
  const cpValBefore  = typeof raw.value_before  === 'number' ? raw.value_before  : null
  const cpValAfter   = typeof raw.value_after   === 'number' ? raw.value_after   : null
  const hasChangepointDetails = cpOnsetDate !== null || cpDelta !== null

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: evaluation ? '#059669' : '#1A2FEE',
        boxShadow: evaluation
          ? '0 0 0 2px rgba(5,150,105,0.10), 0 4px 16px rgba(5,150,105,0.04)'
          : '0 0 0 2px rgba(26,47,238,0.10), 0 4px 16px rgba(26,47,238,0.04)',
      }}
    >
      <div className="flex flex-col lg:flex-row">

        {/* ── LEFT: insight content ── */}
        <div className="flex-1 min-w-0">
          <div className="px-5 py-4 flex flex-col gap-4">

            {/* Header: index + type badges + title */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ backgroundColor: 'rgba(26,47,238,0.08)', color: '#1A2FEE' }}
                >
                  {index + 1}
                </span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: ts.bg, color: ts.text }}>
                  {ts.label}
                </span>
                {cs && !ts.isTrend && !ts.isChangepoint && (
                  <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: cs.bg, color: cs.text }}>
                    <Shield className="size-2.5" /> Konfidenz {cs.label}
                  </span>
                )}
                {trendActive !== null && (
                  <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={trendActive
                    ? { backgroundColor: 'rgba(5,150,105,0.08)', color: '#059669' }
                    : { backgroundColor: 'rgba(0,0,0,0.04)', color: '#737373' }}>
                    <Activity className="size-2.5" /> {trendActive ? 'Aktiv' : 'Beendet'}
                  </span>
                )}
                {savingsEur !== null && (
                  <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'rgba(5,150,105,0.08)', color: '#059669' }}>
                    <Euro className="size-2.5" /> {formatEur(savingsEur)}/a
                  </span>
                )}
                {evaluation && (
                  <span className="ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'rgba(5,150,105,0.08)', color: '#059669' }}>
                    <CheckCircle2 className="size-3" /> Bewertet
                  </span>
                )}
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: ts.bg }}>
                  {ts.isAnomaly
                    ? <AlertTriangle className="size-4" style={{ color: ts.text }} />
                    : ts.isChangepoint
                    ? <Zap className="size-4" style={{ color: ts.text }} />
                    : <TrendingUp className="size-4" style={{ color: ts.text }} />}
                </div>
                <h3 className="text-sm font-bold leading-snug" style={{ color: '#00095B' }}>
                  {insight.insight_title}
                </h3>
              </div>
            </div>

            {/* Savings KPIs */}
            {(savingsEur !== null || savingsKwh !== null) && (
              <div className="grid grid-cols-2 gap-3">
                {savingsEur !== null && (
                  <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: '#F0F0F0' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Euro className="size-3" style={{ color: '#059669' }} />
                      <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Einsparung/Jahr</span>
                    </div>
                    <p className="text-base font-bold font-mono" style={{ color: '#059669' }}>{formatEur(savingsEur)}</p>
                  </div>
                )}
                {savingsKwh !== null && (
                  <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: '#F0F0F0' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Zap className="size-3" style={{ color: '#1A2FEE' }} />
                      <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Energie/Jahr</span>
                    </div>
                    <p className="text-base font-bold font-mono" style={{ color: '#1A2FEE' }}>{formatKwh(savingsKwh)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            {summary && (
              <p className="text-[13px] leading-relaxed" style={{ color: '#444444' }}>{summary}</p>
            )}

            {/* Detailanalyse — open by default */}
            {insight.insight_description && (
              <div>
                <button
                  onClick={() => setDetailOpen((p) => !p)}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-70"
                  style={{ color: '#1A2FEE' }}
                >
                  <Target className="size-3.5" />
                  Detailanalyse
                  {detailOpen
                    ? <ChevronUp className="size-3.5" />
                    : <ChevronDown className="size-3.5" />}
                </button>
                {detailOpen && (
                  <p className="mt-2 text-[13px] leading-relaxed" style={{ color: '#444444' }}>
                    {insight.insight_description}
                  </p>
                )}
              </div>
            )}

            {/* Hypotheses */}
            {hypotheses.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Info className="size-3.5" style={{ color: '#737373' }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#737373' }}>Hypothesen</span>
                </div>
                <div className="flex flex-col gap-2">
                  {hypotheses.map((h, i) => {
                    const hs = hypothesisTypeStyle(h.type)
                    return (
                      <div key={i} className="flex gap-2.5 rounded-lg border px-3 py-2.5" style={{ borderColor: '#F0F0F0', backgroundColor: '#FAFAFA' }}>
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold self-start" style={{ backgroundColor: hs.bg, color: hs.text }}>
                          {hs.label}
                        </span>
                        <p className="text-[12px] leading-relaxed" style={{ color: '#444444' }}>{h.explanation}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Trend Details */}
            {hasTrendDetails && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Calendar className="size-3.5" style={{ color: '#737373' }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#737373' }}>Trend-Details</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {trendStartDate && trendEndDate && (
                    <div className="rounded-lg border px-3 py-2" style={{ borderColor: '#F0F0F0', backgroundColor: '#FAFAFA' }}>
                      <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: '#AEAEAE' }}>Zeitraum</p>
                      <p className="text-[12px] font-semibold" style={{ color: '#00095B' }}>
                        {new Date(trendStartDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                        {' – '}
                        {new Date(trendEndDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      {trendNumPeriods !== null && (
                        <p className="text-[10px] mt-0.5" style={{ color: '#AEAEAE' }}>{trendNumPeriods} {periodUnit ?? 'Perioden'}</p>
                      )}
                    </div>
                  )}
                  {slopePerPeriod !== null && (
                    <div className="rounded-lg border px-3 py-2" style={{ borderColor: '#F0F0F0', backgroundColor: '#FAFAFA' }}>
                      <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: '#AEAEAE' }}>Anstieg / {periodUnit ?? 'Periode'}</p>
                      <p className="text-[12px] font-semibold font-mono" style={{ color: '#00095B' }}>
                        {slopePerPeriod.toLocaleString('de-DE', { maximumFractionDigits: 1 })} {findingUnit ?? ''}
                      </p>
                      {slopePct !== null && (
                        <p className="text-[10px] mt-0.5" style={{ color: '#AEAEAE' }}>+{slopePct.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Changepoint Details */}
            {hasChangepointDetails && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap className="size-3.5" style={{ color: '#737373' }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#737373' }}>Changepoint-Details</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {cpOnsetDate && (
                    <div className="rounded-lg border px-3 py-2" style={{ borderColor: '#F0F0F0', backgroundColor: '#FAFAFA' }}>
                      <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: '#AEAEAE' }}>Einsetzdatum</p>
                      <p className="text-[12px] font-semibold" style={{ color: '#00095B' }}>
                        {new Date(cpOnsetDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                  {cpDelta !== null && (
                    <div className="rounded-lg border px-3 py-2" style={{ borderColor: '#F0F0F0', backgroundColor: '#FAFAFA' }}>
                      <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: '#AEAEAE' }}>Veränderung</p>
                      <p className="text-[12px] font-semibold font-mono" style={{ color: cpDelta >= 0 ? '#dc2626' : '#059669' }}>
                        {cpDelta >= 0 ? '+' : ''}{cpDelta.toLocaleString('de-DE', { maximumFractionDigits: 1 })} {findingUnit ?? ''}
                      </p>
                      {cpDeltaPct !== null && (
                        <p className="text-[10px] mt-0.5" style={{ color: '#AEAEAE' }}>
                          {cpDeltaPct >= 0 ? '+' : ''}{cpDeltaPct.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %
                        </p>
                      )}
                    </div>
                  )}
                  {cpValBefore !== null && cpValAfter !== null && (
                    <div className="rounded-lg border px-3 py-2" style={{ borderColor: '#F0F0F0', backgroundColor: '#FAFAFA' }}>
                      <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: '#AEAEAE' }}>Vorher → Nachher</p>
                      <p className="text-[12px] font-semibold font-mono" style={{ color: '#00095B' }}>
                        {cpValBefore.toLocaleString('de-DE', { maximumFractionDigits: 1 })} → {cpValAfter.toLocaleString('de-DE', { maximumFractionDigits: 1 })} {findingUnit ?? ''}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mobile rating (below content) */}
            <div className="border-t pt-4 lg:hidden" style={{ borderColor: '#F0F0F0' }}>
              {evaluation && !existingEvaluationId
                ? <RatedSummary evaluation={evaluation} />
                : <ConsultantRatingForm insightId={insight.id} evaluatorName={evaluatorName} onSubmitted={onRated} existingEvaluationId={existingEvaluationId} initialValues={initialValues} />}
            </div>
          </div>
        </div>

        {/* ── RIGHT: rating panel (desktop) ── */}
        <div
          className="hidden lg:flex lg:w-96 shrink-0 flex-col border-l"
          style={{ borderColor: '#F0F0F0', backgroundColor: '#FAFCFF' }}
        >
          <div className="p-5 h-full">
            {evaluation && !existingEvaluationId
              ? <RatedSummary evaluation={evaluation} />
              : <ConsultantRatingForm insightId={insight.id} evaluatorName={evaluatorName} onSubmitted={onRated} existingEvaluationId={existingEvaluationId} initialValues={initialValues} />}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ScoreBadge({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#AEAEAE' }}>{label}</span>
      <span
        className="flex size-6 items-center justify-center rounded text-xs font-bold"
        style={{
          backgroundColor: value === null ? 'rgba(0,0,0,0.04)' : 'rgba(26,47,238,0.08)',
          color: value === null ? '#9ca3af' : '#1A2FEE',
        }}
      >
        {value ?? 'N/A'}
      </span>
    </div>
  )
}

// ── Already-rated read-only summary ───────────────────────────────────────────

function RatedSummary({ evaluation }: { evaluation: ConsultantEvaluation }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-5" style={{ color: '#059669' }} />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#059669' }}>
          Bewertung abgegeben
        </span>
      </div>

      <div className="flex gap-3 flex-wrap">
        <ScoreBadge label="Verständl." value={evaluation.verstaendlichkeit} />
        <ScoreBadge label="Plausib." value={evaluation.plausibilitaet} />
        <ScoreBadge label="Aktionab." value={evaluation.aktionabilitaet} />
        <ScoreBadge label="Gesamt" value={evaluation.gesamteindruck} />
      </div>

      {evaluation.notes && (
        <p className="rounded-lg border px-3 py-2 text-[12px] leading-relaxed" style={{ borderColor: '#F0F0F0', color: '#444444', backgroundColor: '#FAFAFA' }}>
          {evaluation.notes}
        </p>
      )}

      <p className="text-[11px]" style={{ color: '#AEAEAE' }}>
        {new Date(evaluation.created_at).toLocaleDateString('de-DE', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })}
      </p>
    </div>
  )
}

