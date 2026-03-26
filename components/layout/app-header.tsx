import type { ReactNode } from 'react'

interface AppHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function AppHeader({ title, description, actions }: AppHeaderProps) {
  return (
    <div className="flex items-start justify-between border-b border-border bg-background px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold leading-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
