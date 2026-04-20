'use client'

import { useState } from 'react'
import {
  Wrench, Euro, Zap, ArrowUpDown, Clock, Shield, Factory,
  FileText, BarChart3, CheckCircle2, HelpCircle,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  ConsultantMeasureRatingForm,
  type InitialMeasureRatingValues,
} from './consultant-measure-rating-form'
import type { ConsultantMeasure, ConsultantMeasureEvaluation } from '@/lib/consultant-types'

// ── Style helpers ─────────────────────────────────────────────────────────────

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

function confidenceStyle(c: number | null) {
  // Measures use 0–100 scale directly
  if (c === null) return null
  if (c >= 80) return { bg: 'rgba(5,150,105,0.08)', text: '#059669', label: `${c.toFixed(0)} %` }
  if (c >= 60) return { bg: 'rgba(234,179,8,0.08)', text: '#b45309', label: `${c.toFixed(0)} %` }
  return { bg: 'rgba(220,38,38,0.06)', text: '#dc2626', label: `${c.toFixed(0)} %` }
}

function formatEur(v: number | null | undefined) {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}
function formatKwh(v: number | null | undefined) {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('de-DE') + ' kWh'
}

const INDUSTRY_DE: Record<string, string> = {
  'Manufacture of basic metals': 'Metallerzeugung',
  'Manufacture of fabricated metal products, except machinery and equipment': 'Metallerzeugnisse',
  'Manufacture of food products': 'Nahrungsmittel',
  'Manufacture of chemicals and chemical products': 'Chemische Erzeugnisse',
  'Manufacture of machinery and equipment n.e.c.': 'Maschinenbau',
  'Manufacture of motor vehicles, trailers and semi-trailers': 'Fahrzeugbau',
  'Manufacture of paper and paper products': 'Papier & Pappe',
  'Manufacture of rubber and plastic products': 'Gummi- & Kunststoffwaren',
  MANUFACTURING_INDUSTRY: 'Verarbeitendes Gewerbe',
  HOSPITALITY: 'Gastgewerbe',
  HEALTHCARE: 'Gesundheitswesen',
  TRANSPORTATION_AND_STORAGE: 'Transport & Lagerei',
  FOOD_TRADE: 'Lebensmittelhandel',
  FOOD_PRODUCTION: 'Lebensmittelproduktion',
}

// ── Main component ─────────────────────────────────────────────────────────────

interface ConsultantMeasureCardProps {
  measure: ConsultantMeasure
  index: number
  evaluation: ConsultantMeasureEvaluation | null
  evaluatorName: string
  onRated: (evaluation: ConsultantMeasureEvaluation) => void
  existingEvaluationId?: string
  initialValues?: InitialMeasureRatingValues
}

