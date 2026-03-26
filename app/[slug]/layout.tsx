import { notFound } from 'next/navigation'
import { getCompanyBySlug } from '@/actions/companies'
import { SlugPasswordGate } from '@/components/slug-password-gate'

interface SlugLayoutProps {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function SlugLayout({ children, params }: SlugLayoutProps) {
  const { slug } = await params
  const company = await getCompanyBySlug(slug)

  if (!company) notFound()

  return (
    <SlugPasswordGate
      slug={slug}
      password={company.password ?? ''}
      companyName={company.name}
    >
      {children}
    </SlugPasswordGate>
  )
}
