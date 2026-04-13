'use client'

import { Pencil } from 'lucide-react'
import type { ConsultantInsight, ConsultantEvaluation } from '@/lib/consultant-types'

interface RatedInsightsListProps {
  insights: ConsultantInsight[]
  evaluations: ConsultantEvaluation[]
  onReEvaluate: (insight: ConsultantInsight, evaluation: ConsultantEvaluation) => void
}

function scoreCell(value: number | null) {
  if (value === null) return (
    <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500 }}>N/A</span>
  )
  return (
    <span
      className="inline-flex size-6 items-center justify-center rounded text-xs font-bold"
      style={{ backgroundColor: 'rgba(26,47,238,0.08)', color: '#1A2FEE' }}
    >
      {value}
    </span>
  )
}

export function RatedInsightsList({ insights, evaluations, onReEvaluate }: RatedInsightsListProps) {
  const evalMap = new Map(evaluations.map((e) => [e.consultant_insight_id, e]))
  const ratedInsights = insights.filter((i) => evalMap.has(i.id))

  if (ratedInsights.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm" style={{ color: '#AEAEAE' }}>Noch keine Erkenntnisse bewertet.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: '#E5E5E5' }}>
      <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9ff', borderBottom: '1px solid #E5E5E5' }}>
            {['#', 'Erkenntnis', 'Verständl.', 'Plausib.', 'Aktionab.', 'Gesamt', 'Kommentar', 'Bewertet', ''].map((h) => (
              <th
                key={h}
                style={{
                  padding: '10px 14px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#AEAEAE',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ratedInsights.map((insight, idx) => {
            const ev = evalMap.get(insight.id)!
            return (
              <tr key={insight.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                {/* # */}
                <td style={{ padding: '10px 14px', fontSize: '12px', color: '#AEAEAE', fontWeight: 600 }}>
                  {idx + 1}
                </td>

                {/* Title — no source file */}
                <td style={{ padding: '10px 14px', minWidth: '200px', maxWidth: '280px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#00095B', lineHeight: 1.4 }}>
                    {insight.insight_title}
                  </p>
                </td>

                {/* Scores */}
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>{scoreCell(ev.verstaendlichkeit)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>{scoreCell(ev.plausibilitaet)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>{scoreCell(ev.aktionabilitaet)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>{scoreCell(ev.gesamteindruck)}</td>

                {/* Comment */}
                <td style={{ padding: '10px 14px', maxWidth: '200px' }}>
                  {ev.notes ? (
                    <p style={{ fontSize: '11px', color: '#737373', lineHeight: 1.4 }} title={ev.notes}>
                      {ev.notes.length > 60 ? ev.notes.slice(0, 60) + '…' : ev.notes}
                    </p>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#AEAEAE' }}>—</span>
                  )}
                </td>

                {/* Date */}
                <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                  <p style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {new Date(ev.created_at).toLocaleDateString('de-DE', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </p>
                </td>

                {/* Ändern button */}
                <td style={{ padding: '10px 14px' }}>
                  <button
                    type="button"
                    onClick={() => onReEvaluate(insight, ev)}
                    className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-blue-50"
                    style={{ borderColor: '#E5E5E5', color: '#1A2FEE' }}
                    title="Bewertung ändern"
                  >
                    <Pencil className="size-3" /> Ändern
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
