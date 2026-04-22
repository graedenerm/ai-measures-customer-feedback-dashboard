'use client'

import { useState } from 'react'
import {
  Activity, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Target, Shuffle, Zap, GraduationCap,
  AlertTriangle, Star, Frown, Coffee, Lightbulb,
} from 'lucide-react'

// Accepts any object with these two fields — works for both insight and
// measure evaluations.
export interface RatedPoint {
  created_at: string
  gesamteindruck: number | null
}

interface Props {
  evaluations: RatedPoint[]
  title?: string
}

type Tone = 'positive' | 'negative' | 'neutral'

interface Observation {
  icon: React.ReactNode
  text: string
  tone: Tone
}

// ── Observation derivation ──────────────────────────────────────────────────

function toneStyle(tone: Tone): { bg: string; color: string; border: string } {
  switch (tone) {
    case 'positive': return { bg: 'rgba(5,150,105,0.08)',  color: '#059669', border: 'rgba(5,150,105,0.20)' }
    case 'negative': return { bg: 'rgba(220,38,38,0.08)',  color: '#dc2626', border: 'rgba(220,38,38,0.20)' }
    default:         return { bg: 'rgba(26,47,238,0.06)',  color: '#1A2FEE', border: 'rgba(26,47,238,0.18)' }
  }
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const m = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[m - 1] + sorted[m]) / 2 : sorted[m]
}

function deriveObservations(points: { t: number; score: number }[]): Observation[] {
  const obs: Observation[] = []
  const n = points.length
  if (n < 4) return obs

  const scores = points.map((p) => p.score)
  const mean = scores.reduce((a, b) => a + b, 0) / n
  const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / n
  const std = Math.sqrt(variance)

  // First vs last third — trend
  const third = Math.max(3, Math.floor(n / 3))
  const firstThird = scores.slice(0, third)
  const lastThird = scores.slice(-third)
  const firstAvg = firstThird.reduce((a, b) => a + b, 0) / firstThird.length
  const lastAvg = lastThird.reduce((a, b) => a + b, 0) / lastThird.length
  const shift = lastAvg - firstAvg

  if (shift >= 0.5) {
    obs.push({
      icon: <TrendingUp className="size-3.5" />,
      text: `Wurde im Verlauf positiver — Ø stieg von ${firstAvg.toFixed(1)} (erstes Drittel) auf ${lastAvg.toFixed(1)} (letztes Drittel).`,
      tone: 'positive',
    })
  } else if (shift <= -0.5) {
    obs.push({
      icon: <TrendingDown className="size-3.5" />,
      text: `Wurde im Verlauf kritischer — Ø fiel von ${firstAvg.toFixed(1)} (erstes Drittel) auf ${lastAvg.toFixed(1)} (letztes Drittel).`,
      tone: 'negative',
    })
  }

  // Learning curve — rough start, better overall
  const firstFew = scores.slice(0, Math.min(5, n))
  const firstFewAvg = firstFew.reduce((a, b) => a + b, 0) / firstFew.length
  if (firstFewAvg <= 2.5 && mean >= 3.5 && n >= 8) {
    obs.push({
      icon: <GraduationCap className="size-3.5" />,
      text: `Möglicherweise Lernkurve zu Beginn: die ersten ${firstFew.length} Bewertungen waren auffällig kritisch (Ø ${firstFewAvg.toFixed(1)}) gegenüber dem Gesamtschnitt (Ø ${mean.toFixed(1)}).`,
      tone: 'neutral',
    })
  }

  // Streuung
  if (std < 0.5 && n >= 5) {
    obs.push({
      icon: <Target className="size-3.5" />,
      text: `Sehr konsistente Bewertungen (Streuung σ = ${std.toFixed(2)}).`,
      tone: 'neutral',
    })
  } else if (std > 1.3) {
    obs.push({
      icon: <Shuffle className="size-3.5" />,
      text: `Große Streuung in den Bewertungen (σ = ${std.toFixed(2)}) — klare Meinungen in beide Richtungen.`,
      tone: 'neutral',
    })
  }

  // Rating-Tempo: intervals between consecutive ratings (excluding gaps > 20 min)
  if (n >= 6) {
    const gapCap = 20 * 60 * 1000
    const intervals: number[] = []
    for (let i = 1; i < n; i++) {
      const dt = points[i].t - points[i - 1].t
      if (dt < gapCap && dt > 0) intervals.push(dt)
    }
    if (intervals.length >= 4) {
      const half = Math.floor(intervals.length / 2)
      const firstHalf = intervals.slice(0, half)
      const secondHalf = intervals.slice(half)
      if (firstHalf.length >= 2 && secondHalf.length >= 2) {
        const firstMed = median(firstHalf)
        const secondMed = median(secondHalf)
        if (firstMed > 0 && secondMed < firstMed * 0.65) {
          const pct = Math.round((1 - secondMed / firstMed) * 100)
          obs.push({
            icon: <Zap className="size-3.5" />,
            text: `Rating-Tempo hat sich beschleunigt (~${pct} % schneller in der zweiten Hälfte).`,
            tone: 'neutral',
          })
        } else if (firstMed > 0 && secondMed > firstMed * 1.6) {
          const pct = Math.round((secondMed / firstMed - 1) * 100)
          obs.push({
            icon: <Coffee className="size-3.5" />,
            text: `Rating-Tempo hat sich verlangsamt (~${pct} % langsamer gegen Ende — möglicherweise Ermüdung).`,
            tone: 'neutral',
          })
        }
      }
    }
  }

  // Extreme Bewertungen
  const ones = scores.filter((s) => s === 1).length
  const fives = scores.filter((s) => s === 5).length
  if (ones / n >= 0.25) {
    obs.push({
      icon: <AlertTriangle className="size-3.5" />,
      text: `${Math.round((ones / n) * 100)} % der Bewertungen waren eine 1 — eher kritische Haltung.`,
      tone: 'negative',
    })
  }
  if (fives / n >= 0.4) {
    obs.push({
      icon: <Star className="size-3.5" />,
      text: `${Math.round((fives / n) * 100)} % der Bewertungen waren eine 5 — überwiegend begeistert.`,
      tone: 'positive',
    })
  }

  // Finish mood — last ~5 vs overall
  const tail = scores.slice(-Math.min(5, n))
  const tailAvg = tail.reduce((a, b) => a + b, 0) / tail.length
  if (tailAvg > mean + 0.7) {
    obs.push({
      icon: <Lightbulb className="size-3.5" />,
      text: `Schlusspunkt: die letzten ${tail.length} Bewertungen lagen deutlich über dem Schnitt (Ø ${tailAvg.toFixed(1)} vs. Ø ${mean.toFixed(1)}).`,
      tone: 'positive',
    })
  } else if (tailAvg < mean - 0.7) {
    obs.push({
      icon: <Frown className="size-3.5" />,
      text: `Schlusspunkt: die letzten ${tail.length} Bewertungen lagen deutlich unter dem Schnitt (Ø ${tailAvg.toFixed(1)} vs. Ø ${mean.toFixed(1)}).`,
      tone: 'negative',
    })
  }

  return obs.slice(0, 4)
}

