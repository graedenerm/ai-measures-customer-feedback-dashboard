'use client'

import { useState, useEffect } from 'react'
import { Zap, Lock } from 'lucide-react'

const PASSWORD = 'heinrich-huhn2026'
const STORAGE_KEY = 'hh_auth'

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    setAuthenticated(localStorage.getItem(STORAGE_KEY) === '1')
  }, [])

  if (authenticated === null) return null // avoid flash

  if (authenticated) return <>{children}</>

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input === PASSWORD) {
      localStorage.setItem(STORAGE_KEY, '1')
      setAuthenticated(true)
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ backgroundColor: '#00095B' }}>
      <div className="w-full max-w-sm rounded-2xl border p-8 shadow-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(26,47,238,0.35)' }}>
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(26,47,238,0.4)' }}>
            <Zap className="size-6 text-white" />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-white">Heinrich Huhn Deutschland GmbH</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Energie-Analyse · Bewertungsportal</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <Lock className="size-3.5" />
              Passwort
            </label>
            <input
              type="password"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(false) }}
              placeholder="Passwort eingeben…"
              autoFocus
              className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderColor: error ? '#ef4444' : 'rgba(255,255,255,0.2)',
                color: '#ffffff',
                caretColor: '#ffffff',
              }}
            />
            {error && (
              <p className="text-xs text-red-400">Falsches Passwort. Bitte versuchen Sie es erneut.</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1A2FEE' }}
          >
            Zugang bestätigen
          </button>
        </form>
      </div>
    </div>
  )
}
