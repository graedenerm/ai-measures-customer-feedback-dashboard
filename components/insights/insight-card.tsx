'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, AlertTriangle, ChevronDown, ChevronUp,
  Shield, Euro, Zap, MapPin, Wrench, Target, Info,
  ThumbsUp, ThumbsDown, Minus, FileText,
} from 'lucide-react'
import { InlineRating } from '@/components/rating/inline-rating'
import type { InsightWithMeasures } from '@/lib/types'
import { MeasureList } from '@/components/measures/measure-list'

// ── Style helpers ─────────────────────────────────────────────────────────────

function typeStyle(type: string) {
  if (type.includes('anomaly'))
    return { bg: 'rgba(220,38,38,0.08)', text: '#dc2626', label: 'Anomalie', isAnomaly: true }
  if (type.includes('trend'))
    return { bg: 'rgba(168,85,247,0.08)', text: '#7c3aed', label: 'Trend', isAnomaly: false }
  return { bg: 'rgba(26,47,238,0.08)', text: '#1A2FEE', label: 'Strukturell', isAnomaly: false }
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

// ── Evaluation summary pills ───────────────────────────────────────────────────

function ImpressionPills({ evals }: { evals: InsightWithMeasures['evaluations'] }) {
  const pos = evals.filter((e) => e.impression === 'positive').length
  const neu = evals.filter((e) => e.impression === 'neutral').length
  const neg = evals.filter((e) => e.impression === 'negative').length
  if (evals.length === 0) return null
  return (
    <div className="flex items-center gap-2">
      {pos > 0 && <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#059669' }}><ThumbsUp className="size-3" />{pos}</span>}
      {neu > 0 && <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#737373' }}><Minus className="size-3" />{neu}</span>}
      {neg > 0 && <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#dc2626' }}><ThumbsDown className="size-3" />{neg}</span>}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface InsightCardProps {
  insight: InsightWithMeasures
  index: number
  onEvaluationSubmitted?: () => void
}

export function InsightCard({ insight, index, onEvaluationSubmitted }: InsightCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  const ts = typeStyle(insight.type)
  const cs = confidenceStyle(insight.confidence)

  const locationLabel = insight.location
    ? [insight.location.title, insight.location.street_name, insight.location.street_number].filter(Boolean).join(', ')
    : null

  const raw = insight.raw_json as Record<string, unknown>
  const summary = typeof raw?.summary === 'string' ? raw.summary : null
  const hypotheses = Array.isArray(raw?.hypotheses)
    ? (raw.hypotheses as { type: string; explanation: string }[]).filter(h => h.type && h.explanation)
    : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: expanded ? '#1A2FEE' : '#E5E5E5',
        boxShadow: expanded ? '0 0 0 2px rgba(26,47,238,0.12), 0 4px 16px rgba(26,47,238,0.06)' : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {/* ── Two-column wrapper ── */}
      <div className="flex flex-col lg:flex-row">

        {/* ── LEFT: insight content ── */}
        <div className="flex-1 min-w-0">

          {/* Clickable header */}
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50/60"
          >
            {/* Type icon */}
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: ts.bg }}>
              {ts.isAnomaly
                ? <AlertTriangle className="size-4" style={{ color: ts.text }} />
                : <TrendingUp className="size-4" style={{ color: ts.text }} />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: ts.bg, color: ts.text }}>
                  {ts.label}
                </span>
                {cs && (
                  <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: cs.bg, color: cs.text }}>
                    <Shield className="size-2.5" /> Konfidenz {cs.label}
                  </span>
                )}
                {insight.savings_eur_per_year !== null && (
                  <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'rgba(5,150,105,0.08)', color: '#059669' }}>
                    <Euro className="size-2.5" /> {formatEur(insight.savings_eur_per_year)}/a
                  </span>
                )}
                {insight.measures.length > 0 && (
                  <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'rgba(26,47,238,0.06)', color: '#1A2FEE' }}>
                    <Wrench className="size-2.5" /> {insight.measures.length} Maßnahme{insight.measures.length > 1 ? 'n' : ''}
                  </span>
                )}
              </div>

              <h3 className="text-sm font-bold leading-snug" style={{ color: '#00095B' }}>
                {insight.title}
              </h3>

              {(summary || insight.description) && !expanded && (
                <p className="mt-1 text-xs leading-relaxed line-clamp-2" style={{ color: '#737373' }}>
                  {summary ?? insight.description}
                </p>
              )}

              {locationLabel && (
                <div className="mt-1.5 flex items-center gap-1" style={{ color: '#AEAEAE' }}>
                  <MapPin className="size-3 shrink-0" />
                  <span className="text-[11px]">{locationLabel}</span>
                </div>
              )}

              {/* "Insight öffnen" CTA — only when collapsed */}
              {!expanded && (
                <div className="mt-3 flex items-center gap-1.5 self-start rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{ borderColor: '#1A2FEE', color: '#1A2FEE', backgroundColor: 'rgba(26,47,238,0.04)' }}
                >
                  <ChevronDown className="size-3.5" />
                  Insight öffnen
                </div>
              )}
            </div>

            {/* Chevron (collapse indicator when expanded) + eval summary */}
            <div className="shrink-0 flex flex-col items-end gap-2">
              <ImpressionPills evals={insight.evaluations} />
              {expanded && <ChevronUp className="size-4" style={{ color: '#AEAEAE' }} />}
            </div>
          </button>

          {/* Always-visible compact measures strip (collapsed state) */}
          {insight.measures.length > 0 && !expanded && (
            <div className="border-t px-5 py-3" style={{ borderColor: '#F0F0F0', backgroundColor: '#FAFCFF' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Wrench className="size-3" style={{ color: '#1A2FEE' }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#1A2FEE' }}>
                  Empfohlene Maßnahmen
                </span>
              </div>
              <MeasureList measures={insight.measures} onEvaluationSubmitted={onEvaluationSubmitted} compact />
            </div>
          )}

          {/* Expandable detail */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="border-t px-5 py-5 flex flex-col gap-5" style={{ borderColor: '#F0F0F0' }}>

                  {/* Savings KPIs */}
                  {(insight.savings_eur_per_year !== null || insight.savings_kwh_per_year !== null) && (
                    <div className="grid grid-cols-2 gap-3">
                      {insight.savings_eur_per_year !== null && (
                        <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: '#F0F0F0' }}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Euro className="size-3" style={{ color: '#059669' }} />
                            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Einsparung/Jahr</span>
                          </div>
                          <p className="text-base font-bold font-mono" style={{ color: '#059669' }}>{formatEur(insight.savings_eur_per_year)}</p>
                        </div>
                      )}
                      {insight.savings_kwh_per_year !== null && (
                        <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: '#F0F0F0' }}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Zap className="size-3" style={{ color: '#1A2FEE' }} />
                            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Energie/Jahr</span>
                          </div>
                          <p className="text-base font-bold font-mono" style={{ color: '#1A2FEE' }}>{formatKwh(insight.savings_kwh_per_year)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Summary — shown directly if available */}
                  {summary && (
                    <p className="text-[13px] leading-relaxed" style={{ color: '#444444' }}>{summary}</p>
                  )}

                  {/* Detailanalyse — collapsible, contains full description */}
                  {insight.description && (
                    <div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetailOpen((p) => !p) }}
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
                          {insight.description}
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

                  {/* Linked measures (full cards) */}
                  {insight.measures.length > 0 && (
                    <div className="border-t pt-4" style={{ borderColor: '#F0F0F0' }}>
                      <div className="flex items-center gap-1.5 mb-3">
                        <Wrench className="size-3.5" style={{ color: '#1A2FEE' }} />
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1A2FEE' }}>
                          Empfohlene Maßnahmen ({insight.measures.length})
                        </span>
                      </div>
                      <MeasureList measures={insight.measures} onEvaluationSubmitted={onEvaluationSubmitted} />
                    </div>
                  )}

                  {/* Rating — mobile only (shown below content on small screens) */}
                  <div className="border-t pt-4 lg:hidden" style={{ borderColor: '#F0F0F0' }}>
                    <div className="flex items-center gap-1.5 mb-3">
                      <FileText className="size-3.5" style={{ color: '#1A2FEE' }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1A2FEE' }}>Diesen Insight bewerten</span>
                    </div>
                    <InlineRating itemType="insight" itemId={insight.id} evaluations={insight.evaluations} onSuccess={onEvaluationSubmitted} />
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── RIGHT: prominent rating panel (desktop) ── */}
        <div
          className="hidden lg:flex lg:w-72 shrink-0 flex-col border-l"
          style={{ borderColor: '#F0F0F0', backgroundColor: '#FAFCFF' }}
        >
          <div className="flex flex-col gap-4 p-5 h-full">
            {/* Header */}
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(26,47,238,0.08)' }}>
                <FileText className="size-3.5" style={{ color: '#1A2FEE' }} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1A2FEE' }}>
                Bewertung
              </span>
            </div>
            <InlineRating itemType="insight" itemId={insight.id} evaluations={insight.evaluations} onSuccess={onEvaluationSubmitted} />
          </div>
        </div>

      </div>
    </motion.div>
  )
}
