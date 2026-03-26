'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const COMPANY_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
]

interface TrendPoint {
  run_date: string
  company_name: string
  company_id: string
  version: string
  run_id: string
  insight_count: number
  measure_count: number
}

interface ChartEntry extends TrendPoint {
  color: string
}

interface RunsTimelineChartProps {
  trendData: TrendPoint[]
}

// Custom X-axis tick: company name (bold) + date below
function XAxisTick({
  x,
  y,
  payload,
  data,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  x?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any
  data: ChartEntry[]
}) {
  const entry = data[payload?.index]
  if (!entry) return null
  const name =
    entry.company_name.length > 14
      ? entry.company_name.slice(0, 13) + '…'
      : entry.company_name
  const date = new Date(entry.run_date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        dy={14}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill={entry.color}
      >
        {name}
      </text>
      <text
        dy={27}
        textAnchor="middle"
        fontSize={10}
        fill="hsl(var(--muted-foreground, 100 100% 40%))"
      >
        {date}
      </text>
    </g>
  )
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
}) {
  if (!active || !payload?.length) return null
  const entry = payload[0].payload as ChartEntry
  const insights =
    (payload.find((p) => p.dataKey === 'insight_count')?.value as number) ?? 0
  const measures =
    (payload.find((p) => p.dataKey === 'measure_count')?.value as number) ?? 0

  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-md space-y-1">
      <p className="font-semibold" style={{ color: entry.color }}>
        {entry.company_name}
      </p>
      <p className="text-muted-foreground">
        {new Date(entry.run_date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })}{' '}
        · v{entry.version}
      </p>
      <p className="text-amber-600">💡 {insights} insight{insights !== 1 ? 's' : ''}</p>
      <p className="text-blue-600">🔧 {measures} measure{measures !== 1 ? 's' : ''}</p>
    </div>
  )
}

export function RunsTimelineChart({ trendData }: RunsTimelineChartProps) {
  if (trendData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Runs Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No runs yet.
          </div>
        </CardContent>
      </Card>
    )
  }

  // Assign a stable color per company
  const companyColorMap = new Map<string, string>()
  let colorIdx = 0
  const sorted = [...trendData].sort((a, b) => a.run_date.localeCompare(b.run_date))
  for (const d of sorted) {
    if (!companyColorMap.has(d.company_id)) {
      companyColorMap.set(d.company_id, COMPANY_COLORS[colorIdx % COMPANY_COLORS.length])
      colorIdx++
    }
  }

  const chartData: ChartEntry[] = sorted.map((d) => ({
    ...d,
    color: companyColorMap.get(d.company_id) ?? '#94a3b8',
  }))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">Pipeline Runs Timeline</CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-4 rounded-sm bg-current opacity-85" />
              Insights (solid)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-4 rounded-sm bg-current opacity-35" />
              Measures (faded)
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 48 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis
              dataKey="run_id"
              tick={(props) => <XAxisTick {...props} data={chartData} />}
              tickLine={false}
              interval={0}
              height={56}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              label={{
                value: 'Count',
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} />

            {/* Stacked bars: insights (solid) bottom, measures (faded) top */}
            <Bar dataKey="insight_count" stackId="a" radius={[0, 0, 2, 2]}>
              {chartData.map((entry) => (
                <Cell key={entry.run_id} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
            <Bar dataKey="measure_count" stackId="a" radius={[2, 2, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.run_id} fill={entry.color} fillOpacity={0.35} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
