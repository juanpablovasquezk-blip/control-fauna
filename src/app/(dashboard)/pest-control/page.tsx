'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthProvider'
import { Bird, Plus, Calendar, CheckCircle2 } from 'lucide-react'

export default function PestControlPage() {
  const [records, setRecords] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Form
  const [clientId, setClientId] = useState('')
  const [sector, setSector] = useState('Sector Pista Principal')
  const [rabbitsMale, setRabbitsMale] = useState(0)
  const [rabbitsFemale, setRabbitsFemale] = useState(0)
  const [pigeons, setPigeons] = useState(0)
  const [method, setMethod] = useState('Método Caza Autorizada SAG')
  const [observations, setObservations] = useState('')
  const [saving, setSaving] = useState(false)
  const { profile } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    fetchPestData()
  }, [])

  async function fetchPestData() {
    setLoading(true)
    const { data: clientsData } = await supabase.from('clients').select('*').eq('active', true)
    if (clientsData) {
      setClients(clientsData)
      if (clientsData.length > 0) setClientId(clientsData[0].id)
    }

    const { data: pestData } = await supabase
      .from('pest_control_records')
      .select('*, client:clients(*), responsible:profiles(*)')
      .order('created_at', { ascending: false })

    if (pestData) setRecords(pestData)
    setLoading(false)
  }

  const handleCreatePestRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)

    try {
      const totalRabbits = Number(rabbitsMale) + Number(rabbitsFemale)
      const { error } = await supabase.from('pest_control_records').insert({
        client_id: clientId,
        sector,
        rabbits_male: Number(rabbitsMale),
        rabbits_female: Number(rabbitsFemale),
        rabbits_total: totalRabbits,
        pigeons: Number(pigeons),
        method,
        observations,
        responsible_id: profile.id,
      })

      if (error) throw error
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
          onClick={() => setShowModal(true)}
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
          <span className="text-xs text-gray-500">{records.length} jornadas</span>
        </div>

        {loading ? (
          <div className="p-6 text-center text-xs text-gray-500">Cargando jornadas...</div>
        ) : records.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">No hay jornadas de caza registradas.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {records.map((rec) => (
              <div key={rec.id} className="p-4 hover:bg-gray-50 transition flex flex-col sm:flex-row justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">{rec.sector}</span>
                    <span className="text-xs text-gray-500">({rec.client?.name})</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold text-emerald-700 pt-1">
                    <span>Conejos: {rec.rabbits_total} (M: {rec.rabbits_male} | H: {rec.rabbits_female})</span>
                    <span>Palomas: {rec.pigeons}</span>
                  </div>
                  <p className="text-[11px] text-gray-400">Operador Caza: {rec.responsible?.full_name}</p>
                </div>
                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {new Date(rec.record_date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Registrar Jornada Caza */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Registrar Jornada de Caza</h3>

            <form onSubmit={handleCreatePestRecord} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Cliente</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Conejos Macho</label>
                  <input
                    type="number"
                    min="0"
                    value={rabbitsMale}
                    onChange={(e) => setRabbitsMale(Number(e.target.value))}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Conejos Hembra</label>
                  <input
                    type="number"
                    min="0"
                    value={rabbitsFemale}
                    onChange={(e) => setRabbitsFemale(Number(e.target.value))}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
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
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Método / Autorización SAG</label>
                <input
                  type="text"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-xs font-semibold rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700"
                >
                  Guardar Jornada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
