'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function getDeliveryActsDataAction() {
  try {
    const { data: clientsData, error: clientErr } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('active', true)

    if (clientErr) throw clientErr

    const { data: animalsData, error: animalErr } = await supabaseAdmin
      .from('animal_records')
      .select('*, event:events(*, client:clients(*))')
      .eq('was_captured', true)

    if (animalErr) throw animalErr

    const { data: opsData, error: opsErr } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, rut')
      .order('full_name')

    if (opsErr) throw opsErr

    const { data: actsData, error: actErr } = await supabaseAdmin
      .from('delivery_acts')
      .select('*, client:clients(*), animal:animal_records(*)')
      .order('created_at', { ascending: false })

    if (actErr) throw actErr

    return {
      success: true,
      clients: clientsData || [],
      animals: animalsData || [],
      operators: opsData || [],
      acts: actsData || []
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      clients: [],
      animals: [],
      operators: [],
      acts: []
    }
  }
}

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
  created_at?: string
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

    // Update kennel_records status to 'Retirado'
    await supabaseAdmin
      .from('kennel_records')
      .update({
        status: 'Retirado',
        exit_datetime: actData.delivery_datetime,
        exit_responsible: actData.delivering_user,
      })
      .eq('animal_id', actData.animal_id)

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateSignedScanAction(actId: string, scanUrl: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('delivery_acts')
      .update({ signed_scan_url: scanUrl })
      .eq('id', actId)
      .select()

    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
