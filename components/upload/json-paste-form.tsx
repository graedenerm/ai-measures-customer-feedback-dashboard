'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { RunMetadataForm, type RunMetadata } from './run-metadata-form'
import { uploadPipelineRun } from '@/actions/upload'
import { CheckCircle, XCircle, Loader2, FileJson, X } from 'lucide-react'
import { DrivePickerButton } from './drive-picker-button'

type UploadState = 'idle' | 'loading' | 'success' | 'error'

interface JsonFieldProps {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  disabled: boolean
}

function JsonField({ id, label, placeholder, value, onChange, disabled }: JsonFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      onChange((ev.target?.result as string) ?? '')
    }
    reader.readAsText(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const handleClear = () => {
    setFileName(null)
    onChange('')
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center gap-2">
          {fileName && (
            <span className="flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <FileJson className="size-3" />
              {fileName}
              <button
                type="button"
                onClick={handleClear}
                disabled={disabled}
                className="ml-0.5 rounded hover:text-foreground"
                aria-label="Clear file"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          <DrivePickerButton
            onContent={(content, name) => {
              setFileName(name)
              onChange(content)
            }}
            disabled={disabled}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <FileJson className="size-3.5" />
            Upload file
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled}
          />
        </div>
      </div>
      <Textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          setFileName(null)
          onChange(e.target.value)
        }}
        disabled={disabled}
        rows={14}
        className="font-mono text-xs"
      />
      <p className="text-xs text-muted-foreground">
        Upload a .json file or paste the JSON array directly. Leave empty if none.
      </p>
    </div>
  )
}

export function JsonPasteForm() {
  const router = useRouter()

  const [metadata, setMetadata] = useState<RunMetadata>({
    companyName: '',
    industry: '',
    version: '',
    runDate: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [insightsJson, setInsightsJson] = useState('')
  const [measuresJson, setMeasuresJson] = useState('')
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successRunId, setSuccessRunId] = useState<string | null>(null)

  const isLoading = uploadState === 'loading'

  const handleSubmit = async () => {
    if (!metadata.companyName.trim()) {
      setErrorMessage('Company name is required.')
      setUploadState('error')
      return
    }
    if (!metadata.version.trim()) {
      setErrorMessage('Pipeline version is required.')
      setUploadState('error')
      return
    }
    if (!metadata.runDate) {
      setErrorMessage('Run date is required.')
      setUploadState('error')
      return
    }

    setUploadState('loading')
    setErrorMessage(null)

    const result = await uploadPipelineRun({
      companyName: metadata.companyName,
      industry: metadata.industry,
      version: metadata.version,
      runDate: metadata.runDate,
      notes: metadata.notes,
      insightsJson: insightsJson || '[]',
      measuresJson: measuresJson || '[]',
    })

    if (result.success && result.runId) {
      setSuccessRunId(result.runId)
      setUploadState('success')
    } else {
      setErrorMessage(result.error ?? 'Upload failed.')
      setUploadState('error')
    }
  }

  const handleViewRun = () => {
    if (successRunId) {
      router.push('/dashboard')
      router.refresh()
    }
  }

  const handleReset = () => {
    setUploadState('idle')
    setErrorMessage(null)
    setSuccessRunId(null)
    setMetadata({
      companyName: '',
      industry: '',
      version: '',
      runDate: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setInsightsJson('')
    setMeasuresJson('')
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Metadata section */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Run Metadata</h2>
        <RunMetadataForm values={metadata} onChange={setMetadata} disabled={isLoading} />
      </section>

      {/* JSON inputs */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Pipeline Output</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <JsonField
            id="insights-json"
            label="Insights JSON"
            placeholder='Paste the insights JSON array here, e.g. [{"id": "ins_...", ...}]'
            value={insightsJson}
            onChange={setInsightsJson}
            disabled={isLoading}
          />
          <JsonField
            id="measures-json"
            label="Measures JSON"
            placeholder='Paste the measures JSON array here, e.g. [{"insightId": "ins_...", ...}]'
            value={measuresJson}
            onChange={setMeasuresJson}
            disabled={isLoading}
          />
        </div>
      </section>

      {/* Progress indicator */}
      {isLoading && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Importing pipeline run…
          </div>
          <Progress value={null} className="h-1.5" />
        </div>
      )}

      {/* Success state */}
      {uploadState === 'success' && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle className="size-5 shrink-0 text-emerald-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-800">
              Pipeline run imported successfully!
            </p>
            <p className="mt-0.5 text-xs text-emerald-700">
              The run has been saved to the database and is ready to evaluate.
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={handleViewRun}>
                Go to Dashboard
              </Button>
              <Button size="sm" variant="outline" onClick={handleReset}>
                Import Another Run
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {uploadState === 'error' && errorMessage && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <XCircle className="size-5 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Import failed</p>
            <p className="mt-0.5 text-xs text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Submit button */}
      {uploadState !== 'success' && (
        <div className="flex items-center gap-2">
          <Button onClick={handleSubmit} disabled={isLoading} className="gap-2">
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            Import Run
          </Button>
          {uploadState === 'error' && (
            <Button variant="ghost" onClick={handleReset} size="sm">
              Reset
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
