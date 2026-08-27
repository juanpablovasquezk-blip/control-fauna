'use client'

import { useEffect } from 'react'
import { RefreshCw, AlertTriangle, Home, RotateCcw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('🔴 Error capturado en Next.js Error Boundary:', error)

    const isChunkError = 
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('failed to fetch') ||
      error.message?.includes('dynamically imported module') ||
      error.message?.includes('Load failed')

    if (isChunkError) {
      console.warn('Nueva versión desplegada detectada. Recargando automáticamente...')
      window.location.reload()
    }
  }, [error])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-2xl p-6 sm:p-8 shadow-2xl space-y-4 border border-gray-100 text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Se produjo un error en este módulo</h2>
            <p className="text-xs text-gray-500">Detalle del sistema para resolución inmediata</p>
          </div>
        </div>

        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-mono text-red-800 break-words leading-relaxed max-h-40 overflow-y-auto">
          {error?.message || 'Error desconocido al cargar los datos del módulo.'}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reintentar Cargar Módulo</span>
          </button>

          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Forzar Recarga</span>
          </button>

          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            <span>Inicio</span>
          </button>
        </div>
      </div>
    </div>
  )
}
