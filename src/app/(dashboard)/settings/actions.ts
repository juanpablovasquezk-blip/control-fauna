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
