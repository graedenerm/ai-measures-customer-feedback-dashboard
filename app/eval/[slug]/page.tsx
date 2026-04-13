import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getConsultantPortalBySlug } from '@/actions/consultant-portals'
import { getInsightsForPortal } from '@/actions/consultant-insights'
import { getEvaluationsForPortal } from '@/actions/consultant-evaluations'
import { ConsultantPasswordGate } from '@/components/consultant/consultant-password-gate'
import { ConsultantPortalClient } from '@/components/consultant/consultant-portal-client'

interface EvalSlugPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: EvalSlugPageProps) {
  const { slug } = await params
  const portal = await getConsultantPortalBySlug(slug)
  return {
    title: portal ? `${portal.evaluator_name} – Erkenntnis-Evaluierung` : 'Evaluierungsportal',
  }
}

export default async function EvalSlugPage({ params }: EvalSlugPageProps) {
  const { slug } = await params
  const portal = await getConsultantPortalBySlug(slug)

  if (!portal) notFound()

  // Check auth cookie — the password is never sent to the client
  const cookieStore = await cookies()
  const authToken = cookieStore.get(`consultant_auth_${slug}`)?.value
  const isAuthenticated = authToken === portal.id

  if (!isAuthenticated) {
    return (
      <ConsultantPasswordGate
        slug={slug}
        evaluatorName={portal.evaluator_name}
      />
    )
  }

  // Authenticated — load data
  const [insights, evaluations] = await Promise.all([
    getInsightsForPortal(portal.id),
    getEvaluationsForPortal(portal.id),
  ])

  return (
    <ConsultantPortalClient
      portalId={portal.id}
      portalSlug={portal.slug}
      evaluatorName={portal.evaluator_name}
      insights={insights}
      initialEvaluations={evaluations}
    />
  )
}
