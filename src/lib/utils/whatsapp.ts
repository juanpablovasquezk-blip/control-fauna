import { createClient } from '@/lib/supabase/client'
import { formatFreeText } from '@/lib/utils/formatters'

export interface WhatsAppConfig {
  enabled: boolean
  instance_id: string
  token: string
  default_group_id: string
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'ultramsg_config')
      .maybeSingle()

    if (data && data.value) {
      return {
        enabled: data.value.enabled ?? true,
        instance_id: data.value.instance_id || '',
        token: data.value.token || '',
        default_group_id: data.value.default_group_id || '',
      }
    }
  } catch (err) {
    console.warn('Failed to fetch WhatsApp config from system_settings:', err)
  }

  return {
    enabled: true,
    instance_id: '',
    token: '',
    default_group_id: '',
  }
}

export async function sendWhatsAppMessage(params: {
  to?: string
  body: string
  imageUrl?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getWhatsAppConfig()

    if (!config.enabled) {
      console.log('WhatsApp notifications are disabled globally.')
      return { success: false, error: 'Disabled' }
    }

    const targetRecipient = params.to || config.default_group_id
    if (!targetRecipient || !targetRecipient.trim()) {
      console.log('No WhatsApp group ID or recipient configured. Skipping message.')
      return { success: false, error: 'No recipient' }
    }

    if (!config.instance_id || !config.token) {
      console.log('UltraMsg instance_id or token missing in settings.')
      return { success: false, error: 'Missing credentials' }
    }

    const cleanRecipient = targetRecipient.trim()
    const endpoint = params.imageUrl
      ? `https://api.ultramsg.com/${config.instance_id}/messages/image`
      : `https://api.ultramsg.com/${config.instance_id}/messages/chat`

    const payload: any = {
      token: config.token,
      to: cleanRecipient,
      body: params.body,
    }

    if (params.imageUrl) {
      payload.image = params.imageUrl
      payload.caption = params.body
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(payload).toString(),
    })

    const data = await response.json()
    if (data && (data.sent === 'true' || data.sent === true || data.id)) {
      return { success: true }
    } else {
      console.warn('UltraMsg API response:', data)
      return { success: false, error: data?.error || 'Error sending' }
    }
  } catch (err: any) {
    console.warn('Error sending WhatsApp message:', err?.message || err)
    return { success: false, error: err?.message }
  }
}

