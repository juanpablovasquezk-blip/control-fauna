'use client'

import { useState, useEffect, Fragment } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { 
  Bird, Plus, Calendar, AlertCircle, Info, Shield, CheckCircle2, 
  ChevronDown, ChevronUp, Filter, FileSpreadsheet, CalendarDays, Trash2,
  Clock, Play, Square, Timer, AlertOctagon
} from 'lucide-react'
import { 
  getPestControlDataAction, 
  createPestRecordAction, 
  deletePestRecordAction,
  startPestControlShiftAction,
  closePestControlShiftAction,
  cancelPestControlShiftAction
} from './actions'
import { formatFreeText } from '@/lib/utils/formatters'

const PRESET_REASONS = [
  'Sin caza, por lluvia / clima adverso',
  'Sin caza, día feriado',
  'Sin caza, terreno no apto / lodoso',
  'Sin caza, listado de herramientas vencido',
  'Sin caza, problema con vehículo / camioneta',
  'Sin caza, baja visibilidad / alerta torre de control',
  'Sin caza, clima nocturno muy frío no apto para cazar',
  'Otro (especificar)'
]

const MONTHS_CONFIG = [
  { value: '12', name: 'Diciembre' },
  { value: '11', name: 'Noviembre' },
  { value: '10', name: 'Octubre' },
  { value: '09', name: 'Septiembre' },
  { value: '08', name: 'Agosto' },
  { value: '07', name: 'Julio' },
  { value: '06', name: 'Junio' },
  { value: '05', name: 'Mayo' },
  { value: '04', name: 'Abril' },
  { value: '03', name: 'Marzo' },
  { value: '02', name: 'Febrero' },
  { value: '01', name: 'Enero' }
]

