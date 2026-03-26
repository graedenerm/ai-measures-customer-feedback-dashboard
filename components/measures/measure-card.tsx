'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wrench,
  Euro,
  Clock,
  Zap,
  ArrowUpDown,
  X,
  CheckCircle2,
  BarChart3,
  FileText,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from 'lucide-react'
import { InlineRating } from '@/components/rating/inline-rating'
import type { Measure, Evaluation } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function effortStyle(level: string | null) {
  switch (level) {
    case 'LOW':    return { label: 'Geringer Aufwand',  color: '#059669', bg: 'rgba(5,150,105,0.08)' }
    case 'MEDIUM': return { label: 'Mittlerer Aufwand', color: '#b45309', bg: 'rgba(234,179,8,0.08)' }
    case 'HIGH':   return { label: 'Hoher Aufwand',     color: '#dc2626', bg: 'rgba(220,38,38,0.08)' }
    default:       return level ? { label: level, color: '#737373', bg: 'rgba(0,0,0,0.04)' } : null
  }
}

function categoryLabel(cat: string | null) {
  if (!cat) return null
  const map: Record<string, string> = {
    OTHER: 'Sonstiges', PRESSURIZED_AIR: 'Druckluft',
    HEATING: 'Heizung', COOLING: 'Kälte', LIGHTING: 'Beleuchtung',
  }
  return map[cat] ?? cat
}

function formatEur(v: number | null) {
  if (v === null) return '—'
  return v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}
function formatKwh(v: number | null) {
  if (v === null) return '—'
  return v.toLocaleString('de-DE') + ' kWh'
}

