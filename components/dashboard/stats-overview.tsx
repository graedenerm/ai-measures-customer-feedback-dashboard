import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, PlayCircle, ClipboardList, Star } from 'lucide-react'

interface StatsOverviewProps {
  totalCompanies: number
  totalRuns: number
  totalEvaluations: number
  avgOverallRating: number | null
}

export function StatsOverview({
  totalCompanies,
  totalRuns,
  totalEvaluations,
  avgOverallRating,
}: StatsOverviewProps) {
  const stats = [
    {
      label: 'Total Companies',
      value: totalCompanies.toString(),
      icon: Building2,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total Runs',
      value: totalRuns.toString(),
      icon: PlayCircle,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Total Evaluations',
      value: totalEvaluations.toString(),
      icon: ClipboardList,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
    },
    {
      label: 'Avg Overall Rating',
      value:
        avgOverallRating !== null
          ? `${avgOverallRating.toFixed(1)} / 5`
          : '—',
      icon: Star,
      color: 'text-purple-500',
      bg: 'bg-purple-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <stat.icon className={`size-4 ${stat.color}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
