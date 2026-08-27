'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function deleteRoundAction(roundId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!roundId) {
      return { success: false, error: 'ID de ronda no proporcionado.' }
    }

    const { error: incErr } = await supabaseAdmin
      .from('fence_incidents')
      .delete()
      .eq('round_id', roundId)

    if (incErr) {
      console.warn('Error eliminando fence_incidents asociados:', incErr)
    }

    const { error: roundErr } = await supabaseAdmin
      .from('rounds')
      .delete()
      .eq('id', roundId)

    if (roundErr) {
      console.error('Error eliminando registro de ronda:', roundErr)
      return { success: false, error: roundErr.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error('deleteRoundAction exception:', err)
    return { success: false, error: err.message || 'Error al eliminar el registro de ronda.' }
  }
}

export async function getRoundsDataAction() {
  try {
    const { data: zones } = await supabaseAdmin
      .from('airport_zones')
      .select('*')
      .order('name')

    const { data: operators } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role')
      .eq('active', true)
      .order('full_name')

    const { data: rounds, error } = await supabaseAdmin
      .from('rounds')
      .select('*, operator:profiles!operator_id(*), fence_incidents(*)')
      .order('start_time', { ascending: false })

    if (error) {
      console.error('Error fetching rounds:', error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      zones: zones || [],
      operators: operators || [],
      rounds: rounds || [],
    }
  } catch (err: any) {
    console.error('getRoundsDataAction error:', err)
    return { success: false, error: err.message }
  }
}

export async function getFenceIncidentsAction(roundId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('fence_incidents')
      .select('*')
      .eq('round_id', roundId)

    if (error) {
      console.error('Error fetching fence_incidents:', error)
      return { success: false, error: error.message }
    }

    return { success: true, incidents: data || [] }
  } catch (err: any) {
    console.error('getFenceIncidentsAction error:', err)
    return { success: false, error: err.message }
  }
}
