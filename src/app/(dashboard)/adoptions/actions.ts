'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function getAdoptionsDataAction() {
  try {
    const { data, error } = await supabaseAdmin
      .from('animal_records')
      .select('*, event:events(*), adoptions:adoption_records(*)')
      .eq('species', 'Perro')
      .neq('animal_status', 'Finalizado')
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, dogs: data || [] }
  } catch (err: any) {
    console.error('getAdoptionsDataAction error:', err)
    return { success: false, error: err?.message || 'Error al cargar adopciones' }
  }
}

export async function saveOnlyChipAction(animalId: string, microchipNumber: string) {
  try {
    // Update animal_records
    const { error: aErr } = await supabaseAdmin
      .from('animal_records')
      .update({ microchip_number: microchipNumber })
      .eq('id', animalId)

    if (aErr) console.warn('Warning updating microchip on animal_records:', aErr.message)

    // Check if adoption record exists
    const { data: existingAdoption } = await supabaseAdmin
      .from('adoption_records')
      .select('id')
      .eq('animal_id', animalId)
      .maybeSingle()

    if (existingAdoption) {
      await supabaseAdmin
        .from('adoption_records')
        .update({ microchip_number: microchipNumber })
        .eq('id', existingAdoption.id)
    } else {
      await supabaseAdmin
        .from('adoption_records')
        .insert([{
          animal_id: animalId,
          microchip_number: microchipNumber,
          adopter_name: 'Pendiente Adopción',
          adopter_rut: 'PENDIENTE',
          adopter_phone: 'PENDIENTE',
          adopter_address: 'PENDIENTE',
        }])
    }

    return { success: true }
  } catch (err: any) {
    console.error('saveOnlyChipAction error:', err)
    return { success: false, error: err?.message || 'Error al guardar microchip' }
  }
}

export async function completeFullAdoptionAction(data: {
  animal_id: string
  microchip_number: string
  adopter_name: string
  adopter_rut: string
  adopter_phone: string
  adopter_email?: string
  adopter_address: string
  contract_url?: string
  completed_by: string
}) {
  try {
    const { animal_id, microchip_number, adopter_name, adopter_rut, adopter_phone, adopter_email, adopter_address, contract_url, completed_by } = data

    // Update animal_records status & chip
    await supabaseAdmin
      .from('animal_records')
      .update({
        animal_status: 'Finalizado',
        microchip_number: microchip_number
      })
      .eq('id', animal_id)

    // Update kennel_records status
    await supabaseAdmin
      .from('kennel_records')
      .update({ status: 'Retirado' })
      .eq('animal_id', animal_id)

    // Check if adoption_records exists
    const { data: existingAdoption } = await supabaseAdmin
      .from('adoption_records')
      .select('id')
      .eq('animal_id', animal_id)
      .maybeSingle()

    const payload: any = {
      animal_id,
      microchip_number,
      adopter_name,
      adopter_rut,
      adopter_phone,
      adopter_email: adopter_email || null,
      adopter_address,
      contract_url: contract_url || null,
      completed_by,
    }

    if (existingAdoption) {
      await supabaseAdmin
        .from('adoption_records')
        .update(payload)
        .eq('id', existingAdoption.id)
    } else {
      await supabaseAdmin
        .from('adoption_records')
        .insert([payload])
    }

    return { success: true }
  } catch (err: any) {
    console.error('completeFullAdoptionAction error:', err)
    return { success: false, error: err?.message || 'Error al completar adopción' }
  }
}
