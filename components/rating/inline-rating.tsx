'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ThumbsUp, ThumbsDown, Minus,
  ChevronDown, ChevronUp, CheckCircle2, RotateCcw, Loader2, User, Pencil,
} from 'lucide-react'
import { MetricRating, type MetricValue } from './metric-rating'
import { submitEvaluation } from '@/actions/evaluations'
import { useEvaluator } from '@/lib/evaluator-context'
import type { Evaluation } from '@/lib/types'
import { cn } from '@/lib/utils'

type Impression = 'positive' | 'negative' | 'neutral'

interface InlineRatingProps {
  itemType: 'insight' | 'measure'
  itemId: string
  evaluations?: Evaluation[]
  onSuccess?: () => void
}

function toDb(v: MetricValue | null): number | null {
  return v === null || v === 'na' ? null : v
}

const impressionConfig = [
  {
    value: 'positive' as const,
    icon: ThumbsUp,
    label: 'Positiv',
    descriptionInsight: 'Die Erkenntnis ist korrekt und hilfreich',
    descriptionMeasure: 'Die Maßnahme ist plausibel und umsetzbar',
    selectedBg: '#059669',
    selectedBorder: '#059669',
    hoverClass: 'hover:border-emerald-400 hover:bg-emerald-50',
    hoverColor: '#059669',
  },
  {
    value: 'neutral' as const,
    icon: Minus,
    label: 'Neutral',
    descriptionInsight: 'Diese Erkenntnis ist korrekt, bringt jedoch keinen Mehrwert',
    descriptionMeasure: 'Diese Maßnahme ist korrekt, bringt jedoch keinen Mehrwert',
    selectedBg: '#52525b',
    selectedBorder: '#52525b',
    hoverClass: 'hover:border-zinc-400 hover:bg-zinc-50',
    hoverColor: '#52525b',
  },
  {
    value: 'negative' as const,
    icon: ThumbsDown,
    label: 'Negativ',
    descriptionInsight: 'Die Erkenntnis ist inkorrekt',
    descriptionMeasure: 'Die Maßnahme ist nicht umsetzbar oder relevant',
    selectedBg: '#dc2626',
    selectedBorder: '#dc2626',
    hoverClass: 'hover:border-red-400 hover:bg-red-50',
    hoverColor: '#dc2626',
  },
]

const impressionLabels: Record<string, string> = {
  positive: 'Positiv',
  neutral: 'Neutral',
  negative: 'Negativ',
}
const impressionColors: Record<string, string> = {
  positive: '#059669',
  neutral: '#52525b',
  negative: '#dc2626',
}

function ScoreRow({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium" style={{ color: '#737373' }}>{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(n => (
            <div
              key={n}
              className="size-2 rounded-full"
              style={{ backgroundColor: n <= score ? '#1A2FEE' : '#E5E5E5' }}
            />
          ))}
        </div>
        <span className="text-xs font-semibold" style={{ color: '#00095B' }}>{score}/5</span>
      </div>
    </div>
  )
}

function EvaluatorSummary({ evaluation }: { evaluation: Evaluation }) {
  const color = impressionColors[evaluation.impression ?? ''] ?? '#737373'
  const label = impressionLabels[evaluation.impression ?? ''] ?? '–'
  const hasDetails = typeof evaluation.comprehensibility === 'number'
    || typeof evaluation.relevance === 'number'
    || typeof evaluation.plausibility === 'number'

  return (
    <div className="flex flex-col gap-2 pt-1">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium" style={{ color: '#737373' }}>Gesamteindruck:</span>
        <span className="text-[11px] font-bold" style={{ color }}>{label}</span>
      </div>
      {hasDetails && (
        <div className="flex flex-col gap-1.5">
          {typeof evaluation.comprehensibility === 'number' && (
            <ScoreRow label="Verständlichkeit" score={evaluation.comprehensibility} />
          )}
          {typeof evaluation.relevance === 'number' && (
            <ScoreRow label="Relevanz" score={evaluation.relevance} />
          )}
          {typeof evaluation.plausibility === 'number' && (
            <ScoreRow label="Plausibilität" score={evaluation.plausibility} />
          )}
        </div>
      )}
      {evaluation.notes && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Kommentar</p>
          <p className="text-xs leading-snug" style={{ color: '#00095B' }}>{evaluation.notes}</p>
        </div>
      )}
    </div>
  )
}

