import { notFound } from 'next/navigation'
import { getRunDetail } from '@/actions/runs'
import { AppHeader } from '@/components/layout/app-header'
import { RunDetailClient } from './run-detail-client'
import { LinkButton } from '@/components/ui/link-button'
import { GitCompare } from 'lucide-react'

interface RunDetailPageProps {
  params: Promise<{ companyId: string; runId: string }>
}

export default async function RunDetailPage({ params }: RunDetailPageProps) {
  const { companyId, runId } = await params

  const run = await getRunDetail(runId)

  if (!run || run.company_id !== companyId) {
    notFound()
  }

  const formattedDate = new Date(run.run_date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex flex-col">
      <AppHeader
        title={`${run.company.name} — v${run.version}`}
        description={`Run date: ${formattedDate} · ${run.insights.length} insights · ${run.insights.reduce((acc, i) => acc + i.measures.length, 0)} measures`}
        actions={
          <LinkButton href={`/companies/${companyId}/compare?runB=${runId}`} variant="outline" size="sm">
            <GitCompare className="size-4" />
            Compare
          </LinkButton>
        }
      />
      <RunDetailClient run={run} />
    </div>
  )
}
