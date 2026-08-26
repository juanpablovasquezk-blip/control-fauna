'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Settings, Users, Building2, MessageSquare, Shield, Mail, CheckCircle, 
  MapPin, Plus, Trash2, Edit2, Key, AlertCircle, Save, X 
} from 'lucide-react'
import { 
  createUserAction, updateUserAction, deleteUserAction,
  createClientAction, updateClientAction, deleteClientAction,
  updateClientServicePriceAction,
  createAirportZoneAction, updateAirportZoneAction, deleteAirportZoneAction,
  getWhatsAppSettingsAction, saveWhatsAppSettingsAction, sendTestWhatsAppAction
} from './actions'

export default function SettingsPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [clientServices, setClientServices] = useState<any[]>([])
  const [zones, setZones] = useState<any[]>([])
  
  const [activeTab, setActiveTab] = useState<'users' | 'clients' | 'zones' | 'integrations'>('users')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Integration Config State
  const [whatsappEnabled, setWhatsappEnabled] = useState(true)
  const [ultramsgToken, setUltramsgToken] = useState('')
  const [ultramsgInstance, setUltramsgInstance] = useState('')
  const [defaultGroupId, setDefaultGroupId] = useState('')
  const [testingWa, setTestingWa] = useState(false)

  // Modals visibility
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  
  const [showClientModal, setShowClientModal] = useState(false)
  const [editingClient, setEditingClient] = useState<any | null>(null)
  const [showRatesModal, setShowRatesModal] = useState<any | null>(null) // holds client object

  const [showZoneModal, setShowZoneModal] = useState(false)
  const [editingZone, setEditingZone] = useState<any | null>(null)

  // User form state
  const [userEmail, setUserEmail] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [userFullName, setUserFullName] = useState('')
  const [userRut, setUserRut] = useState('')
  const [userRole, setUserRole] = useState('canes')
  const [userActive, setUserActive] = useState(true)

  // Client form state
  const [clientName, setClientName] = useState('')
  const [clientRut, setClientRut] = useState('')
  const [clientContactName, setClientContactName] = useState('')
  const [clientContactEmail, setClientContactEmail] = useState('')
  const [clientContactPhone, setClientContactPhone] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [clientIsContract, setClientIsContract] = useState(false)
  const [clientCanRequest, setClientCanRequest] = useState(true)
  const [clientNotifEmails, setClientNotifEmails] = useState('')
  const [clientWhatsappGroup, setClientWhatsappGroup] = useState('')

  // Zone form state
  const [zoneName, setZoneName] = useState('')

  const [pricesState, setPricesState] = useState<{ [serviceId: string]: number }>({})
  const [unitsState, setUnitsState] = useState<{ [serviceId: string]: string }>({})

  const supabase = createClient()

  useEffect(() => {
    fetchSettingsData()
  }, [])

  async function fetchSettingsData() {
    setLoading(true)
    
    // Profiles
    const { data: profData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (profData) setProfiles(profData)

    // Clients
    const { data: clientData } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    if (clientData) setClients(clientData)

    // Services
    const { data: serviceData } = await supabase.from('services').select('*').order('name', { ascending: true })
    if (serviceData) setServices(serviceData)

    // Client Services Pricing
    const { data: pricingData } = await supabase.from('client_services').select('*')
    if (pricingData) setClientServices(pricingData)

    // Airport Zones
    const { data: zoneData } = await supabase.from('airport_zones').select('*').order('name', { ascending: true })
    if (zoneData) setZones(zoneData)

    // WhatsApp Settings
    const waRes = await getWhatsAppSettingsAction()
    if (waRes.success && waRes.config) {
      setWhatsappEnabled(waRes.config.enabled ?? true)
      setUltramsgInstance(waRes.config.instance_id || '')
      setUltramsgToken(waRes.config.token || '')
      setDefaultGroupId(waRes.config.default_group_id || '')
    }

    setLoading(false)
  }

  const handleSaveWhatsAppConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await saveWhatsAppSettingsAction({
        enabled: whatsappEnabled,
        instance_id: ultramsgInstance,
        token: ultramsgToken,
        default_group_id: defaultGroupId,
      })
      if (!res.success) throw new Error(res.error)
      alert('Configuración de WhatsApp guardada con éxito.')
    } catch (err: any) {
      alert('Error al guardar configuración de WhatsApp: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleTestWhatsApp = async () => {
    if (!ultramsgInstance || !ultramsgToken || !defaultGroupId) {
      alert('Debe ingresar Instance ID, Token y el ID del Grupo por Defecto para enviar un mensaje de prueba.')
      return
    }
    setTestingWa(true)
    try {
      const res = await sendTestWhatsAppAction({
        instance_id: ultramsgInstance,
        token: ultramsgToken,
        to: defaultGroupId,
      })
      if (res.success) {
        alert('✅ Mensaje de prueba enviado con éxito a WhatsApp!')
      } else {
        alert('❌ Error al enviar mensaje de prueba: ' + res.error)
      }
    } catch (err: any) {
      alert('❌ Error de conexión: ' + err.message)
    } finally {
      setTestingWa(false)
    }
  }

  // --- USER HANDLERS ---
  const handleOpenAddUser = () => {
    setEditingUser(null)
    setUserEmail('')
    setUserPassword('')
    setUserFullName('')
    setUserRut('')
    setUserRole('canes')
    setUserActive(true)
    setShowUserModal(true)
  }

  const handleOpenEditUser = (user: any) => {
    setEditingUser(user)
    setUserEmail(user.email)
    setUserPassword('') // Clear password field for edits
    setUserFullName(user.full_name)
    setUserRut(user.rut || '')
    setUserRole(user.role)
    setUserActive(user.active)
    setShowUserModal(true)
  }

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingUser) {
        // Edit User
        const res = await updateUserAction({
          id: editingUser.id,
          fullName: userFullName,
          rut: userRut,
          role: userRole,
          active: userActive
        })
        if (!res.success) throw new Error(res.error)
      } else {
        // Create User
        const res = await createUserAction({
          email: userEmail,
          password: userPassword,
          fullName: userFullName,
          rut: userRut,
          role: userRole
        })
        if (!res.success) throw new Error(res.error)
      }
      setShowUserModal(false)
      await fetchSettingsData()
    } catch (err: any) {
      alert('Error al guardar usuario: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este usuario de la plataforma?')) return
    try {
      const res = await deleteUserAction(id)
      if (!res.success) throw new Error(res.error)
      await fetchSettingsData()
    } catch (err: any) {
      alert('Error al eliminar usuario: ' + err.message)
    }
  }

  // --- CLIENT HANDLERS ---
  const handleOpenAddClient = () => {
    setEditingClient(null)
    setClientName('')
    setClientRut('')
    setClientContactName('')
    setClientContactEmail('')
    setClientContactPhone('')
    setClientAddress('')
    setClientIsContract(false)
    setClientCanRequest(true)
    setClientNotifEmails('')
    setClientWhatsappGroup('')
    setShowClientModal(true)
  }

  const handleOpenEditClient = (client: any) => {
    setEditingClient(client)
    setClientName(client.name)
    setClientRut(client.rut || '')
    setClientContactName(client.contact_name || '')
    setClientContactEmail(client.contact_email || '')
    setClientContactPhone(client.contact_phone || '')
    setClientAddress(client.address || '')
    setClientIsContract(client.is_contract_client)
    setClientCanRequest(client.can_request_service)
    setClientNotifEmails((client.notification_emails || []).join(', '))
    setClientWhatsappGroup(client.whatsapp_group_id || '')
    setShowClientModal(true)
  }

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const notification_emails = clientNotifEmails
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0)

    const clientData = {
      id: editingClient?.id,
      name: clientName,
      rut: clientRut,
      contact_name: clientContactName,
      contact_email: clientContactEmail,
      contact_phone: clientContactPhone,
      address: clientAddress,
      is_contract_client: clientIsContract,
      can_request_service: clientCanRequest,
      notification_emails,
      whatsapp_group_id: clientWhatsappGroup
    }

    try {
      if (editingClient) {
        const res = await updateClientAction(editingClient.id, clientData)
        if (!res.success) throw new Error(res.error)
      } else {
        const res = await createClientAction(clientData)
        if (!res.success) throw new Error(res.error)
      }
      setShowClientModal(false)
      await fetchSettingsData()
    } catch (err: any) {
      alert('Error al guardar cliente: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClient = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este cliente? Se borrarán sus tarifas asociadas.')) return
    try {
      const res = await deleteClientAction(id)
      if (!res.success) throw new Error(res.error)
      await fetchSettingsData()
    } catch (err: any) {
      alert('Error al eliminar cliente: ' + err.message)
    }
  }

  // --- RATES / PRICING HANDLERS ---
  const handleOpenRates = (client: any) => {
    setShowRatesModal(client)
    
    // Pre-populate rates state
    const initialPrices: { [serviceId: string]: number } = {}
    const initialUnits: { [serviceId: string]: string } = {}
    services.forEach(s => {
      const match = clientServices.find(cs => cs.client_id === client.id && cs.service_id === s.id)
      initialPrices[s.id] = match ? parseFloat(match.price_per_animal) : 0
      initialUnits[s.id] = match && match.price_unit ? match.price_unit : 'CLP'
    })
    setPricesState(initialPrices)
    setUnitsState(initialUnits)
  }

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showRatesModal) return
    setSaving(true)

    try {
      for (const serviceId of Object.keys(pricesState)) {
        const price = pricesState[serviceId]
        const unit = unitsState[serviceId] || 'CLP'
        const res = await updateClientServicePriceAction(showRatesModal.id, serviceId, price, unit)
        if (!res.success) throw new Error(res.error)
      }
      setShowRatesModal(null)
      await fetchSettingsData()
      alert('Tarifas actualizadas correctamente.')
    } catch (err: any) {
      alert('Error al actualizar tarifas: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // --- ZONE HANDLERS ---
  const handleOpenAddZone = () => {
    setEditingZone(null)
    setZoneName('')
    setShowZoneModal(true)
  }

  const handleOpenEditZone = (zone: any) => {
    setEditingZone(zone)
    setZoneName(zone.name)
    setShowZoneModal(true)
  }

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingZone) {
        const res = await updateAirportZoneAction(editingZone.id, zoneName)
        if (!res.success) throw new Error(res.error)
      } else {
        const res = await createAirportZoneAction(zoneName)
        if (!res.success) throw new Error(res.error)
      }
      setShowZoneModal(false)
      await fetchSettingsData()
    } catch (err: any) {
      alert('Error al guardar sector: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteZone = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este sector del aeródromo?')) return
    try {
      const res = await deleteAirportZoneAction(id)
      if (!res.success) throw new Error(res.error)
      await fetchSettingsData()
    } catch (err: any) {
      alert('Error al eliminar sector: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin border-4 border-orange-500 border-t-transparent rounded-full w-8 h-8"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-gray-800" />
            <h1 className="text-xl font-bold text-gray-900">Ajustes y Administración de la Plataforma</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Administración global de usuarios, clientes, sectores aeroportuarios e integraciones.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-4 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-2 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'users' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Administración de Usuarios</span>
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={`pb-3 px-2 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'clients' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Clientes & Tarifas</span>
        </button>

        <button
          onClick={() => setActiveTab('zones')}
          className={`pb-3 px-2 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'zones' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Sectores / Zonas</span>
        </button>

        <button
          onClick={() => setActiveTab('integrations')}
          className={`pb-3 px-2 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'integrations' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Integraciones (WhatsApp)</span>
        </button>
      </div>

      {/* Tab 1: Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Usuarios Registrados</h3>
              <span className="text-[11px] text-gray-500">{profiles.length} usuarios con acceso</span>
            </div>
            <button
              onClick={handleOpenAddUser}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Usuario</span>
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {profiles.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-gray-900">{p.full_name}</h4>
                    {!p.active && (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-[9px] font-bold rounded">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">{p.email} {p.rut ? `| RUT: ${p.rut}` : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-[10px] font-bold uppercase rounded border border-gray-200">
                    {p.role}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditUser(p)}
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition"
                      title="Editar usuario"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(p.id)}
                      className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition"
                      title="Eliminar usuario"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Clients */}
      {activeTab === 'clients' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Clientes y Tarifarios</h3>
              <span className="text-[11px] text-gray-500">{clients.length} clientes en base de datos</span>
            </div>
            <button
              onClick={handleOpenAddClient}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Cliente</span>
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {clients.map((c) => (
              <div key={c.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition">
                <div className="space-y-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <h4 className="text-xs font-bold text-gray-900">{c.name}</h4>
                    {c.is_contract_client ? (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[9px] font-bold rounded">
                        CONTRATO DGAC (Exento cobro animal)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">
                        Tarifa por Animal Capturado
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    RUT: {c.rut || 'N/A'} | Dirección: {c.address || 'N/A'}
                  </p>
                  {c.notification_emails && c.notification_emails.length > 0 && (
                    <p className="text-[10px] text-gray-400">
                      Notificaciones a: {c.notification_emails.join(', ')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 justify-end">
                  {!c.is_contract_client && (
                    <button
                      onClick={() => handleOpenRates(c)}
                      className="px-2.5 py-1 text-[11px] font-bold text-orange-600 hover:bg-orange-50 border border-orange-200 rounded transition"
                    >
                      Configurar Tarifas ($)
                    </button>
                  )}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditClient(c)}
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition"
                      title="Editar cliente"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClient(c.id)}
                      className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition"
                      title="Eliminar cliente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Zones */}
      {activeTab === 'zones' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Sectores y Zonas del Aeropuerto</h3>
              <span className="text-[11px] text-gray-500">Configuración de zonas operacionales</span>
            </div>
            <button
              onClick={handleOpenAddZone}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Zona</span>
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {zones.map((z) => (
              <div key={z.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-bold text-gray-900">{z.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditZone(z)}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteZone(z.id)}
                    className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {zones.length === 0 && (
              <div className="p-8 text-center text-xs text-gray-500">
                No hay zonas registradas. Agrega una para comenzar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Integrations */}
      {activeTab === 'integrations' && (
        <form onSubmit={handleSaveWhatsAppConfig} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 max-w-xl">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <span>Configuración UltraMsg (WhatsApp API)</span>
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">Alertas automáticas a grupos y celulares de guardia</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={whatsappEnabled}
                onChange={(e) => setWhatsappEnabled(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <span className="text-xs font-bold text-gray-800">Alertas Activas</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Instance ID de UltraMsg *</label>
            <input
              type="text"
              required
              value={ultramsgInstance}
              onChange={(e) => setUltramsgInstance(e.target.value)}
              placeholder="Ej: instance12345"
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Token de Acceso de UltraMsg *</label>
            <input
              type="password"
              required
              value={ultramsgToken}
              onChange={(e) => setUltramsgToken(e.target.value)}
              placeholder="••••••••••••••••"
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">ID de Grupo / Celular por Defecto (Global) *</label>
            <input
              type="text"
              value={defaultGroupId}
              onChange={(e) => setDefaultGroupId(e.target.value)}
              placeholder="Ej: 120363123456789012@g.us o +56912345678"
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Las alertas generales (Rondas, Canil, etc.) y clientes sin grupo exclusivo asignado se enviarán a este ID.
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleTestWhatsApp}
              disabled={testingWa}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <span>{testingWa ? 'Enviando...' : '🧪 Enviar Mensaje de Prueba'}</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow transition"
            >
              {saving ? 'Guardando...' : 'Guardar Configuración WhatsApp'}
            </button>
          </div>
        </form>
      )}

      {/* --- MODAL USUARIO --- */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-gray-900">
                {editingUser ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={userFullName}
                    onChange={(e) => setUserFullName(e.target.value)}
                    placeholder="Ej: Victor Cornejo"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">RUT Operador / Usuario *</label>
                  <input
                    type="text"
                    required
                    value={userRut}
                    onChange={(e) => setUserRut(e.target.value)}
                    placeholder="12.345.678-9"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  disabled={!!editingUser}
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="correo@minerquim.cl"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900 disabled:opacity-60"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Contraseña Inicial</label>
                  <input
                    type="password"
                    required
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="Min. 8 caracteres"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Rol en la Plataforma</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900"
                >
                  <option value="admin">Administrador (Minerquim)</option>
                  <option value="supervisor">Supervisor DGAC / Aeródromo</option>
                  <option value="canes">Operador Canil & Aseo (Línea 1)</option>
                  <option value="caza">Operador Caza (Línea 2)</option>
                </select>
              </div>

              {editingUser && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="userActive"
                    checked={userActive}
                    onChange={(e) => setUserActive(e.target.checked)}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="userActive" className="text-xs font-bold text-gray-700">Usuario Activo / Acceso Habilitado</label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded hover:bg-orange-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL CLIENTE --- */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-gray-900">
                {editingClient ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}
              </h3>
              <button onClick={() => setShowClientModal(false)} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nombre / Razón Social</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej: DGAC - Dirección General..."
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">RUT</label>
                  <input
                    type="text"
                    value={clientRut}
                    onChange={(e) => setClientRut(e.target.value)}
                    placeholder="12.345.678-9"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Contacto</label>
                  <input
                    type="text"
                    value={clientContactName}
                    onChange={(e) => setClientContactName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Correo Electrónico Contacto</label>
                  <input
                    type="email"
                    value={clientContactEmail}
                    onChange={(e) => setClientContactEmail(e.target.value)}
                    placeholder="contacto@empresa.com"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono Contacto</label>
                  <input
                    type="text"
                    value={clientContactPhone}
                    onChange={(e) => setClientContactPhone(e.target.value)}
                    placeholder="+56 9 1234 5678"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Dirección Comercial</label>
                  <input
                    type="text"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Sector Carga, Pudahuel"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Correos Notificación Rondas/Daño Rejas (Separados por coma)</label>
                <input
                  type="text"
                  value={clientNotifEmails}
                  onChange={(e) => setClientNotifEmails(e.target.value)}
                  placeholder="correo1@minerquim.cl, correo2@minerquim.cl"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ID Grupo WhatsApp (ultramsg)</label>
                <input
                  type="text"
                  value={clientWhatsappGroup}
                  onChange={(e) => setClientWhatsappGroup(e.target.value)}
                  placeholder="E.g. 120363029384756@g.us"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2 bg-gray-50 p-3 rounded-xl border">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="clientIsContract"
                    checked={clientIsContract}
                    onChange={(e) => {
                      setClientIsContract(e.target.checked)
                      if (e.target.checked) setClientCanRequest(false)
                    }}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="clientIsContract" className="text-xs font-bold text-gray-800">
                    Cliente de Contrato DGAC (Sin Cobro por Captura Animal)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="clientCanRequest"
                    disabled={clientIsContract}
                    checked={clientCanRequest}
                    onChange={(e) => setClientCanRequest(e.target.checked)}
                    className="rounded text-orange-600 focus:ring-orange-500 disabled:opacity-50"
                  />
                  <label htmlFor="clientCanRequest" className="text-xs font-bold text-gray-800 disabled:opacity-50">
                    Habilitado para crear Solicitudes de Servicio (Sólo clientes privados)
                  </label>
                </div>
              </div>

              {!clientIsContract && editingClient && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowClientModal(false)
                      handleOpenRates(editingClient)
                    }}
                    className="w-full py-2.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <span>Configurar Tarifas ($) de este Cliente</span>
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded hover:bg-orange-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL CONFIGURAR TARIFAS --- */}
      {showRatesModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Tarifario de Captura por Animal</h3>
                <p className="text-[11px] text-gray-500">{showRatesModal.name}</p>
              </div>
              <button onClick={() => setShowRatesModal(null)} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRates} className="space-y-4">
              <div className="space-y-3">
                {services.map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-4 p-2 bg-gray-50 rounded-lg border">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{s.name}</h4>
                      <p className="text-[10px] text-gray-500">{s.line}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={unitsState[s.id] || 'CLP'}
                        onChange={(e) => setUnitsState({ ...unitsState, [s.id]: e.target.value })}
                        className="p-1.5 bg-white border border-gray-300 rounded text-xs font-bold text-gray-700"
                      >
                        <option value="CLP">$ (Pesos)</option>
                        <option value="UF">UF</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={pricesState[s.id] || 0}
                        onChange={(e) => setPricesState({ ...pricesState, [s.id]: parseFloat(e.target.value) || 0 })}
                        className="w-24 p-1.5 bg-white border border-gray-300 rounded text-xs font-semibold text-right text-gray-900"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowRatesModal(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded hover:bg-orange-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Tarifas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL ZONAS AEROPUERTO --- */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-gray-900">
                {editingZone ? 'Editar Sector / Zona' : 'Agregar Sector / Zona'}
              </h3>
              <button onClick={() => setShowZoneModal(false)} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveZone} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nombre del Sector / Zona</label>
                <input
                  type="text"
                  required
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="Ej: Área Pista 35L / Hangar 3"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowZoneModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded hover:bg-orange-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Sector'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
