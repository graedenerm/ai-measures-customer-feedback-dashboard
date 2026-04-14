import { getConsultantPortals } from '@/actions/consultant-portals'
import { getCompanies } from '@/actions/runs'
import { ConsultantAdminClient } from '@/components/admin/consultant-admin-client'

export const metadata = { title: 'Admin – Consultant Portale' }

export default async function ConsultantAdminPage() {
  const [portals, companies] = await Promise.all([getConsultantPortals(), getCompanies()])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9ff' }}>
      {/* Header */}
      <div className="border-b shadow-sm" style={{ backgroundColor: '#00095B', borderColor: 'rgba(26,47,238,0.25)' }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-base font-bold text-white">ecoplanet Admin</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Consultant-Portal-Verwaltung</p>
          </div>
          <a
            href="/admin"
            style={{
              fontSize: '12px', color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
              padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            ← Kundenportale
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <ConsultantAdminClient portals={portals} companies={companies} />
      </div>
    </div>
  )
}
