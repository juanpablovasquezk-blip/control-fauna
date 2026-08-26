'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function createKennelCleaningAction(data: {
  operator_id: string
  cleaning_type: string
  observations: string
  photo_url?: string
  active_animal_ids: string[]
  cleaning_datetime?: string
}) {
  const { operator_id, cleaning_type, observations, photo_url, active_animal_ids, cleaning_datetime } = data

  const insertPayload: any = {
    operator_id,
    cleaning_type,
    observations,
    photo_url,
  }

  if (cleaning_datetime) {
    insertPayload.cleaning_datetime = cleaning_datetime
    insertPayload.created_at = cleaning_datetime
  }

  const { data: cleanRes, error: cleanErr } = await supabaseAdmin
    .from('kennel_cleanings')
    .insert([insertPayload])
    .select()
    .single()

  if (cleanErr) {
    return { success: false, error: cleanErr.message }
  }

  if (cleanRes && active_animal_ids && active_animal_ids.length > 0) {
    const cleaningAnimalLinks = active_animal_ids.map(animal_id => ({
      cleaning_id: cleanRes.id,
      animal_id,
    }))

    const { error: linkErr } = await supabaseAdmin
      .from('cleaning_animals')
      .insert(cleaningAnimalLinks)

    if (linkErr) {
      console.warn('Warning linking cleaning animals:', linkErr.message)
    }
  }

  return { success: true, data: cleanRes }
}