export function ConsultantMeasureCard({
  measure,
  index,
  evaluation,
  evaluatorName,
  onRated,
  existingEvaluationId,
  initialValues,
}: ConsultantMeasureCardProps) {
  const [detailOpen, setDetailOpen] = useState(true)
  const [questionsOpen, setQuestionsOpen] = useState(false)

  const raw = measure.measure_raw ?? {}

  // Read a field by both snake_case and camelCase keys (new and old formats)
  function num(...keys: string[]): number | null {
    for (const k of keys) {
      const v = (raw as Record<string, unknown>)[k]
      if (typeof v === 'number') return v
    }
    return null
  }
  function str(...keys: string[]): string | null {
    for (const k of keys) {
      const v = (raw as Record<string, unknown>)[k]
      if (typeof v === 'string') return v
    }
    return null
  }

  const savingsEurFrom = num('yearly_savings_range_from',        'yearlySavingsRangeFrom')
  const savingsEurTo   = num('yearly_savings_range_to',          'yearlySavingsRangeTo')
  const savingsKwhFrom = num('yearly_savings_energy_range_from', 'yearlySavingsEnergyRangeFrom')
  const savingsKwhTo   = num('yearly_savings_energy_range_to',   'yearlySavingsEnergyRangeTo')
  const investFrom     = num('investment_range_from',            'investmentRangeFrom')
  const investTo       = num('investment_range_to',              'investmentRangeTo')
  const amortMonths    = num('amortisation_period_in_months',    'amortisationPeriodInMonths')
  const confidence     = num('confidence')
  const effortLevel    = str('effort_level',                     'effortLevel')
  const category       = str('category')
  const reasoning      = str('reasoning')
  const evidences      = Array.isArray(raw.evidences)
    ? (raw.evidences as unknown[]).filter((e): e is string => typeof e === 'string')
    : []
  const questions      = Array.isArray(raw.questions)
    ? (raw.questions as Array<{
        question: string
        suggestedAnswers?: { answer: string }[]
        suggested_answers?: { answer: string }[]
      }>)
        .filter((q) => q && typeof q.question === 'string')
        .map((q) => ({
          question: q.question,
          answers: (q.suggested_answers ?? q.suggestedAnswers ?? []).filter(
            (a): a is { answer: string } => !!a && typeof a.answer === 'string'
          ),
        }))
    : []

  const effort = effortStyle(effortLevel)
  const catLabel = categoryLabel(category)
  const cs = confidenceStyle(confidence)
  const industryLabel = measure.industry ? (INDUSTRY_DE[measure.industry] ?? measure.industry) : null

  const investmentIsZero = (investFrom === 0 || investFrom === null) && (investTo === 0 || investTo === null)

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

        {/* ── LEFT: measure content ── */}
        <div className="flex-1 min-w-0">
          <div className="px-5 py-4 flex flex-col gap-4">

            {/* Header: index + badges + title */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ backgroundColor: 'rgba(26,47,238,0.08)', color: '#1A2FEE' }}
                >
                  {index + 1}
                </span>
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
                {cs && (
                  <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: cs.bg, color: cs.text }}>
                    <Shield className="size-2.5" /> Konfidenz {cs.label}
                  </span>
                )}
                {industryLabel && (
                  <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'rgba(0,0,0,0.04)', color: '#737373' }}>
                    <Factory className="size-2.5" /> {industryLabel}
                  </span>
                )}
                {evaluation && (
                  <span className="ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'rgba(5,150,105,0.08)', color: '#059669' }}>
                    <CheckCircle2 className="size-3" /> Bewertet
                  </span>
                )}
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(26,47,238,0.06)' }}>
                  <Wrench className="size-4" style={{ color: '#1A2FEE' }} />
                </div>
                <h3 className="text-sm font-bold leading-snug" style={{ color: '#00095B' }}>
                  {measure.measure_title}
                </h3>
              </div>
            </div>

            {/* KPI Grid — 4 cells */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: '#F0F0F0' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Euro className="size-3" style={{ color: '#059669' }} />
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Einsparung/Jahr</span>
                </div>
                <p className="text-xs font-bold font-mono leading-snug" style={{ color: '#059669' }}>
                  {formatEur(savingsEurFrom)} – {formatEur(savingsEurTo)}
                </p>
              </div>
              <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: '#F0F0F0' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="size-3" style={{ color: '#1A2FEE' }} />
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Energie/Jahr</span>
                </div>
                <p className="text-xs font-bold font-mono leading-snug" style={{ color: '#1A2FEE' }}>
                  {formatKwh(savingsKwhFrom)} – {formatKwh(savingsKwhTo)}
                </p>
              </div>
              <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: '#F0F0F0' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowUpDown className="size-3" style={{ color: '#b45309' }} />
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Investition</span>
                </div>
                <p className="text-xs font-bold font-mono leading-snug" style={{ color: '#00095B' }}>
                  {investmentIsZero ? 'Keine' : `${formatEur(investFrom)} – ${formatEur(investTo)}`}
                </p>
              </div>
              <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: '#F0F0F0' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="size-3" style={{ color: '#737373' }} />
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Amortisation</span>
                </div>
                <p className="text-xs font-bold font-mono leading-snug" style={{ color: '#00095B' }}>
                  {amortMonths !== null ? `${amortMonths} Mon.` : '—'}
                </p>
              </div>
            </div>

            {/* Short description */}
            {measure.measure_short_description && (
              <p className="text-[13px] leading-relaxed" style={{ color: '#444444' }}>
                {measure.measure_short_description}
              </p>
            )}

            {/* Full description — collapsible, open by default */}
            {measure.measure_description && (
              <div>
                <button
                  onClick={() => setDetailOpen((p) => !p)}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-70"
                  style={{ color: '#1A2FEE' }}
                >
                  <FileText className="size-3.5" />
                  Beschreibung
                  {detailOpen
                    ? <ChevronUp className="size-3.5" />
                    : <ChevronDown className="size-3.5" />}
                </button>
                {detailOpen && (
                  <p className="mt-2 text-[13px] leading-relaxed" style={{ color: '#444444' }}>
                    {measure.measure_description}
                  </p>
                )}
              </div>
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

            {/* Questions — collapsed by default */}
            {questions.length > 0 && (
              <div>
                <button
                  onClick={() => setQuestionsOpen((p) => !p)}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-70"
                  style={{ color: '#737373' }}
                >
                  <HelpCircle className="size-3.5" />
                  Rückfragen an Kunden ({questions.length})
                  {questionsOpen
                    ? <ChevronUp className="size-3.5" />
                    : <ChevronDown className="size-3.5" />}
                </button>
                {questionsOpen && (
                  <div className="mt-2 flex flex-col gap-3">
                    {questions.map((q, i) => (
                      <div key={i} className="rounded-lg border px-3 py-2.5" style={{ borderColor: '#F0F0F0', backgroundColor: '#FAFAFA' }}>
                        <p className="text-[12px] font-semibold leading-snug" style={{ color: '#00095B' }}>
                          {i + 1}. {q.question}
                        </p>
                        {q.answers.length > 0 && (
                          <ul className="mt-1.5 flex flex-col gap-0.5 pl-3">
                            {q.answers.map((a, j) => (
                              <li key={j} className="text-[11px] leading-relaxed" style={{ color: '#737373' }}>
                                · {a.answer}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mobile rating */}
            <div className="border-t pt-4 lg:hidden" style={{ borderColor: '#F0F0F0' }}>
              {evaluation && !existingEvaluationId
                ? <RatedSummary evaluation={evaluation} />
                : <ConsultantMeasureRatingForm
                    measureId={measure.id}
                    evaluatorName={evaluatorName}
                    onSubmitted={onRated}
                    existingEvaluationId={existingEvaluationId}
                    initialValues={initialValues}
                  />}
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
              : <ConsultantMeasureRatingForm
                  measureId={measure.id}
                  evaluatorName={evaluatorName}
                  onSubmitted={onRated}
                  existingEvaluationId={existingEvaluationId}
                  initialValues={initialValues}
                />}
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

function RatedSummary({ evaluation }: { evaluation: ConsultantMeasureEvaluation }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-5" style={{ color: '#059669' }} />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#059669' }}>
          Bewertung abgegeben
        </span>
      </div>

      <div className="flex gap-3 flex-wrap">
        <ScoreBadge label="Verständl."   value={evaluation.verstaendlichkeit} />
        <ScoreBadge label="Plausib."     value={evaluation.plausibilitaet} />
        <ScoreBadge label="Wirtsch."     value={evaluation.wirtschaftlichkeit} />
        <ScoreBadge label="Umsetzb."     value={evaluation.umsetzbarkeit} />
        <ScoreBadge label="Gesamt"       value={evaluation.gesamteindruck} />
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
