'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthProvider'
import { AnimalRecord } from '@/types'
import { HeartHandshake, CheckCircle2, FileText, Upload } from 'lucide-react'

export default function AdoptionsPage() {
  const [pendingDogs, setPendingDogs] = useState<AnimalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDog, setSelectedDog] = useState<AnimalRecord | null>(null)
  
  // Adoption form
  const [chipNumber, setChipNumber] = useState('')
  const [adopterName, setAdopterName] = useState('')
  const [adopterRut, setAdopterRut] = useState('')
  const [adopterPhone, setAdopterPhone] = useState('')
  const [adopterAddress, setAdopterAddress] = useState('')
  const [rnmPdfUrl, setRnmPdfUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const { profile } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    fetchPendingDogs()
  }, [])

  async function fetchPendingDogs() {
    setLoading(true)
    const { data } = await supabase
      .from('animal_records')
      .select('*, event:events(*)')
      .eq('species', 'Perro')
      .eq('animal_status', 'Pendiente Adopción')

    if (data) setPendingDogs(data as AnimalRecord[])
    setLoading(false)
  }

  const handleCompleteAdoption = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDog || !profile) return
    setSaving(true)

    try {
      // 1. Insert adoption record
      const { error: adOptErr } = await supabase.from('adoption_records').insert({
        animal_id: selectedDog.id,
        microchip_number: chipNumber,
        adopter_name: adopterName,
        adopter_rut: adopterRut,
        adopter_phone: adopterPhone,
        adopter_address: adopterAddress,
        rnm_pdf_url: rnmPdfUrl || 'https://registratumascota.cl/comprobante_simulado.pdf',
        completed_by: profile.id,
      })

      if (adOptErr) throw adOptErr

      // 2. Update animal status to Finalizado
      await supabase.from('animal_records').update({
        animal_status: 'Finalizado'
      }).eq('id', selectedDog.id)

      setSelectedDog(null)
      fetchPendingDogs()
      alert('Proceso de adopción finalizado correctamente. Ficha de perro cerrada.')
    } catch (err: any) {
      alert('Error completando adopción: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <HeartHandshake className="w-6 h-6 text-purple-600" />
          <h1 className="text-xl font-bold text-gray-900">Gestión de Adopciones de Perros (Chip & RNM)</h1>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Registro post-entrega obligatorio para cerrar expedientes de perros entregados.
        </p>
      </div>

      {/* Pending Dogs List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Perros Pendientes de Adopción ({pendingDogs.length})</h3>

        {loading ? (
          <div className="p-6 text-center text-xs text-gray-500">Cargando adopciones pendientes...</div>
        ) : pendingDogs.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl border border-gray-200 text-center text-xs text-gray-400">
            No hay perros pendientes de chip o Registro Nacional de Mascotas.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingDogs.map((dog) => (
              <div key={dog.id} className="bg-white p-5 rounded-2xl border border-purple-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-full">
                    PENDIENTE CHIP & RNM
                  </span>
                  <span className="text-[11px] text-gray-400">Capturado: {new Date(dog.created_at).toLocaleDateString()}</span>
                </div>

                <div className="text-xs space-y-1">
                  <p className="font-semibold text-gray-900">Características: {dog.color_features || 'No especificadas'}</p>
                  <p className="text-gray-600">Sexo: {dog.sex} | Tamaño: {dog.size}</p>
                </div>

                <button
                  onClick={() => setSelectedDog(dog)}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Completar Adopción</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Completar Adopción */}
      {selectedDog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Completar Datos de Adopción</h3>

            <form onSubmit={handleCompleteAdoption} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">N° de Microchip Impuesto</label>
                <input
                  type="text"
                  required
                  value={chipNumber}
                  onChange={(e) => setChipNumber(e.target.value)}
                  placeholder="Ej: 990000001234567"
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Adoptante</label>
                <input
                  type="text"
                  required
                  value={adopterName}
                  onChange={(e) => setAdopterName(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">RUT Adoptante</label>
                  <input
                    type="text"
                    required
                    value={adopterRut}
                    onChange={(e) => setAdopterRut(e.target.value)}
                    placeholder="12.345.678-9"
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    required
                    value={adopterPhone}
                    onChange={(e) => setAdopterPhone(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Dirección del Adoptante</label>
                <input
                  type="text"
                  required
                  value={adopterAddress}
                  onChange={(e) => setAdopterAddress(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">PDF Comprobante Registro Nacional Mascotas (RNM)</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setRnmPdfUrl(URL.createObjectURL(e.target.files[0]))
                  }}
                  className="w-full text-xs text-gray-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDog(null)}
                  className="px-4 py-2 bg-gray-100 text-xs font-semibold rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded hover:bg-purple-700"
                >
                  Finalizar Expediente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
