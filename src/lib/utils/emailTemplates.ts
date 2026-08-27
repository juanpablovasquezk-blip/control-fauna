export interface FenceDamageEmailParams {
  source: 'round' | 'event'
  sourceCode: string // e.g. "Ronda Perimetral" or "FAU-20260827-0001"
  date: string
  operatorName: string
  zone: string
  specificLocation?: string
  damageDescription: string
  hasDamagePhotos: boolean
  damagePhotoCids: string[]
  actionTaken: string
  wasRepaired: boolean
  hasRepairPhotos: boolean
  repairPhotoCids: string[]
}

export function generateFenceDamageEmailHtml(params: FenceDamageEmailParams): string {
  const {
    sourceCode,
    date,
    operatorName,
    zone,
    specificLocation,
    damageDescription,
    damagePhotoCids,
    actionTaken,
    wasRepaired,
    repairPhotoCids,
  } = params

  const damageImagesHtml = damagePhotoCids
    .map(
      (cid, i) => `
      <div style="margin-top: 10px; text-align: center;">
        <img src="cid:${cid}" alt="Foto Daño ${i + 1}" style="max-width: 100%; max-height: 400px; border-radius: 8px; border: 1px solid #e5e7eb; display: block; margin: 0 auto;" />
        <span style="font-size: 11px; color: #6b7280; display: block; margin-top: 4px;">Foto Daño Reja #${i + 1}</span>
      </div>`
    )
    .join('')

  const repairImagesHtml = repairPhotoCids
    .map(
      (cid, i) => `
      <div style="margin-top: 10px; text-align: center;">
        <img src="cid:${cid}" alt="Foto Reparación ${i + 1}" style="max-width: 100%; max-height: 400px; border-radius: 8px; border: 1px solid #e5e7eb; display: block; margin: 0 auto;" />
        <span style="font-size: 11px; color: #6b7280; display: block; margin-top: 4px;">Foto Reparación / Mitigación #${i + 1}</span>
      </div>`
    )
    .join('')

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Daño en Reja Perimetral</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; color: #1f2937;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
    
    <!-- HEADER -->
    <div style="background-color: #dc2626; color: #ffffff; padding: 20px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
        ⚠️ Reporte de Daño en Reja Perimetral
      </h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">
        ${sourceCode} — ${date}
      </p>
    </div>

    <!-- CONTENT -->
    <div style="padding: 24px;">
      
      <!-- GENERAL INFO TABLE -->
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; border: 1px solid #f3f4f6; margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px;">
          📋 Datos del Incidente
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 4px 0; font-weight: 600; color: #4b5563; width: 35%;">Origen:</td>
            <td style="padding: 4px 0; color: #111827;">${sourceCode}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 600; color: #4b5563;">Fecha:</td>
            <td style="padding: 4px 0; color: #111827;">${date}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 600; color: #4b5563;">Operador:</td>
            <td style="padding: 4px 0; color: #111827;">${operatorName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 600; color: #4b5563;">Zona Aeroportuaria:</td>
            <td style="padding: 4px 0; color: #111827;">${zone}</td>
          </tr>
          ${
            specificLocation
              ? `
          <tr>
            <td style="padding: 4px 0; font-weight: 600; color: #4b5563;">Ubicación Exacta:</td>
            <td style="padding: 4px 0; color: #111827; font-weight: 600; color: #dc2626;">${specificLocation}</td>
          </tr>`
              : ''
          }
        </table>
      </div>

      <!-- DAMAGE SECTION -->
      <div style="margin-bottom: 20px; border-left: 4px solid #dc2626; padding-left: 14px;">
        <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #991b1b;">
          🔴 Descripción del Daño Encontrado
        </h3>
        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #1f2937; background-color: #fef2f2; padding: 10px 12px; border-radius: 6px;">
          ${damageDescription || 'Sin descripción ingresada.'}
        </p>
        ${damageImagesHtml}
      </div>

      <!-- MITIGATION / REPAIR SECTION -->
      <div style="margin-bottom: 20px; border-left: 4px solid ${wasRepaired ? '#16a34a' : '#ca8a04'}; padding-left: 14px;">
        <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: ${wasRepaired ? '#166534' : '#854d0e'}; flex-items: center;">
          ${wasRepaired ? '🟢 Acción de Mitigación / Reparación' : '🟡 Acciones Tomadas (Pendiente Reparación)'}
        </h3>
        <div style="margin-bottom: 8px;">
          <span style="display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; background-color: ${wasRepaired ? '#dcfce7' : '#fef9c3'}; color: ${wasRepaired ? '#15803d' : '#a16207'};">
            ${wasRepaired ? '✅ Reparado' : '⚠️ Pendiente de reparación definitiva'}
          </span>
        </div>
        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #1f2937; background-color: #f9fafb; padding: 10px 12px; border-radius: 6px;">
          ${actionTaken || 'Sin acción/reparación registrada.'}
        </p>
        ${repairImagesHtml}
      </div>

    </div>

    <!-- FOOTER -->
    <div style="background-color: #1f2937; color: #9ca3af; padding: 16px 24px; text-align: center; font-size: 12px; border-top: 1px solid #374151;">
      <p style="margin: 0; font-weight: 600; color: #e5e7eb;">Control Fauna Minerquim</p>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #6b7280;">Este es un mensaje automático generado por el Sistema de Control de Fauna Aeroportuario.</p>
    </div>

  </div>
</body>
</html>
  `.trim()
}

export function generatePasswordResetEmailHtml(resetUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecimiento de Contraseña - Control de Fauna</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; color: #1f2937;">
  <div style="max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
    
    <!-- HEADER -->
    <div style="background-color: #ea580c; color: #ffffff; padding: 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 0.5px;">
        CONTROL DE FAUNA AEROPORTUARIO
      </h1>
      <p style="margin: 6px 0 0 0; font-size: 12px; opacity: 0.9; font-weight: 500;">
        Plataforma Operacional • Grupo Minerquim
      </p>
    </div>

    <!-- CONTENT -->
    <div style="padding: 28px 24px; text-align: center;">
      <h2 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #111827;">
        🔑 Restablecimiento de Contraseña
      </h2>

      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #4b5563;">
        Hemos recibido una solicitud para cambiar la contraseña de tu cuenta registrada en el sistema. Haz clic en el botón a continuación para ingresar tu nueva contraseña:
      </p>

      <div style="margin: 24px 0;">
        <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #ea580c; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(234, 88, 12, 0.3);">
          Restablecer Mi Contraseña
        </a>
      </div>

      <p style="margin: 20px 0 0 0; font-size: 12px; color: #6b7280; line-height: 1.4;">
        Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:<br>
        <a href="${resetUrl}" style="color: #ea580c; word-break: break-all;">${resetUrl}</a>
      </p>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f3f4f6; text-align: left;">
        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
          • Este enlace es de uso único y vencerá automáticamente por seguridad.<br>
          • Si no solicitaste este cambio, no te preocupes; tu cuenta y contraseña actual se mantendrán seguras.
        </p>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="background-color: #111827; color: #9ca3af; padding: 16px 24px; text-align: center; font-size: 11px; border-top: 1px solid #1f2937;">
      <p style="margin: 0; font-weight: 600; color: #e5e7eb;">Control Fauna Minerquim</p>
      <p style="margin: 4px 0 0 0; color: #6b7280;">Comercializadora y Servicios de Ingeniería Minerquim</p>
    </div>

  </div>
</body>
</html>
  `.trim()
}

