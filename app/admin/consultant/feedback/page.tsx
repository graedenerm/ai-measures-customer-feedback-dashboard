import { getConsultantPortals } from '@/actions/consultant-portals'
import { ConsultantFeedbackClient } from '@/components/admin/consultant-feedback-client'

export const metadata = { title: 'Admin – Consultant Feedback-Analyse' }

export default async function ConsultantFeedbackPage() {
  const portals = await getConsultantPortals()

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9ff' }}>
      {/* Header */}
      <div className="border-b shadow-sm" style={{ backgroundColor: '#00095B', borderColor: 'rgba(26,47,238,0.25)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-base font-bold text-white">ecoplanet Admin</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Consultant Feedback-Analyse</p>
          </div>
          <a
            href="/admin/consultant"
            style={{
              fontSize: '12px', color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
              padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            ← Portale verwalten
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <ConsultantFeedbackClient portals={portals} />
      </div>
    </div>
  )
}
