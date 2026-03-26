'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const COMPANY_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
]

interface TrendPoint {
  run_date: string
  avg_rating: number | null
  company_name: string
  company_id: string
  version: string
  run_id: string
}

interface QualityTrendChartProps {
  trendData: TrendPoint[]
}

interface ChartDataPoint {
  run_date: string
  [companyName: string]: string | number | null
}

export function QualityTrendChart({ trendData }: QualityTrendChartProps) {
  if (trendData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quality Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No evaluation data yet. Rate some insights to see the trend.
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group by company
  const companies = Array.from(
    new Map(trendData.map((d) => [d.company_id, d.company_name])).entries()
  )

  // Build chart data: one row per run_date, one column per company
  const dateMap = new Map<string, ChartDataPoint>()

  for (const point of trendData) {
    if (!dateMap.has(point.run_date)) {
      dateMap.set(point.run_date, { run_date: point.run_date })
    }
    const entry = dateMap.get(point.run_date)!
    entry[point.company_name] = point.avg_rating
  }

  const chartData = Array.from(dateMap.values()).sort((a, b) =>
    a.run_date.localeCompare(b.run_date)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quality Trend by Company</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="run_date"
              tick={{ fontSize: 12 }}
              tickFormatter={(v: string) => {
                const d = new Date(v)
                return d.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                })
              }}
            />
            <YAxis
              domain={[0, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) =>
                value != null ? (value as number).toFixed(2) : 'N/A'
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(label: any) =>
                new Date(label as string).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })
              }
            />
            <Legend />
            {companies.map(([, name], index) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={COMPANY_COLORS[index % COMPANY_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
