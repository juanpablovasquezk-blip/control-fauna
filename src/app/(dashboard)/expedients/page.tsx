'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AnimalRecord } from '@/types'
import { FileText, CheckCircle2, AlertCircle, Search } from 'lucide-react'

export default function ExpedientsPage() {
  const [animals, setAnimals] = useState<AnimalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClient()

  const [selectedAnimal, setSelectedAnimal] = useState<any | null>(null)
  const [cleaningsCount, setCleaningsCount] = useState<number>(0)

  useEffect(() => {
    fetchExpedients()
  }, [])

  async function fetchExpedients() {
    setLoading(true)
    const { data: animalData, error } = await supabase
      .from('animal_records')
      .select('*, event:events(*, client:clients(*)), delivery_acts(*), adoptions:adoption_records(*)')
      .order('created_at', { ascending: false })

    const { data: cleaningData } = await supabase
      .from('kennel_cleanings')
      .select('id')

    if (cleaningData) setCleaningsCount(cleaningData.length)
    if (animalData) setAnimals(animalData as any[])
    setLoading(false)
  }

  const filteredAnimals = animals.filter(a => 
    a.species?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.animal_status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.color_features?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.event?.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-600" />
            <h1 className="text-xl font-bold text-gray-900">Control Documental y Expediente Digital</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Auditoría de cumplimiento de fichas, fotos, actas, aseos de canil y registros RNM por animal. Haz clic en cualquier ficha para auditar el expediente.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar especie, cliente, estado..."
            className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Expedients Cards */}
      {loading ? (
        <div className="p-8 text-center text-xs text-gray-500">Cargando expedientes...</div>
      ) : filteredAnimals.length === 0 ? (
        <div className="p-8 bg-white rounded-2xl border border-gray-200 text-center text-xs text-gray-400">
          No hay expedientes digitales coincidentes.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAnimals.map((a) => {
            const items = getChecklistItems(a)
            const completedCount = items.filter(i => i.ok).length
            const totalCount = items.length
            const percentage = Math.round((completedCount / totalCount) * 100)

            return (
              <div
                key={a.id}
                onClick={() => setSelectedAnimal(a)}
                className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3 hover:border-orange-400 hover:shadow-md cursor-pointer transition group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-900 font-bold text-xs rounded-md">
                      {a.species}
                    </span>
                    <span className="text-xs font-semibold text-gray-600 truncate max-w-[200px]">
                      {a.event?.client?.name || 'Cliente DGAC'}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                    a.animal_status === 'Finalizado' ? 'bg-emerald-100 text-emerald-800' :
                    a.animal_status === 'Pendiente Adopción' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {a.animal_status}
                  </span>
                </div>

                <div className="text-xs text-gray-700 space-y-1">
                  <p><strong>Detalle:</strong> {a.color_features || 'No especificado'} ({a.sex})</p>
                  <p><strong>Fecha Captura:</strong> {new Date(a.created_at).toLocaleDateString('es-CL')}</p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1 pt-2 border-t border-gray-100">
                  <div className="flex justify-between text-[11px] font-semibold text-gray-600">
                    <span className="group-hover:text-orange-600 font-bold transition">Completitud Expediente Digital</span>
                    <span className="font-bold">{completedCount}/{totalCount} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        percentage === 100 ? 'bg-emerald-500' : 'bg-orange-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-right text-orange-600 font-bold mt-1">Haz clic para auditar checklist ➔</p>
                </div>
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
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition"
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
                  className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl shadow transition"
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
