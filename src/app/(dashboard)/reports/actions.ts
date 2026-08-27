'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export interface DgacReportFilter {
  clientId: string
  dateMode: 'month' | 'range'
  month?: number // 1-12
  year?: number // e.g. 2026
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
}

export interface ActivationItem {
  id: string
  eventCode: string
  eventDate: string
  noticeTime: string | null
  closureType: string | null
  generalResult: string
  reportedCount: number
  capturedCount: number
  reportedSpecies: string
  airportZone: string
  specificLocation: string
  observations: string | null
}

export interface AnimalCardItem {
  id: string
  eventId: string
  eventCode: string
  captureDate: string
  species: string
  sex: string
  size: string | null
  colorFeatures: string | null
  apparentAge: string | null
  method: string | null
  photoUrl: string | null
  animalStatus: string
  microchipNumber: string | null
  location: string
  exitDate: string | null
  adopterName: string | null
  adopterRut: string | null
  adopterPhone: string | null
  adopterAddress: string | null
  receiverName: string | null
  receiverRut: string | null
  actNumber: string | null
  isPendingFromPreviousMonth?: boolean
}

export interface ZoneRankingItem {
  zone: string
  count: number
  capturedCount?: number
  repairedCount?: number
}

export interface DgacReportData {
  periodLabel: string
  headerPeriodLabel: string
  clientName: string
  clientId: string
  startDateStr: string
  endDateStr: string

  // KPIs
  totalRounds: number
  roundsWithIncident: number
  roundsWithoutIncident: number
  totalFenceDamages: number
  totalActivations: number
  totalCapturedAnimals: number

  // Especies
  speciesBreakdown: { species: string; count: number }[]

  // Activaciones
  positiveActivations: ActivationItem[]
  negativeActivations: ActivationItem[]

  // Animales
  capturedAnimals: AnimalCardItem[]
  pendingAnimals: AnimalCardItem[]

  // KPIs adicionales
  avgResponseTimeMinutes: number | null
  avgKennelStayHours: number | null
  actaCompletionPercent: number
  immediateRepairPercent: number

  // Rankings
  topZonesByActivation: ZoneRankingItem[]
  topZonesByDamage: ZoneRankingItem[]
}

