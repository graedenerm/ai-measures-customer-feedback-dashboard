import { notFound } from 'next/navigation'
import { getCompanyBySlug } from '@/actions/companies'
import { getRunDetail } from '@/actions/runs'
import { CustomerHeader } from '@/components/layout/customer-header'
import { RunDetailClient } from '@/components/run-detail-client'

interface SlugPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: SlugPageProps) {
  const { slug } = await params
  const company = await getCompanyBySlug(slug)
  return {
    title: company ? `${company.name} – Energie-Bewertung` : 'Bewertungsportal',
  }
}

export default async function SlugPage({ params }: SlugPageProps) {
  const { slug } = await params
  const company = await getCompanyBySlug(slug)

  if (!company) notFound()

  if (!company.active_run_id) {
    return (
      <div className="flex min-h-screen flex-col">
        <CustomerHeader companyName={company.name} />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Noch keine Analysedaten verfügbar. Bitte wenden Sie sich an ecoplanet.
          </p>
        </div>
      </div>
    )
  }

  const run = await getRunDetail(company.active_run_id)

  if (!run) {
    return (
      <div className="flex min-h-screen flex-col">
        <CustomerHeader companyName={company.name} />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Daten konnten nicht geladen werden. Bitte Seite neu laden.
          </p>
        </div>
      </div>
    )
  }

  const formattedDate = new Date(run.run_date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const measureCount = run.insights.reduce((acc, i) => acc + i.measures.length, 0)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CustomerHeader companyName={company.name} />

      <div className="border-b border-border bg-muted/40 px-6 py-3">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-base font-semibold text-foreground">
            Analyse-Ergebnisse – {formattedDate}
          </h1>
          <p className="text-sm text-muted-foreground">
            {run.insights.length} Erkenntnisse · {measureCount} Maßnahmen
          </p>
        </div>
      </div>

      <main className="flex-1">
        <RunDetailClient run={run} />
      </main>
    </div>
  )
}
