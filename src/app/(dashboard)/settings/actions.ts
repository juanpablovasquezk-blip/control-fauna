'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function createUserAction(formData: any) {
  const { email, password, fullName, role, rut } = formData
  
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: role,
      rut: rut
    }
  })

  if (error) {
    return { success: false, error: error.message }
  }

  if (data?.user) {
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: data.user.id,
        email: email,
        full_name: fullName,
        role: role,
        rut: rut || '',
        active: true
      })
    if (profileError) {
      return { success: false, error: profileError.message }
    }
  }

  return { success: true }
}

export async function updateUserAction(formData: any) {
  const { id, fullName, role, active, rut } = formData

  // Update in auth.users metadata
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
    user_metadata: {
      full_name: fullName,
      role: role,
      rut: rut
    }
  })

  // Update in public.profiles
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      full_name: fullName,
      role: role,
      rut: rut || '',
      active: active
    })
    .eq('id', id)

  if (profileError) {
    return { success: false, error: profileError.message }
  }

  return { success: true }
}

export async function deleteUserAction(id: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

export async function createClientAction(formData: any) {
  const { name, rut, contact_name, contact_email, contact_phone, address, is_contract, can_request_services, notification_emails, whatsapp_group_id } = formData
  
  const { data, error } = await supabaseAdmin
    .from('clients')
    .insert([{
      name,
      rut,
      contact_name,
      contact_email,
      contact_phone,
      address,
      is_contract,
      can_request_services,
      notification_emails: notification_emails ? notification_emails.split(',').map((e: string) => e.trim()) : [],
      whatsapp_group_id
    }])
    .select()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function updateClientAction(id: string, formData: any) {
  const { name, rut, contact_name, contact_email, contact_phone, address, is_contract, can_request_services, notification_emails, whatsapp_group_id } = formData
  
  const { error } = await supabaseAdmin
    .from('clients')
    .update({
      name,
      rut,
      contact_name,
      contact_email,
      contact_phone,
      address,
      is_contract,
      can_request_services,
      notification_emails: notification_emails ? notification_emails.split(',').map((e: string) => e.trim()) : [],
      whatsapp_group_id
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function deleteClientAction(id: string) {
  const { error } = await supabaseAdmin.from('clients').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateClientServicePriceAction(clientId: string, serviceId: string, customPrice: number, priceUnit: string = 'CLP') {
  const { data: existing } = await supabaseAdmin
    .from('client_services')
    .select('id')
    .eq('client_id', clientId)
    .eq('service_id', serviceId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabaseAdmin
      .from('client_services')
      .update({ custom_price: customPrice, price_unit: priceUnit })
      .eq('id', existing.id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabaseAdmin
      .from('client_services')
      .insert([{
        client_id: clientId,
        service_id: serviceId,
        custom_price: customPrice,
        price_unit: priceUnit
      }])
    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getUFValueAction(dateStr?: string) {
  try {
    const fallbackUf = 37700
    const response = await fetch('https://mindicador.cl/api/uf', { next: { revalidate: 3600 } })
    if (response.ok) {
      const data = await response.json()
      const ufValue = data.serie && data.serie.length > 0 ? data.serie[0].valor : data.valor
      if (ufValue) return { success: true, uf: ufValue, fallbackUf }
    }
    return { success: true, uf: fallbackUf, fallbackUf }
  } catch (err) {
    return { success: true, uf: 37700, fallbackUf: 37700 }
  }
}

export async function createAirportZoneAction(name: string) {
  const { error } = await supabaseAdmin.from('airport_zones').insert([{ name }])
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateAirportZoneAction(id: string, name: string) {
  const { error } = await supabaseAdmin.from('airport_zones').update({ name }).eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function deleteAirportZoneAction(id: string) {
  const { error } = await supabaseAdmin.from('airport_zones').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getWhatsAppSettingsAction() {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'ultramsg_config')
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.warn('getWhatsAppSettingsAction error:', error)
    }

    if (data?.value) {
      return { success: true, config: data.value }
    }
  } catch (err: any) {
    console.warn('getWhatsAppSettingsAction catch:', err)
  }

  return {
    success: true,
    config: {
      enabled: true,
      instance_id: '',
      token: '',
      default_group_id: '',
    },
  }
}

export async function saveWhatsAppSettingsAction(config: {
  enabled: boolean
  instance_id: string
  token: string
  default_group_id: string
}) {
  try {
    const { error } = await supabaseAdmin.from('system_settings').upsert({
      key: 'ultramsg_config',
      value: config,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      if (error.message?.includes('system_settings') || error.code === '42P01' || error.message?.includes('schema cache')) {
        return {
          success: false,
          error: 'Falta crear la tabla system_settings en Supabase. Ejecute el script SQL provisto en el Editor SQL de Supabase.',
        }
      }
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error guardando configuración de WhatsApp' }
  }
}

export async function sendTestWhatsAppAction(params: {
  instance_id: string
  token: string
  to: string
}) {
  const { instance_id, token, to } = params
  if (!instance_id || !token || !to) {
    return { success: false, error: 'Debe ingresar Instance ID, Token y Grupo/Número de destino.' }
  }

  try {
    const endpoint = `https://api.ultramsg.com/${instance_id}/messages/chat`
    const body = `🧪 *MENSAJE DE PRUEBA CONTROL DE FAUNA*\nLas notificaciones automáticas por WhatsApp se han configurado correctamente.`
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token, to: to.trim(), body }).toString(),
    })

    const data = await response.json()
    if (data && (data.sent === 'true' || data.sent === true || data.id)) {
      return { success: true }
    } else {
      return { success: false, error: data?.error || JSON.stringify(data) }
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de conexión' }
  }
}
