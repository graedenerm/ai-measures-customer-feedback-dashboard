'use client'

import { useState } from 'react'
import {
  ThumbsUp, ThumbsDown, Minus,
  ChevronDown, ChevronUp, CheckCircle2, RotateCcw, Loader2,
} from 'lucide-react'
import { MetricRating, type MetricValue } from './metric-rating'
import { submitEvaluation } from '@/actions/evaluations'
import { useEvaluator } from '@/lib/evaluator-context'
import { cn } from '@/lib/utils'

type Impression = 'positive' | 'negative' | 'neutral'

interface InlineRatingProps {
  itemType: 'insight' | 'measure'
  itemId: string
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

export function InlineRating({ itemType, itemId, onSuccess }: InlineRatingProps) {
  const { evaluatorName } = useEvaluator()

  // Phase: 'idle' | 'saving' | 'saved' | 'details'
  const [phase, setPhase]         = useState<'idle' | 'saving' | 'saved' | 'details'>('idle')
  const [impression, setImpression] = useState<Impression | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const [comprehensibility, setComprehensibility] = useState<MetricValue | null>(null)
  const [relevance, setRelevance]                 = useState<MetricValue | null>(null)
  const [plausibility, setPlausibility]           = useState<MetricValue | null>(null)

  const [comment, setComment] = useState('')

  const [detailLoading, setDetailLoading] = useState(false)
  const [detailSuccess, setDetailSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setPhase('idle'); setImpression(null); setShowDetails(false)
    setComprehensibility(null); setRelevance(null); setPlausibility(null)
    setComment('')
    setDetailSuccess(false); setError(null)
  }

  // ── Called immediately when user clicks a thumb ────────────────────────────
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
      setShowDetails(true)   // auto-expand details
    } else {
      setPhase('idle')
      setError(result.error ?? 'Fehler beim Speichern.')
    }
  }

  // ── Optional detailed ratings submit ──────────────────────────────────────
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

  // ── No name entered ────────────────────────────────────────────────────────
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
                {/* Saved tick */}
                {phase === 'saved' && isSelected && (
                  <CheckCircle2 className="ml-auto size-4 shrink-0 opacity-80" />
                )}
              </button>
            )
          })}
        </div>

        {/* Saved confirmation */}
        {phase === 'saved' && (
          <p className="mt-2 text-xs font-medium" style={{ color: '#059669' }}>
            ✓ Gespeichert – Details optional
          </p>
        )}
      </div>

      {/* ── Optional detailed ratings (auto-expands after impression saved) ── */}
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
                  ? 'Verstehen Sie Aussage und wissen, welche Konsequenzen sich für Sie ergeben?'
                  : 'Verstehen Sie die Maßnahme und wissen, welche Konsequenzen sich für Sie ergeben?'}
                value={comprehensibility}
                onChange={setComprehensibility}
              />
              <MetricRating
                label="Relevanz"
                description={itemType === 'insight'
                  ? 'Ist die Erkenntnis relevant für Sie?'
                  : 'Ist die Maßnahme relevant für Sie?'}
                value={relevance}
                onChange={setRelevance}
              />
              <MetricRating
                label="Plausibilität"
                description={itemType === 'insight'
                  ? 'Ist die Erkenntnis inhaltlich richtig?'
                  : 'Ist die Maßnahme inhaltlich richtig?'}
                value={plausibility}
                onChange={setPlausibility}
              />

              {/* Comment field */}
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

      {/* Reset link */}
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
