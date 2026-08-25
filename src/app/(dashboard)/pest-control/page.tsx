'use client'

import { useState, useEffect, Fragment } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { 
  Bird, Plus, Calendar, AlertCircle, Info, Shield, CheckCircle2, 
  ChevronDown, ChevronUp, Filter, FileSpreadsheet, CalendarDays
} from 'lucide-react'
import { getPestControlDataAction, createPestRecordAction } from './actions'

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

function capitalizeSentence(text: string) {
  if (!text) return ''
  const trimmed = text.trim()
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

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

export default function PestControlPage() {
  const [records, setRecords] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [operators, setOperators] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [existingSectors, setExistingSectors] = useState<string[]>([])

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
  const [method, setMethod] = useState('')
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

  const { profile } = useAuth()
  const isAdminOrSuper = profile && ['admin', 'supervisor'].includes(profile.role)

  useEffect(() => {
    fetchPestData()
  }, [])

  // Manage default collapsed state when records or year changes
  useEffect(() => {
    const yearRecs = records.filter(r => r.record_date.startsWith(selectedYear.toString()))
    if (yearRecs.length > 0) {
      // Find the latest month with records in this year
      const uniqueMonths = Array.from(new Set(yearRecs.map((r: any) => r.record_date.substring(0, 7)))) as string[]
      uniqueMonths.sort((a, b) => b.localeCompare(a)) // descending
      
      const latestMonth = uniqueMonths[0] // e.g. "2026-08"
      const initialCollapsed: { [key: string]: boolean } = {}
      
      // All months collapsed except the latest one with records
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

      // Extract unique sectors from records AND official airport zones
      const recordSectors = res.records.map((r: any) => r.sector)
      const officialZones = res.zones ? res.zones.map((z: any) => z.name) : []
      const combinedSectors = Array.from(new Set([...recordSectors, ...officialZones])).filter(Boolean) as string[]
      setExistingSectors(combinedSectors)

      // Automatically find latest year with data
      const years = Array.from(new Set(res.records.map((r: any) => Number(r.record_date.substring(0, 4))))) as number[]
      if (years.length > 0) {
        years.sort((a, b) => b - a)
        setSelectedYear(years[0])
      }

      // Automatically find DGAC client
      const dgac = res.clients.find((c: any) => c.is_contract_client || c.name.toUpperCase().includes('DGAC')) || res.clients[0]
      if (dgac) {
        setClientId(dgac.id)
        setClientNameDisplay(dgac.name)
      }
    }
    setLoading(false)
  }

  const handleOpenModal = () => {
    setRabbitsMale(0)
    setRabbitsFemale(0)
    setPigeons(0)
    setNoHuntingReason('')
    setCustomReason('')
    setObservations('')
    setSector('')
    setMethod('')
    const localObj = new Date()
    const offset = localObj.getTimezoneOffset()
    const localDate = new Date(localObj.getTime() - (offset * 60 * 1000))
    setRecordDate(localDate.toISOString().split('T')[0])
    if (profile) setResponsibleId(profile.id)
    setShowModal(true)
  }

  const handleCreatePestRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    const totalAnimals = Number(rabbitsMale) + Number(rabbitsFemale) + Number(pigeons)

    const formattedSector = capitalizeSentence(sector)
    let finalObservations = observations.trim()
    if (totalAnimals === 0) {
      if (!noHuntingReason) {
        alert('Si no se realiza caza (0 capturas), debe seleccionar el motivo de no-caza obligatoriamente.')
        return
      }
      if (noHuntingReason === 'Otro (especificar)') {
        if (!customReason.trim()) {
          alert('Por favor especifique el motivo de no-caza.')
          return
        }
        finalObservations = capitalizeSentence(customReason) + (observations ? ' | ' + capitalizeSentence(observations) : '')
      } else {
        finalObservations = noHuntingReason + (observations ? ' | ' + capitalizeSentence(observations) : '')
      }
    } else {
      finalObservations = capitalizeSentence(finalObservations)
    }

    setSaving(true)

    try {
      const selectedOperatorId = isAdminOrSuper ? (responsibleId || profile.id) : profile.id

      const res = await createPestRecordAction({
        client_id: clientId,
        sector: formattedSector,
        rabbits_male: Number(rabbitsMale),
        rabbits_female: Number(rabbitsFemale),
        pigeons: Number(pigeons),
        method,
        observations: finalObservations,
        responsible_id: selectedOperatorId,
        record_date: isAdminOrSuper ? recordDate : new Date().toISOString().split('T')[0]
      })

      if (!res.success) throw new Error(res.error)

      setShowModal(false)
      fetchPestData()
      alert('Jornada de control de caza registrada correctamente.')
    } catch (err: any) {
      alert('Error guardando jornada: ' + err.message)
    } finally {
      setSaving(false)
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

  const monthlySummaries = MONTHS_CONFIG.map(m => {
    const monthKey = `${selectedYear}-${m.value}`
    const monthRecords = yearRecords.filter(r => r.record_date.substring(5, 7) === m.value)

    const rMale = monthRecords.reduce((acc, r) => acc + (r.rabbits_male || 0), 0)
    const rFemale = monthRecords.reduce((acc, r) => acc + (r.rabbits_female || 0), 0)
    const rTotal = rMale + rFemale
    const pigeonsCount = monthRecords.reduce((acc, r) => acc + (r.pigeons || 0), 0)
    const jornadasCount = monthRecords.length
    const withCazaCount = monthRecords.filter(r => (r.rabbits_total + r.pigeons) > 0).length
    const withoutCazaCount = jornadasCount - withCazaCount

    // Add to annual totals
    annualMale += rMale
    annualFemale += rFemale
    annualRabbits += rTotal
    annualPigeons += pigeonsCount
    annualJornadas += jornadasCount
    annualWithCaza += withCazaCount
    annualWithoutCaza += withoutCazaCount

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
      records: monthRecords.sort((a, b) => b.record_date.localeCompare(a.record_date))
    }
  })

  const toggleMonthCollapse = (monthKey: string) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }))
  }

  // Get unique years with data dynamically from records
  const dynamicYearsList = Array.from(
    new Set(records.map(r => Number(r.record_date.substring(0, 4))))
  ).sort((a, b) => b - a)

  if (dynamicYearsList.length === 0) {
    dynamicYearsList.push(2026) // fallback default
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Bird className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-bold text-gray-900">Control de Caza (Conejos y Palomas)</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Resumen anual y registro de jornadas de control de fauna silvestre y avifauna.
          </p>
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Jornada de Caza</span>
        </button>
      </div>

      {/* Year Selector */}
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

      {/* Monthly Summary Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
            Resumen Mensual {selectedYear}
          </h2>
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
                <th className="p-3 pr-4 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {/* Total Row */}
              {yearRecords.length > 0 && (
                <tr className="bg-gray-100 font-bold border-b-2 border-gray-300">
                  <td className="p-3 pl-4 text-gray-900 text-xs font-black">TOTAL ANUAL</td>
                  <td className="p-3 text-right">{annualMale}</td>
                  <td className="p-3 text-right">{annualFemale}</td>
                  <td className="p-3 text-right text-emerald-800 font-black">{annualRabbits}</td>
                  <td className="p-3 text-right">{annualPigeons}</td>
                  <td className="p-3 text-center">{annualJornadas}</td>
                  <td className="p-3 text-center text-emerald-700">{annualWithCaza}</td>
                  <td className="p-3 text-center text-amber-700">{annualWithoutCaza}</td>
                  <td className="p-3 pr-4"></td>
                </tr>
              )}
              {monthlySummaries.filter(m => m.jornadasCount > 0).map((m) => {
                const isCollapsed = collapsedMonths[m.monthKey] !== false; // collapsed by default unless explicitly false
                const hasData = m.jornadasCount > 0;

                return (
                  <Fragment key={m.monthKey}>
                    {/* Row Summary */}
                    <tr 
                      onClick={() => hasData && toggleMonthCollapse(m.monthKey)}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        hasData ? 'cursor-pointer' : 'opacity-60'
                      } ${!isCollapsed ? 'bg-emerald-50/30' : ''}`}
                    >
                      <td className="p-3 pl-4 font-bold text-gray-900">{m.name}</td>
                      <td className="p-3 text-right font-medium">{hasData ? m.rMale : '-'}</td>
                      <td className="p-3 text-right font-medium">{hasData ? m.rFemale : '-'}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">{hasData ? m.rTotal : '-'}</td>
                      <td className="p-3 text-right font-medium">{hasData ? m.pigeonsCount : '-'}</td>
                      <td className="p-3 text-center font-semibold text-gray-700">{hasData ? m.jornadasCount : '-'}</td>
                      <td className="p-3 text-center font-semibold text-emerald-600">{hasData ? m.withCazaCount : '-'}</td>
                      <td className="p-3 text-center font-semibold text-amber-600">{hasData ? m.withoutCazaCount : '-'}</td>
                      <td className="p-3 pr-4 text-center">
                        {hasData && (
                          <span className="inline-flex items-center justify-center p-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-500">
                            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expandable Daily Detail Row */}
                    {!isCollapsed && hasData && (
                      <tr>
                        <td colSpan={9} className="p-0 bg-gray-50/50">
                          <div className="border-t border-b border-gray-200/80 divide-y divide-gray-100 max-h-[450px] overflow-y-auto">
                            {m.records.map((rec) => {
                              const totalCaptured = (rec.rabbits_total || 0) + (rec.pigeons || 0)
                              return (
                                <div key={rec.id} className="p-4 pl-8 pr-6 hover:bg-white transition flex flex-col sm:flex-row justify-between gap-3 text-xs">
                                  <div className="space-y-1.5 flex-1">
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

                                  <span className="text-[11px] text-gray-500 flex items-start gap-1 font-semibold whitespace-nowrap mt-0.5">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                    {formatRecordDate(rec.record_date)}
                                  </span>
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

      {/* Modal Registrar Jornada Caza */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">Registrar Jornada de Caza</h3>
            </div>

            <form onSubmit={handleCreatePestRecord} className="space-y-3">
              {/* Cliente (Read Only) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Cliente</label>
                <div className="p-2.5 bg-gray-100 border border-gray-200 rounded text-xs font-semibold text-gray-700 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>{clientNameDisplay}</span>
                </div>
              </div>

              {/* Fecha de la Jornada (Only for Admin / Supervisor) */}
              {isAdminOrSuper && (
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
              )}

              {/* Selector de Operador (Only for Admin / Supervisor) */}
              {isAdminOrSuper ? (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Operador Responsable de Caza</label>
                  <select
                    value={responsibleId}
                    onChange={(e) => setResponsibleId(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-medium"
                  >
                    {operators.map(op => (
                      <option key={op.id} value={op.id}>
                        {op.full_name} ({op.role})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Operador Responsable</label>
                  <div className="p-2 bg-gray-100 border border-gray-200 rounded text-xs font-medium text-gray-600">
                    {profile?.full_name} ({profile?.role})
                  </div>
                </div>
              )}

              {/* Sector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Sector / Zona</label>
                <input
                  type="text"
                  required
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  list="sectors-list"
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-medium"
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
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Conejos Hembra</label>
                  <input
                    type="number"
                    min="0"
                    value={rabbitsFemale}
                    onChange={(e) => setRabbitsFemale(Number(e.target.value))}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-semibold"
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
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-semibold"
                />
              </div>

              {/* Motivo de No-Caza (If 0 animals) */}
              {(Number(rabbitsMale) + Number(rabbitsFemale) + Number(pigeons)) === 0 && (
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

              {/* Método */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Método / Autorización SAG</label>
                <input
                  type="text"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                />
              </div>

              {/* Observaciones generales */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Observaciones de la Jornada</label>
                <textarea
                  rows={2}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Detalles sobre el estado del terreno, horario, clima..."
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-xs font-semibold rounded hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 disabled:opacity-50"
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
