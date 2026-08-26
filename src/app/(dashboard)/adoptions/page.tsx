'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { 
  HeartHandshake, CheckCircle2, FileText, Upload, Tag, 
  UserCheck, X, Download, ShieldCheck, AlertCircle 
} from 'lucide-react'
import { formatFreeText, formatRut } from '@/lib/utils/formatters'
import { uploadImageFile } from '@/lib/utils/uploadHelpers'
import { 
  getAdoptionsDataAction, 
  saveOnlyChipAction, 
  completeFullAdoptionAction 
} from './actions'

export default function AdoptionsPage() {
  const [pendingDogs, setPendingDogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDog, setSelectedDog] = useState<any | null>(null)
  const [modalMode, setModalMode] = useState<'only_chip' | 'full_adoption'>('only_chip')

  // Form State
  const [chipNumber, setChipNumber] = useState('')
  const [adopterName, setAdopterName] = useState('')
  const [adopterRut, setAdopterRut] = useState('')
  const [adopterPhone, setAdopterPhone] = useState('')
  const [adopterEmail, setAdopterEmail] = useState('')
  const [adopterAddress, setAdopterAddress] = useState('')
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [contractPreview, setContractPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { profile } = useAuth()

  useEffect(() => {
    fetchPendingDogs()
  }, [])

  async function fetchPendingDogs() {
    setLoading(true)
    const res = await getAdoptionsDataAction()
    if (res.success) {
      setPendingDogs(res.dogs || [])
    }
    setLoading(false)
  }

  const openDogModal = (dog: any, mode: 'only_chip' | 'full_adoption') => {
    setSelectedDog(dog)
    setModalMode(mode)
    
    // Existing adoption record if any
    const existingAdoption = dog.adoptions && dog.adoptions.length > 0 ? dog.adoptions[0] : null
    
    setChipNumber(dog.microchip_number || existingAdoption?.microchip_number || '')
    setAdopterName(existingAdoption?.adopter_name !== 'Pendiente Adopción' ? (existingAdoption?.adopter_name || '') : '')
    setAdopterRut(existingAdoption?.adopter_rut !== 'PENDIENTE' ? (existingAdoption?.adopter_rut || '') : '')
    setAdopterPhone(existingAdoption?.adopter_phone !== 'PENDIENTE' ? (existingAdoption?.adopter_phone || '') : '')
    setAdopterEmail(existingAdoption?.adopter_email || '')
    setAdopterAddress(existingAdoption?.adopter_address !== 'PENDIENTE' ? (existingAdoption?.adopter_address || '') : '')
    setContractFile(null)
    setContractPreview(existingAdoption?.contract_url || null)
  }

  const handleSaveOnlyChip = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDog) return
    if (!chipNumber.trim()) {
      alert('Por favor ingrese el número de Microchip.')
      return
    }

    setSaving(true)
    try {
      const res = await saveOnlyChipAction(selectedDog.id, chipNumber.trim())
      if (!res.success) throw new Error(res.error)

      alert(`Microchip N° ${chipNumber.trim()} guardado correctamente en la ficha del perro.`)
      setSelectedDog(null)
      fetchPendingDogs()
    } catch (err: any) {
      alert('Error guardando microchip: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCompleteFullAdoption = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDog || !profile) return

    if (!chipNumber.trim()) {
      alert('El número de Microchip es OBLIGATORIO para completar la adopción.')
      return
    }

    if (!adopterName.trim() || !adopterRut.trim() || !adopterPhone.trim() || !adopterAddress.trim()) {
      alert('Por favor complete todos los datos del adoptante (Nombre, RUT, Teléfono y Dirección).')
      return
    }

    setSaving(true)
    try {
      let contractUrl = contractPreview || ''
      if (contractFile) {
        contractUrl = await uploadImageFile(contractFile, `adoptions/${selectedDog.id}`)
      }

      const res = await completeFullAdoptionAction({
        animal_id: selectedDog.id,
        microchip_number: chipNumber.trim(),
        adopter_name: formatFreeText(adopterName),
        adopter_rut: formatRut(adopterRut),
        adopter_phone: adopterPhone.trim(),
        adopter_email: adopterEmail.trim(),
        adopter_address: formatFreeText(adopterAddress),
        contract_url: contractUrl,
        completed_by: profile.id
      })

      if (!res.success) throw new Error(res.error)

      alert('Proceso de adopción completado correctamente. Ficha del perro finalizada y cerrada.')
      setSelectedDog(null)
      fetchPendingDogs()
    } catch (err: any) {
      alert('Error al finalizar la adopción: ' + err.message)
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
          <h1 className="text-xl font-bold text-gray-900">Gestión de Adopciones y Microchips (Chip & RNM)</h1>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Asignación independiente de Microchips y registro de contratos de adopción responsable para el cierre de expedientes.
        </p>
      </div>

      {/* Pending Dogs List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Perros Pendientes de Registro ({pendingDogs.length})</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Cargando canes pendientes...</div>
        ) : pendingDogs.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-gray-200 text-center text-xs text-gray-400">
            No hay perros pendientes de chip o contrato de adopción.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingDogs.map((dog) => {
              const existingAdoption = dog.adoptions && dog.adoptions.length > 0 ? dog.adoptions[0] : null
              const currentChip = dog.microchip_number || existingAdoption?.microchip_number
              const photoUrl = dog.photo_urls && dog.photo_urls[0] ? dog.photo_urls[0] : null

              return (
                <div key={dog.id} className="bg-white p-5 rounded-2xl border border-purple-200 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-full">
                        {currentChip ? '🏷️ CHIP ASIGNADO' : 'PENDIENTE CHIP & RNM'}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {new Date(dog.created_at).toLocaleDateString('es-CL')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt="Perro"
                          className="w-14 h-14 object-cover rounded-xl border border-gray-200 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center text-purple-400 shrink-0">
                          <Tag className="w-6 h-6" />
                        </div>
                      )}

                      <div className="text-xs space-y-0.5">
                        <p className="font-bold text-gray-900">{dog.species} - {dog.sex}</p>
                        <p className="text-gray-600">Color: {dog.color_features || 'Sin señas'}</p>
                        <p className="text-gray-500">Tamaño: {dog.size || 'Mediano'}</p>
                      </div>
                    </div>

                    {currentChip ? (
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 font-semibold flex items-center gap-2">
                        <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate">Microchip: <strong>{currentChip}</strong></span>
                      </div>
                    ) : (
                      <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 italic">
                        Sin número de Microchip asignado aún.
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => openDogModal(dog, 'only_chip')}
                      className="w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>{currentChip ? 'Editar Solo Microchip' : 'Ingresar Solo Microchip'}</span>
                    </button>

                    <button
                      onClick={() => openDogModal(dog, 'full_adoption')}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                    >
                      <HeartHandshake className="w-3.5 h-3.5" />
                      <span>Completar Adopción Completa</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Ingreso de Chip / Adopción */}
      {selectedDog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                  REGISTRO DE CHIP / ADOPCIÓN RESPONSABLE
                </span>
                <h3 className="text-base font-bold text-gray-900">
                  {selectedDog.species} ({selectedDog.sex}) - {selectedDog.color_features || 'Sin señas'}
                </h3>
              </div>
              <button onClick={() => setSelectedDog(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setModalMode('only_chip')}
                className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  modalMode === 'only_chip'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>1. Solo Microchip</span>
              </button>

              <button
                type="button"
                onClick={() => setModalMode('full_adoption')}
                className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  modalMode === 'full_adoption'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>2. Adopción Completa</span>
              </button>
            </div>

            {/* FORM 1: SOLO MICROCHIP */}
            {modalMode === 'only_chip' && (
              <form onSubmit={handleSaveOnlyChip} className="space-y-4">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 text-xs leading-relaxed">
                  ℹ️ Permite registrar o actualizar únicamente el <strong>Número de Microchip</strong> en la ficha del can. No requiere datos de adoptante ni cierra el expediente aún.
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    N° de Microchip Impuesto *
                  </label>
                  <input
                    type="text"
                    required
                    value={chipNumber}
                    onChange={(e) => setChipNumber(e.target.value)}
                    placeholder="Ej: 990000001234567"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setSelectedDog(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow transition"
                  >
                    {saving ? 'Guardando...' : 'Guardar Solo Microchip'}
                  </button>
                </div>
              </form>
            )}

            {/* FORM 2: ADOPCIÓN COMPLETA */}
            {modalMode === 'full_adoption' && (
              <form onSubmit={handleCompleteFullAdoption} className="space-y-3.5 text-xs">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 text-xs leading-relaxed">
                  ⚠️ Requiere <strong>Microchip OBLIGATORIO</strong> y todos los datos del adoptante para finalizar el proceso y cerrar formalmente la ficha del can.
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    N° de Microchip Impuesto *
                  </label>
                  <input
                    type="text"
                    required
                    value={chipNumber}
                    onChange={(e) => setChipNumber(e.target.value)}
                    placeholder="Ej: 990000001234567"
                    className="w-full p-2.5 bg-gray-50 border border-purple-300 rounded-xl text-xs font-bold text-purple-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo del Adoptante *</label>
                  <input
                    type="text"
                    required
                    value={adopterName}
                    onChange={(e) => setAdopterName(e.target.value)}
                    placeholder="Nombre y Apellidos"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">RUT del Adoptante *</label>
                    <input
                      type="text"
                      required
                      value={adopterRut}
                      onChange={(e) => setAdopterRut(formatRut(e.target.value))}
                      placeholder="12.345.678-9"
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono de Contacto *</label>
                    <input
                      type="text"
                      required
                      value={adopterPhone}
                      onChange={(e) => setAdopterPhone(e.target.value)}
                      placeholder="+56 9 1234 5678"
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Correo Electrónico (Recomendado)</label>
                  <input
                    type="email"
                    value={adopterEmail}
                    onChange={(e) => setAdopterEmail(e.target.value)}
                    placeholder="ejemplo@correo.cl"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Dirección Residencial del Adoptante *</label>
                  <input
                    type="text"
                    required
                    value={adopterAddress}
                    onChange={(e) => setAdopterAddress(e.target.value)}
                    placeholder="Calle, Número, Comuna, Ciudad"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Documento de Contrato / Ficha de Adopción (PDF / Foto)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0]
                        setContractFile(file)
                        setContractPreview(URL.createObjectURL(file))
                      }
                    }}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setSelectedDog(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow transition"
                  >
                    {saving ? 'Guardando...' : 'Finalizar Adopción y Cerrar Ficha'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
