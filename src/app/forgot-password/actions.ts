'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import nodemailer from 'nodemailer'
import { generatePasswordResetEmailHtml } from '@/lib/utils/emailTemplates'

function createSmtpTransporter() {
  const host = process.env.SMTP_HOST || 'mail.minerquim.cl'
  const port = parseInt(process.env.SMTP_PORT || '465', 10)
  const user = process.env.SMTP_USER || 'no-reply@minerquim.cl'
  const pass = process.env.SMTP_PASS || 'Empresa_1000'

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  })
}

export async function requestPasswordResetAction(email: string, origin: string): Promise<{ success: boolean; message: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      return { success: false, message: 'Por favor, ingresa un correo electrónico válido.' }
    }

    // 1. Buscar usuario en profiles de forma case-insensitive (.ilike)
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, active')
      .ilike('email', cleanEmail)
      .maybeSingle()

    if (profileErr) {
      console.error('Error buscando perfil:', profileErr)
    }

    if (!profile) {
      return {
        success: false,
        message: `El correo "${email}" no se encuentra registrado en el sistema. Verifique la dirección o solicite su registro al administrador.`
      }
    }

    if (!profile.active) {
      return { success: false, message: 'Esta cuenta se encuentra inactiva. Contacte al administrador.' }
    }

    const targetEmail = profile.email || cleanEmail

    // 2. Generar el enlace de recuperación mediante Supabase Admin API
    const redirectUrl = `${origin}/reset-password`
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: targetEmail,
      options: { redirectTo: redirectUrl }
    })

    if (linkErr || !linkData?.properties?.action_link) {
      console.error('Error generando recovery link:', linkErr)
      return { 
        success: false, 
        message: `Error al generar el enlace de recuperación: ${linkErr?.message || 'Token no generado'}` 
      }
    }

    const resetUrl = linkData.properties.action_link

    // 3. Enviar correo corporativo vía SMTP
    const transporter = createSmtpTransporter()
    const fromName = process.env.SMTP_FROM_NAME || 'Control Fauna Minerquim'
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'no-reply@minerquim.cl'
    const htmlContent = generatePasswordResetEmailHtml(resetUrl)

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: targetEmail,
        subject: '🔑 Restablecimiento de Contraseña - Control de Fauna Minerquim',
        html: htmlContent
      })
    } catch (smtpErr: any) {
      console.error('Error enviando correo SMTP:', smtpErr)
      return {
        success: false,
        message: `Error al enviar correo mediante el servidor SMTP: ${smtpErr.message || smtpErr}`
      }
    }

    return {
      success: true,
      message: `Hemos enviado las instrucciones para restablecer tu contraseña al correo ${targetEmail}. Por favor revisa tu bandeja de entrada o carpeta de Spam.`
    }
  } catch (err: any) {
    console.error('requestPasswordResetAction exception:', err)
    return { success: false, message: err.message || 'Error al procesar la solicitud.' }
  }
}
