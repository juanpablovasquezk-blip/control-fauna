'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { Bird, Plus, Calendar, AlertCircle, Info, Shield, CheckCircle2 } from 'lucide-react'
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
    // Reset form defaults
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

    // Reason validation when 0 animals are captured
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

      {/* Records List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Historial de Jornadas</h3>
          <span className="text-xs text-gray-500">{records.length} jornadas registradas</span>
        </div>

        {loading ? (
          <div className="p-6 text-center text-xs text-gray-500">Cargando jornadas...</div>
        ) : records.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">No hay jornadas de caza registradas.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {records.map((rec) => {
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
                      <span>Palomas: {rec.pigeons}</span>
                    </div>

                    {rec.observations && (
                      <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 mt-1">
                        <span className="font-semibold text-gray-700">Observaciones:</span> {rec.observations}
                      </p>
                    )}

                    <p className="text-[11px] text-gray-400">
                      Operador Caza: <span className="font-semibold text-gray-600">{rec.responsible?.full_name || 'No especificado'}</span>
                    </p>
                  </div>

                  <span className="text-[11px] text-gray-500 flex items-start gap-1 whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                    {new Date(rec.record_date).toLocaleDateString()}
                  </span>
                </div>
              )
            })}
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