export async function getDgacReportDataAction(filter: DgacReportFilter): Promise<{ success: boolean; data?: DgacReportData; error?: string }> {
  try {
    const supabase = supabaseAdmin

    // 1. Obtener cliente
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('*')
      .eq('id', filter.clientId)
      .single()

    if (clientErr || !client) {
      return { success: false, error: 'Cliente no encontrado.' }
    }

    // 2. Determinar rango de fechas YYYY-MM-DD
    let startDate: string
    let endDate: string
    let periodLabel: string
    let headerPeriodLabel: string

    if (filter.dateMode === 'month' && filter.month && filter.year) {
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ]
      const mStr = String(filter.month).padStart(2, '0')
      const lastDay = new Date(filter.year, filter.month, 0).getDate()
      startDate = `${filter.year}-${mStr}-01`
      endDate = `${filter.year}-${mStr}-${String(lastDay).padStart(2, '0')}`
      periodLabel = `${monthNames[filter.month - 1]} ${filter.year}`
      headerPeriodLabel = `${monthNames[filter.month - 1]} ${filter.year}`
    } else if (filter.startDate && filter.endDate) {
      startDate = filter.startDate
      endDate = filter.endDate
      periodLabel = `${startDate} al ${endDate}`
      headerPeriodLabel = `${startDate} al ${endDate}`
    } else {
      return { success: false, error: 'Rango de fechas no válido.' }
    }

    // 3. Consultar Rondas en el periodo
    const { data: rounds } = await supabase
      .from('rounds')
      .select('*, fence_incidents(*)')
      .gte('round_date', startDate)
      .lte('round_date', endDate)

    const roundsList = rounds || []
    const totalRounds = roundsList.length
    let roundsWithIncident = 0
    let roundsFenceDamagesCount = 0

    roundsList.forEach((r: any) => {
      if (r.has_fence_incident) roundsWithIncident++
      if (r.fence_incidents && Array.isArray(r.fence_incidents)) {
        roundsFenceDamagesCount += r.fence_incidents.length
      }
    })
    const roundsWithoutIncident = totalRounds - roundsWithIncident

    // 4. Consultar Activaciones (events) del cliente en el periodo
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('client_id', filter.clientId)
      .gte('event_date', startDate)
      .lte('event_date', endDate)

    const eventsList = events || []
    const totalActivations = eventsList.length

    let eventFenceDamagesCount = 0
    let totalFenceRepaired = 0

    eventsList.forEach((e: any) => {
      if (e.has_perimeter_damage) {
        eventFenceDamagesCount++
        if (e.damage_repaired) totalFenceRepaired++
      }
    })

    const totalFenceDamages = roundsFenceDamagesCount + eventFenceDamagesCount
    const immediateRepairPercent = totalFenceDamages > 0 ? Math.round((totalFenceRepaired / totalFenceDamages) * 100) : 100

    // 5. Consultar Animal Records para los eventos
    const eventIds = eventsList.map((e: any) => e.id)
    let animalRecords: any[] = []
    if (eventIds.length > 0) {
      const { data: animals } = await supabase
        .from('animal_records')
        .select('*')
        .in('event_id', eventIds)
      animalRecords = animals || []
    }

    // 6. Consultar Adopciones y Actas de Entrega para dichos animales
    const animalIds = animalRecords.map((a: any) => a.id)
    let adoptionsMap: Record<string, any> = {}
    let actsMap: Record<string, any> = {}
    let kennelMap: Record<string, any> = {}

    if (animalIds.length > 0) {
      const { data: adoptions } = await supabase
        .from('adoption_records')
        .select('*')
        .in('animal_id', animalIds)
      if (adoptions) {
        adoptions.forEach((ad: any) => { adoptionsMap[ad.animal_id] = ad })
      }

      const { data: acts } = await supabase
        .from('delivery_acts')
        .select('*')
        .in('animal_id', animalIds)
      if (acts) {
        acts.forEach((ac: any) => { actsMap[ac.animal_id] = ac })
      }

      const { data: kennels } = await supabase
        .from('kennel_records')
        .select('*')
        .in('animal_id', animalIds)
      if (kennels) {
        kennels.forEach((k: any) => { kennelMap[k.animal_id] = k })
      }
    }

    // 7. Clasificar Activaciones Positivas vs Negativas
    const positiveActivations: ActivationItem[] = []
    const negativeActivations: ActivationItem[] = []
    let totalCapturedAnimals = 0

    const speciesCounts: Record<string, number> = { Perro: 0, Gato: 0, Murciélago: 0 }

    eventsList.forEach((ev: any) => {
      const evAnimals = animalRecords.filter((a: any) => a.event_id === ev.id)
      const capturedEvAnimals = evAnimals.filter((a: any) => a.was_captured)
      const capturedCount = capturedEvAnimals.length

      capturedEvAnimals.forEach((ca: any) => {
        const sp = ca.species || 'Perro'
        speciesCounts[sp] = (speciesCounts[sp] || 0) + 1
        totalCapturedAnimals++
      })

      const item: ActivationItem = {
        id: ev.id,
        eventCode: ev.event_code,
        eventDate: ev.event_date,
        noticeTime: ev.notice_time,
        closureType: ev.closure_type || ev.general_result,
        generalResult: ev.general_result,
        reportedCount: ev.reported_animal_count || 1,
        capturedCount,
        reportedSpecies: ev.reported_species || 'Perro',
        airportZone: ev.airport_zone || 'Sin definir',
        specificLocation: ev.specific_location || '',
        observations: ev.observations || ev.closure_observations
      }

      const isPos = ev.general_result === 'Captura total' || ev.general_result === 'Captura parcial' || capturedCount > 0
      if (isPos) {
        positiveActivations.push(item)
      } else {
        negativeActivations.push(item)
      }
    })

    const speciesBreakdown = Object.entries(speciesCounts).map(([species, count]) => ({ species, count }))

    // 8. Construir Fichas de Animales del periodo
    const capturedAnimals: AnimalCardItem[] = []

    animalRecords.filter((a: any) => a.was_captured).forEach((a: any) => {
      const ev = eventsList.find((e: any) => e.id === a.event_id)
      const ad = adoptionsMap[a.id]
      const ac = actsMap[a.id]
      const kn = kennelMap[a.id]

      const photoUrl = a.photo_urls && a.photo_urls.length > 0 ? a.photo_urls[0] : null
      const exitDate = ac?.delivery_datetime || kn?.exit_datetime || ad?.completed_at || null

      capturedAnimals.push({
        id: a.id,
        eventId: a.event_id,
        eventCode: ev?.event_code || 'FAU-0000',
        captureDate: ev?.event_date || a.created_at.split('T')[0],
        species: a.species,
        sex: a.sex,
        size: a.size,
        colorFeatures: a.color_features,
        apparentAge: a.apparent_age,
        method: a.method,
        photoUrl,
        animalStatus: a.animal_status,
        microchipNumber: a.microchip_number || ad?.microchip_number || null,
        location: ev ? `${ev.airport_zone} (${ev.specific_location})` : '',
        exitDate,
        adopterName: ad?.adopter_name || null,
        adopterRut: ad?.adopter_rut || null,
        adopterPhone: ad?.adopter_phone || null,
        adopterAddress: ad?.adopter_address || null,
        receiverName: ac?.receiver_name || null,
        receiverRut: ac?.receiver_rut || null,
        actNumber: ac?.act_number || null,
        isPendingFromPreviousMonth: false
      })
    })

    // 9. Consultar Animales Pendientes de Meses Anteriores
    const { data: pastAdoptions } = await supabase
      .from('adoption_records')
      .select('*, animal_records(*, events(*))')
      .gte('completed_at', `${startDate}T00:00:00Z`)
      .lte('completed_at', `${endDate}T23:59:59Z`)

    const pendingAnimals: AnimalCardItem[] = []
    if (pastAdoptions) {
      pastAdoptions.forEach((ad: any) => {
        const ar = ad.animal_records
        if (ar && ar.created_at < `${startDate}T00:00:00Z`) {
          const ev = ar.events
          const photoUrl = ar.photo_urls && ar.photo_urls.length > 0 ? ar.photo_urls[0] : null
          pendingAnimals.push({
            id: ar.id,
            eventId: ar.event_id,
            eventCode: ev?.event_code || 'FAU-PAST',
            captureDate: ev?.event_date || ar.created_at.split('T')[0],
            species: ar.species,
            sex: ar.sex,
            size: ar.size,
            colorFeatures: ar.color_features,
            apparentAge: ar.apparent_age,
            method: ar.method,
            photoUrl,
            animalStatus: ar.animal_status,
            microchipNumber: ar.microchip_number || ad.microchip_number,
            location: ev ? `${ev.airport_zone} (${ev.specific_location})` : '',
            exitDate: ad.completed_at,
            adopterName: ad.adopter_name,
            adopterRut: ad.adopter_rut,
            adopterPhone: ad.adopter_phone,
            adopterAddress: ad.adopter_address,
            receiverName: null,
            receiverRut: null,
            actNumber: null,
            isPendingFromPreviousMonth: true
          })
        }
      })
    }

    // 10. Calcular KPIs
    let totalResponseMinutes = 0
    let responseCount = 0

    eventsList.forEach((ev: any) => {
      if (ev.notice_time && ev.intervention_time) {
        const [nH, nM] = ev.notice_time.split(':').map(Number)
        const [iH, iM] = ev.intervention_time.split(':').map(Number)
        const diff = (iH * 60 + iM) - (nH * 60 + nM)
        if (diff >= 0 && diff < 300) {
          totalResponseMinutes += diff
          responseCount++
        }
      }
    })

    const avgResponseTimeMinutes = responseCount > 0 ? Math.round(totalResponseMinutes / responseCount) : null

    let totalStayHours = 0
    let stayCount = 0

    Object.values(kennelMap).forEach((k: any) => {
      if (k.entry_datetime && k.exit_datetime) {
        const entry = new Date(k.entry_datetime).getTime()
        const exit = new Date(k.exit_datetime).getTime()
        const hours = (exit - entry) / (1000 * 60 * 60)
        if (hours >= 0 && hours < 720) {
          totalStayHours += hours
          stayCount++
        }
      }
    })

    const avgKennelStayHours = stayCount > 0 ? Math.round((totalStayHours / stayCount) * 10) / 10 : null
    const actCount = Object.keys(actsMap).length
    const actaCompletionPercent = totalCapturedAnimals > 0 ? Math.min(100, Math.round((actCount / totalCapturedAnimals) * 100)) : 100

    // 11. Rankings de Zonas
    const zoneActivationMap: Record<string, { count: number; captured: number }> = {}
    eventsList.forEach((ev: any) => {
      const z = ev.airport_zone || 'Sin definir'
      if (!zoneActivationMap[z]) zoneActivationMap[z] = { count: 0, captured: 0 }
      zoneActivationMap[z].count++
      const cap = animalRecords.filter((a: any) => a.event_id === ev.id && a.was_captured).length
      zoneActivationMap[z].captured += cap
    })

    const topZonesByActivation: ZoneRankingItem[] = Object.entries(zoneActivationMap)
      .map(([zone, val]) => ({ zone, count: val.count, capturedCount: val.captured }))
      .sort((a, b) => b.count - a.count)

    const zoneDamageMap: Record<string, { count: number; repaired: number }> = {}
    eventsList.filter((e: any) => e.has_perimeter_damage).forEach((ev: any) => {
      const z = ev.airport_zone || ev.damage_location || 'Sin definir'
      if (!zoneDamageMap[z]) zoneDamageMap[z] = { count: 0, repaired: 0 }
      zoneDamageMap[z].count++
      if (ev.damage_repaired) zoneDamageMap[z].repaired++
    })

    roundsList.forEach((r: any) => {
      if (r.has_fence_incident && r.fence_incidents) {
        r.fence_incidents.forEach((fi: any) => {
          const z = r.zone || 'Perímetro General'
          if (!zoneDamageMap[z]) zoneDamageMap[z] = { count: 0, repaired: 0 }
          zoneDamageMap[z].count++
          if (fi.was_repaired) zoneDamageMap[z].repaired++
        })
      }
    })

    const topZonesByDamage: ZoneRankingItem[] = Object.entries(zoneDamageMap)
      .map(([zone, val]) => ({ zone, count: val.count, repairedCount: val.repaired }))
      .sort((a, b) => b.count - a.count)

    return {
      success: true,
      data: {
        periodLabel,
        headerPeriodLabel,
        clientName: client.name,
        clientId: client.id,
        startDateStr: startDate,
        endDateStr: endDate,
        totalRounds,
        roundsWithIncident,
        roundsWithoutIncident,
        totalFenceDamages,
        totalActivations,
        totalCapturedAnimals,
        speciesBreakdown,
        positiveActivations,
        negativeActivations,
        capturedAnimals,
        pendingAnimals,
        avgResponseTimeMinutes,
        avgKennelStayHours,
        actaCompletionPercent,
        immediateRepairPercent,
        topZonesByActivation,
        topZonesByDamage
      }
    }
  } catch (err: any) {
    console.error('Error fetching DGAC report data:', err)
    return { success: false, error: err.message || 'Error al obtener datos del reporte.' }
  }
}