function formatSecondsToHHMMSS(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (num: number) => String(num).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

function formatMinutesToHoursStr(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0 mins'
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  if (hours === 0) return `${mins} mins`
  if (mins === 0) return `${hours} hrs`
  return `${hours}h ${mins}m`
}

export default function PestControlPage() {
  const [records, setRecords] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [operators, setOperators] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)
  const [existingSectors, setExistingSectors] = useState<string[]>([])

  // Active shift state
  const [activeShift, setActiveShift] = useState<any | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Year Selection
  const [selectedYear, setSelectedYear] = useState(2026)

  // Collapsed months state
  const [collapsedMonths, setCollapsedMonths] = useState<{ [key: string]: boolean }>({})

  // Form states
  const [clientId, setClientId] = useState('')
  const [clientNameDisplay, setClientNameDisplay] = useState('')
  const [responsibleId, setResponsibleId] = useState('')
  const [sector, setSector] = useState('')
  const [rabbitsMale, setRabbitsMale] = useState(0)
  const [rabbitsFemale, setRabbitsFemale] = useState(0)
  const [pigeons, setPigeons] = useState(0)
  const [noHuntingReason, setNoHuntingReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [observations, setObservations] = useState('')
  const [recordDate, setRecordDate] = useState(() => {
    const localObj = new Date()
    const offset = localObj.getTimezoneOffset()
    const localDate = new Date(localObj.getTime() - (offset * 60 * 1000))
    return localDate.toISOString().split('T')[0]
  })
  const [saving, setSaving] = useState(false)
  const [startingShift, setStartingShift] = useState(false)

  const { profile } = useAuth()
  const isAdminOrSuper = profile && ['admin', 'supervisor'].includes(profile.role)

  useEffect(() => {
    fetchPestData()
  }, [])

  // Timer effect for active shift
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (activeShift && activeShift.started_at) {
      const startTime = new Date(activeShift.started_at).getTime()
      
      const updateTimer = () => {
        const now = new Date().getTime()
        const diffSecs = Math.floor((now - startTime) / 1000)
        setElapsedSeconds(diffSecs > 0 ? diffSecs : 0)
      }

      updateTimer()
      interval = setInterval(updateTimer, 1000)
    } else {
      setElapsedSeconds(0)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeShift])

  // Manage default collapsed state when records or year changes
  useEffect(() => {
    const yearRecs = records.filter(r => r.record_date.startsWith(selectedYear.toString()))
    if (yearRecs.length > 0) {
      const uniqueMonths = Array.from(new Set(yearRecs.map((r: any) => r.record_date.substring(0, 7)))) as string[]
      uniqueMonths.sort((a, b) => b.localeCompare(a))
      
      const latestMonth = uniqueMonths[0]
      const initialCollapsed: { [key: string]: boolean } = {}
      
      MONTHS_CONFIG.forEach(m => {
        const monthKey = `${selectedYear}-${m.value}`
        initialCollapsed[monthKey] = monthKey !== latestMonth
      })
      setCollapsedMonths(initialCollapsed)
    } else {
      setCollapsedMonths({})
    }
  }, [records, selectedYear])

  useEffect(() => {
    if (profile && !responsibleId) {
      setResponsibleId(profile.id)
    }
  }, [profile])

  async function fetchPestData() {
    setLoading(true)
    const res = await getPestControlDataAction()
    if (res.success) {
      setClients(res.clients)
      setOperators(res.operators)
      setRecords(res.records)

      // Find active shift for current user (or any active shift if admin)
      if (profile) {
        const currentActive = res.records.find((r: any) => 
          r.status === 'en_curso' && (r.responsible_id === profile.id || isAdminOrSuper)
        )
        setActiveShift(currentActive || null)
      }

      const recordSectors = res.records.map((r: any) => r.sector)
      const officialZones = res.zones ? res.zones.map((z: any) => z.name) : []
      const combinedSectors = Array.from(new Set([...recordSectors, ...officialZones])).filter(Boolean) as string[]
      setExistingSectors(combinedSectors)

      const years = Array.from(new Set(res.records.map((r: any) => Number(r.record_date.substring(0, 4))))) as number[]
      if (years.length > 0) {
        years.sort((a, b) => b - a)
        setSelectedYear(years[0])
      }

      const dgac = res.clients.find((c: any) => c.is_contract_client || c.name.toUpperCase().includes('DGAC')) || res.clients[0]
      if (dgac) {
        setClientId(dgac.id)
        setClientNameDisplay(dgac.name)
      }
    }
    setLoading(false)
  }

  // Handle Start Shift (Apertura)
  const handleStartShift = async () => {
    if (!profile) return
    setStartingShift(true)
    try {
      const res = await startPestControlShiftAction({
        client_id: clientId,
        responsible_id: profile.id
      })

      if (!res.success) throw new Error(res.error)

      fetchPestData()
      alert('🎯 Turno de Caza aperturado con éxito. Se envió la notificación de inicio al Grupo de WhatsApp de Caza.')
    } catch (err: any) {
      alert('Error al aperturar turno: ' + err.message)
    } finally {
      setStartingShift(false)
    }
  }

  // Handle Open Close Modal
  const handleOpenCloseModal = () => {
    setRabbitsMale(0)
    setRabbitsFemale(0)
    setPigeons(0)
    setNoHuntingReason('')
    setCustomReason('')
    setObservations('')
    setSector('')
    setShowModal(true)
  }

  // Handle Submit Close Shift
  const handleCloseShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeShift) return

    const totalAnimals = Number(rabbitsMale) + Number(rabbitsFemale) + Number(pigeons)

    // Validación 1: Si >0 capturas, el Sector / Zona es OBLIGATORIO
    if (totalAnimals > 0) {
      if (!sector.trim()) {
        alert('Si la cantidad de animales cazados es mayor a 0, debe ingresar obligatoriamente el Sector / Zona de la caza.')
        return
      }
    }

    // Validación 2: Si 0 capturas, el Motivo de No-Caza es OBLIGATORIO
    let finalObservations = observations.trim()
    if (totalAnimals === 0) {
      if (!noHuntingReason) {
        alert('Si no se realiza caza (0 capturas), debe seleccionar obligatoriamente el motivo por el cual no se realizó la caza.')
        return
      }
      if (noHuntingReason === 'Otro (especificar)') {
        if (!customReason.trim()) {
          alert('Por favor especifique el motivo detallado de no-caza.')
          return
        }
        finalObservations = formatFreeText(customReason) + (observations ? ' | ' + formatFreeText(observations) : '')
      } else {
        finalObservations = noHuntingReason + (observations ? ' | ' + formatFreeText(observations) : '')
      }
    } else {
      finalObservations = formatFreeText(finalObservations)
    }

    const formattedSector = sector.trim() ? formatFreeText(sector) : 'General / Sin Caza'

    setSaving(true)

    try {
      const res = await closePestControlShiftAction({
        record_id: activeShift.id,
        sector: formattedSector,
        rabbits_male: Number(rabbitsMale),
        rabbits_female: Number(rabbitsFemale),
        pigeons: Number(pigeons),
        observations: finalObservations
      })

      if (!res.success) throw new Error(res.error)

      setShowModal(false)
      setActiveShift(null)
      fetchPestData()
      alert('🏁 Turno de Caza cerrado y registrado correctamente. Se envió el reporte consolidado al Grupo de WhatsApp de Caza.')
    } catch (err: any) {
      alert('Error al cerrar turno: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Cancel in-progress shift
  const handleCancelShift = async () => {
    if (!activeShift) return
    const confirmed = window.confirm('¿Está seguro de descartar este turno en curso? El registro se eliminará.')
    if (!confirmed) return

    try {
      const res = await cancelPestControlShiftAction(activeShift.id)
      if (res.success) {
        setActiveShift(null)
        fetchPestData()
        alert('Turno en curso descartado.')
      }
    } catch (err: any) {
      alert('Error descartando turno: ' + err.message)
    }
  }

  // Handle Manual Historical Entry Submit (Admin)
  const handleCreateManualRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    const totalAnimals = Number(rabbitsMale) + Number(rabbitsFemale) + Number(pigeons)

    if (totalAnimals > 0 && !sector.trim()) {
      alert('Si la cantidad de animales es >0, debe ingresar el Sector / Zona.')
      return
    }

    let finalObservations = observations.trim()
    if (totalAnimals === 0) {
      if (!noHuntingReason) {
        alert('Debe seleccionar el motivo de no-caza.')
        return
      }
      finalObservations = (noHuntingReason === 'Otro (especificar)' ? customReason : noHuntingReason) + (observations ? ' | ' + observations : '')
    }

    setSaving(true)

    try {
      const res = await createPestRecordAction({
        client_id: clientId,
        sector: sector.trim() ? formatFreeText(sector) : 'General / Sin Caza',
        rabbits_male: Number(rabbitsMale),
        rabbits_female: Number(rabbitsFemale),
        pigeons: Number(pigeons),
        method: 'Estándar',
        observations: finalObservations,
        responsible_id: isAdminOrSuper ? (responsibleId || profile.id) : profile.id,
        record_date: recordDate
      })

      if (!res.success) throw new Error(res.error)

      setShowManualModal(false)
      fetchPestData()
      alert('Jornada manual registrada con éxito.')
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRecord = async (recordId: string) => {
    if (!isAdminOrSuper) return
    const confirmed = window.confirm('¿Está seguro de que desea eliminar esta jornada de caza? Esta acción actualizará los totales de inmediato.')
    if (!confirmed) return

    try {
      const res = await deletePestRecordAction(recordId)
      if (res.success) {
        alert('Jornada de caza eliminada correctamente.')
        fetchPestData()
      } else {
        alert('Error al eliminar registro: ' + res.error)
      }
    } catch (err: any) {
      alert('Error al eliminar registro: ' + err.message)
    }
  }

  // Format date correctly without timezone shift
  const formatRecordDate = (dateStr: string) => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    const dateObj = new Date(Number(year), Number(month) - 1, Number(day))
    const dayNameShort = dateObj.toLocaleDateString('es-CL', { weekday: 'short' }).toUpperCase().replace('.', '')
    return `${day}/${month}/${year} (${dayNameShort})`
  }

  // Filter records for the selected year
  const yearRecords = records.filter(rec => rec.record_date.startsWith(selectedYear.toString()))

  // Calculate monthly summaries and annual totals
  let annualMale = 0
  let annualFemale = 0
  let annualRabbits = 0
  let annualPigeons = 0
  let annualJornadas = 0
  let annualWithCaza = 0
  let annualWithoutCaza = 0
  let annualMinutes = 0

  const monthlySummaries = MONTHS_CONFIG.map(m => {
    const monthKey = `${selectedYear}-${m.value}`
    const monthRecords = yearRecords.filter(r => r.record_date.substring(5, 7) === m.value && r.status !== 'en_curso')

    const rMale = monthRecords.reduce((acc, r) => acc + (r.rabbits_male || 0), 0)
    const rFemale = monthRecords.reduce((acc, r) => acc + (r.rabbits_female || 0), 0)
    const rTotal = rMale + rFemale
    const pigeonsCount = monthRecords.reduce((acc, r) => acc + (r.pigeons || 0), 0)
    const jornadasCount = monthRecords.length
    const withCazaCount = monthRecords.filter(r => (r.rabbits_total + r.pigeons) > 0).length
    const withoutCazaCount = jornadasCount - withCazaCount
    const totalMins = monthRecords.reduce((acc, r) => acc + (r.duration_minutes || 0), 0)

    // Add to annual totals
    annualMale += rMale
    annualFemale += rFemale
    annualRabbits += rTotal
    annualPigeons += pigeonsCount
    annualJornadas += jornadasCount
    annualWithCaza += withCazaCount
    annualWithoutCaza += withoutCazaCount
    annualMinutes += totalMins

    return {
      monthKey,
      name: m.name,
      rMale,
      rFemale,
      rTotal,
      pigeonsCount,
      jornadasCount,
      withCazaCount,
      withoutCazaCount,
      totalMins,
      records: monthRecords.sort((a, b) => b.record_date.localeCompare(a.record_date))
    }
  })

  const toggleMonthCollapse = (monthKey: string) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }))
  }

  const dynamicYearsList = Array.from(
    new Set(records.map(r => Number(r.record_date.substring(0, 4))))
  ).sort((a, b) => b - a)

  if (dynamicYearsList.length === 0) {
    dynamicYearsList.push(2026)
  }

  const currentTotalAnimals = Number(rabbitsMale) + Number(rabbitsFemale) + Number(pigeons)

  return (
    <div className="space-y-6">
      {/* Banner de Control de Turno en Vivo */}
      {activeShift ? (
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-gray-900 rounded-2xl p-5 sm:p-6 text-white shadow-xl border-2 border-emerald-500 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/30 text-emerald-300 font-extrabold text-[10px] uppercase rounded-md tracking-wider border border-emerald-400/40">
                TURNO DE CAZA EN CURSO
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Timer className="w-8 h-8 text-emerald-400 animate-pulse flex-shrink-0" />
              <div>
                <p className="text-2xl sm:text-3xl font-black text-white font-mono tracking-widest leading-none">
                  {formatSecondsToHHMMSS(elapsedSeconds)}
                </p>
                <p className="text-xs text-emerald-200 mt-1 font-medium">
                  Operador: <span className="font-bold text-white">{activeShift.responsible?.full_name || profile?.full_name}</span> • Apertura: {new Date(activeShift.started_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleOpenCloseModal}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition transform active:scale-95"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Cerrar y Registrar Turno</span>
            </button>
            <button
              onClick={handleCancelShift}
              title="Descartar turno"
              className="p-3 bg-gray-800 hover:bg-red-900/60 text-gray-300 hover:text-red-300 rounded-xl border border-gray-700 transition"
            >
              <AlertOctagon className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <Bird className="w-6 h-6 text-emerald-600" />
              <h1 className="text-xl font-bold text-gray-900">Control de Caza (Conejos y Palomas)</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Apertura y cierre de turnos en vivo con cronómetro de tiempo efectivo de caza.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleStartShift}
              disabled={startingShift}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{startingShift ? 'Aperturando...' : 'Aperturar Turno de Caza'}</span>
            </button>

            {isAdminOrSuper && (
              <button
                onClick={() => {
                  setRabbitsMale(0)
                  setRabbitsFemale(0)
                  setPigeons(0)
                  setNoHuntingReason('')
                  setCustomReason('')
                  setObservations('')
                  setSector('')
                  setShowManualModal(true)
                }}
                className="px-3.5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Ingreso Manual</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Selector de Año */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
          <CalendarDays className="w-4 h-4 text-emerald-600" />
          <span>Seleccionar Año de Operación:</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {dynamicYearsList.map((yr) => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                selectedYear === yr
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm font-semibold'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Año {yr}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla Resumen Mensual */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
            Resumen Mensual {selectedYear}
          </h2>
          {isAdminOrSuper && annualMinutes > 0 && (
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tiempo Efectivo Anual: {formatMinutesToHoursStr(annualMinutes)}</span>
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100/70 border-b border-gray-200 text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                <th className="p-3 pl-4">Mes</th>
                <th className="p-3 text-right">Conejos Macho</th>
                <th className="p-3 text-right">Conejos Hembra</th>
                <th className="p-3 text-right font-bold text-emerald-700">Total Conejos</th>
                <th className="p-3 text-right">Palomas</th>
                <th className="p-3 text-center">Total Jornadas</th>
                <th className="p-3 text-center text-emerald-600">Con Caza</th>
                <th className="p-3 text-center text-amber-600">Sin Caza</th>
                {isAdminOrSuper && <th className="p-3 text-center text-indigo-600">Tiempo Efectivo</th>}
                {isAdminOrSuper && <th className="p-3 pr-4 text-center">Evolución</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {/* Total Row */}
              {yearRecords.length > 0 && (
                <tr className="bg-emerald-50/50 font-bold border-b-2 border-emerald-200">
                  <td className="p-3 pl-4 text-emerald-950 text-xs font-black">TOTAL ANUAL {selectedYear}</td>
                  <td className="p-3 text-right">{annualMale}</td>
                  <td className="p-3 text-right">{annualFemale}</td>
                  <td className="p-3 text-right text-emerald-800 font-black">{annualRabbits}</td>
                  <td className="p-3 text-right">{annualPigeons}</td>
                  <td className="p-3 text-center">{annualJornadas}</td>
                  <td className="p-3 text-center text-emerald-700">{annualWithCaza}</td>
                  <td className="p-3 text-center text-amber-700">{annualWithoutCaza}</td>
                  {isAdminOrSuper && <td className="p-3 text-center text-indigo-700 font-black">{formatMinutesToHoursStr(annualMinutes)}</td>}
                  {isAdminOrSuper && <td className="p-3 pr-4"></td>}
                </tr>
              )}
              {monthlySummaries.filter(m => m.jornadasCount > 0).map((m) => {
                const isCollapsed = collapsedMonths[m.monthKey] !== false;
                const hasData = m.jornadasCount > 0;

                return (
                  <Fragment key={m.monthKey}>
                    {/* Fila Resumen del Mes */}
                    <tr 
                      onClick={() => isAdminOrSuper && hasData && toggleMonthCollapse(m.monthKey)}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isAdminOrSuper && hasData ? 'cursor-pointer' : ''
                      } ${!isCollapsed && isAdminOrSuper ? 'bg-emerald-50/30' : ''}`}
                    >
                      <td className="p-3 pl-4 font-bold text-gray-900">{m.name}</td>
                      <td className="p-3 text-right font-medium">{hasData ? m.rMale : '-'}</td>
                      <td className="p-3 text-right font-medium">{hasData ? m.rFemale : '-'}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">{hasData ? m.rTotal : '-'}</td>
                      <td className="p-3 text-right font-medium">{hasData ? m.pigeonsCount : '-'}</td>
                      <td className="p-3 text-center font-semibold text-gray-700">{hasData ? m.jornadasCount : '-'}</td>
                      <td className="p-3 text-center font-semibold text-emerald-600">{hasData ? m.withCazaCount : '-'}</td>
                      <td className="p-3 text-center font-semibold text-amber-600">{hasData ? m.withoutCazaCount : '-'}</td>
                      {isAdminOrSuper && <td className="p-3 text-center font-bold text-indigo-600">{hasData && m.totalMins > 0 ? formatMinutesToHoursStr(m.totalMins) : '-'}</td>}
                      {isAdminOrSuper && (
                        <td className="p-3 pr-4 text-center">
                          {hasData && (
                            <span className="inline-flex items-center justify-center p-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600">
                              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>

                    {/* Evolución Diaria Expandible (Solo para Admin / Supervisor) */}
                    {isAdminOrSuper && !isCollapsed && hasData && (
                      <tr>
                        <td colSpan={10} className="p-0 bg-gray-50/50">
                          <div className="border-t border-b border-gray-200/80 divide-y divide-gray-100 max-h-[450px] overflow-y-auto">
                            {m.records.map((rec) => {
                              const totalCaptured = (rec.rabbits_total || 0) + (rec.pigeons || 0)
                              const startTimeStr = rec.started_at ? new Date(rec.started_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : null
                              const endTimeStr = rec.ended_at ? new Date(rec.ended_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : null

                              return (
                                <div key={rec.id} className="p-3.5 pl-8 pr-6 hover:bg-white transition flex flex-col sm:flex-row justify-between gap-3 text-xs">
                                  <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-gray-900">{rec.sector}</span>
                                      <span className="text-[11px] text-gray-500">({rec.client?.name || 'DGAC'})</span>
                                      {totalCaptured === 0 ? (
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3 text-amber-600" /> Sin Caza
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Caza Efectiva
                                        </span>
                                      )}

                                      {rec.duration_minutes > 0 && (
                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md flex items-center gap-1 border border-indigo-200">
                                          <Clock className="w-3 h-3" /> Tiempo: {formatMinutesToHoursStr(rec.duration_minutes)} {startTimeStr && endTimeStr ? `(${startTimeStr} - ${endTimeStr})` : ''}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-4 text-xs font-semibold text-emerald-700">
                                      <span>Conejos: {rec.rabbits_total} (M: {rec.rabbits_male} | H: {rec.rabbits_female})</span>
                                      {rec.pigeons > 0 && <span>Palomas: {rec.pigeons}</span>}
                                    </div>

                                    {rec.observations && (
                                      <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 mt-1 max-w-2xl">
                                        <span className="font-semibold text-gray-700">Observaciones / Motivo:</span> {rec.observations}
                                      </p>
                                    )}

                                    <p className="text-[11px] text-gray-400">
                                      Operador Caza: <span className="font-semibold text-gray-600">{rec.responsible?.full_name || 'No especificado'}</span>
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-3 self-start sm:self-center">
                                    <span className="text-[11px] text-gray-500 flex items-center gap-1 font-semibold whitespace-nowrap">
                                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                      {formatRecordDate(rec.record_date)}
                                    </span>
                                    {isAdminOrSuper && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteRecord(rec.id)
                                        }}
                                        title="Eliminar jornada"
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        {yearRecords.length === 0 && (
          <div className="p-6 text-center text-xs text-gray-400">
            No hay jornadas de caza registradas para el año {selectedYear}.
          </div>
        )}
      </div>

      {/* MODAL 1: Cierre de Turno en Vivo */}
      {showModal && activeShift && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-3 sm:p-4 pb-20 sm:pb-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[85vh] my-auto border border-emerald-100">
            {/* Header Fijo */}
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <div>
                <h3 className="text-base font-bold text-gray-900">Cerrar y Registrar Turno de Caza</h3>
                <p className="text-[11px] text-emerald-700 font-medium">Notificación automática al Grupo WhatsApp de Caza</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold px-2 py-1 rounded-md hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* Resumen de Tiempo Efectivo */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 my-2 flex items-center justify-between text-xs text-emerald-900 shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <div>
                  <span className="font-bold block">Tiempo Efectivo Transcurrido:</span>
                  <span className="text-[11px] text-emerald-700">
                    Apertura: {new Date(activeShift.started_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs
                  </span>
                </div>
              </div>
              <span className="text-base font-black text-emerald-800 font-mono">
                {formatSecondsToHHMMSS(elapsedSeconds)}
              </span>
            </div>

            {/* Formulario Flex con Scroll en los campos */}
            <form onSubmit={handleCloseShiftSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
                {/* Sector / Zona */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Sector / Zona {currentTotalAnimals > 0 ? <span className="text-red-600">*</span> : '(Opcional si es 0 capturas)'}
                  </label>
                  <input
                    type="text"
                    required={currentTotalAnimals > 0}
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    placeholder={currentTotalAnimals > 0 ? "Obligatorio: Ej. Pista 17R / Sector Norte" : "Opcional: Ej. Pista 17R / Sector Norte"}
                    list="sectors-list"
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                  />
                  <datalist id="sectors-list">
                    {existingSectors.map((sec) => (
                      <option key={sec} value={sec} />
                    ))}
                  </datalist>
                </div>

                {/* Animal Counts */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Conejos Macho</label>
                    <input
                      type="number"
                      min="0"
                      value={rabbitsMale}
                      onChange={(e) => setRabbitsMale(Number(e.target.value))}
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-semibold text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Conejos Hembra</label>
                    <input
                      type="number"
                      min="0"
                      value={rabbitsFemale}
                      onChange={(e) => setRabbitsFemale(Number(e.target.value))}
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-semibold text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Cantidad de Palomas</label>
                  <input
                    type="number"
                    min="0"
                    value={pigeons}
                    onChange={(e) => setPigeons(Number(e.target.value))}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-semibold text-gray-900"
                  />
                </div>

                {/* Motivo de No-Caza (If 0 animals) */}
                {currentTotalAnimals === 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Motivo por el cual no se realizó caza *</span>
                    </div>
                    <select
                      value={noHuntingReason}
                      onChange={(e) => setNoHuntingReason(e.target.value)}
                      className="w-full p-2 bg-white border border-amber-300 rounded text-xs font-medium text-amber-900"
                    >
                      <option value="">-- Seleccionar motivo obligatorio --</option>
                      {PRESET_REASONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>

                    {noHuntingReason === 'Otro (especificar)' && (
                      <input
                        type="text"
                        required
                        placeholder="Escriba el motivo detallado..."
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        className="w-full p-2 bg-white border border-amber-300 rounded text-xs text-gray-900"
                      />
                    )}
                  </div>
                )}

                {/* Observaciones generales */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Observaciones / Novedades del Turno</label>
                  <textarea
                    rows={2}
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Detalles sobre el estado del terreno, clima, avistamientos..."
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900"
                  />
                </div>
              </div>

              {/* Botones Fijos Abajo */}
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 bg-white shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-xs font-semibold rounded-xl hover:bg-gray-200 text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-sm flex items-center gap-1.5"
                >
                  {saving ? 'Cerrando Turno...' : 'Finalizar y Enviar Alerta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Ingreso Manual Pasado (Admin) */}
      {showManualModal && isAdminOrSuper && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-3 sm:p-4 pb-20 sm:pb-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[85vh] my-auto">
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <h3 className="text-base font-bold text-gray-900">Ingreso Manual de Jornada</h3>
              <button 
                type="button" 
                onClick={() => setShowManualModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold px-2 py-1 rounded-md hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualRecord} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Fecha de la Jornada</label>
                  <input
                    type="date"
                    required
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-medium text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Operador Responsable de Caza</label>
                  <select
                    value={responsibleId}
                    onChange={(e) => setResponsibleId(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-medium text-gray-900"
                  >
                    {operators.map(op => (
                      <option key={op.id} value={op.id}>
                        {op.full_name} ({op.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Sector / Zona (Opcional)</label>
                  <input
                    type="text"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    placeholder="Ej: Pista 17R / Sector Norte"
                    list="sectors-list"
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-medium text-gray-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Conejos Macho</label>
                    <input
                      type="number"
                      min="0"
                      value={rabbitsMale}
                      onChange={(e) => setRabbitsMale(Number(e.target.value))}
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-semibold text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Conejos Hembra</label>
                    <input
                      type="number"
                      min="0"
                      value={rabbitsFemale}
                      onChange={(e) => setRabbitsFemale(Number(e.target.value))}
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-semibold text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Cantidad de Palomas</label>
                  <input
                    type="number"
                    min="0"
                    value={pigeons}
                    onChange={(e) => setPigeons(Number(e.target.value))}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-semibold text-gray-900"
                  />
                </div>

                {currentTotalAnimals === 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Motivo por el cual no se realizó caza *</span>
                    </div>
                    <select
                      value={noHuntingReason}
                      onChange={(e) => setNoHuntingReason(e.target.value)}
                      className="w-full p-2 bg-white border border-amber-300 rounded text-xs font-medium text-amber-900"
                    >
                      <option value="">-- Seleccionar motivo --</option>
                      {PRESET_REASONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Observaciones</label>
                  <textarea
                    rows={2}
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 bg-white shrink-0">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 bg-gray-100 text-xs font-semibold rounded-xl text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  {saving ? 'Guardando...' : 'Guardar Jornada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
