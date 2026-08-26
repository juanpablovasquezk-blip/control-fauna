import { createClient } from '@/lib/supabase/client'

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
      // Silent no-op when no recipient is configured
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
  notice_time?: string
  client_group_id?: string
}) {
  const message = [
    `🚨 *ALERTA DE ACTIVACIÓN DE FAUNA*`,
    `• *Código:* ${params.event_code}`,
    `• *Cliente:* ${params.client_name}`,
    params.requested_by ? `• *Solicita:* ${params.requested_by}` : null,
    `• *Zona:* ${params.airport_zone}`,
    params.specific_location ? `• *Lugar Específico:* ${params.specific_location}` : null,
    `• *Aviso:* Divisado(s) ${params.reported_count} ${params.reported_species}(s)`,
    params.situation_description ? `• *Detalle:* ${params.situation_description}` : null,
    params.operator_name ? `• *Operador en Terreno:* ${params.operator_name}` : null,
    `• *Fecha/Hora:* ${new Date().toLocaleDateString('es-CL')} ${params.notice_time || ''}`,
  ]
    .filter(Boolean)
    .join('\n')

  return sendWhatsAppMessage({
    to: params.client_group_id,
    body: message,
  })
}

export async function sendFenceDamageWhatsAppAlert(params: {
  event_code: string
  damage_location: string
  damage_description: string
  damage_photo_url?: string
  client_group_id?: string
}) {
  const message = [
    `⚠️ *REPORTE DE DAÑO EN REJA PERIMETRAL*`,
    `• *Procedimiento:* ${params.event_code}`,
    `• *Ubicación del Daño:* ${params.damage_location}`,
    `• *Detalle:* ${params.damage_description}`,
    `• *Estado:* Reparado en terreno`,
  ].join('\n')

  return sendWhatsAppMessage({
    to: params.client_group_id,
    body: message,
    imageUrl: params.damage_photo_url,
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
  client_group_id?: string
}) {
  const message = [
    `🔄 *RECEPCIÓN EXTERNA DE CAN*`,
    `• *Registro:* ${params.event_code}`,
    params.handover_entity ? `• *Entregado por:* ${params.handover_entity} (${params.handover_person_name || 'N/I'})` : null,
    `• *Especie / Sexo:* ${params.species} - ${params.sex}`,
    `• *Edad Aparente:* ${params.apparent_age}`,
    params.color_features ? `• *Características:* ${params.color_features}` : null,
    params.operator_name ? `• *Recibe:* ${params.operator_name}` : null,
    `• *Fecha:* ${new Date().toLocaleDateString('es-CL')}`,
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
  const message = [
    `📄 *ENTREGA / SALIDA DE CANIL*`,
    `• *Acta de Entrega N°:* ${params.act_number}`,
    `• *Cliente:* ${params.client_name}`,
    `• *Can Entregado:* ${params.species} ${params.sex} (${params.color_features || 'Sin señas'})`,
    `• *Receptor:* ${params.receiver_name} (${params.receiver_rut})`,
    params.delivering_user_name ? `• *Entregado por:* ${params.delivering_user_name}` : null,
    `• *Fecha/Hora:* ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`,
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
  const message = [
    `🚗 *RONDA PERIMETRAL REGISTRADA*`,
    params.round_code ? `• *Código:* ${params.round_code}` : null,
    `• *Operador:* ${params.operator_name}`,
    `• *Zona:* ${params.airport_zone}`,
    `• *Estado:* ${params.status}`,
    params.observations ? `• *Novedades:* ${params.observations}` : null,
    `• *Hora:* ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`,
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
  const message = [
    `🦴 *ALIMENTACIÓN / LIMPIEZA DE CANIL*`,
    `• *Tipo:* ${params.cleaning_type}`,
    `• *Responsable:* ${params.operator_name}`,
    `• *Canes Atendidos:* ${params.animal_count} canes`,
    params.observations ? `• *Observaciones:* ${params.observations}` : null,
    `• *Fecha/Hora:* ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`,
  ]
    .filter(Boolean)
    .join('\n')

  return sendWhatsAppMessage({
    body: message,
    imageUrl: params.photo_url,
  })
}
