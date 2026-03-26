'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export interface RunMetadata {
  companyName: string
  industry: string
  version: string
  runDate: string
  notes: string
}

interface RunMetadataFormProps {
  values: RunMetadata
  onChange: (values: RunMetadata) => void
  disabled?: boolean
}

export function RunMetadataForm({
  values,
  onChange,
  disabled = false,
}: RunMetadataFormProps) {
  const update = (field: keyof RunMetadata) => (value: string) =>
    onChange({ ...values, [field]: value })

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="company-name">Company Name *</Label>
          <Input
            id="company-name"
            placeholder="e.g. Stahlwerk GmbH"
            value={values.companyName}
            onChange={(e) => update('companyName')(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="industry">Industry</Label>
          <Input
            id="industry"
            placeholder="e.g. steel_rolling"
            value={values.industry}
            onChange={(e) => update('industry')(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="version">Pipeline Version *</Label>
          <Input
            id="version"
            placeholder="e.g. 2.4.1"
            value={values.version}
            onChange={(e) => update('version')(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="run-date">Run Date *</Label>
          <Input
            id="run-date"
            type="date"
            value={values.runDate}
            onChange={(e) => update('runDate')(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Any notes about this pipeline run…"
          value={values.notes}
          onChange={(e) => update('notes')(e.target.value)}
          disabled={disabled}
          rows={2}
        />
      </div>
    </div>
  )
}
