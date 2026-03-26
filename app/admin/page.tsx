import { AdminForm } from '@/components/admin/admin-form'
import { getCompanies } from '@/actions/runs'

export const metadata = { title: 'Admin – Kundenportal' }

export default async function AdminPage() {
  const companies = await getCompanies()

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9ff' }}>
      {/* Header */}
      <div className="border-b shadow-sm" style={{ backgroundColor: '#00095B', borderColor: 'rgba(26,47,238,0.25)' }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-base font-bold text-white">ecoplanet Admin</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Kundenportal-Verwaltung</p>
          </div>
          <span className="rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: 'rgba(26,47,238,0.5)' }}>
            {companies.length} {companies.length === 1 ? 'Kunde' : 'Kunden'}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <AdminForm existingCompanies={companies} />
      </div>
    </div>
  )
}
