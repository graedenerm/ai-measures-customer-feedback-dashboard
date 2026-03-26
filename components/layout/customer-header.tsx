'use client'

import Image from 'next/image'
import { User } from 'lucide-react'
import { useEvaluator } from '@/lib/evaluator-context'

interface CustomerHeaderProps {
  companyName: string
}

export function CustomerHeader({ companyName }: CustomerHeaderProps) {
  const { evaluatorName, setEvaluatorName } = useEvaluator()

  return (
    <header className="sticky top-0 z-50 border-b shadow-sm" style={{ backgroundColor: '#00095B', borderColor: 'rgba(26,47,238,0.25)' }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Branding */}
        <div className="flex items-center gap-4">
          <Image
            src="/ecoplanet-logo.png"
            alt="ecoplanet"
            width={120}
            height={36}
            className="object-contain"
            priority
          />
          <div className="h-7 w-px" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <div>
            <p className="text-sm font-bold leading-tight text-white">
              {companyName}
            </p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Energie-Analyse · Bewertungsportal
            </p>
          </div>
        </div>

        {/* Evaluator name */}
        <div className="flex items-center gap-2">
          <User className="size-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
          <div className="flex flex-col items-end gap-0.5">
            <input
              type="text"
              placeholder="Ihr Name…"
              value={evaluatorName}
              onChange={(e) => setEvaluatorName(e.target.value)}
              className="w-44 rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderColor: 'rgba(255,255,255,0.2)',
                color: '#ffffff',
                caretColor: '#ffffff',
              }}
            />
            {evaluatorName && (
              <p className="text-[11px] font-medium" style={{ color: 'rgba(226,236,43,0.9)' }}>
                Bewertet als: {evaluatorName}
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
