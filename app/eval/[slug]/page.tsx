import { notFound } from 'next/navigation'
import { getConsultantPortalBySlug } from '@/actions/consultant-portals'
import { getInsightsForPortal } from '@/actions/consultant-insights'
import { getEvaluationsForPortal } from '@/actions/consultant-evaluations'
import { getMeasuresForPortal } from '@/actions/consultant-measures'
import { getMeasureEvaluationsForPortal } from '@/actions/consultant-measure-evaluations'
import { ConsultantPortalClient } from '@/components/consultant/consultant-portal-client'

interface EvalSlugPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: EvalSlugPageProps) {
  const { slug } = await params
  const portal = await getConsultantPortalBySlug(slug)
  return {
    title: portal ? `${portal.evaluator_name} – Evaluierung` : 'Evaluierungsportal',
  }
}

export default async function EvalSlugPage({ params }: EvalSlugPageProps) {
  const { slug } = await params
  const portal = await getConsultantPortalBySlug(slug)

  if (!portal) notFound()

  const [insights, evaluations, measures, measureEvaluations] = await Promise.all([
    getInsightsForPortal(portal.id),
    getEvaluationsForPortal(portal.id),
    getMeasuresForPortal(portal.id),
    getMeasureEvaluationsForPortal(portal.id),
  ])

  return (
    <ConsultantPortalClient
      portalId={portal.id}
      portalSlug={portal.slug}
      evaluatorName={portal.evaluator_name}
      insights={insights}
      initialEvaluations={evaluations}
      measures={measures}
      initialMeasureEvaluations={measureEvaluations}
    />
  )
}
