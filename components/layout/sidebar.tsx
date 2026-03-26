'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Upload,
  Building2,
  ChevronRight,
  Zap,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Company } from '@/lib/types'
import { useEvaluator } from '@/lib/evaluator-context'

interface SidebarProps {
  companies: Company[]
}

export function Sidebar({ companies }: SidebarProps) {
  const pathname = usePathname()
  const { evaluatorName, setEvaluatorName } = useEvaluator()

  const isActive = (href: string) => pathname === href
  const isPrefix = (prefix: string) => pathname.startsWith(prefix)

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-zinc-900 text-zinc-100">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-zinc-700 px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-blue-500">
          <Zap className="size-4 text-white" />
        </div>
        <span className="text-sm font-semibold tracking-tight">
          Huhn Evaluator
        </span>
      </div>

      {/* Evaluator name — prominent, right below logo */}
      <div className="border-b border-zinc-700 px-4 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          <User className="size-3.5 text-zinc-400 shrink-0" />
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Your Name
          </p>
        </div>
        <input
          type="text"
          placeholder="Enter name to rate…"
          value={evaluatorName}
          onChange={(e) => setEvaluatorName(e.target.value)}
          className="w-full rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        {evaluatorName && (
          <p className="mt-1.5 text-[11px] text-emerald-400">
            Rating as: <span className="font-medium">{evaluatorName}</span>
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {/* Dashboard */}
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            isActive('/dashboard')
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
          )}
        >
          <LayoutDashboard className="size-4 shrink-0" />
          Dashboard
        </Link>

        {/* Upload */}
        <Link
          href="/upload"
          className={cn(
            'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            isActive('/upload')
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
          )}
        >
          <Upload className="size-4 shrink-0" />
          Upload Run
        </Link>

        {/* Companies section */}
        {companies.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Companies
            </p>
            <div className="flex flex-col gap-0.5">
              {companies.map((company) => {
                const href = `/companies/${company.id}`
                const active = isPrefix(href)
                return (
                  <Link
                    key={company.id}
                    href={href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-zinc-700 text-white'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                    )}
                  >
                    <Building2 className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{company.name}</span>
                    {active && (
                      <ChevronRight className="size-3.5 shrink-0 text-zinc-500" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {companies.length === 0 && (
          <div className="mt-3 px-3">
            <p className="text-xs text-zinc-600">
              No companies yet.{' '}
              <Link href="/upload" className="text-blue-400 hover:underline">
                Upload a run
              </Link>{' '}
              to get started.
            </p>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-700 px-4 py-2">
        <p className="text-xs text-zinc-600">v0.1.0</p>
      </div>
    </aside>
  )
}