function impressionSummary(evals: Evaluation[]) {
  const pos = evals.filter((e) => e.impression === 'positive').length
  const neu = evals.filter((e) => e.impression === 'neutral').length
  const neg = evals.filter((e) => e.impression === 'negative').length
  return { pos, neu, neg, total: evals.length }
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

function MeasureDetailModal({
  measure,
  onClose,
  onEvaluationSubmitted,
}: {
  measure: Measure & { evaluations: Evaluation[] }
  onClose: () => void
  onEvaluationSubmitted?: () => void
}) {
  const effort = effortStyle(measure.effort_level)
  const catLabel = categoryLabel(measure.category)
  const raw = measure.raw_json as Record<string, unknown>
  const reasoning = typeof raw?.reasoning === 'string' ? raw.reasoning : null
  const evidences = Array.isArray(raw?.evidences)
    ? (raw.evidences as unknown[]).filter((e): e is string => typeof e === 'string')
    : []
  const questions = Array.isArray(raw?.questions)
    ? (raw.questions as { question: string; suggestedAnswers?: { answer: string }[] }[]).filter(q => q.question)
    : []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-8 md:py-16"
      style={{ backgroundColor: 'rgba(0,9,91,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl rounded-2xl border shadow-2xl"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E5E5' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b px-6 py-5" style={{ borderColor: '#F0F0F0' }}>
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {catLabel && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'rgba(0,0,0,0.04)', color: '#737373' }}>
                  {catLabel}
                </span>
              )}
              {effort && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: effort.bg, color: effort.color }}>
                  {effort.label}
                </span>
              )}
            </div>
            <h2 className="text-base font-bold leading-snug" style={{ color: '#00095B' }}>
              {measure.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
          >
            <X className="size-4" style={{ color: '#737373' }} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border px-3 py-3" style={{ borderColor: '#F0F0F0' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Euro className="size-3" style={{ color: '#059669' }} />
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Einsparung/Jahr</span>
              </div>
              <p className="text-sm font-bold font-mono" style={{ color: '#059669' }}>
                {formatEur(measure.yearly_savings_eur_from)} – {formatEur(measure.yearly_savings_eur_to)}
              </p>
            </div>
            <div className="rounded-lg border px-3 py-3" style={{ borderColor: '#F0F0F0' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="size-3" style={{ color: '#1A2FEE' }} />
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Energie/Jahr</span>
              </div>
              <p className="text-sm font-bold font-mono" style={{ color: '#1A2FEE' }}>
                {formatKwh(measure.yearly_savings_kwh_from)} – {formatKwh(measure.yearly_savings_kwh_to)}
              </p>
            </div>
            <div className="rounded-lg border px-3 py-3" style={{ borderColor: '#F0F0F0' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowUpDown className="size-3" style={{ color: '#b45309' }} />
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Investition</span>
              </div>
              <p className="text-sm font-bold font-mono" style={{ color: '#00095B' }}>
                {measure.investment_from === 0 && measure.investment_to === 0
                  ? 'Keine'
                  : `${formatEur(measure.investment_from)} – ${formatEur(measure.investment_to)}`}
              </p>
            </div>
            <div className="rounded-lg border px-3 py-3" style={{ borderColor: '#F0F0F0' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="size-3" style={{ color: '#737373' }} />
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Amortisation</span>
              </div>
              <p className="text-sm font-bold font-mono" style={{ color: '#00095B' }}>
                {measure.amortisation_months !== null ? `${measure.amortisation_months} Mon.` : '—'}
              </p>
            </div>
          </div>

          {/* Description */}
          {measure.description && (
            <p className="text-[13px] leading-relaxed" style={{ color: '#444444' }}>
              {measure.description}
            </p>
          )}

          {/* Reasoning */}
          {reasoning && (
            <div className="rounded-lg border-l-2 px-4 py-3" style={{ backgroundColor: '#FAFAFA', borderLeftColor: '#1A2FEE' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <FileText className="size-3.5" style={{ color: '#1A2FEE' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1A2FEE' }}>Begründung</span>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: '#444444' }}>{reasoning}</p>
            </div>
          )}

          {/* Evidences */}
          {evidences.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <BarChart3 className="size-3.5" style={{ color: '#059669' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#059669' }}>Datenpunkte</span>
              </div>
              <div className="rounded-lg border px-4 py-3" style={{ backgroundColor: '#FAFAFA', borderColor: '#F0F0F0' }}>
                <ul className="flex flex-col gap-2">
                  {evidences.map((ev, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-3 shrink-0" style={{ color: '#059669' }} />
                      <span className="text-[12px] leading-relaxed" style={{ color: '#444444' }}>{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Questions */}
          {questions.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <FileText className="size-3.5" style={{ color: '#737373' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#737373' }}>Fragen</span>
              </div>
              <div className="flex flex-col gap-3">
                {questions.map((q, i) => (
                  <div key={i} className="rounded-lg border px-3 py-2.5" style={{ backgroundColor: '#FAFAFA', borderColor: '#F0F0F0' }}>
                    <p className="text-xs font-semibold leading-snug mb-1.5" style={{ color: '#00095B' }}>{q.question}</p>
                    {q.suggestedAnswers && q.suggestedAnswers.length > 0 && (
                      <ul className="flex flex-col gap-1">
                        {q.suggestedAnswers.map((a, j) => (
                          <li key={j} className="flex items-start gap-1.5 text-[11px]" style={{ color: '#737373' }}>
                            <span className="mt-[5px] size-1 shrink-0 rounded-full bg-gray-300" />
                            {a.answer}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rating */}
          <div className="border-t pt-4" style={{ borderColor: '#F0F0F0' }}>
            <div className="flex items-center gap-1.5 mb-3">
              <FileText className="size-3.5" style={{ color: '#1A2FEE' }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1A2FEE' }}>Diese Maßnahme bewerten</span>
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: '#E5E5E5', backgroundColor: '#FAFAFA' }}>
              <InlineRating itemType="measure" itemId={measure.id} onSuccess={onEvaluationSubmitted} />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Measure Card (compact row) ────────────────────────────────────────────────

interface MeasureCardProps {
  measure: Measure & { evaluations: Evaluation[] }
  index: number
  onEvaluationSubmitted?: () => void
  compact?: boolean
}

export function MeasureCard({ measure, index, onEvaluationSubmitted, compact }: MeasureCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const effort = effortStyle(measure.effort_level)
  const catLabel = categoryLabel(measure.category)
  const { pos, neu, neg, total } = impressionSummary(measure.evaluations)

  if (compact) {
    return (
      <>
        <motion.button
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.15, delay: index * 0.03 }}
          onClick={() => setModalOpen(true)}
          className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white"
          style={{ color: '#00095B' }}
        >
          <Wrench className="size-3 shrink-0" style={{ color: '#1A2FEE' }} />
          <span className="flex-1 min-w-0 truncate text-xs font-medium">{measure.title}</span>
          {total > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              {pos > 0 && <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: '#059669' }}><ThumbsUp className="size-2.5" />{pos}</span>}
              {neu > 0 && <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: '#737373' }}><Minus className="size-2.5" />{neu}</span>}
              {neg > 0 && <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: '#dc2626' }}><ThumbsDown className="size-2.5" />{neg}</span>}
            </div>
          )}
          <ChevronRight className="size-3 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: '#AEAEAE' }} />
        </motion.button>
        <AnimatePresence>
          {modalOpen && (
            <MeasureDetailModal
              measure={measure}
              onClose={() => setModalOpen(false)}
              onEvaluationSubmitted={() => { setModalOpen(false); onEvaluationSubmitted?.() }}
            />
          )}
        </AnimatePresence>
      </>
    )
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.03 }}
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E5E5' }}
      >
        <button
          onClick={() => setModalOpen(true)}
          className="group flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50/50"
        >
          {/* Icon */}
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(26,47,238,0.06)' }}>
            <Wrench className="size-4" style={{ color: '#1A2FEE' }} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              {catLabel && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'rgba(0,0,0,0.04)', color: '#737373' }}>
                  {catLabel}
                </span>
              )}
              {effort && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: effort.bg, color: effort.color }}>
                  {effort.label}
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold leading-snug" style={{ color: '#00095B' }}>
              {measure.title}
            </h4>
            {measure.short_description && (
              <p className="mt-1 text-xs leading-relaxed line-clamp-2" style={{ color: '#737373' }}>
                {measure.short_description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {(measure.yearly_savings_eur_from !== null || measure.yearly_savings_eur_to !== null) && (
                <div className="flex items-center gap-1">
                  <Euro className="size-3" style={{ color: '#059669' }} />
                  <span className="text-xs font-semibold font-mono" style={{ color: '#059669' }}>
                    {formatEur(measure.yearly_savings_eur_from)} – {formatEur(measure.yearly_savings_eur_to)}/a
                  </span>
                </div>
              )}
              {measure.amortisation_months !== null && (
                <div className="flex items-center gap-1">
                  <Clock className="size-3" style={{ color: '#737373' }} />
                  <span className="text-xs font-medium" style={{ color: '#737373' }}>
                    {measure.amortisation_months} Mon. Amortisation
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: eval summary + arrow */}
          <div className="shrink-0 flex flex-col items-end gap-2">
            {total > 0 && (
              <div className="flex items-center gap-1.5">
                {pos > 0 && <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: '#059669' }}><ThumbsUp className="size-2.5" />{pos}</span>}
                {neu > 0 && <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: '#737373' }}><Minus className="size-2.5" />{neu}</span>}
                {neg > 0 && <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: '#dc2626' }}><ThumbsDown className="size-2.5" />{neg}</span>}
              </div>
            )}
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" style={{ color: '#AEAEAE' }} />
          </div>
        </button>
      </motion.div>

      <AnimatePresence>
        {modalOpen && (
          <MeasureDetailModal
            measure={measure}
            onClose={() => setModalOpen(false)}
            onEvaluationSubmitted={() => {
              setModalOpen(false)
              onEvaluationSubmitted?.()
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
