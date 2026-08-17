'use client'

import { BarChart3, TrendingUp, Clock, AlertTriangle, CheckCircle, MapPin } from 'lucide-react'

export default function IndicatorsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-orange-600" />
          <h1 className="text-xl font-bold text-gray-900">Indicadores de Gestión Operacional (KPIs)</h1>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Métricas consolidadas de desempeño conforme a la Sección 18 del Manual Operacional v2.0.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-gray-500">Tiempo Promedio Aviso → Intervención</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900">14.2</span>
            <span className="text-xs font-bold text-gray-500">minutos</span>
          </div>
          <p className="text-[10px] text-emerald-600 font-medium">✓ Dentro del estándar meta (&lt; 20 min)</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-gray-500">Tiempo de Permanencia en Canil</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900">18.5</span>
            <span className="text-xs font-bold text-gray-500">horas</span>
          </div>
          <p className="text-[10px] text-emerald-600 font-medium">✓ Custodia temporal controlada (&lt; 24h)</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-gray-500">% Actas de Entrega Completas</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">100%</span>
          </div>
          <p className="text-[10px] text-gray-500">Trazabilidad firmada y escaneada</p>
        </div>
      </div>

      {/* Graphical Breakdown Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Interventions by species */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Intervenciones por Especie</h3>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Perros</span>
                <span>8 capturas (53%)</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-orange-500 h-full rounded-full" style={{ width: '53%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Gatos</span>
                <span>4 capturas (27%)</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: '27%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Murciélagos</span>
                <span>3 liberaciones (20%)</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '20%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Recurrence by sector */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Ranking Zonas Críticas</h3>
          
          <div className="space-y-2 text-xs">
            <div className="p-2.5 bg-gray-50 rounded-lg flex items-center justify-between">
              <span className="font-semibold text-gray-800">1. Umbral Pista 35L</span>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded-full text-[10px]">6 eventos</span>
            </div>

            <div className="p-2.5 bg-gray-50 rounded-lg flex items-center justify-between">
              <span className="font-semibold text-gray-800">2. Perímetro Norte Carga</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 font-bold rounded-full text-[10px]">4 eventos</span>
            </div>

            <div className="p-2.5 bg-gray-50 rounded-lg flex items-center justify-between">
              <span className="font-semibold text-gray-800">3. Calle Rodaje Alpha</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-bold rounded-full text-[10px]">3 eventos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
