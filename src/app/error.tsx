'use client'

import { useEffect } from 'react'
import { RefreshCw, AlertTriangle, Home } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Si el error es por actualización de despliegue (ChunkLoadError / Failed to fetch dynamically imported module)
    const isChunkError = 
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('failed to fetch') ||
      error.message?.includes('dynamically imported module')

    if (isChunkError) {
      console.warn('Nueva versión desplegada detectada. Recargando automáticamente...')
      window.location.reload()
    }
  }, [error])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-4 border border-gray-100">
        <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h2 className="text-base font-bold text-gray-900">Se ha actualizado la plataforma</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Se han desplegado mejoras en el sistema. Por favor recarga la página para cargar la versión más reciente.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recargar Página</span>
          </button>

          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            <span>Inicio</span>
          </button>
        </div>
      </div>
    </div>
  )
}
