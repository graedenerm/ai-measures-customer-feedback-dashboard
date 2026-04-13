'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginConsultantPortal } from '@/actions/consultant-portals'
import { Lock, Loader2 } from 'lucide-react'

interface ConsultantPasswordGateProps {
  slug: string
  evaluatorName: string
}

export function ConsultantPasswordGate({ slug, evaluatorName }: ConsultantPasswordGateProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await loginConsultantPortal(slug, password)

    if (result.success) {
      router.refresh()  // re-renders server component — now authenticated
    } else {
      setError(result.error ?? 'Fehler beim Anmelden.')
      setLoading(false)
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#f8f9ff' }}
    >
      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl border p-8"
        style={{ backgroundColor: '#ffffff', borderColor: '#e5e5e5', boxShadow: '0 4px 24px rgba(0,9,91,0.06)' }}
      >
        {/* Logo / Icon */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div
            className="flex size-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'rgba(26,47,238,0.08)' }}
          >
            <Lock className="size-5" style={{ color: '#1A2FEE' }} />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#AEAEAE' }}>
              ecoplanet · Evaluierungsportal
            </p>
            <h1 className="mt-1 text-lg font-bold" style={{ color: '#00095B' }}>
              {evaluatorName}
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
              style={{ color: '#374151' }}
            >
              Zugangscode
            </label>
            <input
              id="password"
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Zugangscode eingeben"
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                borderColor: error ? '#dc2626' : '#e5e5e5',
                color: '#111827',
                backgroundColor: '#ffffff',
              }}
              onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = '#1A2FEE' }}
              onBlur={(e) => { if (!error) e.currentTarget.style.borderColor = '#e5e5e5' }}
            />
            {error && (
              <p className="mt-1.5 text-xs font-medium" style={{ color: '#dc2626' }}>
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-50"
            style={{ backgroundColor: '#1A2FEE', color: '#ffffff' }}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? 'Wird geprüft…' : 'Anmelden'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs" style={{ color: '#AEAEAE' }}>
        ecoplanet · Energie-Intelligence für die Industrie
      </p>
    </div>
  )
}
