'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { SpeciesType, AnimalSex, AnimalSize, ApparentAge } from '@/types'

export interface CreateExternalHandoverParams {
  event_date: string
  notice_time?: string
  client_id: string
  operator_id: string
  handover_person_name: string
  handover_entity: string
  handover_id_photo_url: string
  specific_location: string
  airport_zone: string
  observations?: string
  species: SpeciesType
  sex: AnimalSex
  size?: AnimalSize
  color_features: string
  apparent_age?: ApparentAge
  animal_photo_url: string
}

export async function createExternalHandoverAction(data: CreateExternalHandoverParams) {
  try {
    const {
      event_date,
      notice_time,
      client_id,
      operator_id,
      handover_person_name,
      handover_entity,
      handover_id_photo_url,
      specific_location,
      airport_zone,
      observations,
      species,
      sex,
      size,
      color_features,
      apparent_age,
      animal_photo_url,
    } = data

    // 1. Clean date and time
    const cleanDate = event_date || new Date().toISOString().slice(0, 10)
    const cleanTime = (notice_time || '12:00').slice(0, 5)
    
    let closedAtTimestamp = new Date().toISOString()
    try {
      closedAtTimestamp = new Date(`${cleanDate}T${cleanTime}:00`).toISOString()
    } catch {
      closedAtTimestamp = new Date().toISOString()
    }

    const dateFormatted = cleanDate.replace(/-/g, '')
    const randomCode = Math.floor(1000 + Math.random() * 9000)
    const event_code = `EXT-${dateFormatted}-${randomCode}`

    const situation_description = `Recepción Externa: Can/Animal entregado por ${handover_entity} (${handover_person_name}). Ubicación de captura: ${specific_location}. Credencial TICA: ${handover_id_photo_url || 'No adjunta'}`
    const closure_observations = `Recepción externa registrada y puesta en custodia en canil. ${observations || ''}`.trim()

    // Base event payload
    const eventPayload: Record<string, any> = {
      event_code,
      client_id,
      operator_id,
      event_type: 'Recepción Externa',
      event_date: cleanDate,
      notice_time: cleanTime,
      intervention_time: cleanTime,
      end_time: cleanTime,
      specific_location,
      airport_zone: airport_zone || 'Cuartel / Canil',
      situation_description,
      general_result: 'Captura total',
      closure_type: 'Captura total',
      closure_observations,
      observations: observations || null,
      status: 'Cerrado',
      closed_at: closedAtTimestamp,
      closed_by: operator_id,
      // Handover columns
      handover_person_name,
      handover_entity,
      handover_id_photo_url,
    }

    // Try full insert first
    let { data: eventData, error: eventError } = await supabaseAdmin
      .from('events')
      .insert([eventPayload])
      .select()
      .single()

    // Fallback if handover columns do not exist in DB yet
    if (eventError && (eventError.message?.includes('handover') || eventError.code === 'PGRST204')) {
      console.warn('Handover columns missing in events table, executing fallback insert:', eventError.message)
      delete eventPayload.handover_person_name
      delete eventPayload.handover_entity
      delete eventPayload.handover_id_photo_url

      const fallbackRes = await supabaseAdmin
        .from('events')
        .insert([eventPayload])
        .select()
        .single()

      eventData = fallbackRes.data
      eventError = fallbackRes.error
    }

    if (eventError || !eventData) {
      console.error('Error creating external handover event:', eventError)
      return { success: false, error: eventError?.message || 'Error guardando evento en la base de datos' }
    }

    // 3. Insert Animal Record
    const photoUrls = animal_photo_url ? [animal_photo_url] : []
    const { data: animalData, error: animalError } = await supabaseAdmin
      .from('animal_records')
      .insert([
        {
          event_id: eventData.id,
          species,
          sex,
          size: size || 'Mediano',
          color_features,
          apparent_age: apparent_age || 'Adulto',
          was_captured: true,
          animal_status: 'En canil',
          photo_urls: photoUrls,
          observations: `Entregado por ${handover_entity} (${handover_person_name}).`,
          created_at: closedAtTimestamp,
        },
      ])
      .select()
      .single()

    if (animalError || !animalData) {
      console.error('Error creating animal record for external handover:', animalError)
      return { success: false, error: animalError?.message || 'Error guardando registro del animal' }
    }

    // 4. Insert Kennel Record if Dog/Cat
    if (species === 'Perro' || species === 'Gato') {
      const { error: kennelError } = await supabaseAdmin
        .from('kennel_records')
        .insert([
          {
            animal_id: animalData.id,
            species,
            entry_datetime: closedAtTimestamp,
            entry_responsible: operator_id,
            status: 'En canil',
          },
        ])

      if (kennelError) {
        console.warn('Warning creating kennel record:', kennelError.message)
      }
    }

    return { success: true, event: eventData, animal: animalData }
  } catch (err: any) {
    console.error('Unexpected error in createExternalHandoverAction:', err)
    return { success: false, error: err?.message || 'Error inesperado al crear recepción externa' }
  }
}