// Helper to format DD-MM-YYYY HH:MM
function formatDateTime(dateStr?: string, timeStr?: string): string {
  let dateFormatted = ''
  if (dateStr) {
    const parts = dateStr.split('T')[0].split('-')
    if (parts.length === 3) {
      dateFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`
    } else {
      dateFormatted = dateStr
    }
  } else {
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    dateFormatted = `${day}-${month}-${year}`
  }

  const timeFormatted = timeStr || new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  return `${dateFormatted} ${timeFormatted}`
}

// ----------------------------------------------------------------------------
// SPECIFIC EVENT ALERT HELPERS
// ----------------------------------------------------------------------------

export async function sendActivationWhatsAppAlert(params: {
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
  const requestedByFormatted = params.requested_by ? formatFreeText(params.requested_by) : ''

  // Include specific_location ONLY if filled and not identical to airport_zone
  const hasSpecificLocation =
    params.specific_location &&
    params.specific_location.trim().length > 0 &&
    params.specific_location.trim().toLowerCase() !== params.airport_zone.trim().toLowerCase()

  // Omit redundant situation_description if it just repeats the default Divisado(s) string
  const isDefaultDesc =
    !params.situation_description ||
    params.situation_description.startsWith('Divisado(s)') ||
    params.situation_description.includes(`Divisado(s) ${params.reported_count}`)

  const customObs = isDefaultDesc ? '' : formatFreeText(params.situation_description)
  const dateTimeStr = formatDateTime(params.event_date, params.notice_time)

  const message = [
    `🚨 *ALERTA DE ACTIVACIÓN DE FAUNA*`,
    `• *Cliente:* ${formatFreeText(params.client_name)}`,
    requestedByFormatted ? `• *Solicita:* ${requestedByFormatted}` : null,
    `• *Zona:* ${formatFreeText(params.airport_zone)}`,
    hasSpecificLocation ? `• *Lugar Específico:* ${formatFreeText(params.specific_location!)}` : null,
    `• *Aviso:* ${params.reported_count} ${params.reported_species}(s)`,
    customObs ? `• *Observaciones:* ${customObs}` : null,
    params.operator_name ? `• *Operador:* ${formatFreeText(params.operator_name)}` : null,
    `• *Fecha/Hora:* ${dateTimeStr}`,
  ]
    .filter(Boolean)
    .join('\n')

  return sendWhatsAppMessage({
    to: params.client_group_id,
    body: message,
  })
}

export async function sendProcedureClosureWhatsAppAlert(params: {
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
  const obsFormatted = params.observations ? formatFreeText(params.observations) : ''
  const dateTimeStr = formatDateTime(params.close_date, params.close_time)

  const message = [
    `🔒 *CIERRE DE PROCEDIMIENTO DE FAUNA*`,
    `• *Cliente:* ${formatFreeText(params.client_name)}`,
    `• *Zona:* ${formatFreeText(params.airport_zone)}`,
    `• *Resultado:* ${params.general_result}`,
    obsFormatted ? `• *Observaciones:* ${obsFormatted}` : null,
    params.has_fence_damage ? `• *Daño en Perímetro:* Detectado y Reparado` : null,
    params.operator_name ? `• *Operador:* ${formatFreeText(params.operator_name)}` : null,
    `• *Fecha/Hora:* ${dateTimeStr}`,
  ]
    .filter(Boolean)
    .join('\n')

  return sendWhatsAppMessage({
    to: params.client_group_id,
    body: message,
  })
}

export async function sendCapturedAnimalWhatsAppAlert(params: {
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
  const animalIcon = params.species === 'Gato' ? '🐱' : '🐕'
  const indexStr = params.total && params.total > 1 ? ` (${params.index || 1} de ${params.total})` : ''

  const message = [
    `${animalIcon} *CAN CAPTURADO*${indexStr}`,
    `• *Especie / Sexo:* ${params.species} ${params.sex}`,
    `• *Tamaño / Edad:* ${params.size} - ${params.apparent_age}`,
    params.color_features ? `• *Características:* ${formatFreeText(params.color_features)}` : null,
    `• *Estado:* Ingresado a Canil`,
  ]
    .filter(Boolean)
    .join('\n')

  return sendWhatsAppMessage({
    to: params.client_group_id,
    body: message,
    imageUrl: params.photo_url,
  })
}

export async function sendFenceDamageWhatsAppAlert(params: {
  location: string
  damage_description: string
  damage_photo_url?: string
  close_date?: string
  close_time?: string
  client_group_id?: string
}) {
  const dateTimeStr = formatDateTime(params.close_date, params.close_time)
  const message = [
    `⚠️ *REPORTE DE DAÑO EN REJA PERIMETRAL*`,
    `• *Ubicación:* ${formatFreeText(params.location)}`,
    `• *Descripción del Daño:* ${formatFreeText(params.damage_description)}`,
    `• *Fecha/Hora:* ${dateTimeStr}`,
  ].join('\n')

  return sendWhatsAppMessage({
    to: params.client_group_id,
    body: message,
    imageUrl: params.damage_photo_url,
  })
}

export async function sendFenceRepairWhatsAppAlert(params: {
  location: string
  repair_description: string
  repair_photo_url?: string
  close_date?: string
  close_time?: string
  client_group_id?: string
}) {
  const dateTimeStr = formatDateTime(params.close_date, params.close_time)
  const message = [
    `🛠️ *REPARACIÓN DE CERCO PERIMETRAL*`,
    `• *Ubicación:* ${formatFreeText(params.location)}`,
    `• *Acción Tomada:* ${formatFreeText(params.repair_description)}`,
    `• *Estado:* Reparado en terreno`,
    `• *Fecha/Hora:* ${dateTimeStr}`,
  ].join('\n')

  return sendWhatsAppMessage({
    to: params.client_group_id,
    body: message,
    imageUrl: params.repair_photo_url,
  })
}

export async function sendExternalHandoverWhatsAppAlert(params: {
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
  const entityStr = params.handover_entity
    ? `${formatFreeText(params.handover_entity)}${params.handover_person_name ? ` (${formatFreeText(params.handover_person_name)})` : ''}`
    : null

  const colorStr = params.color_features ? formatFreeText(params.color_features) : ''
  const animalDetail = `${params.species} ${params.sex}${colorStr ? ` - ${colorStr}` : ''}`

  const message = [
    `🔄 *RECEPCIÓN EXTERNA DE CAN*`,
    entityStr ? `• *Entregado por:* ${entityStr}` : null,
    `• *Can:* ${animalDetail}`,
    `• *Edad:* ${params.apparent_age}`,
    params.operator_name ? `• *Recibe:* ${formatFreeText(params.operator_name)}` : null,
    `• *Fecha/Hora:* ${formatDateTime(params.event_date, params.notice_time)}`,
  ]
    .filter(Boolean)
    .join('\n')

  return sendWhatsAppMessage({
    to: params.client_group_id,
    body: message,
    imageUrl: params.photo_url,
  })
}

export async function sendDeliveryActWhatsAppAlert(params: {
  act_number: string
  client_name: string
  receiver_name: string
  receiver_rut: string
  species: string
  sex: string
  color_features?: string
  delivering_user_name?: string
  client_group_id?: string
}) {
  const colorStr = params.color_features ? formatFreeText(params.color_features) : 'Sin señas'
  const message = [
    `📄 *ENTREGA / SALIDA DE CANIL*`,
    `• *Acta N°:* ${params.act_number}`,
    `• *Cliente:* ${formatFreeText(params.client_name)}`,
    `• *Can:* ${params.species} ${params.sex} (${colorStr})`,
    `• *Receptor:* ${formatFreeText(params.receiver_name)} (${params.receiver_rut})`,
    params.delivering_user_name ? `• *Entregado por:* ${formatFreeText(params.delivering_user_name)}` : null,
    `• *Fecha/Hora:* ${formatDateTime()}`,
  ]
    .filter(Boolean)
    .join('\n')

  return sendWhatsAppMessage({
    to: params.client_group_id,
    body: message,
  })
}

export async function sendRoundWhatsAppAlert(params: {
  round_code?: string
  operator_name: string
  airport_zone: string
  status: string
  observations?: string
}) {
  const obsFormatted = params.observations ? formatFreeText(params.observations) : ''

  const message = [
    `🚗 *RONDA PERIMETRAL REGISTRADA*`,
    `• *Operador:* ${formatFreeText(params.operator_name)}`,
    `• *Zona:* ${formatFreeText(params.airport_zone)}`,
    `• *Estado:* ${params.status}`,
    obsFormatted ? `• *Novedades:* ${obsFormatted}` : null,
    `• *Fecha/Hora:* ${formatDateTime()}`,
  ]
    .filter(Boolean)
    .join('\n')

  return sendWhatsAppMessage({
    body: message,
  })
}

export async function sendKennelCleaningWhatsAppAlert(params: {
  cleaning_type: string
  operator_name: string
  animal_count: number
  observations?: string
  photo_url?: string
}) {
  const obsFormatted = params.observations ? formatFreeText(params.observations) : ''

  const message = [
    `🦴 *ALIMENTACIÓN / LIMPIEZA DE CANIL*`,
    `• *Tipo:* ${params.cleaning_type}`,
    `• *Responsable:* ${formatFreeText(params.operator_name)}`,
    `• *Canes Atendidos:* ${params.animal_count} canes`,
    obsFormatted ? `• *Observaciones:* ${obsFormatted}` : null,
    `• *Fecha/Hora:* ${formatDateTime()}`,
  ]
    .filter(Boolean)
    .join('\n')

  return sendWhatsAppMessage({
    body: message,
    imageUrl: params.photo_url,
  })
}
