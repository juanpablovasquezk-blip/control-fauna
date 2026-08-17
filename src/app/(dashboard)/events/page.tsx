'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthProvider'
import { EventActivation, AnimalRecord, Client } from '@/types'
import { ShieldAlert, Plus, Dog, Camera, Download, Send, CheckCircle2 } from 'lucide-react'

export default function EventsPage() {
  const [activations, setActivations] = useState<EventActivation[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showAnimalModal, setShowAnimalModal] = useState<string | null>(null)
  const { profile } = useAuth()
  const supabase = createClient()

  // Activation Form
  const [clientId, setClientId] = useState('')
  const [specificLocation, setSpecificLocation] = useState('Umbral Pista 35L')
  const [zones, setZones] = useState<any[]>([])
  const [airportZone, setAirportZone] = useState('')
  const [situationDescription, setSituationDescription] = useState('')
  const [generalResult, setGeneralResult] = useState<'Captura total' | 'Captura parcial' | 'Animales escaparon' | 'Sin hallazgo'>('Captura total')
  const [saving, setSaving] = useState(false)

  // Animal Record Form
  const [species, setSpecies] = useState<'Perro' | 'Gato' | 'Murciélago'>('Perro')
  const [sex, setSex] = useState<'Macho' | 'Hembra' | 'Indeterminado'>('Macho')
  const [size, setSize] = useState<'Pequeño' | 'Mediano' | 'Grande'>('Mediano')
  const [colorFeatures, setColorFeatures] = useState('')
  const [apparentAge, setApparentAge] = useState<'Cachorro/juvenil' | 'Adulto' | 'Senior' | 'Indeterminada'>('Adulto')
  const [wasCaptured, setWasCaptured] = useState(true)

  useEffect(() => {
    fetchInitialData()
  }, [])

  async function fetchInitialData() {
    setLoading(true)
    const { data: zoneData } = await supabase.from('airport_zones').select('*').order('name')
    if (zoneData) {
      setZones(zoneData)
      if (zoneData.length > 0) setAirportZone(zoneData[0].name)
    }

    const { data: clientsData } = await supabase.from('clients').select('*').eq('active', true)
    if (clientsData) {
      setClients(clientsData as Client[])
      if (clientsData.length > 0) setClientId(clientsData[0].id)
    }

    const { data: eventsData } = await supabase
      .from('events')
      .select('*, client:clients(*), operator:profiles(*)')
      .order('created_at', { ascending: false })

    if (eventsData) setActivations(eventsData as EventActivation[])
    setLoading(false)
  }

  const handleCreateActivation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)

    try {
      const code = `FAU-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`
      const { data, error } = await supabase.from('events').insert({
        event_code: code,
        client_id: clientId,
        operator_id: profile.id,
        specific_location: specificLocation,
        airport_zone: airportZone,
        situation_description: situationDescription,
        general_result: generalResult,
        status: 'En curso',
      }).select().single()

      if (error) throw error
      setShowModal(false)
      fetchInitialData()
    } catch (err: any) {
      alert('Error al crear activación: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateAnimalRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showAnimalModal || !profile) return
    setSaving(true)

    try {
      // 1. Create animal record
      const { data: animalData, error: animalError } = await supabase
        .from('animal_records')
        .insert({
          event_id: showAnimalModal,
          species,
          sex,
          size,
          color_features: colorFeatures,
          apparent_age: apparentAge,
          was_captured: wasCaptured,
          animal_status: wasCaptured ? 'En canil' : 'Escapó',
        })
        .select()
        .single()

      if (animalError) throw animalError

      // 2. If captured, insert into kennel
      if (wasCaptured && animalData && (species === 'Perro' || species === 'Gato')) {
        await supabase.from('kennel_records').insert({
          animal_id: animalData.id,
          species,
          entry_responsible: profile.id,
          status: 'En canil',
        })
      }

      setShowAnimalModal(null)
      fetchInitialData()
      alert('Registro de animal guardado con éxito.')
    } catch (err: any) {
      alert('Error guardando animal: ' + err.message)
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
            <ShieldAlert className="w-6 h-6 text-red-600" />
            <h1 className="text-xl font-bold text-gray-900">Intervenciones Canes (Perros/Gatos/Murciélagos)</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Registro de activaciones operacionales y capturas individuales por animal.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Activación / Aviso</span>
        </button>
      </div>

      {/* Activations List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Cargando activaciones...</div>
        ) : activations.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-gray-200 text-center text-xs text-gray-400">
            No hay intervenciones registradas.
          </div>
        ) : (
          activations.map((ev) => (
            <div key={ev.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">{ev.event_code}</span>
                  <h3 className="text-sm font-bold text-gray-900">{ev.client?.name}</h3>
                  <p className="text-xs text-gray-500">{ev.specific_location} ({ev.airport_zone})</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-[10px] font-semibold rounded-md">
                    {ev.general_result}
                  </span>
                  <button
                    onClick={() => setShowAnimalModal(ev.id)}
                    className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-semibold text-xs rounded-lg transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Animal</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-700 bg-gray-50 p-2.5 rounded-lg">{ev.situation_description}</p>
            </div>
          ))
        )}
      </div>

      {/* Modal Nueva Activación */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Nueva Activación de Intervención</h3>

            <form onSubmit={handleCreateActivation} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Cliente Solicitante</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Zona del Aeródromo</label>
                <select
                  value={airportZone}
                  onChange={(e) => setAirportZone(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.name}>{z.name}</option>
                  ))}
                  {zones.length === 0 && (
                    <option value="">Cargando zonas...</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Lugar Específico</label>
                <input
                  type="text"
                  required
                  value={specificLocation}
                  onChange={(e) => setSpecificLocation(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Descripción de la Situación / Aviso</label>
                <textarea
                  rows={3}
                  required
                  value={situationDescription}
                  onChange={(e) => setSituationDescription(e.target.value)}
                  placeholder="Ej: 3 perros avistados en umbral pista 35L..."
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
                  className="px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded hover:bg-orange-700"
                >
                  Crear Activación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Agregar Registro Individual de Animal */}
      {showAnimalModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Registro Individual de Animal</h3>

            <form onSubmit={handleCreateAnimalRecord} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Especie</label>
                <select
                  value={species}
                  onChange={(e: any) => setSpecies(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                >
                  <option value="Perro">Perro</option>
                  <option value="Gato">Gato</option>
                  <option value="Murciélago">Murciélago</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Sexo</label>
                  <select
                    value={sex}
                    onChange={(e: any) => setSex(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                  >
                    <option value="Macho">Macho</option>
                    <option value="Hembra">Hembra</option>
                    <option value="Indeterminado">Indeterminado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tamaño</label>
                  <select
                    value={size}
                    onChange={(e: any) => setSize(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                  >
                    <option value="Pequeño">Pequeño</option>
                    <option value="Mediano">Mediano</option>
                    <option value="Grande">Grande</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Color / Características</label>
                <input
                  type="text"
                  value={colorFeatures}
                  onChange={(e) => setColorFeatures(e.target.value)}
                  placeholder="Ej: Negro con manchas café en el pecho"
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                />
              </div>

              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                <input
                  type="checkbox"
                  checked={wasCaptured}
                  onChange={(e) => setWasCaptured(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded"
                />
                <span className="text-xs font-semibold text-gray-800">¿Fue capturado efectivamente?</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAnimalModal(null)}
                  className="px-4 py-2 bg-gray-100 text-xs font-semibold rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded hover:bg-orange-700"
                >
                  Guardar Animal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
