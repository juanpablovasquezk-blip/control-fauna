import nodemailer from 'nodemailer'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateFenceDamageEmailHtml } from './emailTemplates'

export interface FenceDamageEmailInput {
  source: 'round' | 'event'
  sourceCode: string // e.g. "Ronda Perimetral" or "FAU-20260827-0001"
  date: string
  operatorName: string
  zone: string
  specificLocation?: string
  damageDescription: string
  damagePhotoUrls?: string[]
  actionTaken: string
  wasRepaired: boolean
  repairPhotoUrls?: string[]
  toEmails?: string[] // If provided, overrides client lookup
}

export async function getEmailConfig(): Promise<{ enabled: boolean; cc_emails: string[] }> {
  try {
    const { data } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'email_config')
      .maybeSingle()

    if (data?.value) {
      return {
        enabled: data.value.enabled ?? true,
        cc_emails: Array.isArray(data.value.cc_emails) ? (data.value.cc_emails as string[]) : ['juanpablo.vasquez@minerquim.cl'],
      }
    }
  } catch (err) {
    console.warn('getEmailConfig catch:', err)
  }

  return {
    enabled: true,
    cc_emails: ['juanpablo.vasquez@minerquim.cl'],
  }
}

function createSmtpTransporter() {
  const host = (process.env.SMTP_HOST || 'mail.minerquim.cl').trim()
  const port = parseInt(process.env.SMTP_PORT || '465', 10)
  const user = (process.env.SMTP_USER || 'no-reply@minerquim.cl').trim()
  const pass = (process.env.SMTP_PASS || 'Empresa_1000').trim()

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
    authMethod: 'PLAIN',
    tls: {
      rejectUnauthorized: false, // Prevents self-signed cert errors
    },
  })
}

async function urlOrBase64ToBuffer(urlOrBase64: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    if (urlOrBase64.startsWith('data:image/')) {
      const parts = urlOrBase64.split(',')
      const mimeMatch = parts[0].match(/:(.*?);/)
      const contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
      const base64Data = parts[1]
      return { buffer: Buffer.from(base64Data, 'base64'), contentType }
    }

    if (urlOrBase64.startsWith('http://') || urlOrBase64.startsWith('https://')) {
      const res = await fetch(urlOrBase64)
      if (!res.ok) return null
      const arrayBuffer = await res.arrayBuffer()
      const contentType = res.headers.get('content-type') || 'image/jpeg'
      return { buffer: Buffer.from(arrayBuffer), contentType }
    }
  } catch (err) {
    console.error('Error fetching image for email attachment:', err)
  }
  return null
}

export async function sendFenceDamageNotification(input: FenceDamageEmailInput): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getEmailConfig()
    if (!config.enabled) {
      console.log('Email notifications are disabled in settings.')
      return { success: true }
    }

    // Determine TO recipient emails (DGAC notification emails)
    let toEmails: string[] = input.toEmails || []
    if (toEmails.length === 0) {
      const { data: dgacClient } = await supabaseAdmin
        .from('clients')
        .select('notification_emails')
        .eq('is_contract_client', true)
        .maybeSingle()

      if (dgacClient?.notification_emails && dgacClient.notification_emails.length > 0) {
        toEmails = dgacClient.notification_emails
      }
    }

    // Fallback if no DGAC email configured: use CC email as TO to prevent failure
    const ccEmails = config.cc_emails.filter((email) => email.trim().length > 0)
    if (toEmails.length === 0 && ccEmails.length > 0) {
      toEmails = [ccEmails[0]]
    }

    if (toEmails.length === 0) {
      return { success: false, error: 'No hay correos de notificación configurados para DGAC ni correos en CC.' }
    }

    const attachments: Array<{ filename: string; content: Buffer; cid: string; contentType: string }> = []
    const damageCids: string[] = []
    const repairCids: string[] = []

    // Process damage photos
    const damagePhotos = input.damagePhotoUrls || []
    for (let i = 0; i < damagePhotos.length; i++) {
      const photo = damagePhotos[i]
      if (!photo) continue
      const downloaded = await urlOrBase64ToBuffer(photo)
      if (downloaded) {
        const cid = `damage_photo_${i + 1}_${Date.now()}`
        damageCids.push(cid)
        attachments.push({
          filename: `dano_reja_${i + 1}.jpg`,
          content: downloaded.buffer,
          cid,
          contentType: downloaded.contentType,
        })
      }
    }

    // Process repair photos
    const repairPhotos = input.repairPhotoUrls || []
    for (let i = 0; i < repairPhotos.length; i++) {
      const photo = repairPhotos[i]
      if (!photo) continue
      const downloaded = await urlOrBase64ToBuffer(photo)
      if (downloaded) {
        const cid = `repair_photo_${i + 1}_${Date.now()}`
        repairCids.push(cid)
        attachments.push({
          filename: `reparacion_reja_${i + 1}.jpg`,
          content: downloaded.buffer,
          cid,
          contentType: downloaded.contentType,
        })
      }
    }

    const htmlContent = generateFenceDamageEmailHtml({
      source: input.source,
      sourceCode: input.sourceCode,
      date: input.date,
      operatorName: input.operatorName,
      zone: input.zone,
      specificLocation: input.specificLocation,
      damageDescription: input.damageDescription,
      hasDamagePhotos: damageCids.length > 0,
      damagePhotoCids: damageCids,
      actionTaken: input.actionTaken,
      wasRepaired: input.wasRepaired,
      hasRepairPhotos: repairCids.length > 0,
      repairPhotoCids: repairCids,
    })

    const transporter = createSmtpTransporter()
    const fromName = process.env.SMTP_FROM_NAME || 'Control Fauna Minerquim'
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'no-reply@minerquim.cl'

    const subject = `⚠️ Reporte Daño en Reja Perimetral - ${input.zone} (${input.sourceCode})`

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmails.join(', '),
      cc: ccEmails.join(', '),
      subject,
      html: htmlContent,
      attachments,
    })

    console.log('Fence damage email sent successfully:', info.messageId)
    return { success: true }
  } catch (err: any) {
    console.error('Error sending fence damage email:', err)
    return { success: false, error: err?.message || 'Error al enviar correo electrónico' }
  }
}