export function InlineRating({ itemType, itemId, evaluations = [], onSuccess }: InlineRatingProps) {
  const { evaluatorName } = useEvaluator()

  const [phase, setPhase]         = useState<'idle' | 'saving' | 'saved'>('idle')
  const [impression, setImpression] = useState<Impression | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const [comprehensibility, setComprehensibility] = useState<MetricValue | null>(null)
  const [relevance, setRelevance]                 = useState<MetricValue | null>(null)
  const [plausibility, setPlausibility]           = useState<MetricValue | null>(null)

  const [comment, setComment] = useState('')

  const [detailLoading, setDetailLoading] = useState(false)
  const [detailSuccess, setDetailSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [expandedEvaluator, setExpandedEvaluator] = useState<string | null>(null)

  // Reset form when evaluator name changes
  const prevName = useRef(evaluatorName)
  useEffect(() => {
    if (prevName.current !== evaluatorName) {
      prevName.current = evaluatorName
      setPhase('idle'); setImpression(null); setShowDetails(false)
      setComprehensibility(null); setRelevance(null); setPlausibility(null)
      setComment(''); setDetailSuccess(false); setError(null)
      setExpandedEvaluator(null)
    }
  }, [evaluatorName])

  // Group evaluations by evaluator name (most recent per evaluator)
  const evaluatorMap = new Map<string, Evaluation>()
  for (const ev of evaluations) {
    if (!evaluatorMap.has(ev.evaluator_name)) {
      evaluatorMap.set(ev.evaluator_name, ev)
    }
  }
  const evaluatorNames = Array.from(evaluatorMap.keys())

  const isOwnName = (name: string) =>
    name.trim().toLowerCase() === (evaluatorName ?? '').trim().toLowerCase()

  const handlePillClick = (name: string) => {
    if (isOwnName(name)) {
      const ev = evaluatorMap.get(name)!
      setImpression(ev.impression as Impression)
      setComprehensibility(ev.comprehensibility)
      setRelevance(ev.relevance)
      setPlausibility(ev.plausibility)
      setComment(ev.notes ?? '')
      setPhase('saved')
      setShowDetails(true)
      setDetailSuccess(false)
      setExpandedEvaluator(null)
    } else {
      setExpandedEvaluator(expandedEvaluator === name ? null : name)
    }
  }

  const resetForm = () => {
    setError(null)
    setPhase('idle'); setImpression(null); setShowDetails(false)
    setComprehensibility(null); setRelevance(null); setPlausibility(null)
    setComment('')
    setDetailSuccess(false)
  }

  const handleImpressionClick = async (value: Impression) => {
    if (phase === 'saving') return
    setImpression(value)
    setPhase('saving')
    setError(null)

    const result = await submitEvaluation({
      itemType, itemId,
      evaluatorName: evaluatorName || 'Anonym',
      impression: value,
    })

    if (result.success) {
      setPhase('saved')
      setShowDetails(true)
    } else {
      setPhase('idle')
      setError(result.error ?? 'Fehler beim Speichern.')
    }
  }

  const handleDetailSubmit = async () => {
    if (!impression) return
    setDetailLoading(true); setError(null)
    const result = await submitEvaluation({
      itemType, itemId,
      evaluatorName: evaluatorName || 'Anonym',
      impression,
      comprehensibility: toDb(comprehensibility),
      relevance: toDb(relevance),
      plausibility: toDb(plausibility),
      notes: comment || undefined,
    })
    setDetailLoading(false)
    if (result.success) { setDetailSuccess(true); onSuccess?.() }
    else setError(result.error ?? 'Fehler beim Speichern.')
  }

  if (!evaluatorName) {
    return (
      <div className="flex flex-col items-center gap-2 py-2 text-center">
        <p className="text-xs leading-snug" style={{ color: '#AEAEAE' }}>
          Tragen Sie Ihren Namen oben ein,<br />um zu bewerten.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── Previous evaluators ── */}
      {evaluatorNames.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#AEAEAE' }}>
            Bereits bewertet von
          </p>
          <div className="flex flex-wrap gap-1.5">
            {evaluatorNames.map(name => {
              const ev = evaluatorMap.get(name)!
              const own = isOwnName(name)
              const isExpanded = expandedEvaluator === name
              const color = impressionColors[ev.impression ?? ''] ?? '#737373'
              return (
                <button
                  key={name}
                  onClick={() => handlePillClick(name)}
                  className={cn(
                    'flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all',
                    isExpanded ? 'ring-1' : '',
                  )}
                  style={{
                    borderColor: own ? '#1A2FEE' : isExpanded ? color : '#E5E5E5',
                    backgroundColor: own ? 'rgba(26,47,238,0.06)' : isExpanded ? `${color}10` : '#fff',
                    color: own ? '#1A2FEE' : isExpanded ? color : '#737373',
                    ...(isExpanded ? { ringColor: color } : {}),
                  }}
                >
                  {own ? <Pencil className="size-3 shrink-0" /> : <User className="size-3 shrink-0" />}
                  {name}
                  {own && <span className="text-[9px] opacity-60">(Sie)</span>}
                </button>
              )
            })}
          </div>

          {/* Expanded evaluator detail (other people only — own pill loads into form) */}
          {expandedEvaluator && evaluatorMap.has(expandedEvaluator) && (
            <div
              className="rounded-xl border p-3"
              style={{ borderColor: '#E5E5E5', backgroundColor: '#FAFAFA' }}
            >
              <EvaluatorSummary evaluation={evaluatorMap.get(expandedEvaluator)!} />
            </div>
          )}
        </div>
      )}

      {/* ── Big impression buttons ── */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#AEAEAE' }}>
          Gesamteindruck
        </p>
        <div className="flex flex-col gap-2">
          {impressionConfig.map(({ value, icon: Icon, label, descriptionInsight, descriptionMeasure, selectedBg, selectedBorder, hoverClass, hoverColor }) => {
            const isSelected = impression === value
            const isSaving   = phase === 'saving' && isSelected
            const description = itemType === 'insight' ? descriptionInsight : descriptionMeasure
            return (
              <button
                key={value}
                type="button"
                disabled={phase === 'saving'}
                onClick={() => handleImpressionClick(value)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all disabled:opacity-60',
                  isSelected ? '' : cn('border-gray-200 bg-white', hoverClass),
                )}
                style={isSelected
                  ? { backgroundColor: selectedBg, borderColor: selectedBorder, color: '#fff' }
                  : { color: hoverColor }}
              >
                {isSaving
                  ? <Loader2 className="size-5 shrink-0 animate-spin" />
                  : <Icon className="size-5 shrink-0" />}
                <div className="flex flex-col">
                  <span className="text-sm font-semibold leading-tight">{label}</span>
                  <span className="text-[11px] font-normal leading-snug" style={{ opacity: isSelected ? 0.85 : 0.7 }}>
                    {description}
                  </span>
                </div>
                {phase === 'saved' && isSelected && (
                  <CheckCircle2 className="ml-auto size-4 shrink-0 opacity-80" />
                )}
              </button>
            )
          })}
        </div>

        {phase === 'saved' && (
          <p className="mt-2 text-xs font-medium" style={{ color: '#059669' }}>
            ✓ Gespeichert – Details optional
          </p>
        )}
      </div>

      {/* ── Optional detailed ratings ── */}
      {phase === 'saved' && (
        <>
          <button
            onClick={() => setShowDetails((p) => !p)}
            className="flex items-center gap-1.5 self-start rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-50"
            style={{ borderColor: '#E5E5E5', color: '#737373' }}
          >
            {showDetails ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {showDetails ? 'Details ausblenden' : 'Detailbewertung anzeigen'}
          </button>

          {showDetails && !detailSuccess && (
            <div className="flex flex-col gap-3 rounded-xl border p-3" style={{ borderColor: '#E5E5E5', backgroundColor: '#FAFAFA' }}>
              <MetricRating
                label="Verständlichkeit"
                description={itemType === 'insight'
                  ? 'Verstehen Sie die Aussage und wissen, welche Konsequenzen sich für Sie ergeben?'
                  : 'Verstehen Sie die Maßnahme und wissen, welche Konsequenzen sich für Sie ergeben?'}
                value={comprehensibility}
                onChange={setComprehensibility}
              />
              <MetricRating
                label="Relevanz"
                description={itemType === 'insight'
                  ? 'Ist die Erkenntnis relevant für Sie und hinreichend konkret, um die nächsten Schritte davon abzuleiten?'
                  : 'Ist die Maßnahme relevant für Sie und hinreichend konkret, um die nächsten Schritte davon abzuleiten?'}
                value={relevance}
                onChange={setRelevance}
              />
              <MetricRating
                label="Plausibilität"
                description={itemType === 'insight'
                  ? 'Halten Sie die Erkenntnis sowie die damit verbundenen Einsparpotenziale für inhaltlich plausibel?'
                  : 'Halten Sie die Maßnahme sowie die damit verbundenen Einsparpotenziale für inhaltlich plausibel?'}
                value={plausibility}
                onChange={setPlausibility}
              />

              <div className="border-t pt-3" style={{ borderColor: '#E5E5E5' }}>
                <label
                  htmlFor={`comment-${itemId}`}
                  className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: '#AEAEAE' }}
                >
                  Kommentar (optional)
                </label>
                <textarea
                  id={`comment-${itemId}`}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ihre Anmerkungen, Fragen oder weiteres Feedback…"
                  rows={3}
                  className="w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-gray-300"
                  style={{
                    borderColor: '#E5E5E5',
                    color: '#00095B',
                    backgroundColor: '#ffffff',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#1A2FEE' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E5E5' }}
                />
              </div>

              {error && <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>}

              <button
                onClick={handleDetailSubmit}
                disabled={detailLoading}
                className="w-full rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-40"
                style={{ backgroundColor: '#1A2FEE', color: '#ffffff' }}
              >
                {detailLoading ? 'Wird gespeichert…' : 'Detailbewertung absenden'}
              </button>
            </div>
          )}

          {detailSuccess && showDetails && (
            <p className="text-xs font-medium" style={{ color: '#059669' }}>✓ Detailbewertung gespeichert!</p>
          )}
        </>
      )}

      {error && phase === 'idle' && (
        <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>
      )}

      {phase === 'saved' && (
        <button
          onClick={resetForm}
          className="flex items-center gap-1.5 self-start text-xs transition-opacity hover:opacity-70"
          style={{ color: '#AEAEAE' }}
        >
          <RotateCcw className="size-3" /> Erneut bewerten
        </button>
      )}
    </div>
  )
}
