'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Wrench, Euro, Clock, Zap, ArrowUpDown,
  FileText, BarChart3, CheckCircle2,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { InlineRating } from '@/components/rating/inline-rating'
import type { MeasureWithEvaluations } from '@/lib/types'

// ── Helpers (shared with measure-card.tsx) ────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

interface MeasureInlineCardProps {
  measure: MeasureWithEvaluations
  index: number
  onEvaluationSubmitted?: () => void
}

export function MeasureInlineCard({ measure, index, onEvaluationSubmitted }: MeasureInlineCardProps) {
  const [expanded, setExpanded] = useState(false)

  const effort = effortStyle(measure.effort_level)
  const catLabel = categoryLabel(measure.category)
  const raw = measure.raw_json as Record<string, unknown>
  const reasoning = typeof raw?.reasoning === 'string' ? raw.reasoning : null
  const evidences = Array.isArray(raw?.evidences)
    ? (raw.evidences as unknown[]).filter((e): e is string => typeof e === 'string')
    : []

  const hasExpandable = !!(measure.description || reasoning || evidences.length > 0)

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
      <div className="flex flex-col lg:flex-row">

        {/* ── LEFT: measure content ── */}
        <div className="flex-1 min-w-0 px-5 py-4 flex flex-col gap-4">

          {/* Badges + title */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(26,47,238,0.06)' }}>
                <Wrench className="size-4" style={{ color: '#1A2FEE' }} />
              </div>
              <div className="flex flex-wrap gap-1.5">
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
            </div>
            <h3 className="text-sm font-bold leading-snug" style={{ color: '#00095B' }}>
              {measure.title}
            </h3>
            {measure.short_description && (
              <p className="mt-1 text-xs leading-relaxed" style={{ color: '#737373' }}>
                {measure.short_description}
              </p>
            )}
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: '#F0F0F0' }}>
              <div className="flex items-center gap-1 mb-1">
                <Euro className="size-3" style={{ color: '#059669' }} />
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Einsparung/Jahr</span>
              </div>
              <p className="text-xs font-bold font-mono" style={{ color: '#059669' }}>
                {formatEur(measure.yearly_savings_eur_from)} – {formatEur(measure.yearly_savings_eur_to)}
              </p>
            </div>
            <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: '#F0F0F0' }}>
              <div className="flex items-center gap-1 mb-1">
                <Zap className="size-3" style={{ color: '#1A2FEE' }} />
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Energie/Jahr</span>
              </div>
              <p className="text-xs font-bold font-mono" style={{ color: '#1A2FEE' }}>
                {formatKwh(measure.yearly_savings_kwh_from)} – {formatKwh(measure.yearly_savings_kwh_to)}
              </p>
            </div>
            <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: '#F0F0F0' }}>
              <div className="flex items-center gap-1 mb-1">
                <ArrowUpDown className="size-3" style={{ color: '#b45309' }} />
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Investition</span>
              </div>
              <p className="text-xs font-bold font-mono" style={{ color: '#00095B' }}>
                {measure.investment_from === 0 && measure.investment_to === 0
                  ? 'Keine'
                  : `${formatEur(measure.investment_from)} – ${formatEur(measure.investment_to)}`}
              </p>
            </div>
            <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: '#F0F0F0' }}>
              <div className="flex items-center gap-1 mb-1">
                <Clock className="size-3" style={{ color: '#737373' }} />
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#AEAEAE' }}>Amortisation</span>
              </div>
              <p className="text-xs font-bold font-mono" style={{ color: '#00095B' }}>
                {measure.amortisation_months !== null ? `${measure.amortisation_months} Mon.` : '—'}
              </p>
            </div>
          </div>

          {/* Expand toggle */}
          {hasExpandable && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className="flex items-center gap-1.5 self-start text-xs font-medium transition-colors"
              style={{ color: '#1A2FEE' }}
            >
              {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              {expanded ? 'Weniger anzeigen' : 'Beschreibung & Begründung'}
            </button>
          )}

          {/* Expandable detail */}
          {expanded && (
            <div className="flex flex-col gap-4 border-t pt-4" style={{ borderColor: '#F0F0F0' }}>
              {measure.description && (
                <p className="text-[13px] leading-relaxed" style={{ color: '#444444' }}>
                  {measure.description}
                </p>
              )}
              {reasoning && (
                <div className="rounded-lg border-l-2 px-4 py-3" style={{ backgroundColor: '#FAFAFA', borderLeftColor: '#1A2FEE' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText className="size-3.5" style={{ color: '#1A2FEE' }} />
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1A2FEE' }}>Begründung</span>
                  </div>
                  <p className="text-[13px] leading-relaxed" style={{ color: '#444444' }}>{reasoning}</p>
                </div>
              )}
              {evidences.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <BarChart3 className="size-3.5" style={{ color: '#059669' }} />
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#059669' }}>Datenpunkte</span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {evidences.map((ev, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-3 shrink-0" style={{ color: '#059669' }} />
                        <span className="text-[12px] leading-relaxed" style={{ color: '#444444' }}>{ev}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Rating — mobile only */}
          <div className="border-t pt-4 lg:hidden" style={{ borderColor: '#F0F0F0' }}>
            <div className="flex items-center gap-1.5 mb-3">
              <FileText className="size-3.5" style={{ color: '#1A2FEE' }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1A2FEE' }}>Diese Maßnahme bewerten</span>
            </div>
            <InlineRating itemType="measure" itemId={measure.id} evaluations={measure.evaluations} onSuccess={onEvaluationSubmitted} />
          </div>
        </div>

        {/* ── RIGHT: rating panel (desktop) ── */}
        <div
          className="hidden lg:flex lg:w-72 shrink-0 flex-col border-l"
          style={{ borderColor: '#F0F0F0', backgroundColor: '#FAFCFF' }}
        >
          <div className="flex flex-col gap-4 p-5 h-full">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(26,47,238,0.08)' }}>
                <FileText className="size-3.5" style={{ color: '#1A2FEE' }} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1A2FEE' }}>
                Bewertung
              </span>
            </div>
            <InlineRating itemType="measure" itemId={measure.id} evaluations={measure.evaluations} onSuccess={onEvaluationSubmitted} />
          </div>
        </div>

      </div>
    </motion.div>
  )
}
