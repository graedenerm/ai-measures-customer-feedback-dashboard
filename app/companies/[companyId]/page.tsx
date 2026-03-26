import { notFound } from 'next/navigation'
import { getRunsForCompany, getCompanies } from '@/actions/runs'
import { AppHeader } from '@/components/layout/app-header'
import { RunCard } from '@/components/runs/run-card'
import { LinkButton } from '@/components/ui/link-button'
import { GitCompare, Upload } from 'lucide-react'

interface CompanyPageProps {
  params: Promise<{ companyId: string }>
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { companyId } = await params

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
        title={company.name}
        description={company.industry ?? 'No industry specified'}
        actions={
          <div className="flex items-center gap-2">
            <LinkButton href={`/companies/${companyId}/compare`} variant="outline" size="sm">
              <GitCompare className="size-4" />
              Compare Runs
            </LinkButton>
            <LinkButton href="/upload" size="sm">
              <Upload className="size-4" />
              New Run
            </LinkButton>
          </div>
        }
      />

      <div className="p-6">
        {runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-16 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              No pipeline runs yet for this company.
            </p>
            <LinkButton href="/upload" size="sm" className="mt-4">
              <Upload className="size-4" />
              Import First Run
            </LinkButton>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {runs.length} run{runs.length !== 1 ? 's' : ''} found
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {runs.map((run) => (
                <RunCard key={run.id} run={run} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
