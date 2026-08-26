'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthProvider'
import { KennelRecord, KennelCleaning } from '@/types'
import { Dog, Sparkles, AlertTriangle, Plus, Clock, CheckCircle2, Camera } from 'lucide-react'
import { createKennelCleaningAction } from './actions'
import { uploadImageFile } from '@/lib/utils/uploadHelpers'
import { sendKennelCleaningWhatsAppAlert } from '@/lib/utils/whatsapp'
import { formatFreeText } from '@/lib/utils/formatters'

function formatKennelDate(entryDatetime?: string): string {
  if (!entryDatetime) return ''
  const cleanStr = entryDatetime.split('T')[0]
  const parts = cleanStr.split('-')
  if (parts.length === 3) {
    return `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}/${parts[0]}`
  }
  return new Date(entryDatetime).toLocaleDateString()
}

export default function KennelPage() {
  const [activeKennels, setActiveKennels] = useState<KennelRecord[]>([])
  const [cleanings, setCleanings] = useState<KennelCleaning[]>([])
  const [loading, setLoading] = useState(true)
  const [showCleaningModal, setShowCleaningModal] = useState(false)
  const { profile } = useAuth()
  const supabase = createClient()

  // Cleaning Form
  const [cleaningType, setCleaningType] = useState('')
  const [observations, setObservations] = useState('')
  const [cleaningFile, setCleaningFile] = useState<File | null>(null)
  const [cleaningPreview, setCleaningPreview] = useState<string | null>(null)
  const [cleaningDate, setCleaningDate] = useState('')
  const [cleaningTime, setCleaningTime] = useState('')
  const [saving, setSaving] = useState(false)

  const isAdminOrSuper = profile && ['admin', 'supervisor'].includes(profile.role)

  useEffect(() => {
    fetchKennelData()
  }, [])

  const openCleaningModal = () => {
    const now = new Date()
    setCleaningType('')
    setObservations('')
    setCleaningFile(null)
    setCleaningPreview(null)
    setCleaningDate(now.toISOString().slice(0, 10))
    setCleaningTime(now.toTimeString().slice(0, 5))
    setShowCleaningModal(true)
  }

  const handleCleaningFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setCleaningFile(file)
      setCleaningPreview(URL.createObjectURL(file))
    }
  }

  async function fetchKennelData() {
    setLoading(true)
    // 1. Fetch from kennel_records
    const { data: kennelData } = await supabase
      .from('kennel_records')
      .select('*, animal:animal_records(*)')
      .eq('status', 'En canil')

    // 2. Fetch directly from animal_records with status 'En canil' to ensure no animal is missed
    const { data: animalData } = await supabase
      .from('animal_records')
      .select('*')
      .eq('animal_status', 'En canil')
      .eq('was_captured', true)

    const list: KennelRecord[] = []
    const seenAnimalIds = new Set<string>()

    if (kennelData) {
      for (const k of kennelData) {
        if (k.animal_id) seenAnimalIds.add(k.animal_id)
        list.push(k as KennelRecord)
      }
    }

    if (animalData) {
      for (const a of animalData) {
        if (!seenAnimalIds.has(a.id)) {
          seenAnimalIds.add(a.id)
          list.push({
            id: `virtual-${a.id}`,
            animal_id: a.id,
            species: a.species,
            entry_datetime: a.created_at,
            entry_responsible: '',
            status: 'En canil',
            animal: a
          } as KennelRecord)
        }
      }
    }

    setActiveKennels(list)

    // 3. Cleaning Logs - Query with graceful fallback
    let { data: cleaningData, error: cleanErr } = await supabase
      .from('kennel_cleanings')
      .select('*, operator:profiles(*)')
      .order('created_at', { ascending: false })

    if (cleanErr || !cleaningData) {
      console.warn('Error fetching cleaning logs with operator join, trying fallback query:', cleanErr)
      const { data: fallbackData } = await supabase
        .from('kennel_cleanings')
        .select('*')
        .order('created_at', { ascending: false })
      cleaningData = fallbackData as any
    }

    if (cleaningData) {
      setCleanings(cleaningData as KennelCleaning[])
    }
    setLoading(false)
  }

  const handleRegisterCleaning = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    if (!cleaningType) {
      alert('Debe seleccionar el tipo de aseo.')
      return
    }

    setSaving(true)

    try {
      let photoUrl = ''
      if (cleaningFile) {
        photoUrl = await uploadImageFile(cleaningFile, 'kennel_cleaning_photos')
      }

      const cleanDate = cleaningDate || new Date().toISOString().slice(0, 10)
      const cleanTime = (cleaningTime || '12:00').slice(0, 5)
      let cleaningTimestamp = new Date().toISOString()
      try {
        cleaningTimestamp = new Date(`${cleanDate}T${cleanTime}:00`).toISOString()
      } catch {
        cleaningTimestamp = new Date().toISOString()
      }

      const activeAnimalIds = activeKennels.map(k => k.animal_id).filter(Boolean)
      const res = await createKennelCleaningAction({
        operator_id: profile.id,
        cleaning_type: cleaningType,
        observations: formatFreeText(observations),
        photo_url: photoUrl,
        active_animal_ids: activeAnimalIds,
        cleaning_datetime: cleaningTimestamp,
      })

      if (!res.success) {
        alert('Error al guardar el registro de aseo: ' + (res.error || 'Error en la base de datos.'))
        return
      }

      // Trigger WhatsApp notification (asynchronous & silent)
      sendKennelCleaningWhatsAppAlert({
        cleaning_type: cleaningType,
        operator_name: profile.full_name || 'Operador',
        animal_count: activeKennels.length,
        observations: formatFreeText(observations),
        photo_url: photoUrl,
        cleaning_date: cleanDate,
        cleaning_time: cleanTime,
      }).catch(err => console.warn('Kennel cleaning WhatsApp alert error:', err))

      setShowCleaningModal(false)
      setObservations('')
      setCleaningFile(null)
      setCleaningPreview(null)
      fetchKennelData()
      alert('Aseo de canil registrado correctamente y vinculado a los animales presentes.')
    } catch (err: any) {
      if (err?.message?.includes('Server Action') || err?.message?.includes('was not found')) {
        alert('Se ha actualizado la plataforma a una nueva versión. La página se recargará automáticamente para aplicar la actualización.')
        window.location.reload()
        return
      }
      alert('Error registrando aseo: ' + err.message)
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
            <Dog className="w-6 h-6 text-amber-600" />
            <h1 className="text-xl font-bold text-gray-900">Control de Canil & Registro de Aseo</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Custodia temporal de perros y gatos, con trazabilidad obligatoria de desinfección y alimentación.
          </p>
        </div>
        <button
          onClick={openCleaningModal}
          disabled={activeKennels.length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow transition"
        >
          <Sparkles className="w-4 h-4" />
          <span>Registrar Aseo de Canil</span>
        </button>
      </div>

      {/* Active Animals in Kennel Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Animales Bajo Custodia Actual ({activeKennels.length})</h3>

        {activeKennels.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl border border-gray-200 text-center text-xs text-gray-400">
            No hay animales actualmente en el canil.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeKennels.map((k) => (
              <div key={k.id} className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase">
                    {k.species}
                  </span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatKennelDate(k.entry_datetime)}
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-gray-800">Sexo: {k.animal?.sex || 'Indeterminado'}</p>
                  <p className="text-gray-600">Color: {k.animal?.color_features || 'No especificado'}</p>
                  <p className="text-gray-500">Edad aparente: {k.animal?.apparent_age || 'Indeterminada'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cleaning History List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Historial de Aseos y Alimentación</h3>
          <span className="text-xs text-gray-500">{cleanings.length} registros</span>
        </div>

        {cleanings.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">No hay registros de aseo cargados.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {cleanings.map((c) => (
              <div key={c.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-gray-900">{c.cleaning_type}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{c.observations || 'Sin observaciones'}</p>
                  <p className="text-[10px] text-gray-400">Realizado por: {c.operator?.full_name || 'Operador / Admin'}</p>
                </div>
                <span className="text-[11px] text-gray-500 font-medium">
                  {new Date(c.created_at || c.cleaning_datetime || '').toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Registrar Aseo */}
      {showCleaningModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Registrar Aseo / Limpieza de Canil</h3>

            <form onSubmit={handleRegisterCleaning} className="space-y-3">
              {isAdminOrSuper && (
                <div className="grid grid-cols-2 gap-2 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">📅 Fecha de Aseo *</label>
                    <input
                      type="date"
                      required
                      value={cleaningDate}
                      onChange={(e) => setCleaningDate(e.target.value)}
                      className="w-full p-2 bg-white border border-amber-300 rounded text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">⏰ Hora de Aseo *</label>
                    <input
                      type="time"
                      required
                      value={cleaningTime}
                      onChange={(e) => setCleaningTime(e.target.value)}
                      className="w-full p-2 bg-white border border-amber-300 rounded text-xs font-semibold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Aseo / Mantención *</label>
                <select
                  value={cleaningType}
                  onChange={(e) => setCleaningType(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                >
                  <option value="">-- Seleccionar Tipo de Aseo --</option>
                  <option value="Limpieza general y desinfección">Limpieza general y desinfección</option>
                  <option value="Alimentación y agua fresca">Alimentación y agua fresca</option>
                  <option value="Aseo completo + alimentación">Aseo completo + alimentación</option>
                  <option value="Inspección de salud y descanso">Inspección de salud y descanso</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Observaciones</label>
                <textarea
                  rows={3}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Detalles sobre el estado del canil y los animales..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Foto de Respaldo (Alimentación / Limpieza)</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-bold text-xs transition">
                    <Camera className="w-4 h-4 text-amber-600" />
                    <span>{cleaningFile ? 'Cambiar Foto' : 'Tomar / Adjuntar Foto'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleCleaningFileChange}
                    />
                  </label>
                </div>
                {cleaningPreview && (
                  <div className="mt-2 relative rounded-xl overflow-hidden border border-amber-200">
                    <img src={cleaningPreview} alt="Vista previa aseo" className="h-28 w-full object-cover" />
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800">
                Este registro de aseo quedará automáticamente vinculado a los <strong>{activeKennels.length}</strong> animales presentes en el canil en este momento.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCleaningModal(false)}
                  className="px-4 py-2 bg-gray-100 text-xs font-semibold rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded hover:bg-amber-700"
                >
                  Guardar Aseo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
