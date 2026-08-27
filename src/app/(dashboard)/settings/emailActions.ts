'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { getEmailConfig, sendFenceDamageNotification } from '@/lib/utils/email'

export async function getEmailSettingsAction() {
  try {
    const config = await getEmailConfig()
    return { success: true, config }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Error al obtener configuración de correo',
      config: { enabled: true, cc_emails: ['juanpablo.vasquez@minerquim.cl'] },
    }
  }
}

export async function saveEmailSettingsAction(config: { enabled: boolean; cc_emails: string[] }) {
  try {
    const { error } = await supabaseAdmin.from('system_settings').upsert({
      key: 'email_config',
      value: config,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al guardar configuración de correo' }
  }
}

export async function sendTestEmailAction(toEmail: string) {
  if (!toEmail) {
    return { success: false, error: 'Debe ingresar un correo electrónico para realizar la prueba.' }
  }

  try {
    const result = await sendFenceDamageNotification({
      source: 'round',
      sourceCode: 'PRUEBA - Ronda Perimetral',
      date: new Date().toLocaleDateString('es-CL'),
      operatorName: 'Operador de Prueba',
      zone: 'Sector Carga / Pudahuel',
      specificLocation: 'Reja Perimetral Km 2.5 (Mensaje de Prueba)',
      damageDescription: 'Este es un correo de prueba del módulo de notificaciones de daño en reja de Control Fauna Minerquim.',
      actionTaken: 'Prueba de configuración de correo completada con éxito.',
      wasRepaired: true,
      toEmails: [toEmail.trim()],
    })

    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al enviar correo de prueba' }
  }
}

export async function sendFenceDamageEmailAction(input: Parameters<typeof sendFenceDamageNotification>[0]) {
  return await sendFenceDamageNotification(input)
}
