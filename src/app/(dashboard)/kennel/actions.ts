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
    insertPayload.created_at = cleaning_datetime
  }

  const { data: cleanRes, error: cleanErr } = await supabaseAdmin
    .from('kennel_cleanings')
    .insert([insertPayload])
    .select()
    .single()

  if (cleanErr) {
    console.error('Error inserting into kennel_cleanings:', cleanErr)
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

export async function getKennelDataAction() {
  try {
    // 1. Fetch active kennels with animals
    const { data: kennelData, error: kErr } = await supabaseAdmin
      .from('kennel_records')
      .select('*, animal:animal_records(*)')
      .eq('status', 'En canil')

    if (kErr) console.error('Error fetching kennel_records:', kErr)

    // 2. Fetch active animals directly
    const { data: animalData, error: aErr } = await supabaseAdmin
      .from('animal_records')
      .select('*')
      .eq('animal_status', 'En canil')
      .eq('was_captured', true)

    if (aErr) console.error('Error fetching animal_records:', aErr)

    // 3. Fetch cleanings log
    const { data: cleaningData, error: cErr } = await supabaseAdmin
      .from('kennel_cleanings')
      .select('*')
      .order('created_at', { ascending: false })

    if (cErr) console.error('Error fetching kennel_cleanings:', cErr)

    // 4. Fetch profiles / operators
    const { data: profilesData, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('*')

    if (pErr) console.error('Error fetching profiles:', pErr)

    // Map operator profiles to cleanings manually to guarantee 100% data integrity
    const profilesMap = new Map((profilesData || []).map(p => [p.id, p]))
    const cleaningsWithOperators = (cleaningData || []).map(c => ({
      ...c,
      operator: profilesMap.get(c.operator_id) || null
    }))

    return {
      success: true,
      kennelRecords: kennelData || [],
      animalRecords: animalData || [],
      cleanings: cleaningsWithOperators,
      operators: profilesData || []
    }
  } catch (err: any) {
    console.error('getKennelDataAction error:', err)
    return { success: false, error: err?.message || 'Error al cargar datos del canil' }
  }
}
