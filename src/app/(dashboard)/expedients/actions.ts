'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function getExpedientsDataAction() {
  try {
    const { data: animalData, error: aErr } = await supabaseAdmin
      .from('animal_records')
      .select('*, event:events(*, client:clients(*)), delivery_acts(*), adoptions:adoption_records(*)')
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

    return {
      success: true,
      animals: animalData || [],
      clients: clientData || [],
      totalCleanings: cleaningData?.length || 0,
    }
  } catch (err: any) {
    console.error('getExpedientsDataAction error:', err)
    return { success: false, error: err?.message || 'Error al cargar expedientes' }
  }
}
