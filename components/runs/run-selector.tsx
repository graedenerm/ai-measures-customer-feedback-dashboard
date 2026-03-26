'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RunWithStats } from '@/lib/types'

interface RunSelectorProps {
  runs: RunWithStats[]
  value: string
  onChange: (runId: string) => void
  placeholder?: string
}

export function RunSelector({
  runs,
  value,
  onChange,
  placeholder = 'Select a run…',
}: RunSelectorProps) {
  return (
    <Select value={value} onValueChange={(val) => { if (val !== null) onChange(val) }}>
      <SelectTrigger className="w-64">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {runs.map((run) => (
          <SelectItem key={run.id} value={run.id}>
            v{run.version} —{' '}
            {new Date(run.run_date).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
