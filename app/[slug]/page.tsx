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

      {/* ── Hero banner ── */}
      <section className="relative overflow-hidden" style={{ backgroundColor: '#00095B' }}>
        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(26,47,238,0.2),transparent_60%)]" />

        <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-10 md:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: title + instruction */}
            <div className="max-w-xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#AEAEAE' }}>
                Energie-Analyse · {formattedDate}
              </p>
              <h1 className="text-2xl font-bold leading-snug tracking-tight text-white md:text-3xl">
                {company.name}
              </h1>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: '#AEAEAE' }}>
                Bitte bewerten Sie die folgenden KI-generierten Erkenntnisse und Maßnahmen.
                Ihre Rückmeldung hilft uns, die Qualität kontinuierlich zu verbessern.
              </p>
            </div>

            {/* Right: stats card */}
            <div
              className="shrink-0 rounded-xl border px-6 py-4"
              style={{ backgroundColor: '#0D1166', borderColor: 'rgba(26,47,238,0.25)' }}
            >
              <div className="flex gap-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#AEAEAE' }}>
                    Erkenntnisse
                  </p>
                  <p className="mt-1 font-mono text-3xl font-bold text-white">
                    {run.insights.length}
                  </p>
                </div>
                <div className="w-px" style={{ backgroundColor: 'rgba(26,47,238,0.25)' }} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#AEAEAE' }}>
                    Maßnahmen
                  </p>
                  <p className="mt-1 font-mono text-3xl font-bold text-white">
                    {measureCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="relative h-12">
          <svg viewBox="0 0 1440 48" fill="none" className="absolute bottom-0 w-full" preserveAspectRatio="none">
            <path d="M0 24C240 48 480 48 720 24C960 0 1200 0 1440 24V48H0V24Z" fill="#FFFFFF" />
          </svg>
        </div>
      </section>

      <main className="flex-1">
        <RunDetailClient run={run} />
      </main>

      {/* ── Footer ── */}
      <footer style={{ backgroundColor: '#00095B' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-10">
          <p className="text-xs font-bold text-white">ecoplanet</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Energie-Intelligence für die Industrie
          </p>
        </div>
      </footer>
    </div>
  )
}
