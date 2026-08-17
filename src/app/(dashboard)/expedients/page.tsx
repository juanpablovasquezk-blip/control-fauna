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

  useEffect(() => {
    fetchExpedients()
  }, [])

  async function fetchExpedients() {
    setLoading(true)
    const { data } = await supabase
      .from('animal_records')
      .select('*, event:events(*, client:clients(*))')
      .order('created_at', { ascending: false })

    if (data) setAnimals(data as AnimalRecord[])
    setLoading(false)
  }

  const filteredAnimals = animals.filter(a => 
    a.species.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.animal_status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.color_features?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getChecklistProgress = (animal: AnimalRecord) => {
    if (animal.species === 'Perro') {
      let count = 2 // ficha + capturado
      if (animal.was_captured) count += 2 // fotos + canil
      if (animal.animal_status === 'Finalizado') count += 6 // acta + scan + chip + adoptante + rnm + obs
      return { total: 10, completed: Math.min(count, 10) }
    } else if (animal.species === 'Gato') {
      let count = 2
      if (animal.was_captured) count += 2
      if (animal.animal_status === 'Finalizado') count += 1
      return { total: 5, completed: count }
    } else {
      return { total: 4, completed: animal.was_captured ? 4 : 2 }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-gray-800" />
            <h1 className="text-xl font-bold text-gray-900">Control Documental y Expediente Digital</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Auditoría de cumplimiento de fichas, fotos, actas, aseos de canil y registros RNM por animal.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar especie, estado..."
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
            const progress = getChecklistProgress(a)
            const percentage = Math.round((progress.completed / progress.total) * 100)

            return (
              <div key={a.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-900 font-bold text-xs rounded-md">
                      {a.species}
                    </span>
                    <span className="text-xs font-semibold text-gray-500">
                      {a.event?.client?.name}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    a.animal_status === 'Finalizado' ? 'bg-emerald-100 text-emerald-800' :
                    a.animal_status === 'Pendiente Adopción' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {a.animal_status}
                  </span>
                </div>

                <div className="text-xs text-gray-700 space-y-1">
                  <p><strong>Detalle:</strong> {a.color_features || 'No especificado'} ({a.sex})</p>
                  <p><strong>Fecha Captura:</strong> {new Date(a.created_at).toLocaleDateString()}</p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1 pt-1 border-t border-gray-100">
                  <div className="flex justify-between text-[11px] font-semibold text-gray-600">
                    <span>Completitud Expediente</span>
                    <span>{progress.completed}/{progress.total} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        percentage === 100 ? 'bg-emerald-500' : 'bg-orange-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
