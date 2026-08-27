'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function deleteRoundAction(roundId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!roundId) {
      return { success: false, error: 'ID de ronda no proporcionado.' }
    }

    // 1. Eliminar incidentes de cerco vinculados
    const { error: incErr } = await supabaseAdmin
      .from('fence_incidents')
      .delete()
      .eq('round_id', roundId)

    if (incErr) {
      console.warn('Error eliminando fence_incidents asociados:', incErr)
    }

    // 2. Eliminar la ronda
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
