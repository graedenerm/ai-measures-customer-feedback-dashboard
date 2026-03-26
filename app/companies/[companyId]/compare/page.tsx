import { getRunsForCompany, getCompanies } from '@/actions/runs'
import { notFound } from 'next/navigation'
import { AppHeader } from '@/components/layout/app-header'
import { ComparePageClient } from './compare-page-client'

interface ComparePageProps {
  params: Promise<{ companyId: string }>
  searchParams: Promise<{ runA?: string; runB?: string }>
}

export default async function ComparePage({
  params,
  searchParams,
}: ComparePageProps) {
  const { companyId } = await params
  const { runA, runB } = await searchParams

  const [companies, runs] = await Promise.all([
    getCompanies(),
    getRunsForCompany(companyId),
  ])

  const company = companies.find((c) => c.id === companyId)

  if (!company) {
    notFound()
  }

  return (
    <div className="flex flex-col">
      <AppHeader
        title={`Compare Runs — ${company.name}`}
        description="Select two pipeline runs to compare insights side by side."
      />
      <div className="p-6">
        <ComparePageClient
          companyId={companyId}
          runs={runs}
          initialRunAId={runA}
          initialRunBId={runB}
        />
      </div>
    </div>
  )
}