// ── Component ───────────────────────────────────────────────────────────────

export function RatingTimeline({ evaluations, title = 'Zeitverlauf der Bewertungen' }: Props) {
  const [open, setOpen] = useState(false)

  const points = evaluations
    .map((e) => ({ t: new Date(e.created_at).getTime(), score: e.gesamteindruck }))
    .filter((p): p is { t: number; score: number } => p.score !== null)
    .sort((a, b) => a.t - b.t)

  if (points.length < 2) {
    return (
      <div className="rounded-xl border px-4 py-3" style={{ borderColor: '#E5E5E5', backgroundColor: '#ffffff' }}>
        <p className="text-[11px]" style={{ color: '#AEAEAE' }}>
          Zu wenige Bewertungen mit Gesamteindruck für einen Zeitverlauf.
        </p>
      </div>
    )
  }

  const t0 = points[0].t
  const tEnd = points[points.length - 1].t
  const totalMs = Math.max(tEnd - t0, 1)

  // Cumulative average at each point
  let sum = 0
  const running = points.map((p, i) => {
    sum += p.score
    return { ...p, avg: sum / (i + 1) }
  })
  const overallAvg = sum / points.length

  // Gap detection
  const GAP_MINUTES = 20
  const gaps: { startT: number; endT: number; minutes: number }[] = []
  for (let i = 1; i < points.length; i++) {
    const dt = points[i].t - points[i - 1].t
    const min = dt / 60000
    if (min > GAP_MINUTES) gaps.push({ startT: points[i - 1].t, endT: points[i].t, minutes: min })
  }

  // Before/after the longest gap
  let beforeAvg: number | null = null
  let afterAvg: number | null = null
  let gapLabel: string | null = null
  if (gaps.length > 0) {
    const mainGap = gaps.reduce((a, b) => (b.minutes > a.minutes ? b : a))
    const before = points.filter((p) => p.t <= mainGap.startT)
    const after = points.filter((p) => p.t >= mainGap.endT)
    if (before.length > 0) beforeAvg = before.reduce((a, b) => a + b.score, 0) / before.length
    if (after.length > 0)  afterAvg  = after.reduce((a, b) => a + b.score, 0) / after.length
    gapLabel = `Längste Pause: ${Math.round(mainGap.minutes)} min (${new Date(mainGap.startT).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} → ${new Date(mainGap.endT).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })})`
  }

  const observations = deriveObservations(points)

  // SVG geometry
  const W = 900
  const H = 240
  const PAD_L = 32
  const PAD_R = 12
  const PAD_T = 12
  const PAD_B = 28
  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B

  const xFor = (t: number) => PAD_L + ((t - t0) / totalMs) * plotW
  const yFor = (score: number) => PAD_T + (1 - (score - 1) / 4) * plotH

  const avgPath = running
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.t).toFixed(1)} ${yFor(p.avg).toFixed(1)}`)
    .join(' ')

  const xTicks: number[] = [t0, tEnd]
  const stepMs = 30 * 60 * 1000
  for (let t = Math.ceil(t0 / stepMs) * stepMs; t < tEnd; t += stepMs) xTicks.push(t)
  xTicks.sort((a, b) => a - b)

  return (
    <div className="rounded-xl border" style={{ borderColor: '#E5E5E5', backgroundColor: '#ffffff' }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-blue-50/30"
      >
        <div className="flex items-center gap-2">
          <Activity className="size-4" style={{ color: '#1A2FEE' }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#00095B' }}>
            {title}
          </span>
          <span className="text-[11px]" style={{ color: '#AEAEAE' }}>
            · Ø {overallAvg.toFixed(2)} über {points.length} Bewertungen
            {observations.length > 0 && ` · ${observations.length} Erkenntnisse`}
          </span>
        </div>
        {open ? <ChevronUp className="size-4" style={{ color: '#737373' }} /> : <ChevronDown className="size-4" style={{ color: '#737373' }} />}
      </button>

      {open && (
        <div className="border-t px-4 py-4" style={{ borderColor: '#F0F0F0' }}>
          {/* Observations */}
          {observations.length > 0 && (
            <div className="mb-4 flex flex-col gap-1.5">
              {observations.map((o, i) => {
                const s = toneStyle(o.tone)
                return (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg border px-3 py-2"
                    style={{ backgroundColor: s.bg, borderColor: s.border }}
                  >
                    <div style={{ color: s.color, marginTop: '1px' }}>{o.icon}</div>
                    <p className="text-[12px] leading-snug" style={{ color: '#444444' }}>{o.text}</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Gap summary */}
          {gapLabel && (
            <p className="mb-3 text-[11px]" style={{ color: '#737373' }}>
              {gapLabel}
              {beforeAvg !== null && afterAvg !== null && (
                <>
                  {' · '}
                  <span style={{ color: '#00095B', fontWeight: 600 }}>
                    Ø vor Pause: {beforeAvg.toFixed(2)} → Ø nach Pause: {afterAvg.toFixed(2)}
                  </span>
                  {' '}
                  <span style={{ color: afterAvg > beforeAvg ? '#059669' : afterAvg < beforeAvg ? '#dc2626' : '#737373' }}>
                    ({afterAvg >= beforeAvg ? '+' : ''}{(afterAvg - beforeAvg).toFixed(2)})
                  </span>
                </>
              )}
            </p>
          )}

          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
            {[1, 2, 3, 4, 5].map((score) => (
              <g key={score}>
                <line x1={PAD_L} x2={W - PAD_R} y1={yFor(score)} y2={yFor(score)} stroke="#F0F0F0" strokeWidth={1} />
                <text x={PAD_L - 6} y={yFor(score) + 3} textAnchor="end" fontSize={10} fill="#AEAEAE">{score}</text>
              </g>
            ))}

            {gaps.map((g, i) => (
              <rect
                key={i}
                x={xFor(g.startT)}
                y={PAD_T}
                width={Math.max(xFor(g.endT) - xFor(g.startT), 1)}
                height={plotH}
                fill="#FEF3C7"
                opacity={0.6}
              />
            ))}

            <line
              x1={PAD_L} x2={W - PAD_R}
              y1={yFor(overallAvg)} y2={yFor(overallAvg)}
              stroke="#AEAEAE" strokeDasharray="4 4" strokeWidth={1}
            />

            <path d={avgPath} fill="none" stroke="#1A2FEE" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {running.map((p, i) => (
              <circle
                key={i}
                cx={xFor(p.t)}
                cy={yFor(p.score)}
                r={3.5}
                fill={p.score >= 4 ? '#059669' : p.score >= 3 ? '#b45309' : '#dc2626'}
                fillOpacity={0.7}
                stroke="#ffffff"
                strokeWidth={1}
              >
                <title>
                  {new Date(p.t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} · Gesamt {p.score} · Ø bisher {p.avg.toFixed(2)}
                </title>
              </circle>
            ))}

            {xTicks.map((t, i) => (
              <g key={i}>
                <line x1={xFor(t)} x2={xFor(t)} y1={H - PAD_B} y2={H - PAD_B + 4} stroke="#AEAEAE" strokeWidth={1} />
                <text x={xFor(t)} y={H - PAD_B + 16} textAnchor="middle" fontSize={10} fill="#737373">
                  {new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </text>
              </g>
            ))}
          </svg>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]" style={{ color: '#737373' }}>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-0.5 w-4" style={{ backgroundColor: '#1A2FEE' }} /> kumulativer Durchschnitt
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-0.5 w-4" style={{ backgroundColor: '#AEAEAE', borderTop: '1px dashed #AEAEAE' }} /> Gesamtdurchschnitt
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-2 rounded-full" style={{ backgroundColor: '#FEF3C7', border: '1px solid #D1D5DB' }} /> Pause &gt; {GAP_MINUTES} min
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-2 rounded-full" style={{ backgroundColor: '#059669' }} /> ≥ 4
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-2 rounded-full" style={{ backgroundColor: '#b45309' }} /> = 3
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-2 rounded-full" style={{ backgroundColor: '#dc2626' }} /> ≤ 2
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
