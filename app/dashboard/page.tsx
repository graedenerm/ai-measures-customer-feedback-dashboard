import { getDashboardData } from '@/actions/runs'
import { AppHeader } from '@/components/layout/app-header'
import { StatsOverview } from '@/components/dashboard/stats-overview'
import { QualityTrendChart } from '@/components/dashboard/quality-trend-chart'
import { RunsTimelineChart } from '@/components/dashboard/runs-timeline-chart'

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="flex flex-col">
      <AppHeader
        title="Dashboard"
        description="Overview of all pipeline evaluation activity"
      />
      <div className="flex flex-col gap-6 p-6">
        <StatsOverview
          totalCompanies={data.totalCompanies}
          totalRuns={data.totalRuns}
          totalEvaluations={data.totalEvaluations}
          avgOverallRating={data.avgOverallRating}
        />
        <RunsTimelineChart trendData={data.trendData} />
        <QualityTrendChart trendData={data.trendData} />
      </div>
    </div>
  )
}
