'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthProvider'
import { EventActivation, AnimalRecord, Client, ClosureType } from '@/types'
import { uploadImageFile } from '@/lib/utils/uploadHelpers'
import { 
  ShieldAlert, 
  Plus, 
  Dog, 
  Camera, 
  Download, 
  CheckCircle2, 
  Lock, 
  FileText, 
  Search, 
  Calendar, 
  AlertTriangle, 
  Wrench, 
  Eye, 
  X,
  Filter,
  User,
  MapPin,
  Clock
} from 'lucide-react'

import { formatFreeText } from '@/lib/utils/formatters'

export default function EventsPage() {
  const [activations, setActivations] = useState<EventActivation[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modals state
  const [showModal, setShowModal] = useState(false)
  const [showAnimalModal, setShowAnimalModal] = useState<string | null>(null)
  const [showCloseModal, setShowCloseModal] = useState<EventActivation | null>(null)
  const [showDetailModal, setShowDetailModal] = useState<EventActivation | null>(null)
  
  const { profile } = useAuth()
  const supabase = createClient()

  // New Activation Form State
  const [clientId, setClientId] = useState('')
  const [requestedBy, setRequestedBy] = useState('')
  const [specificLocation, setSpecificLocation] = useState('')
  const [zones, setZones] = useState<any[]>([])
  const [airportZone, setAirportZone] = useState('')
  const [operators, setOperators] = useState<any[]>([])
  const [operatorId, setOperatorId] = useState('')
  const [situationDescription, setSituationDescription] = useState('')
  const [generalResult, setGeneralResult] = useState<'Captura total' | 'Captura parcial' | 'Animales escaparon' | 'Sin hallazgo'>('Captura total')
  const [saving, setSaving] = useState(false)

  const isAdminOrSuper = profile && ['admin', 'supervisor'].includes(profile.role)

  useEffect(() => {
    if (profile && !operatorId) {
      setOperatorId(profile.id)
    }
  }, [profile])

  // Animal Record Form State
  const [species, setSpecies] = useState<string>('')
  const [sex, setSex] = useState<string>('')
  const [size, setSize] = useState<string>('')
  const [colorFeatures, setColorFeatures] = useState('')
  const [apparentAge, setApparentAge] = useState<string>('Adulto')
  const [wasCaptured, setWasCaptured] = useState(true)
  const [animalFile, setAnimalFile] = useState<File | null>(null)
  const [animalPreview, setAnimalPreview] = useState<string | null>(null)

  // Closure Form State
  const [closureType, setClosureType] = useState<ClosureType | ''>('')
  const [closureObs, setClosureObs] = useState('')
  const [hasFenceDamage, setHasFenceDamage] = useState(false)
  const [damageLocation, setDamageLocation] = useState('')
  const [damageDescription, setDamageDescription] = useState('')
  const [damageFile, setDamageFile] = useState<File | null>(null)
  const [repairFile, setRepairFile] = useState<File | null>(null)
  const [damagePreview, setDamagePreview] = useState<string | null>(null)
  const [repairPreview, setRepairPreview] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)

  // History Filter State
  const [filterPreset, setFilterPreset] = useState<'7d' | '30d' | 'month' | 'all'>('7d')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchInitialData()
  }, [])

  // Set default dates (last 7 days)
  useEffect(() => {
    const today = new Date()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(today.getDate() - 7)

    setEndDate(today.toISOString().split('T')[0])
    setStartDate(sevenDaysAgo.toISOString().split('T')[0])
  }, [])

  async function fetchInitialData() {
    setLoading(true)
    const { data: zoneData } = await supabase.from('airport_zones').select('*').order('name')
    if (zoneData) {
      setZones(zoneData)
    }

    const { data: clientsData } = await supabase.from('clients').select('*').eq('active', true)
    if (clientsData) {
      setClients(clientsData as Client[])
    }

    const { data: opData } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('active', true)
      .order('full_name')

    if (opData) setOperators(opData)

    // Explicitly specify operator_id foreign key relation to avoid PostgREST ambiguity with closed_by
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('*, client:clients(*), operator:profiles!operator_id(*), animal_records(*)')
      .order('created_at', { ascending: false })

    if (eventsError) {
      console.warn('Error fetching events with operator profile, executing fallback query:', eventsError.message)
      const { data: fallbackEvents } = await supabase
        .from('events')
        .select('*, client:clients(*), animal_records(*)')
        .order('created_at', { ascending: false })

      if (fallbackEvents) setActivations(fallbackEvents as EventActivation[])
    } else if (eventsData) {
      setActivations(eventsData as EventActivation[])
    }

    setLoading(false)
  }

  const openNewActivationModal = () => {
    setClientId('')
    setRequestedBy('')
    setAirportZone('')
    setSpecificLocation('')
    setSituationDescription('')
    setOperatorId(profile ? profile.id : '')
    setShowModal(true)
  }

  // Handle Preset Change
  const handlePresetChange = (preset: '7d' | '30d' | 'month' | 'all') => {
    setFilterPreset(preset)
    const today = new Date()
    
    if (preset === '7d') {
      const d = new Date()
      d.setDate(today.getDate() - 7)
      setStartDate(d.toISOString().split('T')[0])
      setEndDate(today.toISOString().split('T')[0])
    } else if (preset === '30d') {
      const d = new Date()
      d.setDate(today.getDate() - 30)
      setStartDate(d.toISOString().split('T')[0])
      setEndDate(today.toISOString().split('T')[0])
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      setStartDate(firstDay.toISOString().split('T')[0])
      setEndDate(today.toISOString().split('T')[0])
    } else if (preset === 'all') {
      setStartDate('')
      setEndDate('')
    }
  }

  const handleCreateActivation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    if (isAdminOrSuper && !operatorId) {
      alert('Debe seleccionar el operador a cargo / responsable.')
      return
    }
    if (!clientId) {
      alert('Debe seleccionar el cliente solicitante.')
      return
    }
    if (!requestedBy.trim()) {
      alert('Debe ingresar la persona o entidad que activa / solicita.')
      return
    }
    if (!airportZone) {
      alert('Debe seleccionar la zona del aeródromo.')
      return
    }
    if (!specificLocation.trim()) {
      alert('Debe ingresar el lugar específico.')
      return
    }
    if (!situationDescription.trim()) {
      alert('Debe ingresar la descripción del aviso / situación.')
      return
    }

    setSaving(true)

    try {
      const selectedOperatorId = (isAdminOrSuper && operatorId) ? operatorId : profile.id
      const code = `FAU-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`
      
      const formattedRequestedBy = formatFreeText(requestedBy)
      const formattedLocation = formatFreeText(specificLocation)
      const formattedSituation = formatFreeText(situationDescription)

      const { error } = await supabase.from('events').insert({
        event_code: code,
        client_id: clientId,
        operator_id: selectedOperatorId,
        requested_by: formattedRequestedBy,
        specific_location: formattedLocation,
        airport_zone: airportZone,
        situation_description: formattedSituation,
        general_result: generalResult || 'Captura total',
        status: 'En curso',
      })

      if (error) throw error
      setShowModal(false)
      setRequestedBy('')
      setSpecificLocation('')
      setSituationDescription('')
      setAirportZone('')
      setClientId('')
      fetchInitialData()
    } catch (err: any) {
      alert('Error al crear activación: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const openAnimalModal = (eventId: string) => {
    setShowAnimalModal(eventId)
    setSpecies('')
    setSex('')
    setSize('')
    setColorFeatures('')
    setApparentAge('Adulto')
    setWasCaptured(true)
    setAnimalFile(null)
    setAnimalPreview(null)
  }

  const handleAnimalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setAnimalFile(file)
      setAnimalPreview(URL.createObjectURL(file))
    }
  }

  const handleCreateAnimalRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showAnimalModal || !profile) return

    if (!species) {
      alert('Debe seleccionar la especie del animal.')
      return
    }
    if (!sex) {
      alert('Debe seleccionar el sexo.')
      return
    }
    if (!size) {
      alert('Debe seleccionar el tamaño.')
      return
    }
    if (!colorFeatures.trim()) {
      alert('Debe ingresar el color o señas características.')
      return
    }
    if (wasCaptured && !animalFile) {
      alert('En cualquier captura debe haber un registro fotográfico. Por favor suba una foto del animal.')
      return
    }

    setSaving(true)

    try {
      let photoUrl = ''
      if (animalFile) {
        photoUrl = await uploadImageFile(animalFile, `animal_photos/${showAnimalModal}`)
      }

      const photoUrls = photoUrl ? [photoUrl] : []

      const { data: animalData, error: animalError } = await supabase
        .from('animal_records')
        .insert({
          event_id: showAnimalModal,
          species: species as any,
          sex: sex as any,
          size: size as any,
          color_features: formatFreeText(colorFeatures),
          apparent_age: (apparentAge || 'Adulto') as any,
          was_captured: wasCaptured,
          animal_status: wasCaptured ? 'En canil' : 'Escapó',
          photo_urls: photoUrls,
        })
        .select()
        .single()

      if (animalError) throw animalError

      if (wasCaptured && animalData && (species === 'Perro' || species === 'Gato')) {
        await supabase.from('kennel_records').insert({
          animal_id: animalData.id,
          species: species as any,
          entry_responsible: profile.id,
          status: 'En canil',
        })
      }

      setShowAnimalModal(null)
      setAnimalFile(null)
      setAnimalPreview(null)
      setColorFeatures('')
      fetchInitialData()
      alert('Registro de animal guardado con éxito.')
    } catch (err: any) {
      alert('Error guardando animal: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const openCloseModal = (event: EventActivation) => {
    setShowCloseModal(event)
    setClosureType('Captura total')
    setClosureObs('')
    setHasFenceDamage(false)
    setDamageLocation(event.specific_location || '')
    setDamageDescription('')
    setDamageFile(null)
    setRepairFile(null)
    setDamagePreview(null)
    setRepairPreview(null)
  }

  const handleDamageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setDamageFile(file)
      setDamagePreview(URL.createObjectURL(file))
    }
  }

  const handleRepairFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setRepairFile(file)
      setRepairPreview(URL.createObjectURL(file))
    }
  }

  const handleCloseEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showCloseModal || !profile) return

    if (hasFenceDamage) {
      if (!damageFile) {
        alert('Debe subir la foto del daño en la reja.')
        return
      }
      if (!repairFile) {
        alert('Debe subir la foto del daño reparado.')
        return
      }
      if (!damageDescription.trim()) {
        alert('Debe ingresar la descripción del daño y reparación.')
        return
      }
    }

    setClosing(true)

    try {
      let damagePhotoUrl = ''
      let repairPhotoUrl = ''

      if (hasFenceDamage && damageFile && repairFile) {
        damagePhotoUrl = await uploadImageFile(damageFile, `fence_damage/${showCloseModal.id}`)
        repairPhotoUrl = await uploadImageFile(repairFile, `fence_repair/${showCloseModal.id}`)
      }

      // Base payload using columns guaranteed to exist in schema
      const basePayload: any = {
        status: 'Cerrado',
        general_result: closureType === 'Captura total' || closureType === 'Captura parcial' ? closureType : closureType === 'Abandono' ? 'Animales escaparon' : 'Sin hallazgo',
        observations: closureObs || '',
        has_perimeter_damage: hasFenceDamage,
      }

      if (hasFenceDamage) {
        const fullDesc = damageLocation ? `[Ubicación Daño: ${damageLocation}]\n${damageDescription}` : damageDescription
        basePayload.damage_description = fullDesc
        basePayload.damage_photo_urls = [damagePhotoUrl]
        basePayload.damage_repaired = true
        basePayload.repair_photo_urls = [repairPhotoUrl]
      }

      // Full payload including dedicated closure columns from 05_event_closure.sql
      const fullPayload = {
        ...basePayload,
        closure_type: closureType,
        closure_observations: closureObs || '',
        closed_at: new Date().toISOString(),
        closed_by: profile.id,
        damage_location: damageLocation || '',
      }

      // Try updating with fullPayload first
      let { data, error } = await supabase
        .from('events')
        .update(fullPayload)
        .eq('id', showCloseModal.id)
        .select()

      // Fallback if dedicated columns were missing or schema error
      if (error || !data || data.length === 0) {
        console.warn('Full update failed or returned empty data, attempting base update fallback...', error)
        const fallbackRes = await supabase
          .from('events')
          .update(basePayload)
          .eq('id', showCloseModal.id)
          .select()

        if (fallbackRes.error) throw fallbackRes.error
        if (!fallbackRes.data || fallbackRes.data.length === 0) {
          throw new Error('No se pudo actualizar el estado del procedimiento en la base de datos.')
        }
      }

      alert(`Procedimiento ${showCloseModal.event_code} cerrado exitosamente.`)
      setShowCloseModal(null)
      await fetchInitialData()
    } catch (err: any) {
      alert('Error cerrando procedimiento: ' + err.message)
    } finally {
      setClosing(false)
    }
  }

  // Helper to format local YYYY-MM-DD date string without UTC timezone shift
  function getLocalDateString(dateInput: string | Date | undefined | null): string {
    if (!dateInput) return ''
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Filter activations for Active vs Closed
  const activeActivations = activations.filter((ev) => ev.status !== 'Cerrado')

  const closedActivations = activations.filter((ev) => {
    const isClosed = ev.status?.toLowerCase() === 'cerrado'
    if (!isClosed) return false

    // Date filtering using local date string
    const eventDateStr = getLocalDateString(ev.closed_at || ev.created_at || ev.event_date)

    if (startDate && eventDateStr && eventDateStr < startDate) return false
    if (endDate && eventDateStr && eventDateStr > endDate) return false

    // Text search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      const matchesCode = ev.event_code?.toLowerCase().includes(term)
      const matchesClient = ev.client?.name?.toLowerCase().includes(term)
      const matchesLocation = ev.specific_location?.toLowerCase().includes(term)
      const matchesZone = ev.airport_zone?.toLowerCase().includes(term)
      const matchesClosure = ev.closure_type?.toLowerCase().includes(term)
      const matchesObs = ev.closure_observations?.toLowerCase().includes(term) || ev.observations?.toLowerCase().includes(term)

      return matchesCode || matchesClient || matchesLocation || matchesZone || matchesClosure || matchesObs
    }

    return true
  })

  return (
    <div className="space-y-8 pb-10">
      {/* ------------------------------------------------------------- */}
      {/* SECCIÓN 1: GADGET HEADER DEL TÍTULO                           */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-600" />
            <h1 className="text-xl font-bold text-gray-900">Intervenciones Canes (Perros/Gatos/Murciélagos)</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Registro de activaciones operacionales en curso, capturas e historial de procedimientos cerrados.
          </p>
        </div>
        <button
          onClick={openNewActivationModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Activación / Aviso</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECCIÓN 2: INTERVENCIONES EN CURSO                            */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
              Activaciones en Curso ({activeActivations.length})
            </h2>
          </div>
          <span className="text-xs text-gray-400">Casos requeridos de acción inmediata en terreno</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500 bg-white rounded-2xl border border-gray-200">
            Cargando activaciones...
          </div>
        ) : activeActivations.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-dashed border-gray-300 text-center space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-xs font-semibold text-gray-700">No hay activaciones pendientes en curso</p>
            <p className="text-[11px] text-gray-400">Todas las intervenciones activas han sido cerradas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {activeActivations.map((ev) => {
              const animals = ev.animal_records || []
              return (
                <div key={ev.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 hover:border-orange-200 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-orange-600 uppercase tracking-wide">{ev.event_code}</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                          En curso
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mt-0.5">{ev.client?.name}</h3>
                      <p className="text-xs text-gray-700 flex items-center gap-1.5 mt-0.5">
                        <User className="w-3.5 h-3.5 text-orange-600" />
                        <span><strong>Solicitante:</strong> {ev.requested_by || 'No especificado'}</span>
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span>{ev.specific_location}</span>
                        <span className="text-gray-300">•</span>
                        <span>{ev.airport_zone}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        onClick={() => openAnimalModal(ev.id)}
                        className="px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar Animal</span>
                      </button>

                      <button
                        onClick={() => openCloseModal(ev)}
                        className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5 text-orange-400" />
                        <span>Cerrar Procedimiento</span>
                      </button>
                    </div>
                  </div>

                  {/* Situation & Animals preview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 bg-gray-50 p-3 rounded-xl">
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Aviso / Situación Inicial</p>
                      <p className="text-xs text-gray-800">{ev.situation_description}</p>
                    </div>

                    <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100/60">
                      <p className="text-[11px] font-bold text-orange-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Dog className="w-3.5 h-3.5" />
                        <span>Animales Registrados ({animals.length})</span>
                      </p>
                      {animals.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Sin capturas agregadas aún</p>
                      ) : (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {animals.map((a, i) => (
                            <span key={i} className="px-2 py-0.5 bg-white text-gray-800 font-semibold text-[10px] rounded border border-orange-200">
                              {a.species} ({a.sex}) - {a.was_captured ? 'Capturado' : 'Escapó'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECCIÓN 3: TABLA HISTORIAL DE PROCEDIMIENTOS CERRADOS        */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-700" />
              <span>Historial de Procedimientos Cerrados</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Consulte el detalle completo de intervenciones finalizadas. Muestra por defecto los últimos 7 días.
            </p>
          </div>

          <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg self-start md:self-auto">
            {closedActivations.length} procedimientos cerrados
          </span>
        </div>

        {/* Control Bar: Filters & Search */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
          {/* Quick Presets */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-gray-500 font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Ver:</span>
            </span>
            <button
              onClick={() => handlePresetChange('7d')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filterPreset === '7d' ? 'bg-orange-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Últimos 7 días
            </button>
            <button
              onClick={() => handlePresetChange('30d')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filterPreset === '30d' ? 'bg-orange-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Últimos 30 días
            </button>
            <button
              onClick={() => handlePresetChange('month')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filterPreset === 'month' ? 'bg-orange-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Este Mes
            </button>
            <button
              onClick={() => handlePresetChange('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filterPreset === 'all' ? 'bg-orange-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Todos
            </button>
          </div>

          {/* Date range pickers & Search box */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded-lg border border-gray-300">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setFilterPreset('all')
                }}
                className="text-xs bg-transparent focus:outline-none text-gray-700"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setFilterPreset('all')
                }}
                className="text-xs bg-transparent focus:outline-none text-gray-700"
              />
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar código, cliente, sector..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Table of Closed Procedures */}
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100/80 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                <th className="p-3">Código / Fecha Cierre</th>
                <th className="p-3">Cliente / Ubicación</th>
                <th className="p-3">Motivo de Cierre</th>
                <th className="p-3">Animales</th>
                <th className="p-3">Daño Reja</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {closedActivations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 italic">
                    No se encontraron procedimientos cerrados para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                closedActivations.map((ev) => {
                  const animalsCount = ev.animal_records?.length || 0
                  const closedDate = ev.closed_at ? new Date(ev.closed_at).toLocaleDateString('es-CL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'No registrado'

                  return (
                    <tr
                      key={ev.id}
                      onClick={() => setShowDetailModal(ev)}
                      className="hover:bg-orange-50/50 cursor-pointer transition"
                    >
                      <td className="p-3 font-semibold text-gray-900">
                        <div className="text-orange-600 font-bold">{ev.event_code}</div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{closedDate}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-gray-800">{ev.client?.name}</div>
                        <div className="text-[11px] text-gray-500">{ev.specific_location} ({ev.airport_zone})</div>
                        {ev.requested_by && <div className="text-[10px] text-orange-700 font-semibold mt-0.5">Sol: {ev.requested_by}</div>}
                      </td>

                      <td className="p-3">
                        <span className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full ${
                          ev.closure_type === 'Captura total' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          ev.closure_type === 'Captura parcial' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          ev.closure_type === 'Abandono' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {ev.closure_type || ev.general_result || 'Cerrado'}
                        </span>
                      </td>

                      <td className="p-3 font-medium text-gray-700">
                        {animalsCount === 0 ? (
                          <span className="text-gray-400">Sin animales</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-800 font-bold rounded-md text-[11px]">
                            {animalsCount} {animalsCount === 1 ? 'animal' : 'animales'}
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        {ev.has_perimeter_damage ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold rounded-full">
                            <Wrench className="w-3 h-3 text-red-600" />
                            <span>Sí (Reparado)</span>
                          </span>
                        ) : (
                          <span className="text-gray-400 font-medium">No</span>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowDetailModal(ev)
                          }}
                          className="px-3 py-1.5 bg-white border border-gray-300 hover:border-orange-500 hover:text-orange-600 text-gray-700 text-[11px] font-bold rounded-lg shadow-sm transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Antecedentes</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: NUEVA ACTIVACIÓN DE INTERVENCIÓN                     */}
      {/* ------------------------------------------------------------- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-600" />
                <span>Nueva Activación / Aviso</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateActivation} className="space-y-3 text-xs">
              {isAdminOrSuper && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Operador a Cargo / Responsable en Terreno *</label>
                  <select
                    value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Seleccionar Operador --</option>
                    {operators.map((op: any) => (
                      <option key={op.id} value={op.id}>
                        {op.full_name} ({op.role?.toUpperCase() || 'OPERADOR'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 mb-1">Cliente Solicitante *</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">-- Seleccionar Cliente --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Persona o Entidad que Activa / Solicita *</label>
                <input
                  type="text"
                  required
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  onBlur={() => setRequestedBy(formatFreeText(requestedBy))}
                  placeholder="Ej: Torre de Control, SAM 4, Pedro Soto (DGAC)"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Zona del Aeródromo *</label>
                <select
                  value={airportZone}
                  onChange={(e) => setAirportZone(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">-- Seleccionar Zona --</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.name}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Lugar Específico</label>
                <input
                  type="text"
                  required
                  value={specificLocation}
                  onChange={(e) => setSpecificLocation(e.target.value)}
                  placeholder="Ej: Umbral Pista 35L (Calle Alpha)"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Descripción del Aviso / Situación</label>
                <textarea
                  rows={3}
                  required
                  value={situationDescription}
                  onChange={(e) => setSituationDescription(e.target.value)}
                  placeholder="Ej: 3 perros avistados deambulando en calle de rodaje..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 shadow"
                >
                  {saving ? 'Guardando...' : 'Crear Activación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: AGREGAR REGISTRO INDIVIDUAL DE ANIMAL                */}
      {/* ------------------------------------------------------------- */}
      {showAnimalModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Dog className="w-5 h-5 text-orange-600" />
                <span>Registro Individual de Animal</span>
              </h3>
              <button onClick={() => setShowAnimalModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnimalRecord} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Especie *</label>
                <select
                  required
                  value={species}
                  onChange={(e: any) => setSpecies(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium text-xs focus:bg-white focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">-- Seleccionar Especie --</option>
                  <option value="Perro">Perro</option>
                  <option value="Gato">Gato</option>
                  <option value="Murciélago">Murciélago</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Sexo *</label>
                  <select
                    required
                    value={sex}
                    onChange={(e: any) => setSex(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium text-xs focus:bg-white focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Seleccionar --</option>
                    <option value="Macho">Macho</option>
                    <option value="Hembra">Hembra</option>
                    <option value="Indeterminado">Indeterminado</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tamaño *</label>
                  <select
                    required
                    value={size}
                    onChange={(e: any) => setSize(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium text-xs focus:bg-white focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Seleccionar --</option>
                    <option value="Pequeño">Pequeño</option>
                    <option value="Mediano">Mediano</option>
                    <option value="Grande">Grande</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Color / Características *</label>
                <input
                  type="text"
                  required
                  value={colorFeatures}
                  onChange={(e) => setColorFeatures(e.target.value)}
                  placeholder="Ej: Negro con manchas café en el pecho"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium text-xs focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-orange-50/60 rounded-xl border border-orange-100">
                <input
                  type="checkbox"
                  id="wasCapturedCheck"
                  checked={wasCaptured}
                  onChange={(e) => setWasCaptured(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="wasCapturedCheck" className="text-xs font-bold text-gray-800 cursor-pointer">
                  ¿Fue capturado efectivamente?
                </label>
              </div>

              {/* Registro fotográfico del animal */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <label className="block text-xs font-bold text-gray-800 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-orange-600" />
                    <span>Registro Fotográfico del Animal</span>
                  </span>
                  {wasCaptured ? (
                    <span className="text-[10px] text-red-600 font-bold">* Obligatorio en Captura</span>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-normal">(Opcional si escapó)</span>
                  )}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAnimalFileChange}
                  className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-100 file:text-orange-800 hover:file:bg-orange-200 cursor-pointer"
                />
                {animalPreview && (
                  <div className="relative mt-2 w-full h-32 rounded-xl overflow-hidden border border-gray-300">
                    <img src={animalPreview} alt="Foto del animal" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setAnimalFile(null)
                        setAnimalPreview(null)
                      }}
                      className="absolute top-1.5 right-1.5 bg-red-600 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold shadow"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAnimalModal(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 shadow"
                >
                  {saving ? 'Guardando...' : 'Guardar Animal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: CERRAR PROCEDIMIENTO DE INTERVENCIÓN                */}
      {/* ------------------------------------------------------------- */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-wider">{showCloseModal.event_code}</span>
                <h3 className="text-base font-bold text-gray-900">Cierre de Procedimiento</h3>
              </div>
              <button onClick={() => setShowCloseModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseEventSubmit} className="space-y-4 text-xs">
              {/* Motivo de cierre */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Motivo de Cierre del Procedimiento *</label>
                <select
                  value={closureType}
                  onChange={(e: any) => setClosureType(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">-- Seleccionar Motivo de Cierre --</option>
                  <option value="Captura total">Captura total (Todos los animales capturados)</option>
                  <option value="Captura parcial">Captura parcial (Captura de algunos animales)</option>
                  <option value="Abandono">Abandono (Animales abandonaron el área por su cuenta)</option>
                  <option value="Sin hallazgo">Sin hallazgo (No se encontraron animales reportados)</option>
                </select>
              </div>

              {/* Checkbox Daño en Reja */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasFenceDamageCheck"
                    checked={hasFenceDamage}
                    onChange={(e) => setHasFenceDamage(e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
                  />
                  <label htmlFor="hasFenceDamageCheck" className="text-xs font-bold text-amber-900 cursor-pointer flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-amber-700" />
                    <span>¿Se detectó o reparó daño en la reja / perímetro?</span>
                  </label>
                </div>

                {/* Sub-formulario Daño en Reja (Campos obligatorios si está marcado) */}
                {hasFenceDamage && (
                  <div className="pt-2 border-t border-amber-200 space-y-3">
                    <div>
                      <label className="block font-bold text-amber-900 mb-1">📍 Ubicación Específica del Daño *</label>
                      <input
                        type="text"
                        required={hasFenceDamage}
                        value={damageLocation}
                        onChange={(e) => setDamageLocation(e.target.value)}
                        placeholder="Ej: Reja Norte, Paño 12 (Cerca de Rodaje Alpha)"
                        className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-amber-900 mb-1">📝 Descripción del Daño y Reparación Realizada *</label>
                      <textarea
                        rows={2}
                        required={hasFenceDamage}
                        value={damageDescription}
                        onChange={(e) => setDamageDescription(e.target.value)}
                        placeholder="Ej: Malla ronzada de 40cm. Se instaló parche con alambre galvanizado."
                        className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs"
                      />
                    </div>

                    {/* Foto Daño & Foto Reparación */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-amber-900 mb-1">📷 Foto del Daño *</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleDamageFileChange}
                          className="w-full text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-amber-100 file:text-amber-800"
                        />
                        {damagePreview && (
                          <img src={damagePreview} alt="Daño" className="mt-2 h-20 w-full object-cover rounded-lg border border-amber-300" />
                        )}
                      </div>

                      <div>
                        <label className="block font-bold text-amber-900 mb-1">📷 Foto de Reparación *</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleRepairFileChange}
                          className="w-full text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-amber-100 file:text-amber-800"
                        />
                        {repairPreview && (
                          <img src={repairPreview} alt="Reparación" className="mt-2 h-20 w-full object-cover rounded-lg border border-amber-300" />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Observaciones generales de Cierre */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Observaciones Generales del Cierre</label>
                <textarea
                  rows={3}
                  value={closureObs}
                  onChange={(e) => setClosureObs(e.target.value)}
                  placeholder="Ej: Se realizó búsqueda exhaustiva por 45 min. Sector despejado y seguro."
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={closing}
                  className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl shadow transition"
                >
                  {closing ? 'Guardando Cierre...' : 'Confirmar Cierre de Procedimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: POPUP DE DETALLE Y ANTECEDENTES COMPLETOS           */}
      {/* ------------------------------------------------------------- */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl p-6 space-y-6 shadow-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-orange-600 uppercase tracking-wide">{showDetailModal.event_code}</span>
                  <span className="px-2.5 py-0.5 bg-gray-900 text-white font-bold text-[10px] rounded-full">
                    Procedimiento Cerrado
                  </span>
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                    showDetailModal.closure_type === 'Captura total' ? 'bg-emerald-100 text-emerald-800' :
                    showDetailModal.closure_type === 'Captura parcial' ? 'bg-amber-100 text-amber-800' :
                    showDetailModal.closure_type === 'Abandono' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {showDetailModal.closure_type || showDetailModal.general_result}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 mt-1">{showDetailModal.client?.name}</h2>
                <p className="text-xs text-gray-500">{showDetailModal.specific_location} ({showDetailModal.airport_zone})</p>
              </div>

              <button
                onClick={() => setShowDetailModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Grid of details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Card 1: Antecedentes Iniciales */}
              <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100">
                <h4 className="font-bold text-gray-800 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-orange-600" />
                  <span>Antecedentes de Activación</span>
                </h4>
                <div className="space-y-1 text-gray-700">
                  <p><strong>Cliente:</strong> {showDetailModal.client?.name}</p>
                  <p><strong>Persona / Entidad que Activa:</strong> {showDetailModal.requested_by || 'No especificado'}</p>
                  <p><strong>Operador a Cargo:</strong> {showDetailModal.operator?.full_name || 'No registrado'}</p>
                  <p><strong>Zona:</strong> {showDetailModal.airport_zone}</p>
                  <p><strong>Lugar Específico:</strong> {showDetailModal.specific_location}</p>
                  <p><strong>Fecha Creación:</strong> {new Date(showDetailModal.created_at).toLocaleString()}</p>
                </div>
                <div className="pt-2 border-t border-gray-200/60">
                  <p className="font-bold text-gray-700 mb-0.5">Descripción de la Situación:</p>
                  <p className="text-gray-600 italic bg-white p-2 rounded-lg border border-gray-200">{showDetailModal.situation_description}</p>
                </div>
              </div>

              {/* Card 2: Datos de Cierre */}
              <div className="bg-orange-50/40 p-4 rounded-xl space-y-2 border border-orange-100">
                <h4 className="font-bold text-orange-900 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-orange-600" />
                  <span>Información del Cierre</span>
                </h4>
                <div className="space-y-1 text-gray-700">
                  <p><strong>Motivo de Cierre:</strong> {showDetailModal.closure_type || showDetailModal.general_result}</p>
                  <p><strong>Fecha de Cierre:</strong> {showDetailModal.closed_at ? new Date(showDetailModal.closed_at).toLocaleString() : 'No registrada'}</p>
                  <p><strong>Daño en Reja:</strong> {showDetailModal.has_perimeter_damage ? 'Sí (Reparado)' : 'No'}</p>
                </div>
                <div className="pt-2 border-t border-orange-200/60">
                  <p className="font-bold text-gray-700 mb-0.5">Observaciones de Cierre:</p>
                  <p className="text-gray-700 bg-white p-2 rounded-lg border border-orange-200">{showDetailModal.closure_observations || 'Sin observaciones adicionales.'}</p>
                </div>
              </div>
            </div>

            {/* Animal Records list */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-gray-800 uppercase tracking-wider text-[10px] flex items-center gap-1">
                <Dog className="w-4 h-4 text-orange-600" />
                <span>Animales Registrados en este Procedimiento ({showDetailModal.animal_records?.length || 0})</span>
              </h4>

              {!showDetailModal.animal_records || showDetailModal.animal_records.length === 0 ? (
                <div className="p-3 bg-gray-50 rounded-xl text-center text-gray-400 italic">
                  No se registraron capturas ni animales en esta intervención.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {showDetailModal.animal_records.map((a, i) => (
                    <div key={i} className="p-3 bg-white border border-gray-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">{a.species} - {a.sex}</span>
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                          a.was_captured ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {a.was_captured ? 'Capturado' : 'Escapó'}
                        </span>
                      </div>
                      <p className="text-gray-500"><strong>Tamaño:</strong> {a.size || 'No especificado'}</p>
                      <p className="text-gray-500"><strong>Detalle:</strong> {a.color_features || 'Sin señas'}</p>
                      <p className="text-gray-500"><strong>Estado:</strong> {a.animal_status}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fence Damage section if present */}
            {showDetailModal.has_perimeter_damage && (
              <div className="p-4 bg-red-50/50 rounded-xl border border-red-200 space-y-3 text-xs">
                <h4 className="font-bold text-red-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-red-600" />
                  <span>Registro de Daño y Reparación en Reja / Perímetro</span>
                </h4>

                <div className="space-y-1 text-gray-700">
                  <p><strong>Ubicación del Daño:</strong> {showDetailModal.damage_location || showDetailModal.specific_location}</p>
                  <p><strong>Descripción / Reparación:</strong> {showDetailModal.damage_description || 'Sin detalle'}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {showDetailModal.damage_photo_urls && showDetailModal.damage_photo_urls[0] && (
                    <div>
                      <p className="font-bold text-gray-700 mb-1">Foto del Daño:</p>
                      <a href={showDetailModal.damage_photo_urls[0]} target="_blank" rel="noopener noreferrer">
                        <img
                          src={showDetailModal.damage_photo_urls[0]}
                          alt="Foto del Daño"
                          className="h-36 w-full object-cover rounded-xl border border-red-200 hover:opacity-90 transition"
                        />
                      </a>
                    </div>
                  )}

                  {showDetailModal.repair_photo_urls && showDetailModal.repair_photo_urls[0] && (
                    <div>
                      <p className="font-bold text-gray-700 mb-1">Foto de Reparación:</p>
                      <a href={showDetailModal.repair_photo_urls[0]} target="_blank" rel="noopener noreferrer">
                        <img
                          src={showDetailModal.repair_photo_urls[0]}
                          alt="Foto de Reparación"
                          className="h-36 w-full object-cover rounded-xl border border-emerald-200 hover:opacity-90 transition"
                        />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowDetailModal(null)}
                className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
