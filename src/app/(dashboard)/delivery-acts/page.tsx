'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthProvider'
import { DeliveryAct, Client, AnimalRecord } from '@/types'
import { FileCheck, Printer, Camera, Plus, FileText, CheckCircle, Eye, X } from 'lucide-react'
import { createDeliveryActAction, getDeliveryActsDataAction, updateSignedScanAction } from './actions'

function toTitleCase(str: string | undefined | null): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .trim()
    .split(' ')
    .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1) : '')
    .join(' ')
}

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
  const [receiverOrg, setReceiverOrg] = useState('')
  const [receiverAddress, setReceiverAddress] = useState('')
  const [receiverPhone, setReceiverPhone] = useState('')
  const [receiverEmail, setReceiverEmail] = useState('')
  const [observations, setObservations] = useState('')
  const [operators, setOperators] = useState<any[]>([])
  const [deliveringUserId, setDeliveringUserId] = useState('')
  const [saving, setSaving] = useState(false)

  const isAdminOrSuper = profile && ['admin', 'supervisor'].includes(profile.role)

  useEffect(() => {
    fetchActsData()
  }, [])

  useEffect(() => {
    if (profile && !deliveringUserId && !isAdminOrSuper) {
      setDeliveringUserId(profile.id)
    }
  }, [profile, isAdminOrSuper])

  async function fetchActsData() {
    setLoading(true)
    const res = await getDeliveryActsDataAction()
    if (res.success) {
      setClients(res.clients as Client[])
      setAnimals(res.animals as AnimalRecord[])
      setOperators(res.operators)
      setActs(res.acts as DeliveryAct[])
    } else {
      console.error('Error fetching acts:', res.error)
    }
    setLoading(false)
  }

  const openNewActModal = () => {
    setAnimalId('')
    setClientId('')
    setReceiverName('')
    setReceiverRut('')
    setReceiverOrg('')
    setReceiverAddress('')
    setReceiverPhone('')
    setReceiverEmail('')
    setObservations('')
    setDeliveringUserId(isAdminOrSuper ? '' : (profile?.id || ''))
    setShowModal(true)
  }

  const handleCreateAct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    const finalDeliveringUser = isAdminOrSuper ? deliveringUserId : profile.id
    if (!finalDeliveringUser) {
      alert('Debe seleccionar el operador / usuario que realiza la entrega.')
      return
    }

    if (!animalId) {
      alert('Debe seleccionar un animal capturado.')
      return
    }

    setSaving(true)

    try {
      const actNumber = `ACT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      const selectedAnimal = animals.find(a => a.id === animalId) as any
      const targetClientId = selectedAnimal?.event?.client_id || clientId || clients[0]?.id

      const res = await createDeliveryActAction({
        act_number: actNumber,
        event_id: selectedAnimal?.event_id || animalId,
        client_id: targetClientId,
        animal_id: animalId,
        capture_datetime: new Date().toISOString(),
        capture_location: 'Área Aeroportuaria',
        species: selectedAnimal?.species || 'Perro',
        sex: selectedAnimal?.sex || 'Indeterminado',
        size: selectedAnimal?.size || 'Mediano',
        color_features: selectedAnimal?.color_features || '',
        apparent_age: selectedAnimal?.apparent_age || 'Adulto',
        delivery_datetime: new Date().toISOString(),
        delivering_user: finalDeliveringUser,
        receiver_name: receiverName,
        receiver_rut: receiverRut,
        receiver_organization: receiverOrg,
        receiver_address: receiverAddress,
        receiver_phone: receiverPhone,
        receiver_email: receiverEmail,
        observations,
      })

      if (!res.success) throw new Error(res.error)

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
      const res = await updateSignedScanAction(showScanModal, scanImage)
      if (!res.success) throw new Error(res.error)

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

  const [showFormatPreview, setShowFormatPreview] = useState(false)
  const [selectedPreviewAct, setSelectedPreviewAct] = useState<DeliveryAct | null>(null)

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
            Generación de actas oficiales, impresión directa WiFi y trazabilidad de animales entregados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedPreviewAct(null)
              setShowFormatPreview(true)
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl shadow-sm transition"
          >
            <Eye className="w-4 h-4 text-gray-600" />
            <span>Ver Formato Modelo</span>
          </button>
          <button
            onClick={openNewActModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Acta de Entrega</span>
          </button>
        </div>
      </div>

      {/* Acts List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Historial de Actas Emitidas</h3>
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
                    onClick={() => {
                      setSelectedPreviewAct(act)
                      setShowFormatPreview(true)
                    }}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Acta</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedPreviewAct(act)
                      setShowFormatPreview(true)
                      setTimeout(() => window.print(), 300)
                    }}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir</span>
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
              {isAdminOrSuper && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Operador / Usuario que Entrega *</label>
                  <select
                    value={deliveringUserId}
                    onChange={(e) => setDeliveringUserId(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-semibold"
                  >
                    <option value="">-- Seleccionar Operador --</option>
                    {operators.map(op => (
                      <option key={op.id} value={op.id}>{op.full_name} ({op.role})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Seleccionar Animal Capturado *</label>
                <select
                  value={animalId}
                  onChange={(e) => setAnimalId(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                >
                  <option value="">-- Seleccionar Animal Capturado --</option>
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

      {/* Modal 3: Vista Previa del Formato Oficial de Acta */}
      {showFormatPreview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col my-auto border border-gray-100">
            {/* Modal Header - Fixed */}
            <div className="flex items-start justify-between border-b border-gray-200 pb-3 flex-shrink-0 print:hidden">
              <div>
                <h3 className="text-base font-bold text-gray-900">Vista Previa de Acta Oficial de Entrega</h3>
                <p className="text-xs text-gray-500">Documento listo para impresión WiFi o guardado digital en PDF.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Descargar PDF</span>
                </button>

                <button
                  onClick={() => setShowFormatPreview(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Printable Official Document Format - Scrollable */}
            <div className="overflow-y-auto flex-1 my-3 pr-1 space-y-5 border border-gray-300 rounded-xl p-5 bg-white text-xs text-gray-900 shadow-inner font-sans">
              {/* Document Header */}
              <div className="flex items-center justify-between border-b-2 border-gray-900 pb-4 gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <img src="/logos/LOGO MINERQUIM.jpg" alt="Grupo Minerquim" className="w-[2cm] max-w-[20%] h-auto object-contain flex-shrink-0" />
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wide leading-tight">
                      SERVICIO DE CONTROL Y MITIGACIÓN DE FAUNA AEROPORTUARIA
                    </h2>
                    <p className="text-[10px] text-gray-600 font-semibold mt-0.5">
                      Unidad de Gestión de Fauna y Tenencia Responsable | Grupo Minerquim
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-900 font-black text-sm rounded-lg border border-blue-200">
                    {selectedPreviewAct?.act_number || 'ACT-2026-MODELO'}
                  </span>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Fecha: {selectedPreviewAct ? new Date(selectedPreviewAct.delivery_datetime).toLocaleDateString('es-CL') : new Date().toLocaleDateString('es-CL')}
                  </p>
                </div>
              </div>

              <div className="text-center py-1 bg-gray-100 font-black uppercase text-xs tracking-wider rounded border border-gray-200">
                ACTA OFICIAL DE ENTREGA Y CUSTODIA DE ANIMAL
              </div>

              {/* Section 1: Antecedentes */}
              <div className="space-y-2 border-b border-gray-200 pb-3">
                <h4 className="font-bold text-gray-900 uppercase text-[11px]">1. Antecedentes del Cliente Solicitante</h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <p><strong>Cliente / Entidad:</strong> {selectedPreviewAct?.client?.name || 'DGAC - Dirección General de Aeronáutica Civil'}</p>
                  <p><strong>Lugar de Captura / Origen:</strong> {selectedPreviewAct?.capture_location || 'Área Aeroportuaria (Pistas / Lado Aire)'}</p>
                  <p><strong>Fecha / Hora Entrega:</strong> {selectedPreviewAct ? new Date(selectedPreviewAct.delivery_datetime).toLocaleString('es-CL') : new Date().toLocaleString('es-CL')}</p>
                </div>
              </div>

              {/* Section 2: Detalle del Animal */}
              <div className="space-y-2 border-b border-gray-200 pb-3">
                <h4 className="font-bold text-gray-900 uppercase text-[11px]">2. Identificación del Animal Entregado</h4>
                <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200 text-[11px]">
                  <p><strong>Especie:</strong> {selectedPreviewAct?.species || 'Perro / Gato'}</p>
                  <p><strong>Sexo:</strong> {selectedPreviewAct?.sex || 'Macho / Hembra'}</p>
                  <p><strong>Tamaño:</strong> {selectedPreviewAct?.size || 'Mediano'}</p>
                  <p><strong>Color / Señas:</strong> {toTitleCase(selectedPreviewAct?.color_features) || 'No especificado'}</p>
                  <p><strong>Edad Aparente:</strong> {selectedPreviewAct?.apparent_age || 'Adulto'}</p>
                  <p><strong>Estado de Salud:</strong> Saludable / En custodia</p>
                </div>
              </div>

              {/* Section 3: Receptor */}
              <div className="space-y-2 border-b border-gray-200 pb-3">
                <h4 className="font-bold text-gray-900 uppercase text-[11px]">3. Datos de la Persona o Agrupación Receptora</h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <p><strong>Nombre Completo:</strong> {toTitleCase(selectedPreviewAct?.receiver_name) || 'Nombre Receptor'}</p>
                  <p><strong>RUT Receptor:</strong> {selectedPreviewAct?.receiver_rut || '12.345.678-9'}</p>
                  <p><strong>Organización / Refugio:</strong> {toTitleCase(selectedPreviewAct?.receiver_organization) || 'Particular'}</p>
                  <p><strong>Teléfono / Domicilio:</strong> {selectedPreviewAct?.receiver_phone || '+56 9 1234 5678'} | {toTitleCase(selectedPreviewAct?.receiver_address) || 'Dirección de Destino'}</p>
                </div>
              </div>

              {/* Section 4: Cláusula legal */}
              <div className="space-y-1 bg-amber-50/70 p-3 rounded-lg border border-amber-200 text-[10px] text-gray-800">
                <p className="font-bold uppercase text-amber-900">4. DECLARACIÓN Y COMPROMISO DE CUSTODIA</p>
                <p className="leading-relaxed">
                  Por medio de la presente, MINERQUIM LTDA. hace entrega del animal individualizado en esta acta, y quien suscribe en calidad de receptor declara haberlo recibido, asumiendo la custodia y responsabilidad por su cuidado y bienestar desde el momento de la entrega. Los antecedentes del rescate se encuentran registrados en el sistema correspondiente, asociados al ID de Rescate indicado en esta acta.
                </p>
              </div>

              {/* Section 5: Firmas */}
              {(() => {
                const deliveringUserObj = operators.find(op => op.id === selectedPreviewAct?.delivering_user)
                const deliveringName = deliveringUserObj ? toTitleCase(deliveringUserObj.full_name) : 'Nombre Entregante'
                const deliveringRut = deliveringUserObj?.rut ? `RUT: ${deliveringUserObj.rut}` : 'RUT Entregante'
                const receiverNameFormatted = selectedPreviewAct ? toTitleCase(selectedPreviewAct.receiver_name) : 'Nombre Receptor'

                return (
                  <div className="pt-10 grid grid-cols-2 gap-8 text-center text-[11px]">
                    <div className="space-y-1">
                      <div className="border-b border-gray-400 w-48 mx-auto h-10"></div>
                      <p className="font-bold pt-1">FIRMA ENTREGANTE</p>
                      <p className="text-[10px] text-gray-800 font-bold">{deliveringName}</p>
                      <p className="text-[9px] text-gray-600 font-medium">
                        {deliveringRut}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="border-b border-gray-400 w-48 mx-auto h-10"></div>
                      <p className="font-bold pt-1">FIRMA RECEPTOR</p>
                      <p className="text-[10px] text-gray-800 font-bold">{receiverNameFormatted}</p>
                      <p className="text-[9px] text-gray-600 font-medium">
                        RUT: {selectedPreviewAct?.receiver_rut || 'RUT Receptor'}
                      </p>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Modal Footer - Fixed */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 flex-shrink-0 print:hidden">
              <button
                type="button"
                onClick={() => setShowFormatPreview(false)}
                className="px-5 py-2 bg-gray-900 text-white font-bold text-xs rounded-xl shadow hover:bg-gray-800 transition cursor-pointer"
              >
                Cerrar Vista Previa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
