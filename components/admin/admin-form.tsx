'use client'

import { useState } from 'react'
import { uploadPipelineRun } from '@/actions/upload'
import { createOrUpdateCompany } from '@/actions/companies'
import { setActiveRun } from '@/actions/companies'
import type { Company } from '@/lib/types'
import { CheckCircle, AlertCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

interface AdminFormProps {
  existingCompanies: Company[]
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c] ?? c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function AdminForm({ existingCompanies }: AdminFormProps) {
  const [companyName, setCompanyName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [password, setPassword] = useState('')
  const [industry, setIndustry] = useState('')
  const [version, setVersion] = useState('1.0')
  const [runDate, setRunDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [insightsJson, setInsightsJson] = useState('')
  const [measuresJson, setMeasuresJson] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: true; slug: string; runId: string } | { success: false; error: string } | null>(null)
  const [showCompanies, setShowCompanies] = useState(existingCompanies.length > 0)

  function handleNameChange(value: string) {
    setCompanyName(value)
    if (!slugEdited) {
      setSlug(slugify(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
    setSlugEdited(true)
  }

  function handleFileRead(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => setter(ev.target?.result as string ?? '')
      reader.readAsText(file)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      // 1. Create / update company with slug + password
      const companyResult = await createOrUpdateCompany({
        name: companyName.trim(),
        slug: slug.trim(),
        password: password.trim(),
        industry: industry.trim() || undefined,
      })

      if ('error' in companyResult) {
        setResult({ success: false, error: `Fehler beim Anlegen des Unternehmens: ${companyResult.error}` })
        return
      }

      // 2. Upload insights + measures
      const uploadResult = await uploadPipelineRun({
        companyName: companyName.trim(),
        industry: industry.trim(),
        version: version.trim(),
        runDate,
        notes: notes.trim(),
        insightsJson,
        measuresJson,
      })

      if (!uploadResult.success || !uploadResult.runId) {
        setResult({ success: false, error: `Fehler beim Hochladen: ${uploadResult.error ?? 'Unbekannter Fehler'}` })
        return
      }

      // 3. Set uploaded run as active
      const activeResult = await setActiveRun(companyResult.id, uploadResult.runId)
      if (activeResult.error) {
        setResult({ success: false, error: `Fehler beim Setzen des aktiven Runs: ${activeResult.error}` })
        return
      }

      setResult({ success: true, slug: slug.trim(), runId: uploadResult.runId })

      // Reset form
      setCompanyName('')
      setSlug('')
      setSlugEdited(false)
      setPassword('')
      setIndustry('')
      setVersion('1.0')
      setRunDate(new Date().toISOString().split('T')[0])
      setNotes('')
      setInsightsJson('')
      setMeasuresJson('')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    borderRadius: '8px',
    border: '1px solid #e5e5e5',
    padding: '8px 12px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#111827',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '4px',
  }

  const hintStyle = {
    fontSize: '11px',
    color: '#9ca3af',
    marginTop: '3px',
  }

  const sectionStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e5e5',
    padding: '20px 24px',
    marginBottom: '16px',
  }

  const sectionTitleStyle = {
    fontSize: '13px',
    fontWeight: 700,
    color: '#00095B',
    marginBottom: '16px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  }

  return (
    <div>
      {/* Existing companies */}
      {existingCompanies.length > 0 && (
        <div style={{ ...sectionStyle, marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => setShowCompanies(!showCompanies)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <span style={sectionTitleStyle}>Bestehende Kunden ({existingCompanies.length})</span>
            {showCompanies ? <ChevronUp className="size-4" style={{ color: '#00095B' }} /> : <ChevronDown className="size-4" style={{ color: '#00095B' }} />}
          </button>

          {showCompanies && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {existingCompanies.map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f8f9ff', border: '1px solid #e8eaff' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#00095B' }}>{c.name}</p>
                    <p style={{ fontSize: '11px', color: '#9ca3af' }}>
                      {c.slug ? `/${c.slug}` : 'Kein Slug'} · {c.active_run_id ? 'Run aktiv' : 'Kein aktiver Run'}
                    </p>
                  </div>
                  {c.slug && (
                    <a
                      href={`/${c.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#1A2FEE', textDecoration: 'none' }}
                    >
                      Öffnen <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New customer form */}
      <form onSubmit={handleSubmit}>
        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>Neuer Kunde</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Unternehmensname *</label>
              <input
                required
                value={companyName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Muster GmbH"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>URL-Slug *</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e5e5e5', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                <span style={{ padding: '8px 10px', fontSize: '13px', color: '#9ca3af', backgroundColor: '#f9fafb', borderRight: '1px solid #e5e5e5', whiteSpace: 'nowrap' }}>portal.app/</span>
                <input
                  required
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="muster-gmbh"
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
                placeholder="z.B. muster-energie2026"
                style={inputStyle}
              />
              <p style={hintStyle}>Wird dem Kunden mitgeteilt</p>
            </div>

            <div>
              <label style={labelStyle}>Branche</label>
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Industrie, Gewerbe…"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>Analyse-Run</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Version *</label>
              <input
                required
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Analyse-Datum *</label>
              <input
                required
                type="date"
                value={runDate}
                onChange={(e) => setRunDate(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Notizen</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional: Beschreibung dieses Runs"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>JSON-Daten</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Insights JSON *</label>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileRead(setInsightsJson)}
                style={{ ...inputStyle, padding: '6px 12px', cursor: 'pointer' }}
              />
              {insightsJson && (
                <p style={{ ...hintStyle, color: '#059669' }}>
                  ✓ {(() => { try { return JSON.parse(insightsJson).length } catch { return '?' } })()} Einträge geladen
                </p>
              )}
              <div style={{ marginTop: '8px' }}>
                <label style={{ ...labelStyle, fontWeight: 500, color: '#6b7280' }}>oder JSON einfügen</label>
                <textarea
                  value={insightsJson}
                  onChange={(e) => setInsightsJson(e.target.value)}
                  placeholder="[{ &quot;id&quot;: &quot;ins_...&quot;, ... }]"
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Measures JSON</label>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileRead(setMeasuresJson)}
                style={{ ...inputStyle, padding: '6px 12px', cursor: 'pointer' }}
              />
              {measuresJson && (
                <p style={{ ...hintStyle, color: '#059669' }}>
                  ✓ {(() => { try { return JSON.parse(measuresJson).length } catch { return '?' } })()} Einträge geladen
                </p>
              )}
              <div style={{ marginTop: '8px' }}>
                <label style={{ ...labelStyle, fontWeight: 500, color: '#6b7280' }}>oder JSON einfügen</label>
                <textarea
                  value={measuresJson}
                  onChange={(e) => setMeasuresJson(e.target.value)}
                  placeholder="[{ &quot;insightId&quot;: &quot;ins_...&quot;, ... }]"
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !companyName || !slug || !password || !insightsJson}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: loading ? '#9ca3af' : '#1A2FEE',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.15s',
          }}
        >
          {loading ? 'Wird erstellt…' : 'Kundenportal erstellen'}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div style={{
          marginTop: '16px',
          padding: '16px 20px',
          borderRadius: '10px',
          border: `1px solid ${result.success ? '#bbf7d0' : '#fecaca'}`,
          backgroundColor: result.success ? '#f0fdf4' : '#fef2f2',
        }}>
          {result.success ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <CheckCircle className="size-5 shrink-0" style={{ color: '#059669', marginTop: '1px' }} />
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#065f46' }}>Kundenportal erstellt!</p>
                <p style={{ fontSize: '13px', color: '#047857', marginTop: '4px' }}>
                  URL: <a href={`/${result.slug}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, textDecoration: 'underline' }}>/{result.slug}</a>
                </p>
                <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Run ID: {result.runId}</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <AlertCircle className="size-5 shrink-0" style={{ color: '#dc2626', marginTop: '1px' }} />
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b' }}>Fehler</p>
                <p style={{ fontSize: '13px', color: '#b91c1c', marginTop: '4px' }}>{result.error}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
