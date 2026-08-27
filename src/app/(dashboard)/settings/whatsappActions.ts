'use server'

// Server-side WhatsApp action wrappers.
// These run on the server where SUPABASE_SERVICE_ROLE_KEY is available,
// ensuring getWhatsAppConfig() can read system_settings via supabaseAdmin.

import {
  sendRoundWhatsAppAlert as _sendRoundWhatsAppAlert,
  sendFenceDamageWhatsAppAlert as _sendFenceDamageWhatsAppAlert,
  sendFenceRepairWhatsAppAlert as _sendFenceRepairWhatsAppAlert,
  sendActivationWhatsAppAlert as _sendActivationWhatsAppAlert,
  sendProcedureClosureWhatsAppAlert as _sendProcedureClosureWhatsAppAlert,
  sendCapturedAnimalWhatsAppAlert as _sendCapturedAnimalWhatsAppAlert,
  sendExternalHandoverWhatsAppAlert as _sendExternalHandoverWhatsAppAlert,
  sendDeliveryActWhatsAppAlert as _sendDeliveryActWhatsAppAlert,
  sendKennelCleaningWhatsAppAlert as _sendKennelCleaningWhatsAppAlert,
  sendCazaShiftStartWhatsAppAlert as _sendCazaShiftStartWhatsAppAlert,
  sendCazaShiftEndWhatsAppAlert as _sendCazaShiftEndWhatsAppAlert,
} from '@/lib/utils/whatsapp'

export async function sendRoundWhatsAppAction(params: {
  round_code?: string
  operator_name: string
  airport_zone: string
  status: string
  observations?: string
}) {
  return _sendRoundWhatsAppAlert(params)
}

export async function sendFenceDamageWhatsAppAction(params: {
  location: string
  damage_description: string
  damage_photo_url?: string
  close_date?: string
  close_time?: string
  client_group_id?: string
}) {
  return _sendFenceDamageWhatsAppAlert(params)
}

export async function sendFenceRepairWhatsAppAction(params: {
  location: string
  repair_description: string
  repair_photo_url?: string
  close_date?: string
  close_time?: string
  client_group_id?: string
}) {
  return _sendFenceRepairWhatsAppAlert(params)
}

export async function sendActivationWhatsAppAction(params: {
  event_code: string
  client_name: string
  requested_by?: string
  airport_zone: string
  specific_location?: string
  reported_count: number
  reported_species: string
  situation_description?: string
  operator_name?: string
  event_date?: string
  notice_time?: string
  client_group_id?: string
}) {
  return _sendActivationWhatsAppAlert(params)
}

export async function sendProcedureClosureWhatsAppAction(params: {
  client_name: string
  airport_zone: string
  general_result: string
  observations?: string
  has_fence_damage?: boolean
  operator_name?: string
  close_date?: string
  close_time?: string
  client_group_id?: string
}) {
  return _sendProcedureClosureWhatsAppAlert(params)
}

export async function sendCapturedAnimalWhatsAppAction(params: {
  species: string
  sex: string
  size: string
  apparent_age: string
  color_features?: string
  photo_url?: string
  index?: number
  total?: number
  client_group_id?: string
}) {
  return _sendCapturedAnimalWhatsAppAlert(params)
}

export async function sendExternalHandoverWhatsAppAction(params: {
  event_code: string
  handover_entity?: string
  handover_person_name?: string
  species: string
  sex: string
  apparent_age: string
  color_features?: string
  operator_name?: string
  photo_url?: string
  event_date?: string
  notice_time?: string
  client_group_id?: string
}) {
  return _sendExternalHandoverWhatsAppAlert(params)
}

export async function sendDeliveryActWhatsAppAction(params: {
  act_number: string
  client_name: string
  receiver_name: string
  receiver_rut: string
  species: string
  sex: string
  color_features?: string
  delivering_user_name?: string
  event_date?: string
  notice_time?: string
  client_group_id?: string
}) {
  return _sendDeliveryActWhatsAppAlert(params)
}

export async function sendKennelCleaningWhatsAppAction(params: {
  cleaning_type: string
  operator_name: string
  animal_count: number
  observations?: string
  photo_url?: string
  cleaning_date?: string
  cleaning_time?: string
}) {
  return _sendKennelCleaningWhatsAppAlert(params)
}

export async function sendCazaShiftStartWhatsAppAction(params: {
  operator_name: string
  started_at: string
}) {
  return _sendCazaShiftStartWhatsAppAlert(params)
}

export async function sendCazaShiftEndWhatsAppAction(params: {
  operator_name: string
  started_at: string
  ended_at: string
  duration_str: string
  sector: string
  rabbits_total: number
  rabbits_male: number
  rabbits_female: number
  pigeons: number
  observations?: string
}) {
  return _sendCazaShiftEndWhatsAppAlert(params)
}
