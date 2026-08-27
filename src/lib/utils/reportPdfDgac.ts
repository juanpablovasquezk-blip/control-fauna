import jsPDF from 'jspdf'
import { DgacReportData, AnimalCardItem } from '@/app/(dashboard)/reports/actions'

/**
 * Loads an image URL and converts it to Base64 string for jsPDF
 */
async function loadImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null
  try {
    const fullUrl = url.startsWith('/') ? window.location.origin + url : url
    const resp = await fetch(fullUrl)
    if (!resp.ok) return null
    const blob = await resp.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    console.warn('Error loading image for PDF:', url, err)
    return null
  }
}

/**
 * Generates the complete DGAC Executive Monthly Report PDF (Parte I: Captura de Animales)
 */
export async function generateDgacAnimalReport(
  data: DgacReportData,
  onProgress?: (msg: string) => void
): Promise<{ pdfDataUrl: string; blob: Blob }> {
  onProgress?.('Cargando recursos e imágenes...')

  // 1. Cargar Logo Oficial de Minerquim
  const logoBase64 = await loadImageAsBase64('/logos/LOGO MINERQUIM.jpg')

  // 2. Pre-cargar fotos de los animales
  const animalPhotoMap: Record<string, string | null> = {}
  const allAnimals = [...data.capturedAnimals, ...data.pendingAnimals]

  for (let i = 0; i < allAnimals.length; i++) {
    const animal = allAnimals[i]
    if (animal.photoUrl) {
      onProgress?.(`Cargando fotografía de animal ${i + 1}/${allAnimals.length}...`)
      const b64 = await loadImageAsBase64(animal.photoUrl)
      animalPhotoMap[animal.id] = b64
    }
  }

  onProgress?.('Generando documento PDF...')

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth() // 210mm
  const pageHeight = doc.internal.pageSize.getHeight() // 297mm

  // Colores corporativos Minerquim
  const colorOrange = [234, 88, 12] as [number, number, number] // #ea580c
  const colorDarkGray = [17, 24, 39] as [number, number, number] // #111827
  const colorLightGray = [243, 244, 246] as [number, number, number] // #f3f4f6
  const colorText = [55, 65, 81] as [number, number, number] // #374151
  const colorMuted = [107, 114, 128] as [number, number, number] // #6b7280

  // =========================================================================
  // PÁGINA 1: PORTADA
  // =========================================================================
  let y = 20

  // Logo en portada (esquina superior izquierda, 2.5cm)
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'JPEG', 15, y, 30, 15)
    } catch (e) {
      console.warn('Could not add logo to cover:', e)
    }
  }

  y += 30

  // Título de Portada
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...colorDarkGray)
  doc.text('SERVICIO DE CONTROL Y MITIGACIÓN', pageWidth / 2, y, { align: 'center' })
  y += 7
  doc.text('DE FAUNA AEROPORTUARIA', pageWidth / 2, y, { align: 'center' })

  y += 12
  doc.setFontSize(12)
  doc.setTextColor(...colorOrange)
  doc.text('INFORME EJECUTIVO MENSUAL DE GESTIÓN', pageWidth / 2, y, { align: 'center' })

  y += 20
  // Recuadro central destacado
  doc.setFillColor(...colorLightGray)
  doc.setDrawColor(...colorOrange)
  doc.setLineWidth(0.8)
  doc.roundedRect(20, y, pageWidth - 40, 65, 4, 4, 'FD')

  let boxY = y + 12
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...colorDarkGray)
  doc.text('Parte I: Captura de Animales', pageWidth / 2, boxY, { align: 'center' })

  boxY += 7
  doc.setFontSize(11)
  doc.setTextColor(...colorMuted)
  doc.text('(Perros, Gatos, Murciélagos)', pageWidth / 2, boxY, { align: 'center' })

  boxY += 12
  doc.setFontSize(12)
  doc.setTextColor(...colorDarkGray)
  doc.text(`PERIODO: ${data.periodLabel.toUpperCase()}`, pageWidth / 2, boxY, { align: 'center' })

  boxY += 8
  doc.setFontSize(11)
  doc.setTextColor(...colorOrange)
  doc.text(`CLIENTE: ${data.clientName}`, pageWidth / 2, boxY, { align: 'center' })

  y += 85

  // Datos resumen de portada
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...colorDarkGray)
  doc.text('RESUMEN DE COBERTURA OPERACIONAL', 20, y)

  y += 5
  doc.setLineWidth(0.3)
  doc.setDrawColor(200, 200, 200)
  doc.line(20, y, pageWidth - 20, y)

  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...colorText)

  const coverInfo = [
    `• Rondas Perimetrales Registradas: ${data.totalRounds}`,
    `• Novedades / Daños en Cerco Reportados: ${data.totalFenceDamages}`,
    `• Activaciones Atendidas: ${data.totalActivations}`,
    `• Animales Capturados en el Periodo: ${data.totalCapturedAnimals}`
  ]

  coverInfo.forEach(info => {
    doc.text(info, 25, y)
    y += 6
  })

  // Pie de Portada
  doc.setFontSize(8)
  doc.setTextColor(...colorMuted)
  doc.text('Unidad de Gestión de Fauna y Tenencia Responsable | Grupo Minerquim', pageWidth / 2, pageHeight - 15, { align: 'center' })
  doc.text('Documento Oficial de Transparencia e Indicadores de Gestión DGAC', pageWidth / 2, pageHeight - 10, { align: 'center' })

  // =========================================================================
  // PÁGINA 2: RESUMEN EJECUTIVO
  // =========================================================================
  doc.addPage()
  y = 35 // Deja espacio para header en loop final

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...colorDarkGray)
  doc.text('1. Resumen Ejecutivo del Periodo', 15, y)
  y += 8

  // 4 Tarjetas KPI (Grid 2x2)
  const cardW = (pageWidth - 40) / 2
  const cardH = 22

  const kpis = [
    { label: 'Rondas Perimetrales', val: `${data.totalRounds}`, sub: `${data.roundsWithIncident} con novedad` },
    { label: 'Daños en Cerco', val: `${data.totalFenceDamages}`, sub: `${data.immediateRepairPercent}% reparados` },
    { label: 'Activaciones Atendidas', val: `${data.totalActivations}`, sub: `${data.positiveActivations.length} con captura` },
    { label: 'Animales Capturados', val: `${data.totalCapturedAnimals}`, sub: 'Perros / Gatos / Murciélagos' }
  ]

  kpis.forEach((kpi, idx) => {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    const kx = 15 + col * (cardW + 10)
    const ky = y + row * (cardH + 5)

    doc.setFillColor(...colorLightGray)
    doc.setDrawColor(229, 231, 235)
    doc.roundedRect(kx, ky, cardW, cardH, 2, 2, 'FD')

    // Borde lateral naranjo
    doc.setFillColor(...colorOrange)
    doc.rect(kx, ky, 3, cardH, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...colorOrange)
    doc.text(kpi.val, kx + 8, ky + 12)

    doc.setFontSize(9)
    doc.setTextColor(...colorDarkGray)
    doc.text(kpi.label, kx + 8, ky + 18)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...colorMuted)
    doc.text(kpi.sub, kx + cardW - 5, ky + 12, { align: 'right' })
  })

  y += (cardH * 2) + 18

  // Desglose por Especie
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...colorDarkGray)
  doc.text('Desglose de Animales Capturados por Especie', 15, y)
  y += 5

  // Tabla Especies
  doc.setFillColor(...colorDarkGray)
  doc.rect(15, y, pageWidth - 30, 7, 'F')

  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('Especie', 20, y + 5)
  doc.text('Cantidad Capturada', pageWidth - 25, y + 5, { align: 'right' })
  y += 7

  doc.setFont('helvetica', 'normal')
  data.speciesBreakdown.forEach((sp, i) => {
    const rowBg = i % 2 === 0 ? [255, 255, 255] : colorLightGray
    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2])
    doc.rect(15, y, pageWidth - 30, 7, 'F')

    doc.setTextColor(...colorText)
    doc.text(sp.species, 20, y + 5)
    doc.setFont('helvetica', 'bold')
    doc.text(`${sp.count}`, pageWidth - 25, y + 5, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += 7
  })

  y += 10

  // Resumen Operativo de Rondas Perimetrales
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...colorDarkGray)
  doc.text('Estado de Rondas Perimetrales', 15, y)
  y += 5

  doc.setFillColor(...colorLightGray)
  doc.roundedRect(15, y, pageWidth - 30, 25, 2, 2, 'F')

  doc.setFontSize(9)
  doc.setTextColor(...colorText)
  doc.text(`• Total de Rondas Efectuadas: ${data.totalRounds}`, 20, y + 7)
  doc.text(`• Rondas Sin Novedad en Reja: ${data.roundsWithoutIncident} (${data.totalRounds > 0 ? Math.round((data.roundsWithoutIncident / data.totalRounds) * 100) : 100}%)`, 20, y + 13)
  doc.text(`• Rondas Con Detección de Daño en Reja: ${data.roundsWithIncident} (${data.totalRounds > 0 ? Math.round((data.roundsWithIncident / data.totalRounds) * 100) : 0}%)`, 20, y + 19)

  y += 35

  // =========================================================================
  // PÁGINA 3: DETALLE DE ACTIVACIONES
  // =========================================================================
  doc.addPage()
  y = 35

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...colorDarkGray)
  doc.text('2. Registro de Activaciones e Intervenciones', 15, y)
  y += 8

  // Sección A: Positivas
  doc.setFontSize(11)
  doc.setTextColor(...colorOrange)
  doc.text('A. Activaciones con Captura de Animales (Resultados Positivos)', 15, y)
  y += 5

  if (data.positiveActivations.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...colorMuted)
    doc.text('No se registraron capturas durante el periodo.', 15, y + 5)
    y += 12
  } else {
    // Encabezado Tabla Positivas
    doc.setFillColor(...colorDarkGray)
    doc.rect(15, y, pageWidth - 30, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)

    doc.text('Fecha / Hora', 18, y + 5)
    doc.text('Código Evento', 45, y + 5)
    doc.text('Resultado', 80, y + 5)
    doc.text('Rep. / Cap.', 120, y + 5)
    doc.text('Zona / Ubicación', 150, y + 5)
    y += 7

    doc.setFont('helvetica', 'normal')
    data.positiveActivations.forEach((act, idx) => {
      if (y > pageHeight - 25) {
        doc.addPage()
        y = 35
      }

      const rowBg = idx % 2 === 0 ? [255, 255, 255] : colorLightGray
      doc.setFillColor(rowBg[0], rowBg[1], rowBg[2])
      doc.rect(15, y, pageWidth - 30, 8, 'F')

      doc.setTextColor(...colorText)
      doc.text(`${act.eventDate} ${act.noticeTime || ''}`, 18, y + 5.5)
      doc.text(act.eventCode, 45, y + 5.5)

      // Badge resultado
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(16, 185, 129) // verde
      doc.text(act.generalResult, 80, y + 5.5)
      doc.setFont('helvetica', 'normal')

      doc.setTextColor(...colorText)
      doc.text(`${act.reportedCount} / ${act.capturedCount}`, 125, y + 5.5)
      doc.text(`${act.airportZone} - ${act.specificLocation.substring(0, 25)}`, 150, y + 5.5)
      y += 8
    })
  }

  y += 10

  // Sección B: Negativas
  if (y > pageHeight - 45) {
    doc.addPage()
    y = 35
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...colorDarkGray)
  doc.text('B. Activaciones Sin Captura (Sin Hallazgo / Abandono)', 15, y)
  y += 5

  if (data.negativeActivations.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...colorMuted)
    doc.text('Sin registros de activaciones infructuosas.', 15, y + 5)
    y += 12
  } else {
    doc.setFillColor(...colorDarkGray)
    doc.rect(15, y, pageWidth - 30, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)

    doc.text('Fecha / Hora', 18, y + 5)
    doc.text('Código Evento', 45, y + 5)
    doc.text('Resultado', 80, y + 5)
    doc.text('Zona / Ubicación', 120, y + 5)
    doc.text('Observaciones', 165, y + 5)
    y += 7

    doc.setFont('helvetica', 'normal')
    data.negativeActivations.forEach((act, idx) => {
      if (y > pageHeight - 25) {
        doc.addPage()
        y = 35
      }

      const rowBg = idx % 2 === 0 ? [255, 255, 255] : colorLightGray
      doc.setFillColor(rowBg[0], rowBg[1], rowBg[2])
      doc.rect(15, y, pageWidth - 30, 8, 'F')

      doc.setTextColor(...colorText)
      doc.text(`${act.eventDate} ${act.noticeTime || ''}`, 18, y + 5.5)
      doc.text(act.eventCode, 45, y + 5.5)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(239, 68, 68) // rojo
      doc.text(act.generalResult, 80, y + 5.5)
      doc.setFont('helvetica', 'normal')

      doc.setTextColor(...colorText)
      doc.text(`${act.airportZone}`, 120, y + 5.5)
      doc.text((act.observations || 'Sin obs.').substring(0, 25), 165, y + 5.5)
      y += 8
    })
  }

  // =========================================================================
  // PÁGINA 4+: FICHAS DE ANIMALES CAPTURADOS
  // =========================================================================
  doc.addPage()
  y = 35

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...colorDarkGray)
  doc.text('3. Fichas Individuales de Animales Capturados', 15, y)
  y += 8

  const renderAnimalCard = (animal: AnimalCardItem) => {
    const cardH = 50
    if (y + cardH > pageHeight - 20) {
      doc.addPage()
      y = 35
    }

    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(209, 213, 219)
    doc.roundedRect(15, y, pageWidth - 30, cardH, 3, 3, 'FD')

    // Borde izquierdo naranjo
    doc.setFillColor(...colorOrange)
    doc.rect(15, y, 3, cardH, 'F')

    // Foto / Placeholder (30x35 mm)
    const px = 22
    const py = y + 7.5
    const pw = 30
    const ph = 35

    const b64 = animalPhotoMap[animal.id]
    if (b64) {
      try {
        doc.addImage(b64, 'JPEG', px, py, pw, ph)
      } catch (e) {
        drawPlaceholder(doc, px, py, pw, ph)
      }
    } else {
      drawPlaceholder(doc, px, py, pw, ph)
    }

    // Datos del Animal (Columna 2)
    const cx = 58
    let cy = y + 8

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...colorDarkGray)
    doc.text(`${animal.species.toUpperCase()} - ${animal.eventCode}`, cx, cy)

    if (animal.isPendingFromPreviousMonth) {
      doc.setFontSize(8)
      doc.setTextColor(...colorOrange)
      doc.text('(Proceso completado este mes)', cx + 65, cy)
    }

    cy += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...colorText)

    doc.text(`• Sexo: ${animal.sex || 'Indefinido'} | Tamaño: ${animal.size || 'N/I'} | Edad: ${animal.apparentAge || 'N/I'}`, cx, cy)
    cy += 4.5
    doc.text(`• Color / Señas: ${animal.colorFeatures || 'Sin señas específicas'}`, cx, cy)
    cy += 4.5
    doc.text(`• Captura: ${animal.captureDate} | Ubicación: ${animal.location}`, cx, cy)
    cy += 4.5

    doc.setFont('helvetica', 'bold')
    doc.text(`• Estado Actual: ${animal.animalStatus}`, cx, cy)
    doc.setFont('helvetica', 'normal')

    if (animal.microchipNumber) {
      doc.text(` | N° Microchip: ${animal.microchipNumber}`, cx + 45, cy)
    }

    cy += 5.5
    // Datos Adoptante / Receptor
    if (animal.adopterName) {
      doc.setFillColor(...colorLightGray)
      doc.roundedRect(cx - 2, cy - 3, pageWidth - cx - 18, 14, 1, 1, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...colorOrange)
      doc.text('DATOS DE ADOPCIÓN:', cx, cy + 1)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...colorText)
      doc.text(`Adoptante: ${animal.adopterName} (${animal.adopterRut || 'RUT N/I'})`, cx + 32, cy + 1)
      doc.text(`Tel: ${animal.adopterPhone || 'S/I'} | Dirección: ${animal.adopterAddress || 'S/I'}`, cx, cy + 6)
    } else if (animal.receiverName) {
      doc.setFillColor(...colorLightGray)
      doc.roundedRect(cx - 2, cy - 3, pageWidth - cx - 18, 14, 1, 1, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...colorDarkGray)
      doc.text('ACTA DE ENTREGA:', cx, cy + 1)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...colorText)
      doc.text(`Receptor: ${animal.receiverName} (${animal.receiverRut || ''}) | Acta: ${animal.actNumber || ''}`, cx + 30, cy + 1)
    }

    y += cardH + 6
  }

  if (data.capturedAnimals.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...colorMuted)
    doc.text('No se registraron fichas de animales en este periodo.', 15, y + 5)
    y += 15
  } else {
    data.capturedAnimals.forEach(renderAnimalCard)
  }

  // Animales pendientes de meses anteriores
  if (data.pendingAnimals.length > 0) {
    if (y > pageHeight - 40) {
      doc.addPage()
      y = 35
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...colorOrange)
    doc.text('📋 Animales de Periodos Anteriores - Proceso Completado en este Mes', 15, y)
    y += 8

    data.pendingAnimals.forEach(renderAnimalCard)
  }

  // =========================================================================
  // ÚLTIMA PÁGINA: KPIS Y RANKINGS DE ZONAS
  // =========================================================================
  doc.addPage()
  y = 35

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...colorDarkGray)
  doc.text('4. Indicadores de Gestión y Análisis Geográfico (KPIs)', 15, y)
  y += 8

  // Tabla Indicadores de Gestión
  doc.setFontSize(11)
  doc.setTextColor(...colorOrange)
  doc.text('A. Cumplimiento de Indicadores Operacionales', 15, y)
  y += 5

  doc.setFillColor(...colorDarkGray)
  doc.rect(15, y, pageWidth - 30, 7, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text('Indicador de Gestión', 20, y + 5)
  doc.text('Resultado Periodo', 120, y + 5)
  doc.text('Meta Estándar', pageWidth - 25, y + 5, { align: 'right' })
  y += 7

  const kpiTable = [
    { name: 'Tiempo Promedio de Respuesta en Terreno', val: data.avgResponseTimeMinutes !== null ? `${data.avgResponseTimeMinutes} min` : 'N/A', meta: '< 20 min' },
    { name: 'Tiempo Promedio de Permanencia en Canil', val: data.avgKennelStayHours !== null ? `${data.avgKennelStayHours} hrs` : 'N/A', meta: '< 24 hrs' },
    { name: '% Cumplimiento Emitido de Actas de Entrega', val: `${data.actaCompletionPercent}%`, meta: '100%' },
    { name: '% Reparación Inmediata de Daño en Cerco', val: `${data.immediateRepairPercent}%`, meta: '100%' }
  ]

  doc.setFont('helvetica', 'normal')
  kpiTable.forEach((row, i) => {
    const rowBg = i % 2 === 0 ? [255, 255, 255] : colorLightGray
    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2])
    doc.rect(15, y, pageWidth - 30, 7.5, 'F')

    doc.setTextColor(...colorText)
    doc.text(row.name, 20, y + 5)
    doc.setFont('helvetica', 'bold')
    doc.text(row.val, 120, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.text(row.meta, pageWidth - 25, y + 5, { align: 'right' })
    y += 7.5
  })

  y += 12

  // Ranking Zonas Avistamiento
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...colorDarkGray)
  doc.text('B. Zonas con Mayor Avistamiento e Intervención de Fauna', 15, y)
  y += 5

  if (data.topZonesByActivation.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...colorMuted)
    doc.text('Sin datos registrados.', 15, y + 5)
    y += 12
  } else {
    doc.setFillColor(...colorDarkGray)
    doc.rect(15, y, pageWidth - 30, 7, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text('Zona Aeroportuaria', 20, y + 5)
    doc.text('Cantidad Activaciones', 120, y + 5)
    doc.text('Animales Capturados', pageWidth - 25, y + 5, { align: 'right' })
    y += 7

    doc.setFont('helvetica', 'normal')
    data.topZonesByActivation.slice(0, 5).forEach((z, i) => {
      const rowBg = i % 2 === 0 ? [255, 255, 255] : colorLightGray
      doc.setFillColor(rowBg[0], rowBg[1], rowBg[2])
      doc.rect(15, y, pageWidth - 30, 7, 'F')

      doc.setTextColor(...colorText)
      doc.text(z.zone, 20, y + 5)
      doc.text(`${z.count}`, 120, y + 5)
      doc.setFont('helvetica', 'bold')
      doc.text(`${z.capturedCount || 0}`, pageWidth - 25, y + 5, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      y += 7
    })
  }

  y += 12

  // Ranking Zonas Daño Cerco
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...colorDarkGray)
  doc.text('C. Zonas Críticas por Novedad / Daño en Cerco Perimetral', 15, y)
  y += 5

  if (data.topZonesByDamage.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...colorMuted)
    doc.text('No se registraron daños en cerco perimetral en este periodo.', 15, y + 5)
    y += 12
  } else {
    doc.setFillColor(...colorDarkGray)
    doc.rect(15, y, pageWidth - 30, 7, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text('Zona / Sector Cerco', 20, y + 5)
    doc.text('Incidentes Registrados', 120, y + 5)
    doc.text('Reparados', pageWidth - 25, y + 5, { align: 'right' })
    y += 7

    doc.setFont('helvetica', 'normal')
    data.topZonesByDamage.slice(0, 5).forEach((z, i) => {
      const rowBg = i % 2 === 0 ? [255, 255, 255] : colorLightGray
      doc.setFillColor(rowBg[0], rowBg[1], rowBg[2])
      doc.rect(15, y, pageWidth - 30, 7, 'F')

      doc.setTextColor(...colorText)
      doc.text(z.zone, 20, y + 5)
      doc.text(`${z.count}`, 120, y + 5)
      doc.setFont('helvetica', 'bold')
      doc.text(`${z.repairedCount || 0}`, pageWidth - 25, y + 5, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      y += 7
    })
  }

  // =========================================================================
  // LOOP FINAL: DIBUJAR ENCABEZADOS Y PIES DE PÁGINA EN PÁGINAS 2..N
  // =========================================================================
  const totalPages = doc.getNumberOfPages()

  for (let page = 2; page <= totalPages; page++) {
    doc.setPage(page)

    // Header (Top bar)
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, pageWidth, 25, 'F')

    // Logo Minerquim en Header (2.2cm)
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'JPEG', 15, 6, 22, 11)
      } catch (e) {}
    }

    // Título de Encabezado Derecho
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...colorDarkGray)
    doc.text(`Reporte Captura Animales Mes ${data.headerPeriodLabel}`, pageWidth - 15, 12, { align: 'right' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...colorMuted)
    doc.text('Control de Fauna Aeroportuaria | DGAC', pageWidth - 15, 17, { align: 'right' })

    // Línea separadora naranjo
    doc.setLineWidth(0.6)
    doc.setDrawColor(...colorOrange)
    doc.line(15, 22, pageWidth - 15, 22)

    // Footer (Bottom bar)
    doc.setLineWidth(0.3)
    doc.setDrawColor(229, 231, 235)
    doc.line(15, pageHeight - 12, pageWidth - 15, pageHeight - 12)

    doc.setFontSize(8)
    doc.setTextColor(...colorMuted)
    doc.text('Grupo Minerquim | Servicio de Control de Fauna Aeroportuaria', 15, pageHeight - 7)
    doc.text(`Página ${page} de ${totalPages}`, pageWidth - 15, pageHeight - 7, { align: 'right' })
  }

  const pdfDataUrl = doc.output('dataurlstring')
  const blob = doc.output('blob')

  return { pdfDataUrl, blob }
}

function drawPlaceholder(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setFillColor(243, 244, 246)
  doc.setDrawColor(209, 213, 219)
  doc.roundedRect(x, y, w, h, 1, 1, 'FD')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(156, 163, 175)
  doc.text('Sin imagen', x + w / 2, y + h / 2 - 1, { align: 'center' })
  doc.text('disponible', x + w / 2, y + h / 2 + 3, { align: 'center' })
}
