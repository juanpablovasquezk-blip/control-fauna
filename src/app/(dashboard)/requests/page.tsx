'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthProvider'
import { ServiceRequest, Client } from '@/types'
import { HelpCircle, Plus, Send, Clock, CheckCircle } from 'lucide-react'

export default function RequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Form
  const [clientId, setClientId] = useState('')
  const [serviceType, setServiceType] = useState<'Canes' | 'Caza'>('Canes')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [urgency, setUrgency] = useState<'Normal' | 'Urgente' | 'Crítica'>('Normal')
  const [saving, setSaving] = useState(false)
  const { profile } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    fetchRequestsData()
  }, [])

  async function fetchRequestsData() {
    setLoading(true)
    const { data: clientsData } = await supabase.from('clients').select('*').eq('can_request_service', true)
    if (clientsData) {
      setClients(clientsData as Client[])
      if (clientsData.length > 0) setClientId(clientsData[0].id)
    }

    const { data: reqData } = await supabase
      .from('service_requests')
      .select('*, client:clients(*)')
      .order('created_at', { ascending: false })

    if (reqData) setRequests(reqData as ServiceRequest[])
    setLoading(false)
  }

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase.from('service_requests').insert({
        client_id: clientId,
        service_type: serviceType,
        description,
        location,
        urgency,
        status: 'Pendiente',
      })

      if (error) throw error
      setShowModal(false)
      fetchRequestsData()
      alert('Solicitud enviada correctamente. Se ha notificado al equipo operacional y enviado alerta al grupo de WhatsApp.')
    } catch (err: any) {
      alert('Error enviando solicitud: ' + err.message)
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
            <HelpCircle className="w-6 h-6 text-orange-600" />
            <h1 className="text-xl font-bold text-gray-900">Solicitudes de Servicio de Clientes</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Gestión de solicitudes directas de intervención en terreno con alertas de WhatsApp.
          </p>
        </div>
        {profile?.role === 'client' || profile?.role === 'admin' ? (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Solicitud</span>
          </button>
        ) : null}
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Historial de Solicitudes</h3>
          <span className="text-xs text-gray-500">{requests.length} solicitudes</span>
        </div>

        {loading ? (
          <div className="p-6 text-center text-xs text-gray-500">Cargando solicitudes...</div>
        ) : requests.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">No hay solicitudes ingresadas.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {requests.map((r) => (
              <div key={r.id} className="p-4 hover:bg-gray-50 transition flex flex-col sm:flex-row justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">{r.client?.name}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      r.urgency === 'Crítica' ? 'bg-red-100 text-red-800' :
                      r.urgency === 'Urgente' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {r.urgency}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-semibold rounded">
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 font-medium">{r.location}</p>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">{r.description}</p>
                </div>
                <span className="text-[11px] text-gray-400">
                  {new Date(r.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Crear Solicitud */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Nueva Solicitud de Servicio</h3>

            <form onSubmit={handleCreateRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Cliente Solicitante</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Servicio</label>
                <select
                  value={serviceType}
                  onChange={(e: any) => setServiceType(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                >
                  <option value="Canes">Canes (Perros/Gatos/Murciélagos)</option>
                  <option value="Caza">Caza (Conejos/Palomas)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Ubicación / Sector</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej: Sector Carga Hangar 4"
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Urgencia</label>
                <select
                  value={urgency}
                  onChange={(e: any) => setUrgency(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                >
                  <option value="Normal">Normal</option>
                  <option value="Urgente">Urgente</option>
                  <option value="Crítica">Crítica (Interferencia operacional)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Descripción de la Situación</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  Enviar Solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
