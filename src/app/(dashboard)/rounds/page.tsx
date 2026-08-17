'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthProvider'
import { Round } from '@/types'
import { Compass, AlertTriangle, Camera, Plus, CheckCircle, Clock } from 'lucide-react'

export default function RoundsPage() {
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const { profile } = useAuth()
  const supabase = createClient()

  // Form State
  const [zone, setZone] = useState('Zona Umbral Pista 35L')
  const [observations, setObservations] = useState('')
  const [hasFenceIncident, setHasFenceIncident] = useState(false)
  const [damageDescription, setDamageDescription] = useState('')
  const [actionTaken, setActionTaken] = useState('')
  const [wasRepaired, setWasRepaired] = useState(false)
  const [damagePhotos, setDamagePhotos] = useState<string[]>([])
  const [repairPhotos, setRepairPhotos] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchRounds()
  }, [])

  async function fetchRounds() {
    setLoading(true)
    const { data, error } = await supabase
      .from('rounds')
      .select('*, operator:profiles(*)')
      .order('start_time', { ascending: false })

    if (!error && data) {
      setRounds(data as Round[])
    }
    setLoading(false)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'damage' | 'repair') => {
    const files = e.target.files
    if (!files) return

    const newUrls: string[] = []
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          if (target === 'damage' && damagePhotos.length < 3) {
            setDamagePhotos(prev => [...prev, event.target!.result as string].slice(0, 3))
          } else if (target === 'repair' && repairPhotos.length < 3) {
            setRepairPhotos(prev => [...prev, event.target!.result as string].slice(0, 3))
          }
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)

    try {
      // 1. Insert Round
      const { data: roundData, error: roundError } = await supabase
        .from('rounds')
        .insert({
          operator_id: profile.id,
          zone,
          observations,
          has_fence_incident: hasFenceIncident,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
        })
        .select()
        .single()

      if (roundError) throw roundError

      // 2. Insert Fence Incident if toggle is ON
      if (hasFenceIncident && roundData) {
        await supabase.from('fence_incidents').insert({
          round_id: roundData.id,
          damage_description: damageDescription,
          action_taken: actionTaken,
          was_repaired: wasRepaired,
          damage_photo_urls: damagePhotos,
          repair_photo_urls: repairPhotos,
          email_sent: true,
        })
      }

      setShowModal(false)
      resetForm()
      fetchRounds()
    } catch (err: any) {
      alert('Error guardando ronda: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setZone('Zona Umbral Pista 35L')
    setObservations('')
    setHasFenceIncident(false)
    setDamageDescription('')
    setActionTaken('')
    setWasRepaired(false)
    setDamagePhotos([])
    setRepairPhotos([])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-6 h-6 text-orange-600" />
            <h1 className="text-xl font-bold text-gray-900">Rondas Perimetrales de Inspección</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Registro de patrullajes de prevención y detección de daños en cerco perimetral.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Iniciar Nueva Ronda</span>
        </button>
      </div>

      {/* Rounds List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Historial de Patrullajes</h3>
          <span className="text-xs text-gray-500">{rounds.length} registros</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Cargando rondas...</div>
        ) : rounds.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">No hay rondas registradas hoy.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rounds.map((r) => (
              <div key={r.id} className="p-4 hover:bg-gray-50/80 transition flex flex-col sm:flex-row justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">{r.zone}</span>
                    {r.has_fence_incident ? (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Incidencia Reja
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Sin Novedad
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{r.observations || 'Sin observaciones adicionales.'}</p>
                  <p className="text-[10px] text-gray-400">Operador: {r.operator?.full_name || 'Desconocido'}</p>
                </div>
                <div className="text-right flex sm:flex-col justify-between items-end text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(r.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>{new Date(r.round_date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Nueva Ronda */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900">Registro de Ronda de Inspección</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Zona del Aeródromo</label>
                <select
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                >
                  <option value="Zona Umbral Pista 35L">Zona Umbral Pista 35L</option>
                  <option value="Zona Umbral Pista 17R">Zona Umbral Pista 17R</option>
                  <option value="Perímetro Norte Carga">Perímetro Norte Carga</option>
                  <option value="Perímetro Sur Terminal">Perímetro Sur Terminal</option>
                  <option value="Calle de Rodaje Alpha">Calle de Rodaje Alpha</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Observaciones Generales</label>
                <textarea
                  rows={2}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Detalles sobre el recorrido..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              {/* Incidencia Toggle */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800">¿Detectó daño o rotura en el cerco perimetral?</span>
                  <input
                    type="checkbox"
                    checked={hasFenceIncident}
                    onChange={(e) => setHasFenceIncident(e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                </div>

                {hasFenceIncident && (
                  <div className="space-y-3 pt-2 border-t border-gray-200">
                    <div>
                      <label className="block text-[11px] font-bold text-red-700 mb-1">Descripción del Daño / Orificio</label>
                      <input
                        type="text"
                        required
                        value={damageDescription}
                        onChange={(e) => setDamageDescription(e.target.value)}
                        placeholder="Ej: Malla cortada en tramo 45"
                        className="w-full p-2 border border-gray-300 rounded text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Fotos del Daño (Máximo 3)</label>
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-1.5 bg-gray-200 text-gray-800 text-xs rounded cursor-pointer flex items-center gap-1 font-semibold">
                          <Camera className="w-3.5 h-3.5" />
                          <span>Tomar Foto</span>
                          <input type="file" accept="image/*" multiple onChange={(e) => handlePhotoUpload(e, 'damage')} className="hidden" />
                        </label>
                        <span className="text-[10px] text-gray-500">{damagePhotos.length}/3 subidas</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Acción Tomada</label>
                      <input
                        type="text"
                        required
                        value={actionTaken}
                        onChange={(e) => setActionTaken(e.target.value)}
                        placeholder="Ej: Se parchó malla temporalmente"
                        className="w-full p-2 border border-gray-300 rounded text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={wasRepaired}
                        onChange={(e) => setWasRepaired(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span className="text-xs font-semibold text-gray-700">¿Daño reparado completamente?</span>
                    </div>

                    {wasRepaired && (
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Fotos de la Reparación (Máx 3)</label>
                        <div className="flex items-center gap-2">
                          <label className="px-3 py-1.5 bg-gray-200 text-gray-800 text-xs rounded cursor-pointer flex items-center gap-1 font-semibold">
                            <Camera className="w-3.5 h-3.5" />
                            <span>Foto Reparación</span>
                            <input type="file" accept="image/*" multiple onChange={(e) => handlePhotoUpload(e, 'repair')} className="hidden" />
                          </label>
                          <span className="text-[10px] text-gray-500">{repairPhotos.length}/3 subidas</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Ronda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
