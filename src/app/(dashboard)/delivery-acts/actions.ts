'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function createDeliveryActAction(actData: {
  act_number: string
  event_id: string
  client_id: string
  animal_id: string
  capture_datetime: string
  capture_location: string
  species: string
  sex: string
  size: string
  color_features: string
  apparent_age: string
  delivery_datetime: string
  delivering_user: string
  receiver_name: string
  receiver_rut: string
  receiver_organization: string
  receiver_address: string
  receiver_phone: string
  receiver_email: string
  observations: string
}) {
  try {
    const { data, error } = await supabaseAdmin
      .from('delivery_acts')
      .insert([actData])
      .select()
      .single()

    if (error) throw error

    // Update animal status
    const nextStatus = actData.species === 'Gato' ? 'Finalizado' : 'Pendiente Adopción'
    await supabaseAdmin
      .from('animal_records')
      .update({ animal_status: nextStatus })
      .eq('id', actData.animal_id)

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
