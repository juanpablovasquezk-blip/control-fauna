'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function createUserAction(formData: any) {
  const { email, password, fullName, role } = formData
  
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: role
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
        active: true
      })
    if (profileError) {
      return { success: false, error: profileError.message }
    }
  }

  return { success: true }
}

export async function updateUserAction(formData: any) {
  const { id, fullName, role, active } = formData

  // Update in auth.users metadata
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
    user_metadata: {
      full_name: fullName,
      role: role
    }
  })

  // Update in public.profiles
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      full_name: fullName,
      role: role,
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

export async function createClientAction(clientData: any) {
  const { name, rut, contact_name, contact_email, contact_phone, address, is_contract_client, can_request_service, notification_emails, whatsapp_group_id } = clientData
  
  const { data, error } = await supabaseAdmin
    .from('clients')
    .insert([{
      name,
      rut,
      contact_name,
      contact_email,
      contact_phone,
      address,
      is_contract_client,
      can_request_service,
      notification_emails: notification_emails || [],
      whatsapp_group_id
    }])
    .select()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function updateClientAction(clientData: any) {
  const { id, name, rut, contact_name, contact_email, contact_phone, address, is_contract_client, can_request_service, notification_emails, whatsapp_group_id } = clientData
  
  const { error } = await supabaseAdmin
    .from('clients')
    .update({
      name,
      rut,
      contact_name,
      contact_email,
      contact_phone,
      address,
      is_contract_client,
      can_request_service,
      notification_emails: notification_emails || [],
      whatsapp_group_id
    })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function deleteClientAction(id: string) {
  const { error } = await supabaseAdmin
    .from('clients')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function updateClientServicePriceAction(clientId: string, serviceId: string, price: number) {
  const { error } = await supabaseAdmin
    .from('client_services')
    .upsert({
      client_id: clientId,
      service_id: serviceId,
      price_per_animal: price,
      enabled: true
    }, {
      onConflict: 'client_id,service_id'
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function createAirportZoneAction(name: string) {
  const { data, error } = await supabaseAdmin
    .from('airport_zones')
    .insert([{ name }])
    .select()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function updateAirportZoneAction(id: string, name: string) {
  const { error } = await supabaseAdmin
    .from('airport_zones')
    .update({ name })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function deleteAirportZoneAction(id: string) {
  const { error } = await supabaseAdmin
    .from('airport_zones')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
