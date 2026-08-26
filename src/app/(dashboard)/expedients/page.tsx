'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  FileText, CheckCircle2, AlertCircle, Search, Calendar, 
  Filter, FileSpreadsheet, ChevronDown, ChevronUp, Clock, 
  Dog, Award, CheckCircle, AlertTriangle, Trash2
} from 'lucide-react'
import { getExpedientsDataAction, deleteExpedientAction } from './actions'

const MONTHS_CONFIG = [
  { value: '12', name: 'Diciembre' },
  { value: '11', name: 'Noviembre' },
  { value: '10', name: 'Octubre' },
  { value: '09', name: 'Septiembre' },
  { value: '08', name: 'Agosto' },
  { value: '07', name: 'Julio' },
  { value: '06', name: 'Junio' },
  { value: '05', name: 'Mayo' },
  { value: '04', name: 'Abril' },
  { value: '03', name: 'Marzo' },
  { value: '02', name: 'Febrero' },
  { value: '01', name: 'Enero' }
]

// Helper to get effective capture date (event.event_date takes precedence over created_at)
function getAnimalCaptureDate(a: any): Date {
  const dateStr = a.event?.event_date || a.created_at
  if (!dateStr) return new Date()
  // Add T12:00:00 if plain YYYY-MM-DD date to avoid UTC timezone shift
  const cleanStr = typeof dateStr === 'string' && dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr
  const d = new Date(cleanStr)
  return isNaN(d.getTime()) ? new Date() : d
}

function formatAnimalCaptureDate(a: any): string {
  const dateStr = a.event?.event_date || a.created_at
  if (!dateStr) return ''
  const cleanStr = typeof dateStr === 'string' ? dateStr.split('T')[0] : ''
  const parts = cleanStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  return new Date(dateStr).toLocaleDateString('es-CL')
}

