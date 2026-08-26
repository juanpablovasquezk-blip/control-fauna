'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function getExpedientsDataAction() {
  try {
    const { data: animalData, error: aErr } = await supabaseAdmin
      .from('animal_records')
      .select('*, event:events(*, client:clients(*)), delivery_acts(*), adoptions:adoption_records(*), kennel_records(*)')
      .order('created_at', { ascending: false })

    if (aErr) console.error('Error fetching expedients animal_records:', aErr)

    const { data: clientData, error: cErr } = await supabaseAdmin
      .from('clients')
      .select('id, name')
      .order('name')

    if (cErr) console.error('Error fetching expedients clients:', cErr)

    const { data: cleaningData, error: clErr } = await supabaseAdmin
      .from('kennel_cleanings')
      .select('id')

    if (clErr) console.error('Error fetching expedients kennel_cleanings:', clErr)

    // Filter out orphan animal records whose parent event no longer exists
    const validAnimals = (animalData || []).filter(a => !!a.event)

    // Auto clean orphan animal records from DB whose parent event was deleted
    const orphanAnimalIds = (animalData || []).filter(a => !a.event).map(a => a.id)
    if (orphanAnimalIds.length > 0) {
      await supabaseAdmin.from('delivery_acts').delete().in('animal_id', orphanAnimalIds)
      await supabaseAdmin.from('adoptions').delete().in('animal_id', orphanAnimalIds)
      await supabaseAdmin.from('cleaning_animals').delete().in('animal_id', orphanAnimalIds)
      await supabaseAdmin.from('kennel_records').delete().in('animal_id', orphanAnimalIds)
      await supabaseAdmin.from('animal_records').delete().in('id', orphanAnimalIds)
    }

    return {
      success: true,
      animals: validAnimals,
      clients: clientData || [],
      totalCleanings: cleaningData?.length || 0,
    }
  } catch (err: any) {
    console.error('getExpedientsDataAction error:', err)
    return { success: false, error: err?.message || 'Error al cargar expedientes' }
  }
}

export async function deleteExpedientAction(animalId: string) {
  try {
    await supabaseAdmin.from('delivery_acts').delete().eq('animal_id', animalId)
    await supabaseAdmin.from('adoptions').delete().eq('animal_id', animalId)
    await supabaseAdmin.from('cleaning_animals').delete().eq('animal_id', animalId)
    await supabaseAdmin.from('kennel_records').delete().eq('animal_id', animalId)
    const { error } = await supabaseAdmin.from('animal_records').delete().eq('id', animalId)
    if (error) throw error
    return { success: true }
  } catch (err: any) {
    console.error('Error in deleteExpedientAction:', err)
    return { success: false, error: err?.message || 'Error al eliminar expediente' }
  }
}
