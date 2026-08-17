'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthProvider'
import { DeliveryAct, Client, AnimalRecord } from '@/types'
import { FileCheck, Printer, Camera, Plus, FileText, CheckCircle } from 'lucide-react'

export default function DeliveryActsPage() {
  const [acts, setActs] = useState<DeliveryAct[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [animals, setAnimals] = useState<AnimalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showScanModal, setShowScanModal] = useState<string | null>(null)
  const [scanImage, setScanImage] = useState<string | null>(null)
  const { profile } = useAuth()
  const supabase = createClient()

  // Act Form State
  const [clientId, setClientId] = useState('')
  const [animalId, setAnimalId] = useState('')
  const [receiverName, setReceiverName] = useState('')
  const [receiverRut, setReceiverRut] = useState('')
  const [receiverOrg, setReceiverOrg] = useState('Fundación Protección Animal')
  const [receiverAddress, setReceiverAddress] = useState('')
  const [receiverPhone, setReceiverPhone] = useState('')
  const [receiverEmail, setReceiverEmail] = useState('')
  const [observations, setObservations] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchActsData()
  }, [])

  async function fetchActsData() {
    setLoading(true)
    const { data: clientsData } = await supabase.from('clients').select('*').eq('active', true)
    if (clientsData) {
      setClients(clientsData as Client[])
      if (clientsData.length > 0) setClientId(clientsData[0].id)
    }

    const { data: animalsData } = await supabase.from('animal_records').select('*').eq('was_captured', true)
    if (animalsData) {
      setAnimals(animalsData as AnimalRecord[])
      if (animalsData.length > 0) setAnimalId(animalsData[0].id)
    }

    const { data: actsData } = await supabase
      .from('delivery_acts')
      .select('*, client:clients(*), animal:animal_records(*)')
      .order('created_at', { ascending: false })

    if (actsData) setActs(actsData as DeliveryAct[])
    setLoading(false)
  }

  const handleCreateAct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)

    try {
      const actNumber = `ACT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      const selectedAnimal = animals.find(a => a.id === animalId)

      const { data, error } = await supabase.from('delivery_acts').insert({
        act_number: actNumber,
        event_id: selectedAnimal?.event_id || animalId,
        client_id: clientId,
        animal_id: animalId,
        capture_datetime: new Date().toISOString(),
        capture_location: 'Área Aeroportuaria',
        species: selectedAnimal?.species || 'Perro',
        sex: selectedAnimal?.sex || 'Indeterminado',
        size: selectedAnimal?.size || 'Mediano',
        color_features: selectedAnimal?.color_features || '',
        apparent_age: selectedAnimal?.apparent_age || 'Adulto',
        delivery_datetime: new Date().toISOString(),
        delivering_user: profile.id,
        receiver_name: receiverName,
        receiver_rut: receiverRut,
        receiver_organization: receiverOrg,
        receiver_address: receiverAddress,
        receiver_phone: receiverPhone,
        receiver_email: receiverEmail,
        observations,
      }).select().single()

      if (error) throw error

      // Update animal status
      const nextStatus = selectedAnimal?.species === 'Gato' ? 'Finalizado' : 'Pendiente Adopción'
      await supabase.from('animal_records').update({ animal_status: nextStatus }).eq('id', animalId)

      setShowModal(false)
      fetchActsData()
      alert(`Acta N° ${actNumber} creada con éxito. Puede imprimirla ahora.`)
    } catch (err: any) {
      alert('Error al crear acta: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleScanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) setScanImage(event.target.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveSignedScan = async () => {
    if (!showScanModal || !scanImage) return
    setSaving(true)

    try {
      // Save simulated scan PDF URL
      await supabase.from('delivery_acts').update({
        signed_scan_url: scanImage
      }).eq('id', showScanModal)

      setShowScanModal(null)
      setScanImage(null)
      fetchActsData()
      alert('Acta firmada y escaneada guardada correctamente.')
    } catch (err: any) {
      alert('Error guardando escáner: ' + err.message)
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
            <FileCheck className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Actas de Entrega de Animales</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Generación de actas oficiales, impresión en impresora WiFi y escaneo de actas firmadas.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Acta de Entrega</span>
        </button>
      </div>

      {/* Acts List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Historial de Actas</h3>
          <span className="text-xs text-gray-500">{acts.length} actas</span>
        </div>

        {loading ? (
          <div className="p-6 text-center text-xs text-gray-500">Cargando actas...</div>
        ) : acts.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">No hay actas de entrega emitidas.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {acts.map((act) => (
              <div key={act.id} className="p-4 hover:bg-gray-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600">{act.act_number}</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded">
                      {act.species}
                    </span>
                    {act.signed_scan_url ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Firmada & Escaneada
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                        Pendiente Escáner
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-800 font-medium">Recibe: {act.receiver_name} ({act.receiver_rut})</p>
                  <p className="text-[11px] text-gray-500">Organización: {act.receiver_organization || 'Particular'}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir WiFi</span>
                  </button>

                  <button
                    onClick={() => setShowScanModal(act.id)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Escanear Firmada</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Nueva Acta */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900">Emisión de Acta de Entrega</h3>

            <form onSubmit={handleCreateAct} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Seleccionar Animal Capturado</label>
                <select
                  value={animalId}
                  onChange={(e) => setAnimalId(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                >
                  {animals.map(a => (
                    <option key={a.id} value={a.id}>{a.species} - {a.color_features || 'Sin color'} ({a.sex})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Persona que Recibe</label>
                <input
                  type="text"
                  required
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">RUT Receptor</label>
                  <input
                    type="text"
                    required
                    value={receiverRut}
                    onChange={(e) => setReceiverRut(e.target.value)}
                    placeholder="12.345.678-9"
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Organización / Agrupación</label>
                <input
                  type="text"
                  value={receiverOrg}
                  onChange={(e) => setReceiverOrg(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Dirección de Destino</label>
                <input
                  type="text"
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
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
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700"
                >
                  Emitir Acta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Escanear Acta Firmada */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Escanear / Subir Acta Firmada</h3>

            <div className="space-y-3">
              <label className="w-full p-6 border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center cursor-pointer transition">
                <Camera className="w-8 h-8 text-blue-600 mb-2" />
                <span className="text-xs font-bold text-gray-800">Fotografiar / Seleccionar Archivo</span>
                <span className="text-[10px] text-gray-400 mt-0.5">El sistema aplicará procesamiento de escáner en PDF</span>
                <input type="file" accept="image/*" onChange={handleScanUpload} className="hidden" />
              </label>

              {scanImage && (
                <div className="p-2 border rounded-lg bg-gray-50">
                  <img src={scanImage} alt="Scan preview" className="max-h-48 w-full object-contain rounded" />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowScanModal(null)}
                className="px-4 py-2 bg-gray-100 text-xs font-semibold rounded"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!scanImage || saving}
                onClick={handleSaveSignedScan}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 disabled:opacity-50"
              >
                Guardar Acta Escaneada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
