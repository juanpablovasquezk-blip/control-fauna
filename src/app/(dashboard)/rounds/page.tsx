'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthProvider'
import { Round } from '@/types'
import { Compass, AlertTriangle, Camera, Plus, CheckCircle, Clock, Filter, Calendar, Search, Eye, X, Wrench, User, FileText, Trash2 } from 'lucide-react'
import { formatFreeText } from '@/lib/utils/formatters'
import { 
  sendRoundWhatsAppAction,
  sendFenceDamageWhatsAppAction,
  sendFenceRepairWhatsAppAction
} from '@/app/(dashboard)/settings/whatsappActions'
import { uploadImageFile } from '@/lib/utils/uploadHelpers'
import { sendFenceDamageEmailAction } from '@/app/(dashboard)/settings/emailActions'
import { deleteRoundAction } from './actions'
function formatSafeDate(dateInput: any): string {
  if (!dateInput) return 'Sin fecha'
  try {
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return String(dateInput)
    return d.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Santiago'
    })
  } catch (err) {
    return String(dateInput)
  }
}

export default function RoundsPage() {
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState<Round | null>(null)
  const { profile } = useAuth()
  const supabase = createClient()

  // Form State
  const [zones, setZones] = useState<any[]>([])
  const [zone, setZone] = useState('')
  const [operators, setOperators] = useState<any[]>([])
  const [operatorId, setOperatorId] = useState('')
  const [specificLocation, setSpecificLocation] = useState('')
  const [observations, setObservations] = useState('')
  const [hasFenceIncident, setHasFenceIncident] = useState(false)
  const [damageDescription, setDamageDescription] = useState('')
  const [actionTaken, setActionTaken] = useState('')
  const [wasRepaired, setWasRepaired] = useState(false)
  const [damagePhotos, setDamagePhotos] = useState<string[]>([])
  const [repairPhotos, setRepairPhotos] = useState<string[]>([])
  const [damageFiles, setDamageFiles] = useState<File[]>([])
  const [repairFiles, setRepairFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)

  const isAdminOrSuper = profile && ['admin', 'supervisor'].includes(profile.role)

  useEffect(() => {
    if (profile && !operatorId) {
      setOperatorId(profile.id)
    }
  }, [profile])

  // Filter State (Default last 7 days)
  const [filterPreset, setFilterPreset] = useState<'7d' | '30d' | 'month' | 'all'>('7d')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchRounds()
  }, [])

  // Set default dates (last 7 days)
  useEffect(() => {
    const today = new Date()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(today.getDate() - 7)

    setEndDate(today.toISOString().split('T')[0])
    setStartDate(sevenDaysAgo.toISOString().split('T')[0])
  }, [])

  async function fetchRounds() {
    setLoading(true)
    
    // Fetch zones dynamically
    const { data: zoneData } = await supabase.from('airport_zones').select('*').order('name')
    if (zoneData) {
      setZones(zoneData)
    }

    // Fetch active operators for Admin dropdown
    const { data: opData } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('active', true)
      .order('full_name')

    if (opData) setOperators(opData)

    const { data, error } = await supabase
      .from('rounds')
      .select('*, operator:profiles!operator_id(*), fence_incidents(*)')
      .order('start_time', { ascending: false })

    if (error) {
      console.warn('Error fetching rounds with operator, attempting fallback query:', error.message)
      const { data: fallbackData } = await supabase
        .from('rounds')
        .select('*, fence_incidents(*)')
        .order('start_time', { ascending: false })

      if (fallbackData) setRounds(fallbackData as Round[])
    } else if (data) {
      setRounds(data as Round[])
    }

    setLoading(false)
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'damage' | 'repair') => {
    const files = e.target.files
    if (!files) return

    const newFiles = Array.from(files)
    if (target === 'damage') {
      setDamageFiles(prev => [...prev, ...newFiles].slice(0, 3))
    } else {
      setRepairFiles(prev => [...prev, ...newFiles].slice(0, 3))
    }

    newFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          if (target === 'damage') {
            setDamagePhotos(prev => [...prev, event.target!.result as string].slice(0, 3))
          } else if (target === 'repair') {
            setRepairPhotos(prev => [...prev, event.target!.result as string].slice(0, 3))
          }
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleDeleteRound = async (id: string, zoneName: string) => {
    if (!isAdminOrSuper) return
    if (!confirm(`¿Está seguro de que desea eliminar el registro de ronda en "${zoneName}"? Esta acción eliminará el registro y sus antecedentes.`)) return

    try {
      const res = await deleteRoundAction(id)
      if (!res.success) throw new Error(res.error)
      alert('Registro de ronda eliminado correctamente.')
      if (showDetailModal?.id === id) setShowDetailModal(null)
      fetchRounds()
    } catch (err: any) {
      alert('Error al eliminar la ronda: ' + (err?.message || 'Error desconocido'))
    }
  }

  const handleOpenDetailModal = async (r: Round) => {
    setShowDetailModal(r)

    // Cargar detalles de incidencia si no están poblados aún
    if (r.has_fence_incident && (!r.fence_incidents || r.fence_incidents.length === 0)) {
      const { data: incs } = await supabase
        .from('fence_incidents')
        .select('*')
        .eq('round_id', r.id)

      if (incs && incs.length > 0) {
        const updated = { ...r, fence_incidents: incs }
        setShowDetailModal(updated)
        setRounds(prev => prev.map(item => item.id === r.id ? updated : item))
      }
    }
  }

  const openNewRoundModal = () => {
    setZone('')
    setSpecificLocation('')
    setObservations('')
    setHasFenceIncident(false)
    setDamageDescription('')
    setActionTaken('')
    setWasRepaired(false)
    setDamagePhotos([])
    setRepairPhotos([])
    setDamageFiles([])
    setRepairFiles([])
    setOperatorId(profile ? profile.id : '')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    if (isAdminOrSuper && !operatorId) {
      alert('Debe seleccionar el operador / responsable.')
      return
    }
    if (!zone) {
      alert('Debe seleccionar la zona del aeródromo.')
      return
    }
    if (hasFenceIncident && !specificLocation.trim()) {
      alert('Debe ingresar el lugar específico de la rotura en el cerco.')
      return
    }

    setSaving(true)

    try {
      const selectedOperatorId = (isAdminOrSuper && operatorId) ? operatorId : profile.id

      const formattedLocation = formatFreeText(specificLocation)
      const formattedObs = formatFreeText(observations)
      const formattedObservations = formattedLocation
        ? `[Lugar: ${formattedLocation}] ${formattedObs}`.trim()
        : formattedObs

      // Upload damage & repair photos to Supabase storage if provided
      let finalDamagePhotoUrls: string[] = []
      let finalRepairPhotoUrls: string[] = []

      if (hasFenceIncident) {
        if (damageFiles.length > 0) {
          for (const file of damageFiles) {
            const url = await uploadImageFile(file, 'fence_rounds/damage')
            if (url) finalDamagePhotoUrls.push(url)
          }
        } else {
          finalDamagePhotoUrls = damagePhotos
        }

        if (repairFiles.length > 0) {
          for (const file of repairFiles) {
            const url = await uploadImageFile(file, 'fence_rounds/repair')
            if (url) finalRepairPhotoUrls.push(url)
          }
        } else {
          finalRepairPhotoUrls = repairPhotos
        }
      }

      // 1. Insert Round
      const { data: roundData, error: roundError } = await supabase
        .from('rounds')
        .insert({
          operator_id: selectedOperatorId,
          zone,
          observations: formattedObservations,
          has_fence_incident: hasFenceIncident,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
        })
        .select()
        .single()

      if (roundError) throw roundError

      // 2. Insert Fence Incident if toggle is ON & Send Email Notification
      if (hasFenceIncident && roundData) {
        const selectedOperator = operators.find(op => op.id === selectedOperatorId)
        const operatorName = selectedOperator?.full_name || profile?.full_name || 'Operador'

        let emailSent = false
        try {
          const emailRes = await sendFenceDamageEmailAction({
            source: 'round',
            sourceCode: `Ronda Perimetral (${zone})`,
            date: new Date().toLocaleDateString('es-CL'),
            operatorName,
            zone,
            specificLocation: formattedLocation,
            damageDescription: formatFreeText(damageDescription),
            damagePhotoUrls: finalDamagePhotoUrls,
            actionTaken: formatFreeText(actionTaken),
            wasRepaired,
            repairPhotoUrls: finalRepairPhotoUrls,
          })
          emailSent = emailRes.success
        } catch (emailErr) {
          console.warn('Error enviando notificación por correo:', emailErr)
        }

        await supabase.from('fence_incidents').insert({
          round_id: roundData.id,
          damage_description: formatFreeText(damageDescription),
          action_taken: formatFreeText(actionTaken),
          was_repaired: wasRepaired,
          damage_photo_urls: finalDamagePhotoUrls,
          repair_photo_urls: finalRepairPhotoUrls,
          email_sent: emailSent,
        })
      }

      // Trigger WhatsApp notifications (asynchronous & silent)
      const selectedOperator = operators.find(op => op.id === selectedOperatorId)
      
      // Mensaje 1: Ronda Perimetral Registrada
      sendRoundWhatsAppAction({
        round_code: roundData?.round_code || (roundData?.id ? `RND-${roundData.id.slice(0, 6)}` : 'Ronda'),
        operator_name: selectedOperator?.full_name || profile?.full_name || 'Operador',
        airport_zone: zone,
        status: hasFenceIncident ? 'Con Novedad / Daño en Reja' : 'Sin novedades',
        observations: formatFreeText(observations) || (hasFenceIncident ? formatFreeText(damageDescription) : undefined),
      }).catch(err => console.warn('Round WhatsApp alert error:', err))

      // Mensaje 2 & 3: Reporte de Daño en Reja y Reparación (si hubo novedad en ronda)
      if (hasFenceIncident) {
        const fenceLocation = formattedLocation ? `${zone} - ${formattedLocation}` : zone

        sendFenceDamageWhatsAppAction({
          location: fenceLocation,
          damage_description: formatFreeText(damageDescription),
          damage_photo_url: finalDamagePhotoUrls[0],
        }).catch(err => console.warn('Round Fence damage WhatsApp alert error:', err))

        sendFenceRepairWhatsAppAction({
          location: fenceLocation,
          repair_description: formatFreeText(actionTaken) || formatFreeText(damageDescription),
          repair_photo_url: finalRepairPhotoUrls[0],
        }).catch(err => console.warn('Round Fence repair WhatsApp alert error:', err))
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
    setSpecificLocation('')
    setObservations('')
    setHasFenceIncident(false)
    setDamageDescription('')
    setActionTaken('')
    setWasRepaired(false)
    setDamagePhotos([])
    setRepairPhotos([])
    setDamageFiles([])
    setRepairFiles([])
  }

  // Helper for local YYYY-MM-DD date string
  function getLocalDateString(dateInput: string | Date | undefined | null): string {
    if (!dateInput) return ''
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Filter rounds by date and search term
  const filteredRounds = rounds.filter((r) => {
    const roundDateStr = getLocalDateString(r.start_time || r.round_date || r.created_at)

    if (startDate && roundDateStr && roundDateStr < startDate) return false
    if (endDate && roundDateStr && roundDateStr > endDate) return false

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      const matchesZone = r.zone?.toLowerCase().includes(term)
      const matchesObs = r.observations?.toLowerCase().includes(term)
      const matchesOp = r.operator?.full_name?.toLowerCase().includes(term)
      const incident = r.fence_incidents && r.fence_incidents[0]
      const matchesIncidentDesc = incident?.damage_description?.toLowerCase().includes(term)
      const matchesAction = incident?.action_taken?.toLowerCase().includes(term)

      return matchesZone || matchesObs || matchesOp || matchesIncidentDesc || matchesAction
    }

    return true
  })

  return (
    <div className="space-y-6 pb-10">
      {/* Header Gadget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-6 h-6 text-orange-600" />
            <h1 className="text-xl font-bold text-gray-900">Rondas Perimetrales de Inspección</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Registro de patrullajes de prevención, trazabilidad y detección de daños en cerco perimetral.
          </p>
        </div>
        <button
          onClick={openNewRoundModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Iniciar Nueva Ronda</span>
        </button>
      </div>

      {/* Tabla Historial de Rondas de Inspección */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-700" />
              <span>Historial de Patrullajes y Rondas</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Consulte el historial de rondas realizadas. Muestra por defecto los últimos 7 días.
            </p>
          </div>

          <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg self-start md:self-auto">
            {filteredRounds.length} rondas registradas
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
                placeholder="Buscar por zona, detalles..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Table of Rounds */}
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100/80 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                <th className="p-3">Fecha / Hora Ronda</th>
                <th className="p-3">Zona / Sector</th>
                <th className="p-3">Estado Novedad Cerco</th>
                <th className="p-3">Operador a Cargo</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400 italic">
                    Cargando historial de rondas...
                  </td>
                </tr>
              ) : filteredRounds.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400 italic">
                    No se encontraron rondas registradas para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredRounds.map((r) => {
                  const roundDateFormatted = formatSafeDate(r.start_time || r.round_date || r.created_at)

                  return (
                    <tr
                      key={r.id}
                      onClick={() => handleOpenDetailModal(r)}
                      className="hover:bg-orange-50/50 cursor-pointer transition"
                    >
                      <td className="p-3 font-semibold text-gray-900">
                        <div className="flex items-center gap-1.5 text-gray-800 font-bold">
                          <Clock className="w-3.5 h-3.5 text-orange-600" />
                          <span>{roundDateFormatted}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-gray-900">{r.zone}</div>
                        {r.observations && (
                          <div className="text-[11px] text-gray-500 truncate max-w-xs">{r.observations}</div>
                        )}
                      </td>

                      <td className="p-3">
                        {r.has_fence_incident ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold rounded-full">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            <span>Incidencia Reja</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-full">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>Sin Novedad</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3 font-medium text-gray-700">
                        {r.operator?.full_name || 'Operador en terreno'}
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenDetailModal(r)
                            }}
                            className="px-3 py-1.5 bg-white border border-gray-300 hover:border-orange-500 hover:text-orange-600 text-gray-700 text-[11px] font-bold rounded-lg shadow-sm transition inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Antecedentes</span>
                          </button>

                          {isAdminOrSuper && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteRound(r.id, r.zone)
                              }}
                              title="Eliminar esta ronda e incidencia"
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition border border-red-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Nueva Ronda */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900">Registro de Ronda de Inspección</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isAdminOrSuper && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Operador / Responsable en Terreno *</label>
                  <select
                    value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:ring-2 focus:ring-orange-500"
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
                <label className="block text-xs font-bold text-gray-700 mb-1">Zona del Aeródromo *</label>
                <select
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                >
                  <option value="">-- Seleccionar Zona --</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.name}>{z.name}</option>
                  ))}
                  {zones.length === 0 && (
                    <option value="">Cargando zonas...</option>
                  )}
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
                    className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                  />
                </div>

                {hasFenceIncident && (
                  <div className="space-y-3 pt-2 border-t border-gray-200">
                    <div>
                      <label className="block text-[11px] font-bold text-red-700 mb-1">Lugar Específico del Daño / Rotura *</label>
                      <input
                        type="text"
                        required
                        value={specificLocation}
                        onChange={(e) => setSpecificLocation(e.target.value)}
                        placeholder="Ej: Umbral Pista 35L (Calle Alpha)"
                        className="w-full p-2 border border-gray-300 rounded text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-red-700 mb-1">Descripción del Daño / Orificio *</label>
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
                        <label className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs rounded cursor-pointer flex items-center gap-1 font-semibold transition">
                          <Camera className="w-3.5 h-3.5" />
                          <span>Tomar Foto</span>
                          <input type="file" accept="image/*" multiple onChange={(e) => handlePhotoUpload(e, 'damage')} className="hidden" />
                        </label>
                        <span className="text-[10px] text-gray-500">{damagePhotos.length}/3 subidas</span>
                      </div>
                      {damagePhotos.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {damagePhotos.map((url, idx) => (
                            <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-300">
                              <img src={url} alt="Daño" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setDamagePhotos(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute top-0 right-0 bg-red-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-bl font-bold"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Acción Tomada *</label>
                      <input
                        type="text"
                        required
                        value={actionTaken}
                        onChange={(e) => setActionTaken(e.target.value)}
                        placeholder="Ej: Se parchó malla temporalmente con alambre"
                        className="w-full p-2 border border-gray-300 rounded text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Fotos de la Acción Tomada / Reparación (Máximo 3)</label>
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs rounded cursor-pointer flex items-center gap-1 font-semibold transition">
                          <Camera className="w-3.5 h-3.5" />
                          <span>Foto Acción / Reparación</span>
                          <input type="file" accept="image/*" multiple onChange={(e) => handlePhotoUpload(e, 'repair')} className="hidden" />
                        </label>
                        <span className="text-[10px] text-gray-500">{repairPhotos.length}/3 subidas</span>
                      </div>
                      {repairPhotos.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {repairPhotos.map((url, idx) => (
                            <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-300">
                              <img src={url} alt="Acción/Reparación" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setRepairPhotos(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute top-0 right-0 bg-red-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-bl font-bold"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="wasRepairedCheck"
                        checked={wasRepaired}
                        onChange={(e) => setWasRepaired(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                      />
                      <label htmlFor="wasRepairedCheck" className="text-xs font-semibold text-gray-700 cursor-pointer">
                        ¿Daño reparado completamente?
                      </label>
                    </div>
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

      {/* Modal 2: Popup Ver Antecedentes Completo */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-orange-600" />
                  <h3 className="text-base font-bold text-gray-900">{showDetailModal.zone}</h3>
                  {showDetailModal.has_fence_incident ? (
                    <span className="px-2.5 py-0.5 bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-600" /> Incidencia Cerco
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" /> Sin Novedad
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Realizada el {formatSafeDate(showDetailModal.start_time || showDetailModal.round_date || showDetailModal.created_at)}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isAdminOrSuper && (
                  <button
                    onClick={() => handleDeleteRound(showDetailModal.id, showDetailModal.zone)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition border border-red-100 flex items-center gap-1 text-xs font-bold"
                    title="Eliminar esta ronda"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Eliminar</span>
                  </button>
                )}
                <button
                  onClick={() => setShowDetailModal(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Antecedentes de la ronda */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100">
                <h4 className="font-bold text-gray-800 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-orange-600" />
                  <span>Datos del Patrullaje</span>
                </h4>
                <p><strong>Operador:</strong> {showDetailModal.operator?.full_name || 'No registrado'}</p>
                <p><strong>Zona / Sector:</strong> {showDetailModal.zone}</p>
                <p><strong>Fecha / Hora:</strong> {formatSafeDate(showDetailModal.start_time || showDetailModal.created_at)}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100">
                <h4 className="font-bold text-gray-800 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-gray-600" />
                  <span>Observaciones Generales</span>
                </h4>
                <p className="text-gray-700 italic bg-white p-2.5 rounded-lg border border-gray-200">
                  {showDetailModal.observations || 'Sin observaciones registradas.'}
                </p>
              </div>
            </div>

            {/* Detalle de la Incidencia si existe */}
            {(showDetailModal.has_fence_incident || (showDetailModal.fence_incidents && showDetailModal.fence_incidents.length > 0)) && (
              <div className="p-4 bg-red-50/70 rounded-2xl border border-red-200 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-red-200 pb-2">
                  <h4 className="font-bold text-red-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-red-600" />
                    <span>Detalle de Incidencia y Daño en Cerco Perimetral</span>
                  </h4>
                  {showDetailModal.fence_incidents && showDetailModal.fence_incidents[0] && (
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                      showDetailModal.fence_incidents[0].was_repaired
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}>
                      {showDetailModal.fence_incidents[0].was_repaired ? 'Reparado Completamente' : 'Parchado / Pendiente'}
                    </span>
                  )}
                </div>

                {showDetailModal.fence_incidents && showDetailModal.fence_incidents[0] ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-red-100">
                      <div>
                        <span className="font-bold text-gray-500 uppercase text-[9px] block">Descripción del Daño / Orificio:</span>
                        <p className="font-bold text-red-900 mt-0.5">{showDetailModal.fence_incidents[0].damage_description || 'Sin descripción'}</p>
                      </div>
                      <div>
                        <span className="font-bold text-gray-500 uppercase text-[9px] block">Acción Tomada:</span>
                        <p className="font-bold text-gray-900 mt-0.5">{showDetailModal.fence_incidents[0].action_taken || 'Sin acción registrada'}</p>
                      </div>
                    </div>

                    {/* Fotos del daño */}
                    {showDetailModal.fence_incidents[0].damage_photo_urls && showDetailModal.fence_incidents[0].damage_photo_urls.length > 0 && (
                      <div>
                        <p className="font-bold text-red-900 mb-1.5 flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-red-600" />
                          <span>Fotografías del Daño Registrado ({showDetailModal.fence_incidents[0].damage_photo_urls.length}):</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {showDetailModal.fence_incidents[0].damage_photo_urls.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="group relative">
                              <img src={url} alt={`Daño ${idx + 1}`} className="h-28 w-28 object-cover rounded-xl border-2 border-red-200 group-hover:opacity-90 shadow-sm transition" />
                              <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">Ver HD</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fotos de reparación */}
                    {showDetailModal.fence_incidents[0].repair_photo_urls && showDetailModal.fence_incidents[0].repair_photo_urls.length > 0 && (
                      <div>
                        <p className="font-bold text-emerald-900 mb-1.5 flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Fotografías de Acción / Reparación ({showDetailModal.fence_incidents[0].repair_photo_urls.length}):</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {showDetailModal.fence_incidents[0].repair_photo_urls.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="group relative">
                              <img src={url} alt={`Reparación ${idx + 1}`} className="h-28 w-28 object-cover rounded-xl border-2 border-emerald-200 group-hover:opacity-90 shadow-sm transition" />
                              <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">Ver HD</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No se encontraron detalles asociados a esta incidencia.</p>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-100">
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
