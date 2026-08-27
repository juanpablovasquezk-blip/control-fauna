'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { 
  Compass, 
  ShieldAlert, 
  Dog, 
  FileCheck, 
  HeartHandshake, 
  AlertTriangle, 
  TrendingUp, 
  Crosshair, 
  Bird, 
  Calendar, 
  MapPin, 
  Building2,
  Sparkles
} from 'lucide-react'

export default function DashboardPage() {
  const { profile } = useAuth()
  const supabase = createClient()

  // Estados de métricas de Caza
  const [cazaMetrics, setCazaMetrics] = useState({
    rabbitsTotal: 0,
    rabbitsMale: 0,
    rabbitsFemale: 0,
    pigeonsTotal: 0,
    totalJornadas: 0,
    lastSector: 'Sin registros'
  })

  // Estados de métricas de Canes
  const [canesMetrics, setCanesMetrics] = useState({
    capturasMes: 0,
    enCanil: 0,
    adopcionesPendientes: 0,
    actasEmitidas: 0
  })

  const [loadingMetrics, setLoadingMetrics] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchDashboardMetrics()
    }
  }, [profile])

  async function fetchDashboardMetrics() {
    setLoadingMetrics(true)
    try {
      const now = new Date()
      const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

      // 1. Obtener métricas de Caza (pest_control_records)
      const { data: pestData } = await supabase
        .from('pest_control_records')
        .select('*')
        .gte('record_date', firstDayOfMonth)
        .order('record_date', { ascending: false })

      if (pestData) {
        let rTotal = 0
        let rMale = 0
        let rFemale = 0
        let pTotal = 0
        pestData.forEach(r => {
          rTotal += r.rabbits_total || 0
          rMale += r.rabbits_male || 0
          rFemale += r.rabbits_female || 0
          pTotal += r.pigeons || 0
        })

        setCazaMetrics({
          rabbitsTotal: rTotal,
          rabbitsMale: rMale,
          rabbitsFemale: rFemale,
          pigeonsTotal: pTotal,
          totalJornadas: pestData.length,
          lastSector: pestData.length > 0 ? pestData[0].sector : 'Sin registros'
        })
      }

      // 2. Obtener métricas de Canes (animal_records, kennel_records, delivery_acts)
      const { data: animals } = await supabase
        .from('animal_records')
        .select('*')
        .gte('created_at', `${firstDayOfMonth}T00:00:00Z`)

      const { count: enCanilCount } = await supabase
        .from('animal_records')
        .select('*', { count: 'exact', head: true })
        .eq('animal_status', 'En canil')

      const { count: pendingAdoptionsCount } = await supabase
        .from('animal_records')
        .select('*', { count: 'exact', head: true })
        .eq('animal_status', 'Pendiente Adopción')

      const { count: actasCount } = await supabase
        .from('delivery_acts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${firstDayOfMonth}T00:00:00Z`)

      setCanesMetrics({
        capturasMes: animals ? animals.filter(a => a.was_captured).length : 0,
        enCanil: enCanilCount || 0,
        adopcionesPendientes: pendingAdoptionsCount || 0,
        actasEmitidas: actasCount || 0
      })
    } catch (err) {
      console.warn('Error cargando métricas del dashboard:', err)
    } finally {
      setLoadingMetrics(false)
    }
  }

  if (!profile) return null

  const role = profile.role || 'canes'
  const isCazaOnly = role === 'caza'
  const isCanesOnly = role === 'canes'
  const isAdminOrSuper = role === 'admin' || role === 'supervisor'

  const roleLabelMap: Record<string, string> = {
    caza: 'Operador Caza (Línea 2)',
    canes: 'Operador Canes / Canil (Línea 1)',
    supervisor: 'Supervisor DGAC',
    admin: 'Administrador'
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner Estilizado */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block px-2.5 py-0.5 bg-orange-600 text-white text-[10px] font-bold uppercase rounded-md tracking-wider">
              {roleLabelMap[role] || 'Panel Operacional'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Bienvenido(a), {profile.full_name}
          </h1>
          <p className="text-xs text-gray-300 max-w-xl leading-relaxed">
            Plataforma de Registro y Trazabilidad de Control y Mitigación de Fauna Aeroportuaria.
          </p>
        </div>
      </div>

      {/* Alerta de Aseo Canil (Solo para Canes / Admin) */}
      {!isCazaOnly && canesMetrics.enCanil > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">Alerta: Hay {canesMetrics.enCanil} animal(es) bajo custodia en Canil</h4>
              <p className="text-xs text-amber-700">Recuerde registrar la limpieza y alimentación periódica mientras permanezcan en canil.</p>
            </div>
          </div>
          <Link
            href="/kennel"
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition whitespace-nowrap shadow-sm"
          >
            Registrar Aseo
          </Link>
        </div>
      )}

      {/* Accesos Rápidos según Rol */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Accesos Rápidos</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Accesos Caza */}
          {(isCazaOnly || isAdminOrSuper) && (
            <Link
              href="/pest-control"
              className="p-4 bg-white border border-gray-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition group flex flex-col items-center text-center"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                <Crosshair className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-gray-800">Control Caza</span>
              <span className="text-[10px] text-gray-500 mt-0.5">Conejos & Palomas</span>
            </Link>
          )}

          {/* Accesos Canes */}
          {(!isCazaOnly) && (
            <>
              <Link
                href="/rounds"
                className="p-4 bg-white border border-gray-200 rounded-xl hover:border-orange-500 hover:shadow-md transition group flex flex-col items-center text-center"
              >
                <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                  <Compass className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-800">Nueva Ronda</span>
                <span className="text-[10px] text-gray-500 mt-0.5">Patrullaje / Rejas</span>
              </Link>

              <Link
                href="/events"
                className="p-4 bg-white border border-gray-200 rounded-xl hover:border-orange-500 hover:shadow-md transition group flex flex-col items-center text-center"
              >
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-800">Intervención Canes</span>
                <span className="text-[10px] text-gray-500 mt-0.5">Captura animal</span>
              </Link>

              <Link
                href="/delivery-acts"
                className="p-4 bg-white border border-gray-200 rounded-xl hover:border-orange-500 hover:shadow-md transition group flex flex-col items-center text-center"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                  <FileCheck className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-800">Acta de Entrega</span>
                <span className="text-[10px] text-gray-500 mt-0.5">Imprimir / Escanear</span>
              </Link>
            </>
          )}

          {isAdminOrSuper && (
            <Link
              href="/adoptions"
              className="p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-500 hover:shadow-md transition group flex flex-col items-center text-center"
            >
              <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-gray-800">Pendientes Adopción</span>
              <span className="text-[10px] text-gray-500 mt-0.5">Chip & RNM</span>
            </Link>
          )}
        </div>
      </div>

      {/* --- SECCIÓN 1: KPIs DE CAZA (Para Cazadores o Vista Administrador) --- */}
      {(isCazaOnly || isAdminOrSuper) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Crosshair className="w-4 h-4 text-emerald-600" />
              <span>Indicadores de Caza (Conejos & Palomas - Mes Actual)</span>
            </h3>
            <Link href="/pest-control" className="text-xs text-emerald-600 font-bold hover:underline">
              Ver Registros →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Conejos Cazados */}
            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-emerald-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">Conejos Cazados del Mes</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Crosshair className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900 mt-2">{cazaMetrics.rabbitsTotal}</p>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                {cazaMetrics.rabbitsMale} Machos | {cazaMetrics.rabbitsFemale} Hembras
              </p>
            </div>

            {/* KPI 2: Palomas Retiradas */}
            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-emerald-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">Palomas Controladas del Mes</span>
                <span className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                  <Bird className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900 mt-2">{cazaMetrics.pigeonsTotal}</p>
              <p className="text-[11px] text-gray-500 mt-1 font-medium">Control de avifauna aeroportuaria</p>
            </div>

            {/* KPI 3: Jornadas de Caza */}
            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-emerald-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">Jornadas de Caza Realizadas</span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900 mt-2">{cazaMetrics.totalJornadas}</p>
              <p className="text-[11px] text-amber-700 font-semibold mt-1">Registros de terreno del periodo</p>
            </div>

            {/* KPI 4: Último Sector Atendido */}
            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-emerald-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">Último Sector Atendido</span>
                <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <MapPin className="w-4 h-4" />
                </span>
              </div>
              <p className="text-sm font-bold text-gray-900 mt-3 truncate">{cazaMetrics.lastSector}</p>
              <p className="text-[11px] text-gray-500 mt-1">Última zona intervenida</p>
            </div>
          </div>
        </div>
      )}

      {/* --- SECCIÓN 2: KPIs DE CANES / CANIL (Para Operadores Canes o Vista Administrador) --- */}
      {(!isCazaOnly) && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Dog className="w-4 h-4 text-orange-600" />
            <span>Indicadores de Canes & Canil (Mes Actual)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-orange-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">Capturas del Mes</span>
                <span className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900 mt-2">{canesMetrics.capturasMes}</p>
              <p className="text-[11px] text-emerald-700 font-bold mt-1">Canes & Gatos capturados</p>
            </div>

            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-orange-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">En Canil Actual</span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Dog className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900 mt-2">{canesMetrics.enCanil}</p>
              <p className="text-[11px] text-gray-500 font-medium mt-1">Custodia temporal activa</p>
            </div>

            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-orange-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">Adopciones Pendientes</span>
                <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <HeartHandshake className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900 mt-2">{canesMetrics.adopcionesPendientes}</p>
              <p className="text-[11px] text-purple-700 font-bold mt-1">Requieren chip + RNM</p>
            </div>

            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-orange-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">Actas Emitidas</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <FileCheck className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900 mt-2">{canesMetrics.actasEmitidas}</p>
              <p className="text-[11px] text-blue-700 font-bold mt-1">Entregas formalizadas</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
