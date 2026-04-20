'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import type {
  ConsultantPortal,
  ConsultantPortalWithStats,
  InsertConsultantPortal,
} from '@/lib/consultant-types'

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getConsultantPortalBySlug(
  slug: string
): Promise<ConsultantPortal | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('consultant_portals')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as ConsultantPortal
}

export async function getConsultantPortals(): Promise<ConsultantPortalWithStats[]> {
  const supabase = await createClient()

  const { data: portals, error } = await supabase
    .from('consultant_portals')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !portals) return []

  // Fetch insight and evaluation counts per portal
  const results: ConsultantPortalWithStats[] = []

  for (const portal of portals) {
    const { count: insightCount } = await supabase
      .from('consultant_insights')
      .select('*', { count: 'exact', head: true })
      .eq('consultant_portal_id', portal.id)

    // Count evaluations via insights belonging to this portal
    const { data: insightIds } = await supabase
      .from('consultant_insights')
      .select('id')
      .eq('consultant_portal_id', portal.id)

    let evalCount = 0
    if (insightIds && insightIds.length > 0) {
      const ids = insightIds.map((i) => i.id)
      const { count } = await supabase
        .from('evaluations_consultant')
        .select('*', { count: 'exact', head: true })
        .in('consultant_insight_id', ids)
      evalCount = count ?? 0
    }

    const { count: measureCount } = await supabase
      .from('consultant_measures')
      .select('*', { count: 'exact', head: true })
      .eq('consultant_portal_id', portal.id)

    const { data: measureIds } = await supabase
      .from('consultant_measures')
      .select('id')
      .eq('consultant_portal_id', portal.id)

    let measureEvalCount = 0
    if (measureIds && measureIds.length > 0) {
      const ids = measureIds.map((m) => m.id)
      const { count } = await supabase
        .from('evaluations_consultant_measure')
        .select('*', { count: 'exact', head: true })
        .in('consultant_measure_id', ids)
      measureEvalCount = count ?? 0
    }

    results.push({
      ...(portal as ConsultantPortal),
      insight_count: insightCount ?? 0,
      eval_count: evalCount,
      measure_count: measureCount ?? 0,
      measure_eval_count: measureEvalCount,
    })
  }

  return results
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createConsultantPortal(
  config: InsertConsultantPortal
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('consultant_portals')
    .insert({
      slug: config.slug.trim().toLowerCase(),
      password: config.password.trim(),
      evaluator_name: config.evaluator_name.trim(),
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Unbekannter Fehler' }
  }
  return { id: data.id }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
// Password is checked server-side; a short-lived cookie is set on success.
// The password itself is never sent to the client.

export async function loginConsultantPortal(
  slug: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: portal } = await supabase
    .from('consultant_portals')
    .select('id, password')
    .eq('slug', slug)
    .single()

  if (!portal) return { success: false, error: 'Portal nicht gefunden.' }
  if (portal.password !== password) return { success: false, error: 'Falsches Passwort.' }

  const cookieStore = await cookies()
  cookieStore.set(`consultant_auth_${slug}`, portal.id, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  })

  return { success: true }
}

export async function checkConsultantAuth(
  slug: string,
  portalId: string
): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(`consultant_auth_${slug}`)?.value
  return token === portalId
}