export async function saveGeneratedReportAction(params: {
  clientId: string
  year: number
  month: number
  pdfDataUrl: string
  summaryData: any
}): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
  try {
    const supabase = supabaseAdmin

    const base64Data = params.pdfDataUrl.replace(/^data:application\/pdf;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    const fileName = `reports/DGAC_Informe_Capturas_${params.year}_${params.month}_${Date.now()}.pdf`

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('event-photos')
      .upload(fileName, buffer, { contentType: 'application/pdf', upsert: true })

    let pdfUrl = params.pdfDataUrl
    if (!uploadErr && uploadData) {
      const { data: pubData } = supabase.storage.from('event-photos').getPublicUrl(uploadData.path)
      pdfUrl = pubData.publicUrl
    }

    const { error: dbErr } = await supabase
      .from('monthly_reports')
      .insert({
        client_id: params.clientId,
        report_type: 'DGAC Ejecutivo Capturas',
        year: params.year,
        month: params.month,
        pdf_url: pdfUrl,
        summary_data: params.summaryData,
        total_amount: 0
      })

    if (dbErr) {
      console.warn('Error inserting into monthly_reports:', dbErr.message)
    }

    return { success: true, pdfUrl }
  } catch (err: any) {
    console.error('Error saving generated report:', err)
    return { success: false, error: err.message }
  }
}

export async function getPastReportsAction(clientId: string) {
  try {
    const supabase = supabaseAdmin
    const { data, error } = await supabase
      .from('monthly_reports')
      .select('*')
      .eq('client_id', clientId)
      .order('generated_at', { ascending: false })

    if (error) return { success: false, reports: [] }
    return { success: true, reports: data || [] }
  } catch (err) {
    return { success: false, reports: [] }
  }
}
