'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, Users, Building2, MessageSquare, Shield, Mail, CheckCircle } from 'lucide-react'

export default function SettingsPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'users' | 'clients' | 'integrations'>('users')
  const [loading, setLoading] = useState(true)

  // Integrations state
  const [ultramsgToken, setUltramsgToken] = useState('instance1029384756')
  const [ultramsgInstance, setUltramsgInstance] = useState('instance12345')

  const supabase = createClient()

  useEffect(() => {
    fetchSettingsData()
  }, [])

  async function fetchSettingsData() {
    setLoading(true)
    const { data: profData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (profData) setProfiles(profData)

    const { data: clientData } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    if (clientData) setClients(clientData)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-gray-800" />
          <h1 className="text-xl font-bold text-gray-900">Ajustes y Administración de la Plataforma</h1>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Administración global de usuarios, clientes, tarifarios por animal e integraciones de WhatsApp y correo.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-4">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-2 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'users' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Administración de Usuarios</span>
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={`pb-3 px-2 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'clients' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Clientes & Tarifas</span>
        </button>

        <button
          onClick={() => setActiveTab('integrations')}
          className={`pb-3 px-2 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'integrations' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Integraciones (WhatsApp / Email)</span>
        </button>
      </div>

      {/* Tab 1: Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Usuarios Registrados</h3>
            <span className="text-xs text-gray-500">{profiles.length} usuarios</span>
          </div>

          <div className="divide-y divide-gray-100">
            {profiles.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900">{p.full_name}</h4>
                  <p className="text-[11px] text-gray-500">{p.email}</p>
                </div>
                <span className="px-2.5 py-1 bg-gray-100 text-gray-800 text-[10px] font-bold uppercase rounded-md">
                  {p.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Clients */}
      {activeTab === 'clients' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Clientes del Servicio</h3>
            <span className="text-xs text-gray-500">{clients.length} clientes</span>
          </div>

          <div className="divide-y divide-gray-100">
            {clients.map((c) => (
              <div key={c.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-gray-900">{c.name}</h4>
                    {c.is_contract_client && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                        CONTRATO DGAC (Sin Cobro por Animal)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">RUT: {c.rut || 'N/A'} | Dirección: {c.address}</p>
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  {c.can_request_service ? 'Habilitado Solicitudes' : 'Solo Lectura'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Integrations */}
      {activeTab === 'integrations' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 max-w-xl">
          <h3 className="text-sm font-bold text-gray-900 border-b pb-2">Configuración ultramsg (WhatsApp API)</h3>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Instance ID</label>
            <input
              type="text"
              value={ultramsgInstance}
              onChange={(e) => setUltramsgInstance(e.target.value)}
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Token de Acceso</label>
            <input
              type="password"
              value={ultramsgToken}
              onChange={(e) => setUltramsgToken(e.target.value)}
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={() => alert('Configuración de integraciones guardada con éxito.')}
              className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700"
            >
              Guardar Credenciales Integración
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
