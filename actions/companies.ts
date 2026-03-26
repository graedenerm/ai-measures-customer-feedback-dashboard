'use server'

import { createClient } from '@/lib/supabase/server'
import type { Company } from '@/lib/types'

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as Company
}

export interface CreateCompanyConfig {
  name: string
  slug: string
  password: string
  industry?: string
}

export async function createOrUpdateCompany(
  config: CreateCompanyConfig
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('companies')
    .upsert(
      {
        name: config.name.trim(),
        slug: config.slug.trim(),
        password: config.password,
        industry: config.industry?.trim() || null,
      },
      { onConflict: 'name', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Unknown error' }
  }
  return { id: data.id }
}

export async function setActiveRun(
  companyId: string,
  runId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('companies')
    .update({ active_run_id: runId })
    .eq('id', companyId)

  if (error) return { error: error.message }
  return {}
}
