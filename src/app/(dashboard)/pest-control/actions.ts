'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function getPestControlDataAction() {
  try {
    // 1. Fetch clients
    const { data: clients, error: clientErr } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('active', true)

    if (clientErr) throw clientErr

    // 2. Fetch operators/caza profiles for admin selection dropdown
    const { data: operators, error: opErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('active', true)
      .order('full_name', { ascending: true })

    if (opErr) throw opErr

    // 3. Fetch records
    const { data: records, error: recErr } = await supabaseAdmin
      .from('pest_control_records')
      .select('*, client:clients(*), responsible:profiles(*)')
      .order('record_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (recErr) throw recErr

    // 4. Fetch airport zones
    const { data: zones, error: zoneErr } = await supabaseAdmin
      .from('airport_zones')
      .select('name')
      .order('name', { ascending: true })

    if (zoneErr) throw zoneErr

    return {
      success: true,
      clients: clients || [],
      operators: operators || [],
      records: records || [],
      zones: zones || []
    }
  } catch (err: any) {
    return { success: false, error: err.message, clients: [], operators: [], records: [], zones: [] }
  }
}

export async function createPestRecordAction(recordData: {
  client_id: string
  sector: string
  rabbits_male: number
  rabbits_female: number
  pigeons: number
  method: string
  observations: string
  responsible_id: string
  record_date?: string
}) {
  try {
    const totalRabbits = Number(recordData.rabbits_male) + Number(recordData.rabbits_female)
    
    const { data, error } = await supabaseAdmin
      .from('pest_control_records')
      .insert([{
        client_id: recordData.client_id,
        sector: recordData.sector,
        rabbits_male: Number(recordData.rabbits_male),
        rabbits_female: Number(recordData.rabbits_female),
        rabbits_total: totalRabbits,
        pigeons: Number(recordData.pigeons),
        method: recordData.method,
        observations: recordData.observations,
        responsible_id: recordData.responsible_id,
        record_date: recordData.record_date || new Date().toISOString().split('T')[0]
      }])
      .select()

    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deletePestRecordAction(recordId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('pest_control_records')
      .delete()
      .eq('id', recordId)

    if (error) throw error
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
