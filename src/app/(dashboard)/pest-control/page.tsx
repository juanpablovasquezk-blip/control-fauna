'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { 
  Bird, Plus, Calendar, AlertCircle, Info, Shield, CheckCircle2, 
  ChevronDown, ChevronUp, Filter, FileSpreadsheet 
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

export default function PestControlPage() {
  const [records, setRecords] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [operators, setOperators] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Filters State
  const [filterMonth, setFilterMonth] = useState('Todos')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  // Collapsed months state
  const [collapsedMonths, setCollapsedMonths] = useState<{ [key: string]: boolean }>({})

  // Form states
  const [clientId, setClientId] = useState('')
  const [clientNameDisplay, setClientNameDisplay] = useState('DGAC - Dirección General de Aeronáutica Civil')
  const [responsibleId, setResponsibleId] = useState('')
  const [sector, setSector] = useState('Sector Pista Principal')
  const [rabbitsMale, setRabbitsMale] = useState(0)
  const [rabbitsFemale, setRabbitsFemale] = useState(0)
  const [pigeons, setPigeons] = useState(0)
  const [method, setMethod] = useState('Método Caza Autorizada SAG')
  const [noHuntingReason, setNoHuntingReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [observations, setObservations] = useState('')
  const [saving, setSaving] = useState(false)

  const { profile } = useAuth()
  const isAdminOrSuper = profile && ['admin', 'supervisor'].includes(profile.role)

  useEffect(() => {
    fetchPestData()
  }, [])

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

      // Initialize collapsed state (only the latest month expanded by default)
      if (res.records.length > 0) {
        const uniqueMonths = Array.from(new Set(res.records.map((r: any) => r.record_date.substring(0, 7)))) as string[]
        uniqueMonths.sort((a, b) => b.localeCompare(a)) // Sort descending

        const initialCollapsed: { [key: string]: boolean } = {}
        uniqueMonths.forEach((m, idx) => {
          initialCollapsed[m] = idx !== 0 // Expand first, collapse others
        })
        setCollapsedMonths(initialCollapsed)
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
    setSector('Sector Pista Principal')
    setMethod('Método Caza Autorizada SAG')
    if (profile) setResponsibleId(profile.id)
    setShowModal(true)
  }

  const handleCreatePestRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    const totalAnimals = Number(rabbitsMale) + Number(rabbitsFemale) + Number(pigeons)

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
        finalObservations = customReason.trim() + (observations ? ' | ' + observations : '')
      } else {
        finalObservations = noHuntingReason + (observations ? ' | ' + observations : '')
      }
    }

    setSaving(true)

    try {
      const selectedOperatorId = isAdminOrSuper ? (responsibleId || profile.id) : profile.id

      const res = await createPestRecordAction({
        client_id: clientId,
        sector,
        rabbits_male: Number(rabbitsMale),
        rabbits_female: Number(rabbitsFemale),
        pigeons: Number(pigeons),
        method,
        observations: finalObservations,
        responsible_id: selectedOperatorId
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

  // Translate "YYYY-MM" to readable "Mes Año" (e.g. "Agosto 2026")
  const getReadableMonth = (yearMonthStr: string) => {
    const [year, month] = yearMonthStr.split('-')
    const dateObj = new Date(Number(year), Number(month) - 1, 1)
    const monthName = dateObj.toLocaleDateString('es-CL', { month: 'long' })
    return monthName.charAt(0).toUpperCase() + monthName.slice(1) + ' ' + year
  }

  // Filter records based on active filters
  const filteredRecords = records.filter(rec => {
    if (filterMonth !== 'Todos') {
      const recMonth = rec.record_date.substring(0, 7)
      if (recMonth !== filterMonth) return false
    }
    if (filterStartDate && rec.record_date < filterStartDate) return false
    if (filterEndDate && rec.record_date > filterEndDate) return false
    return true
  })

  // Get unique months list for the filter dropdown
  const uniqueMonths = Array.from(new Set(records.map((r: any) => r.record_date.substring(0, 7)))).sort((a: any, b: any) => b.localeCompare(a))

  // Group filtered records by month
  const groupedByMonth: { [month: string]: any[] } = {}
  filteredRecords.forEach(rec => {
    const monthKey = rec.record_date.substring(0, 7)
    if (!groupedByMonth[monthKey]) {
      groupedByMonth[monthKey] = []
    }
    groupedByMonth[monthKey].push(rec)
  })

  const sortedGroupedMonths = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a))

  const toggleMonthCollapse = (monthKey: string) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }))
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
            Registro de jornadas de control y mitigación de fauna silvestre y avifauna.
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

      {/* Filters Area */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
          <Filter className="w-4 h-4 text-gray-500" />
          <span>Filtros y Búsqueda</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 mb-1">Filtrar por Mes</label>
            <select
              value={filterMonth}
              onChange={(e) => {
                setFilterMonth(e.target.value)
                setFilterStartDate('')
                setFilterEndDate('')
              }}
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs text-gray-700 font-medium"
            >
              <option value="Todos">Todos los meses</option>
              {uniqueMonths.map((m: any) => (
                <option key={m} value={m}>{getReadableMonth(m)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 mb-1">Fecha Desde</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => {
                setFilterStartDate(e.target.value)
                setFilterMonth('Todos')
              }}
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs text-gray-700"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 mb-1">Fecha Hasta</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => {
                setFilterEndDate(e.target.value)
                setFilterMonth('Todos')
              }}
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs text-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Records grouped list */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center text-xs text-gray-500">
            Cargando jornadas...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center text-xs text-gray-400">
            No se encontraron jornadas de caza con los filtros aplicados.
          </div>
        ) : (
          sortedGroupedMonths.map((monthKey) => {
            const monthRecords = groupedByMonth[monthKey]
            const isCollapsed = collapsedMonths[monthKey]

            // Calculate totals for this month's records
            const totalRabbitsMale = monthRecords.reduce((acc, r) => acc + (r.rabbits_male || 0), 0)
            const totalRabbitsFemale = monthRecords.reduce((acc, r) => acc + (r.rabbits_female || 0), 0)
            const totalRabbits = totalRabbitsMale + totalRabbitsFemale
            const totalPigeons = monthRecords.reduce((acc, r) => acc + (r.pigeons || 0), 0)
            const totalJornadas = monthRecords.length
            const activeCazaDays = monthRecords.filter(r => (r.rabbits_total + r.pigeons) > 0).length
            const noCazaDays = totalJornadas - activeCazaDays

            return (
              <div key={monthKey} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Accordion Header */}
                <button
                  onClick={() => toggleMonthCollapse(monthKey)}
                  className="w-full p-4 bg-gray-50 hover:bg-gray-100/70 border-b border-gray-200 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left"
                >
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">{getReadableMonth(monthKey)}</h3>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">
                      {totalJornadas} jornadas en total • {activeCazaDays} con caza • {noCazaDays} sin caza
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                      <span>Conejos: {totalRabbits} (M:{totalRabbitsMale} | H:{totalRabbitsFemale})</span>
                      {totalPigeons > 0 && <span>Palomas: {totalPigeons}</span>}
                    </div>
                    {isCollapsed ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </button>

                {/* Accordion Body */}
                {!isCollapsed && (
                  <div className="divide-y divide-gray-100">
                    {monthRecords.map((rec) => {
                      const totalCaptured = (rec.rabbits_total || 0) + (rec.pigeons || 0)
                      return (
                        <div key={rec.id} className="p-4 hover:bg-gray-50 transition flex flex-col sm:flex-row justify-between gap-3">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-gray-900">{rec.sector}</span>
                              <span className="text-xs text-gray-500">({rec.client?.name || 'DGAC'})</span>
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
                              <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 mt-1">
                                <span className="font-semibold text-gray-700">Observaciones / Motivo:</span> {rec.observations}
                              </p>
                            )}

                            <p className="text-[11px] text-gray-400">
                              Operador Caza: <span className="font-semibold text-gray-600">{rec.responsible?.full_name || 'No especificado'}</span>
                            </p>
                          </div>

                          <span className="text-[11px] text-gray-500 flex items-start gap-1 font-semibold whitespace-nowrap">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                            {formatRecordDate(rec.record_date)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
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
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                />
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
