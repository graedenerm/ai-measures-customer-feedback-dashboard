'use client'

import { useState, useRef } from 'react'
import {
  CheckCircle, AlertCircle, ExternalLink, ChevronDown, ChevronUp,
  Upload, FileJson, Trash2,
} from 'lucide-react'
import { createConsultantPortal } from '@/actions/consultant-portals'
import { uploadConsultantInsights } from '@/actions/consultant-insights'
import type { ConsultantPortalWithStats } from '@/lib/consultant-types'
import type { Company } from '@/lib/types'

interface ConsultantAdminClientProps {
  portals: ConsultantPortalWithStats[]
  companies: Company[]
}

interface PendingFile {
  name: string
  content: string
  count: number | null  // insight count after parsing
  error?: string
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c] ?? c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: '8px',
  border: '1px solid #e5e5e5',
  padding: '8px 12px',
  fontSize: '14px',
  outline: 'none',
  backgroundColor: '#ffffff',
  color: '#111827',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '4px',
}

const hintStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#9ca3af',
  marginTop: '3px',
}

const sectionStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e5e5e5',
  padding: '20px 24px',
  marginBottom: '16px',
}

const sectionTitle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#00095B',
  marginBottom: '16px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

export function ConsultantAdminClient({ portals: initialPortals, companies }: ConsultantAdminClientProps) {
  const [portals, setPortals] = useState(initialPortals)
  const [expandedPortalId, setExpandedPortalId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(portals.length === 0)

  // Create form state
  const [evalName, setEvalName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [password, setPassword] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createResult, setCreateResult] = useState<{ success: boolean; message: string } | null>(null)

  // Upload state (per-portal)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [uploadCompanyId, setUploadCompanyId] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadResults, setUploadResults] = useState<{ file: string; count: number }[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleNameChange(value: string) {
    setEvalName(value)
    if (!slugEdited) setSlug(slugify(value))
  }

  function handleSlugChange(value: string) {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
    setSlugEdited(true)
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCreateLoading(true)
    setCreateResult(null)

    const result = await createConsultantPortal({
      slug: slug.trim(),
      password: password.trim(),
      evaluator_name: evalName.trim(),
    })

    setCreateLoading(false)

    if ('error' in result) {
      setCreateResult({ success: false, message: result.error })
      return
    }

    setCreateResult({ success: true, message: `Portal /eval/${slug.trim()} erstellt.` })
    // Add to local list optimistically
    setPortals((prev) => [
      {
        id: result.id,
        slug: slug.trim(),
        password: password.trim(),
        evaluator_name: evalName.trim(),
        created_at: new Date().toISOString(),
        insight_count: 0,
        eval_count: 0,
      },
      ...prev,
    ])
    // Reset form
    setEvalName(''); setSlug(''); setSlugEdited(false); setPassword('')
    setShowCreateForm(false)
  }

  function readFiles(files: FileList | File[]) {
    const fileArray = Array.from(files).filter((f) => f.name.endsWith('.json'))
    if (fileArray.length === 0) return

    fileArray.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const content = ev.target?.result as string ?? ''
        let count: number | null = null
        let error: string | undefined
        try {
          const parsed = JSON.parse(content)
          count = Array.isArray(parsed) ? parsed.length : null
          if (count === null) error = 'Kein Array'
        } catch {
          error = 'Ungültiges JSON'
        }
        setPendingFiles((prev) => {
          // Don't add duplicates
          if (prev.some((f) => f.name === file.name)) return prev
          return [...prev, { name: file.name, content, count, error }]
        })
      }
      reader.readAsText(file)
    })
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) readFiles(e.target.files)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    readFiles(e.dataTransfer.files)
  }

  function removeFile(name: string) {
    setPendingFiles((prev) => prev.filter((f) => f.name !== name))
  }

  async function handleUpload(portalId: string, evaluatorName: string) {
    const validFiles = pendingFiles.filter((f) => !f.error && f.count !== null)
    if (validFiles.length === 0) return

    setUploadLoading(true)
    setUploadError(null)
    setUploadResults([])

    const results: { file: string; count: number }[] = []

    for (const file of validFiles) {
      const result = await uploadConsultantInsights(portalId, file.name, file.content, uploadCompanyId || null)
      if (!result.success) {
        setUploadError(`Fehler bei "${file.name}": ${result.error}`)
        setUploadLoading(false)
        return
      }
      results.push({ file: file.name, count: result.count ?? 0 })
    }

    const totalInsights = results.reduce((sum, r) => sum + r.count, 0)
    setUploadResults(results)
    setPendingFiles([])
    setUploadLoading(false)

    // Update local insight count
    setPortals((prev) =>
      prev.map((p) =>
        p.id === portalId
          ? { ...p, insight_count: p.insight_count + totalInsights }
          : p
      )
    )
  }

  return (
    <div>
      {/* Existing portals */}
      {portals.length > 0 && (
        <div style={{ ...sectionStyle, marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <p style={{ ...sectionTitle, marginBottom: 0 }}>Bestehende Portale ({portals.length})</p>
            <button
              type="button"
              onClick={() => setShowCreateForm((p) => !p)}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: '1px solid #1A2FEE',
                backgroundColor: 'transparent', color: '#1A2FEE', fontSize: '13px',
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              + Neues Portal
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {portals.map((portal) => {
              const isExpanded = expandedPortalId === portal.id
              return (
                <div key={portal.id} style={{ borderRadius: '10px', border: '1px solid #e5e5e5', overflow: 'hidden' }}>
                  {/* Portal header row */}
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', backgroundColor: '#f8f9ff', cursor: 'pointer',
                    }}
                    onClick={() => {
                      setExpandedPortalId(isExpanded ? null : portal.id)
                      setPendingFiles([])
                      setUploadResults([])
                      setUploadError(null)
                      setUploadCompanyId('')
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: '#00095B' }}>
                        {portal.evaluator_name}
                      </p>
                      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '1px' }}>
                        /eval/{portal.slug} · {portal.insight_count} Erkenntnisse · {portal.eval_count} Bewertungen
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <a
                        href={`/eval/${portal.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#1A2FEE', textDecoration: 'none' }}
                      >
                        Öffnen <ExternalLink className="size-3" />
                      </a>
                      {isExpanded
                        ? <ChevronUp className="size-4" style={{ color: '#9ca3af' }} />
                        : <ChevronDown className="size-4" style={{ color: '#9ca3af' }} />}
                    </div>
                  </div>

                  {/* Expanded: portal details + upload */}
                  {isExpanded && (
                    <div style={{ padding: '16px', borderTop: '1px solid #e5e5e5' }}>
                      {/* Details */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                        {[
                          { label: 'Evaluator', value: portal.evaluator_name },
                          { label: 'Slug', value: `/eval/${portal.slug}` },
                          { label: 'Passwort', value: portal.password },
                          { label: 'Erstellt', value: new Date(portal.created_at).toLocaleDateString('de-DE') },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                            <p style={{ fontSize: '13px', color: '#00095B', fontWeight: 500 }}>{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Upload section */}
                      <p style={{ ...sectionTitle, fontSize: '11px' }}>Erkenntnisse hochladen</p>

                      {/* Company selector */}
                      <div style={{ marginBottom: '12px' }}>
                        <label style={labelStyle}>Unternehmen</label>
                        <select
                          value={uploadCompanyId}
                          onChange={(e) => setUploadCompanyId(e.target.value)}
                          style={inputStyle}
                        >
                          <option value="">— kein Unternehmen verknüpft —</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <p style={hintStyle}>Wird bei jeder Erkenntnis dieser Upload-Batch gespeichert</p>
                      </div>

                      {/* Drop zone */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          border: `2px dashed ${isDragging ? '#1A2FEE' : '#d1d5db'}`,
                          borderRadius: '10px',
                          padding: '24px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          backgroundColor: isDragging ? 'rgba(26,47,238,0.04)' : '#fafafa',
                          transition: 'all 0.15s',
                          marginBottom: '12px',
                        }}
                      >
                        <Upload className="mx-auto mb-2 size-6" style={{ color: isDragging ? '#1A2FEE' : '#9ca3af' }} />
                        <p style={{ fontSize: '13px', fontWeight: 600, color: isDragging ? '#1A2FEE' : '#374151' }}>
                          JSON-Dateien hier ablegen
                        </p>
                        <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                          oder klicken zum Auswählen (mehrere möglich)
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".json,application/json"
                          multiple
                          style={{ display: 'none' }}
                          onChange={handleFileInput}
                        />
                      </div>

                      {/* Pending files list */}
                      {pendingFiles.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                          {pendingFiles.map((f) => (
                            <div
                              key={f.name}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '8px 12px', borderRadius: '8px',
                                backgroundColor: f.error ? '#fef2f2' : '#f0fdf4',
                                border: `1px solid ${f.error ? '#fecaca' : '#bbf7d0'}`,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileJson className="size-4" style={{ color: f.error ? '#dc2626' : '#059669' }} />
                                <span style={{ fontSize: '12px', fontWeight: 500, color: f.error ? '#991b1b' : '#065f46' }}>
                                  {f.name}
                                </span>
                                {f.count !== null && (
                                  <span style={{ fontSize: '11px', color: '#6b7280' }}>
                                    ({f.count} Erkenntnisse)
                                  </span>
                                )}
                                {f.error && (
                                  <span style={{ fontSize: '11px', color: '#dc2626' }}>{f.error}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFile(f.name)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                              >
                                <Trash2 className="size-3.5" style={{ color: '#9ca3af' }} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Upload results */}
                      {uploadResults.length > 0 && (
                        <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '12px' }}>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: '#065f46' }}>
                            ✓ {uploadResults.reduce((s, r) => s + r.count, 0)} Erkenntnisse hochgeladen
                          </p>
                          {uploadResults.map((r) => (
                            <p key={r.file} style={{ fontSize: '11px', color: '#047857', marginTop: '2px' }}>
                              {r.file}: {r.count} Erkenntnisse
                            </p>
                          ))}
                        </div>
                      )}

                      {uploadError && (
                        <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '10px' }}>{uploadError}</p>
                      )}

                      <button
                        type="button"
                        disabled={uploadLoading || pendingFiles.filter((f) => !f.error).length === 0}
                        onClick={() => handleUpload(portal.id, portal.evaluator_name)}
                        style={{
                          padding: '10px 20px', borderRadius: '8px', border: 'none',
                          backgroundColor: uploadLoading || pendingFiles.filter((f) => !f.error).length === 0
                            ? '#9ca3af' : '#1A2FEE',
                          color: '#fff', fontSize: '13px', fontWeight: 600,
                          cursor: uploadLoading ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {uploadLoading
                          ? 'Wird hochgeladen…'
                          : `${pendingFiles.filter((f) => !f.error).length} Datei${pendingFiles.filter((f) => !f.error).length !== 1 ? 'en' : ''} hochladen`}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Create new portal form */}
      {(showCreateForm || portals.length === 0) && (
        <form onSubmit={handleCreateSubmit}>
          <div style={sectionStyle}>
            <p style={sectionTitle}>Neues Consultant-Portal</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Evaluator-Name *</label>
                <input
                  required
                  value={evalName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Dr. Müller"
                  style={inputStyle}
                />
                <p style={hintStyle}>Wird dem Consultant angezeigt und bei jeder Bewertung gespeichert</p>
              </div>

              <div>
                <label style={labelStyle}>URL-Slug *</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e5e5e5', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
                  <span style={{ padding: '8px 10px', fontSize: '13px', color: '#9ca3af', backgroundColor: '#f9fafb', borderRight: '1px solid #e5e5e5', whiteSpace: 'nowrap' }}>
                    /eval/
                  </span>
                  <input
                    required
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="mueller-2024"
                    style={{ ...inputStyle, border: 'none', borderRadius: 0, flex: 1 }}
                  />
                </div>
                <p style={hintStyle}>Nur Kleinbuchstaben, Zahlen und Bindestriche</p>
              </div>

              <div>
                <label style={labelStyle}>Passwort *</label>
                <input
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="z.B. energie-check-2025"
                  style={inputStyle}
                />
                <p style={hintStyle}>Wird dem Consultant mitgeteilt</p>
              </div>

            </div>
          </div>

          <button
            type="submit"
            disabled={createLoading || !evalName || !slug || !password}
            style={{
              width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
              backgroundColor: createLoading ? '#9ca3af' : '#1A2FEE',
              color: '#fff', fontSize: '15px', fontWeight: 600,
              cursor: createLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {createLoading ? 'Wird erstellt…' : 'Consultant-Portal erstellen'}
          </button>
        </form>
      )}

      {portals.length > 0 && !showCreateForm && (
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          style={{
            width: '100%', padding: '12px', borderRadius: '10px',
            border: '2px dashed #d1d5db', backgroundColor: 'transparent',
            color: '#6b7280', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
          }}
        >
          + Weiteres Portal erstellen
        </button>
      )}

      {/* Create result */}
      {createResult && (
        <div style={{
          marginTop: '16px', padding: '14px 18px', borderRadius: '10px',
          border: `1px solid ${createResult.success ? '#bbf7d0' : '#fecaca'}`,
          backgroundColor: createResult.success ? '#f0fdf4' : '#fef2f2',
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {createResult.success
              ? <CheckCircle className="size-4 shrink-0" style={{ color: '#059669' }} />
              : <AlertCircle className="size-4 shrink-0" style={{ color: '#dc2626' }} />}
            <p style={{ fontSize: '13px', fontWeight: 600, color: createResult.success ? '#065f46' : '#991b1b' }}>
              {createResult.message}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
