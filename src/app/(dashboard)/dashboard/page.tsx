'use client'

import { useAuth } from '@/lib/auth/AuthProvider'
import Link from 'next/link'
import { 
  Compass, 
  ShieldAlert, 
  Dog, 
  FileCheck, 
  HeartHandshake, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Building2 
} from 'lucide-react'

export default function DashboardPage() {
  const { profile } = useAuth()

  if (!profile) return null

  const isCanes = ['admin', 'supervisor', 'canes'].includes(profile.role)
  const isCaza = ['admin', 'supervisor', 'caza'].includes(profile.role)
  const isAdminOrSuper = ['admin', 'supervisor'].includes(profile.role)

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-end p-4">
          <img src="/logos/Logo Control Fauna.jfif" alt="Fauna" className="h-full object-contain" />
        </div>
        <div className="relative z-10">
          <span className="inline-block px-2.5 py-1 bg-orange-600/80 text-white text-[10px] font-bold uppercase rounded-md tracking-wider mb-2">
            Panel Operacional
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-white">
            Bienvenido(a), {profile.full_name}
          </h1>
          <p className="text-xs text-gray-300 mt-1 max-w-xl">
            Sistema de Gestión, Registro y Trazabilidad del Control y Mitigación de Fauna Aeroportuaria.
          </p>
        </div>
      </div>

      {/* Kennel Alert Banner (If animals present in kennel) */}
      {isCanes && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">Alerta de Registro de Aseo de Canil</h4>
              <p className="text-xs text-amber-700">Recuerde registrar la limpieza y alimentación periódica del canil mientras existan animales bajo custodia.</p>
            </div>
          </div>
          <Link
            href="/kennel"
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition whitespace-nowrap"
          >
            Registrar Aseo
          </Link>
        </div>
      )}

      {/* Quick Access Action Grid for Operators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {isCanes && (
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

        {isCaza && (
          <Link
            href="/pest-control"
            className="p-4 bg-white border border-gray-200 rounded-xl hover:border-orange-500 hover:shadow-md transition group flex flex-col items-center text-center"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <Dog className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-800">Control Caza</span>
            <span className="text-[10px] text-gray-500 mt-0.5">Conejos & Palomas</span>
          </Link>
        )}

        {isAdminOrSuper && (
          <Link
            href="/adoptions"
            className="p-4 bg-white border border-gray-200 rounded-xl hover:border-orange-500 hover:shadow-md transition group flex flex-col items-center text-center"
          >
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-800">Pendientes Adopción</span>
            <span className="text-[10px] text-gray-500 mt-0.5">Chip & RNM</span>
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Capturas del Mes</span>
            <span className="p-1.5 bg-orange-100 text-orange-600 rounded-md">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">12</p>
          <p className="text-[10px] text-emerald-600 mt-1 font-medium">100% con acta de entrega</p>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">En Canil Actual</span>
            <span className="p-1.5 bg-amber-100 text-amber-600 rounded-md">
              <Dog className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">1</p>
          <p className="text-[10px] text-gray-500 mt-1">Custodia temporal activa</p>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Adopciones Pendientes</span>
            <span className="p-1.5 bg-purple-100 text-purple-600 rounded-md">
              <HeartHandshake className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">2</p>
          <p className="text-[10px] text-purple-600 mt-1 font-medium">Requieren chip + RNM</p>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Clientes Activos</span>
            <span className="p-1.5 bg-blue-100 text-blue-600 rounded-md">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">2</p>
          <p className="text-[10px] text-gray-500 mt-1">DGAC + Clientes Privados</p>
        </div>
      </div>
    </div>
  )
}