export default function ExpedientsPage() {
  const [animals, setAnimals] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Filters state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<string>('') // '' = todos los meses
  const [filterClient, setFilterClient] = useState<string>('')
  const [filterSpecies, setFilterSpecies] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  // Collapsed months state: { "08": false, "07": true }
  const [collapsedMonths, setCollapsedMonths] = useState<{ [key: string]: boolean }>({})

  // Modal audit state
  const [selectedAnimal, setSelectedAnimal] = useState<any | null>(null)
  const [cleaningsCount, setCleaningsCount] = useState<number>(0)

  useEffect(() => {
    fetchExpedients()
  }, [])

  async function fetchExpedients() {
    setLoading(true)
    const res = await getExpedientsDataAction()
    if (res.success) {
      const animalData = res.animals || []
      const clientData = res.clients || []
      setCleaningsCount(res.totalCleanings || 0)
      setClients(clientData)
      setAnimals(animalData as any[])

      // Auto expand logic:
      const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, '0')
      const currentYear = new Date().getFullYear()

      const initialCollapsedState: { [key: string]: boolean } = {}
      
      MONTHS_CONFIG.forEach(m => {
        const monthAnimals = animalData.filter((a: any) => {
          const d = getAnimalCaptureDate(a)
          const mStr = String(d.getMonth() + 1).padStart(2, '0')
          return d.getFullYear() === currentYear && mStr === m.value
        })

        const hasPending = monthAnimals.some((a: any) => a.animal_status !== 'Finalizado')
        const isCurrentMonth = m.value === currentMonthStr

        initialCollapsedState[m.value] = !(isCurrentMonth || hasPending)
      })

      setCollapsedMonths(initialCollapsedState)
    }

    setLoading(false)
  }

  const toggleMonth = (monthVal: string) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [monthVal]: !prev[monthVal]
    }))
  }

  const handleDeleteExpedient = async (animalId: string, expCode: string) => {
    if (!confirm(`¿Está seguro de que desea eliminar el expediente ${expCode}? Esta acción borrará la ficha del animal y sus registros asociados.`)) return
    try {
      const res = await deleteExpedientAction(animalId)
      if (!res.success) throw new Error(res.error)
      alert(`Expediente ${expCode} eliminado con éxito.`)
      fetchExpedients()
    } catch (err: any) {
      alert('Error al eliminar expediente: ' + err.message)
    }
  }

  // Calculate checklist items for any animal
  const getChecklistItems = (animal: any) => {
    const isDog = animal.species === 'Perro'
    const isCat = animal.species === 'Gato'
    const hasPhoto = animal.photo_urls && animal.photo_urls.length > 0
    const hasAct = animal.delivery_acts && animal.delivery_acts.length > 0
    const act = hasAct ? animal.delivery_acts[0] : null
    const hasScan = act && !!act.signed_scan_url
    const isFinished = animal.animal_status === 'Finalizado' || animal.animal_status === 'Pendiente Adopción'
    const hasAdoption = animal.adoptions && animal.adoptions.length > 0

    if (isDog) {
      return [
        { label: 'Ficha de Registro e Intervención en Terreno', ok: true, detail: `Evento ${animal.event?.event_code || ''}` },
        { label: 'Registro Fotográfico del Animal', ok: hasPhoto, detail: hasPhoto ? 'Foto cargada en sistema' : 'Sin foto obligatoria' },
        { label: 'Custodia e Ingreso a Canil', ok: animal.was_captured, detail: animal.was_captured ? 'En Canil Custodia' : 'No capturado' },
        { label: 'Registros de Aseo y Alimentación en Canil', ok: cleaningsCount > 0, detail: `${cleaningsCount} aseos registrados` },
        { label: 'Emisión de Acta Oficial de Entrega', ok: hasAct, detail: hasAct ? `Acta ${act.act_number}` : 'Pendiente emisión en /delivery-acts' },
        { label: 'Escáner de Acta Firmada en Terreno', ok: hasScan, detail: hasScan ? 'Documento firmado subido' : 'Pendiente escáner' },
        { label: 'Identificación Microchip / Ficha Sanitaria', ok: isFinished, detail: isFinished ? 'Completado' : 'Pendiente' },
        { label: 'Registro en Plataforma RNM / SAG / Subdere', ok: isFinished, detail: isFinished ? 'Registrado' : 'Pendiente' },
        { label: 'Contrato y Ficha de Adopción Responsable', ok: hasAdoption || isFinished, detail: hasAdoption ? 'Adopción registrada' : 'Pendiente en /adoptions' },
        { label: 'Cierre y Auditoría Documental Completa', ok: isFinished, detail: animal.animal_status }
      ]
    } else if (isCat) {
      return [
        { label: 'Ficha de Intervención Felina', ok: true, detail: `Evento ${animal.event?.event_code || ''}` },
        { label: 'Registro Fotográfico del Animal', ok: hasPhoto, detail: hasPhoto ? 'Foto cargada' : 'Sin foto' },
        { label: 'Custodia e Ingreso a Canil Felino', ok: animal.was_captured, detail: animal.was_captured ? 'En custodia' : 'Escapó' },
        { label: 'Aseos y Mantención de Canil', ok: cleaningsCount > 0, detail: `${cleaningsCount} registros` },
        { label: 'Acta de Entrega / Destino Final', ok: hasAct || isFinished, detail: isFinished ? 'Proceso Finalizado' : 'Pendiente' }
      ]
    } else {
      return [
        { label: 'Ficha de Intervención Fauna Minoritaria', ok: true, detail: `Evento ${animal.event?.event_code || ''}` },
        { label: 'Registro Fotográfico', ok: hasPhoto, detail: hasPhoto ? 'Foto cargada' : 'Sin foto' },
        { label: 'Registro de Captura o Relocalización', ok: animal.was_captured, detail: animal.was_captured ? 'Capturado' : 'Liberado/Escapó' },
        { label: 'Cierre de Expediente de Fauna', ok: isFinished, detail: animal.animal_status }
      ]
    }
  }

  // Filter animals based on year and search/selectors
  const yearAnimals = animals.filter(a => {
    const d = new Date(a.created_at)
    return d.getFullYear() === selectedYear
  })

  const filteredAnimals = yearAnimals.filter(a => {
    const d = new Date(a.created_at)
    const monthStr = String(d.getMonth() + 1).padStart(2, '0')

    const matchesSearch = !searchTerm || (
      a.species?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.animal_status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.color_features?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.event?.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.id.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const matchesMonth = !selectedMonth || monthStr === selectedMonth
    const matchesClient = !filterClient || a.event?.client_id === filterClient
    const matchesSpecies = !filterSpecies || a.species === filterSpecies
    const matchesStatus = !filterStatus || a.animal_status === filterStatus

    return matchesSearch && matchesMonth && matchesClient && matchesSpecies && matchesStatus
  })

  // Calculate monthly KPIs (for the active filtered set)
  const totalFiltered = filteredAnimals.length
  const countInKennel = filteredAnimals.filter(a => a.animal_status === 'En canil').length
  const countAdoption = filteredAnimals.filter(a => a.animal_status === 'Pendiente Adopción').length
  const countFinished = filteredAnimals.filter(a => a.animal_status === 'Finalizado').length

  const avgCompletion = totalFiltered === 0 ? 0 : Math.round(
    filteredAnimals.reduce((acc, a) => {
      const items = getChecklistItems(a)
      const ok = items.filter(i => i.ok).length
      return acc + (ok / items.length) * 100
    }, 0) / totalFiltered
  )

  // Export to Excel
  const exportToExcel = () => {
    if (filteredAnimals.length === 0) {
      alert('No hay expedientes para exportar con los filtros seleccionados.')
      return
    }

    const headers = [
      'N° Expediente',
      'Fecha Captura',
      'Especie',
      'Color y Sexo',
      'Cliente',
      'Estado Animal',
      'Documentos Completos',
      'Porcentaje Completitud'
    ]

    const rows = filteredAnimals.map(a => {
      const items = getChecklistItems(a)
      const completedCount = items.filter(i => i.ok).length
      const totalCount = items.length
      const percentage = Math.round((completedCount / totalCount) * 100)

      return [
        `"EXP-${a.id.slice(0, 8).toUpperCase()}"`,
        `"${new Date(a.created_at).toLocaleDateString('es-CL')}"`,
        `"${a.species || ''}"`,
        `"${a.color_features || 'No especificado'} (${a.sex || ''})"`,
        `"${a.event?.client?.name || 'Cliente DGAC'}"`,
        `"${a.animal_status || ''}"`,
        `"${completedCount}/${totalCount}"`,
        `"${percentage}%"`
      ]
    })

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    const selectedMonthName = MONTHS_CONFIG.find(m => m.value === selectedMonth)?.name || 'Anual'
    link.setAttribute('download', `Expedientes_Digitales_${selectedYear}_${selectedMonthName}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-600" />
            <h1 className="text-xl font-bold text-gray-900">Control Documental y Expediente Digital</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Auditoría de cumplimiento de fichas, fotos, actas, aseos de canil y registros RNM por animal.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Year selector */}
          <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-xl border border-gray-200 text-xs font-semibold">
            <Calendar className="w-4 h-4 text-gray-500 ml-1" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-bold text-gray-800 focus:outline-none pr-1"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          {/* Export to Excel */}
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (Del Mes / Selección actual) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Expedientes {selectedMonth ? 'del Mes' : 'Filtrados'}</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-gray-900">{totalFiltered}</span>
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">En Canil</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-700">{countInKennel}</span>
            <Dog className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200 bg-purple-50/20 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Pendientes Adopción</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-purple-700">{countAdoption}</span>
            <Clock className="w-5 h-5 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Finalizados</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-700">{countFinished}</span>
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-orange-200 bg-orange-50/20 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Completitud Promedio</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-orange-600">{avgCompletion}%</span>
            <Award className="w-5 h-5 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <Filter className="w-4 h-4 text-orange-600" />
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Filtros de Búsqueda y Auditoría</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search text */}
          <div className="relative md:col-span-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar especie, ID..."
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Month selector */}
          <div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-gray-700"
            >
              <option value="">-- Todos los Meses --</option>
              {MONTHS_CONFIG.map(m => (
                <option key={m.value} value={m.value}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Client selector */}
          <div>
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-gray-700"
            >
              <option value="">-- Todos los Clientes --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Species selector */}
          <div>
            <select
              value={filterSpecies}
              onChange={(e) => setFilterSpecies(e.target.value)}
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-gray-700"
            >
              <option value="">-- Todas las Especies --</option>
              <option value="Perro">Perro</option>
              <option value="Gato">Gato</option>
              <option value="Ave">Ave</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          {/* Status selector */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-gray-700"
            >
              <option value="">-- Todos los Estados --</option>
              <option value="En canil">En canil</option>
              <option value="Pendiente Adopción">Pendiente Adopción</option>
              <option value="Finalizado">Finalizado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Monthly Grouped Table View */}
      {loading ? (
        <div className="p-8 text-center text-xs text-gray-500">Cargando expedientes digitales...</div>
      ) : (
        <div className="space-y-4">
          {MONTHS_CONFIG.filter(m => !selectedMonth || m.value === selectedMonth).map(m => {
            const monthAnimals = filteredAnimals.filter(a => {
              const d = getAnimalCaptureDate(a)
              const mStr = String(d.getMonth() + 1).padStart(2, '0')
              return mStr === m.value
            })

            const isCollapsed = collapsedMonths[m.value] ?? false
            const pendingInMonth = monthAnimals.filter(a => a.animal_status !== 'Finalizado').length

            return (
              <div key={m.value} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Month Header Banner */}
                <button
                  onClick={() => toggleMonth(m.value)}
                  className="w-full p-4 bg-gray-50 hover:bg-gray-100/80 transition flex items-center justify-between border-b border-gray-200 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <Calendar className="w-4 h-4 text-orange-600" />
                    <span className="font-bold text-sm text-gray-900">{m.name} {selectedYear}</span>
                    
                    <span className="px-2.5 py-0.5 text-xs font-semibold bg-gray-200 text-gray-700 rounded-full">
                      {monthAnimals.length} expedientes
                    </span>

                    {pendingInMonth > 0 && (
                      <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        {pendingInMonth} pendiente{pendingInMonth > 1 ? 's' : ''} de cierre
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <span>{isCollapsed ? 'Ver detalles' : 'Ocultar'}</span>
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </div>
                </button>

                {/* Table Content */}
                {!isCollapsed && (
                  <div>
                    {monthAnimals.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400 italic">
                        Sin expedientes registrados en {m.name} {selectedYear}.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-100/70 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                              <th className="p-3">N° Expediente</th>
                              <th className="p-3">Fecha Captura</th>
                              <th className="p-3">Especie</th>
                              <th className="p-3">Detalle (Color / Sexo)</th>
                              <th className="p-3">Cliente</th>
                              <th className="p-3">Estado Animal</th>
                              <th className="p-3">Completitud Checklist</th>
                              <th className="p-3 text-right">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {monthAnimals.map((a) => {
                              const items = getChecklistItems(a)
                              const completedCount = items.filter(i => i.ok).length
                              const totalCount = items.length
                              const percentage = Math.round((completedCount / totalCount) * 100)

                              return (
                                <tr
                                  key={a.id}
                                  onClick={() => setSelectedAnimal(a)}
                                  className="hover:bg-orange-50/40 cursor-pointer transition"
                                >
                                  <td className="p-3 font-mono font-bold text-orange-600">
                                    EXP-{a.id.slice(0, 8).toUpperCase()}
                                  </td>
                                  <td className="p-3 font-medium text-gray-700">
                                    {formatAnimalCaptureDate(a)}
                                  </td>
                                  <td className="p-3">
                                    <span className="px-2 py-0.5 bg-gray-100 font-bold text-gray-900 rounded text-[11px]">
                                      {a.species}
                                    </span>
                                  </td>
                                  <td className="p-3 text-gray-700">
                                    {a.color_features || 'No especificado'} <span className="text-gray-400">({a.sex})</span>
                                  </td>
                                  <td className="p-3 text-gray-700 font-medium truncate max-w-[180px]">
                                    {a.event?.client?.name || 'Cliente DGAC'}
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                                      a.animal_status === 'Finalizado' ? 'bg-emerald-100 text-emerald-800' :
                                      a.animal_status === 'Pendiente Adopción' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {a.animal_status}
                                    </span>
                                  </td>
                                  <td className="p-3 min-w-[160px]">
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-[10px] font-bold text-gray-600">
                                        <span>Documentación</span>
                                        <span>{completedCount}/{totalCount} ({percentage}%)</span>
                                      </div>
                                      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full ${percentage === 100 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                                          style={{ width: `${percentage}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setSelectedAnimal(a)
                                        }}
                                        className="px-3 py-1 bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold text-[11px] rounded-lg transition cursor-pointer flex items-center gap-1"
                                      >
                                        <span>👁️ Auditar</span>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteExpedient(a.id, `EXP-${a.id.slice(0, 8).toUpperCase()}`)
                                        }}
                                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition cursor-pointer"
                                        title="Eliminar Expediente de Prueba"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Popup Auditoría de Expediente */}
      {selectedAnimal && (() => {
        const items = getChecklistItems(selectedAnimal)
        const completedCount = items.filter(i => i.ok).length
        const totalCount = items.length
        const percentage = Math.round((completedCount / totalCount) * 100)

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-xl rounded-2xl p-6 space-y-5 shadow-2xl my-8">
              <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                <div>
                  <span className="text-[10px] font-black text-orange-600 uppercase tracking-wider">
                    EXPEDIENTE N° {selectedAnimal.id.slice(0, 8).toUpperCase()}
                  </span>
                  <h3 className="text-base font-bold text-gray-900">Auditoría Documental - {selectedAnimal.species}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedAnimal.event?.client?.name || 'DGAC'} | Capturado el {new Date(selectedAnimal.created_at).toLocaleDateString('es-CL')}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedAnimal(null)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  ✕ Cerrar
                </button>
              </div>

              {/* Progress summary banner */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-800">Estado Global del Expediente</span>
                  <span className={`px-2.5 py-0.5 font-bold rounded-full text-[11px] ${
                    percentage === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {completedCount} de {totalCount} documentos ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${percentage === 100 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Itemized Audit Checklist */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Checklist de Cumplimiento Auditoría</h4>
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                      item.ok ? 'bg-emerald-50/60 border-emerald-200' : 'bg-red-50/60 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      )}
                      <div>
                        <p className={`font-bold ${item.ok ? 'text-emerald-950' : 'text-red-950'}`}>{item.label}</p>
                        <p className="text-[11px] text-gray-500">{item.detail}</p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      item.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item.ok ? 'Completo' : 'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setSelectedAnimal(null)}
                  className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
                >
                  Cerrar Auditoría
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
