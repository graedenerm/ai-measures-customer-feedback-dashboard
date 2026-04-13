'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, FileText } from 'lucide-react'
import { MetricRating, type MetricValue } from '@/components/rating/metric-rating'
import { submitConsultantEvaluation, updateConsultantEvaluation } from '@/actions/consultant-evaluations'
import type { ConsultantEvaluation } from '@/lib/consultant-types'

const CATEGORIES = [
  {
    key: 'verstaendlichkeit' as const,
    label: 'Verständlichkeit',
    description: 'Verstehen Sie die Aussage und wissen, welche Konsequenzen sich ergeben?',
  },
  {
    key: 'plausibilitaet' as const,
    label: 'Plausibilität',
    description: 'Halten Sie die Erkenntnis sowie die damit verbunden Einsparpotenziale für inhaltlich plausibel?',
  },
  {
    key: 'aktionabilitaet' as const,
    label: 'Aktionabilität',
    description: 'Ist die Erkenntnis hinreichend konkret, um die nächsten Schritte davon abzuleiten?',
  },
  {
    key: 'gesamteindruck' as const,
    label: 'Gesamteindruck',
    description: 'Wie wertvoll finden Sie die Erkenntnis in Summe?',
  },
] as const

type CategoryKey = typeof CATEGORIES[number]['key']

function toDb(v: MetricValue | null): number | null {
  return v === null || v === 'na' ? null : v
}

// DB null means N/A was chosen; number means that score
function fromDb(v: number | null): MetricValue {
  return v === null ? 'na' : v
}

export interface InitialRatingValues {
  verstaendlichkeit: number | null
  plausibilitaet: number | null
  aktionabilitaet: number | null
  gesamteindruck: number | null
  notes: string | null
}

interface ConsultantRatingFormProps {
  insightId: string
  evaluatorName: string
  onSubmitted: (evaluation: ConsultantEvaluation) => void
  // Present when updating an existing evaluation
  existingEvaluationId?: string
  initialValues?: InitialRatingValues
}

export function ConsultantRatingForm({
  insightId,
  evaluatorName,
  onSubmitted,
  existingEvaluationId,
  initialValues,
}: ConsultantRatingFormProps) {
  const isUpdate = !!existingEvaluationId

  const [ratings, setRatings] = useState<Record<CategoryKey, MetricValue | null>>(() => {
    if (initialValues) {
      return {
        verstaendlichkeit: fromDb(initialValues.verstaendlichkeit),
        plausibilitaet:    fromDb(initialValues.plausibilitaet),
        aktionabilitaet:   fromDb(initialValues.aktionabilitaet),
        gesamteindruck:    fromDb(initialValues.gesamteindruck),
      }
    }
    return { verstaendlichkeit: null, plausibilitaet: null, aktionabilitaet: null, gesamteindruck: null }
  })
  const [comment, setComment] = useState(initialValues?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function setRating(key: CategoryKey, value: MetricValue) {
    setRatings((prev) => ({ ...prev, [key]: value }))
  }

  const allSet = CATEGORIES.every((c) => ratings[c.key] !== null)

  async function handleSubmit() {
    if (!allSet || loading) return
    setLoading(true)
    setError(null)

    const payload = {
      verstaendlichkeit: toDb(ratings.verstaendlichkeit),
      plausibilitaet:    toDb(ratings.plausibilitaet),
      aktionabilitaet:   toDb(ratings.aktionabilitaet),
      gesamteindruck:    toDb(ratings.gesamteindruck),
      notes: comment || undefined,
    }

    const result = isUpdate
      ? await updateConsultantEvaluation(existingEvaluationId!, payload)
      : await submitConsultantEvaluation({ consultantInsightId: insightId, evaluatorName, ...payload })

    setLoading(false)

    if (result.success && result.evaluation) {
      setSaved(true)
      onSubmitted(result.evaluation)
    } else {
      setError(result.error ?? 'Fehler beim Speichern.')
    }
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <CheckCircle2 className="size-8" style={{ color: '#059669' }} />
        <p className="text-sm font-semibold" style={{ color: '#059669' }}>
          {isUpdate ? 'Bewertung aktualisiert!' : 'Bewertung gespeichert!'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex size-7 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(26,47,238,0.08)' }}>
          <FileText className="size-3.5" style={{ color: '#1A2FEE' }} />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1A2FEE' }}>
          {isUpdate ? 'Bewertung ändern' : 'Bewertung'}
        </span>
      </div>

      <p className="mb-3 text-[10px]" style={{ color: '#AEAEAE' }}>
        Skala: <strong>1</strong> = Sehr schlecht · <strong>5</strong> = Sehr gut · <strong>N/A</strong> = Nicht beurteilbar
      </p>

      <div className="flex flex-col gap-4 rounded-xl border p-4" style={{ borderColor: '#E5E5E5', backgroundColor: '#FAFAFA' }}>
        {CATEGORIES.map((cat) => (
          <MetricRating
            key={cat.key}
            label={cat.label}
            description={cat.description}
            value={ratings[cat.key]}
            onChange={(v) => setRating(cat.key, v)}
          />
        ))}

        <div className="border-t pt-4" style={{ borderColor: '#E5E5E5' }}>
          <label
            htmlFor={`comment-${insightId}-${isUpdate ? 'update' : 'new'}`}
            className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: '#AEAEAE' }}
          >
            Kommentar (optional)
          </label>
          <textarea
            id={`comment-${insightId}-${isUpdate ? 'update' : 'new'}`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Anmerkungen, Fragen oder weiteres Feedback…"
            rows={3}
            className="w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-gray-300"
            style={{ borderColor: '#E5E5E5', color: '#00095B', backgroundColor: '#ffffff' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#1A2FEE' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E5E5' }}
          />
        </div>

        {error && <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allSet || loading}
          className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all"
          style={{
            backgroundColor: allSet && !loading ? '#1A2FEE' : '#9ca3af',
            color: '#ffffff',
            cursor: allSet && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {loading ? 'Wird gespeichert…' : isUpdate ? 'Änderung speichern' : 'Bewertung absenden'}
        </button>

        {!allSet && (
          <p className="text-center text-[11px]" style={{ color: '#AEAEAE' }}>
            Bitte alle vier Kategorien bewerten (1–5 oder N/A)
          </p>
        )}
      </div>
    </div>
  )
}
