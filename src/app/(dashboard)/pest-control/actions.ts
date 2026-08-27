'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { 
  sendCazaShiftStartWhatsAppAlert, 
  sendCazaShiftEndWhatsAppAlert 
} from '@/lib/utils/whatsapp'

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

export async function startPestControlShiftAction(params: {
  client_id: string
  responsible_id: string
}) {
  try {
    // Check if operator already has an active shift
    const { data: activeShift } = await supabaseAdmin
      .from('pest_control_records')
      .select('*')
      .eq('responsible_id', params.responsible_id)
      .eq('status', 'en_curso')
      .maybeSingle()

    if (activeShift) {
      return { success: true, data: activeShift, alreadyActive: true }
    }

    // Get operator details for WhatsApp notification
    const { data: operator } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', params.responsible_id)
      .single()

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    const { data, error } = await supabaseAdmin
      .from('pest_control_records')
      .insert([{
        client_id: params.client_id,
        responsible_id: params.responsible_id,
        record_date: todayStr,
        sector: 'En Curso',
        rabbits_male: 0,
        rabbits_female: 0,
        rabbits_total: 0,
        pigeons: 0,
        method: 'Estándar',
        status: 'en_curso',
        started_at: now.toISOString()
      }])
      .select('*, responsible:profiles(*)')
      .single()

    if (error) throw error

    // Send WhatsApp notification
    const startedAtStr = now.toLocaleDateString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

    await sendCazaShiftStartWhatsAppAlert({
      operator_name: operator?.full_name || 'Operador Caza',
      started_at: startedAtStr
    })

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function closePestControlShiftAction(params: {
  record_id: string
  sector: string
  rabbits_male: number
  rabbits_female: number
  pigeons: number
  observations: string
}) {
  try {
    // Fetch active shift
    const { data: shift, error: fetchErr } = await supabaseAdmin
      .from('pest_control_records')
      .select('*, responsible:profiles(*)')
      .eq('id', params.record_id)
      .single()

    if (fetchErr || !shift) {
      throw new Error('No se encontró el turno de caza especificado.')
    }

    const now = new Date()
    const startedAt = shift.started_at ? new Date(shift.started_at) : new Date(shift.created_at)
    const diffMs = now.getTime() - startedAt.getTime()
    const durationMinutes = Math.max(1, Math.round(diffMs / 60000))

    const totalRabbits = Number(params.rabbits_male) + Number(params.rabbits_female)

    const { data, error } = await supabaseAdmin
      .from('pest_control_records')
      .update({
        status: 'completado',
        ended_at: now.toISOString(),
        duration_minutes: durationMinutes,
        sector: params.sector,
        rabbits_male: Number(params.rabbits_male),
        rabbits_female: Number(params.rabbits_female),
        rabbits_total: totalRabbits,
        pigeons: Number(params.pigeons),
        observations: params.observations
      })
      .eq('id', params.record_id)
      .select('*, responsible:profiles(*)')
      .single()

    if (error) throw error

    // Format duration string (X hrs Y mins)
    const hours = Math.floor(durationMinutes / 60)
    const mins = durationMinutes % 60
    const durationStr = hours > 0 ? `${hours} hrs ${mins} mins` : `${mins} mins`

    const startedAtStr = startedAt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    const endedAtStr = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })

    // Send WhatsApp Alert
    await sendCazaShiftEndWhatsAppAlert({
      operator_name: shift.responsible?.full_name || 'Operador Caza',
      started_at: startedAtStr,
      ended_at: endedAtStr,
      duration_str: durationStr,
      sector: params.sector,
      rabbits_total: totalRabbits,
      rabbits_male: Number(params.rabbits_male),
      rabbits_female: Number(params.rabbits_female),
      pigeons: Number(params.pigeons),
      observations: params.observations
    })

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function cancelPestControlShiftAction(recordId: string) {
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
        status: 'completado',
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
