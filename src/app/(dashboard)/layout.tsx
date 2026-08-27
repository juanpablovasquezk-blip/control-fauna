'use client'

import React, { useEffect } from 'react'
import { AuthProvider, useAuth } from '@/lib/auth/AuthProvider'
import { Sidebar } from '@/components/layout/Sidebar'
import { Navbar } from '@/components/layout/Navbar'
import { BottomNav } from '@/components/layout/BottomNav'
import { useRouter } from 'next/navigation'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !profile) {
      router.push('/login')
    }
  }, [profile, loading, router])

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason?.message || String(event?.reason || '')
      if (
        reason.includes('Loading chunk') ||
        reason.includes('ChunkLoadError') ||
        reason.includes('failed to fetch') ||
        reason.includes('dynamically imported module') ||
        reason.includes('Load failed')
      ) {
        console.warn('Descalce de despliegue detectado, auto-recargando...')
        window.location.reload()
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service worker registration failed:', err)
      })
    }

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium text-gray-300">Cargando Plataforma Control de Fauna...</p>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden print:bg-white print:h-auto print:overflow-visible print:p-0 print:m-0">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible print:h-auto print:p-0 print:m-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 print:p-0 print:m-0 print:overflow-visible print:h-auto">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardContent>{children}</DashboardContent>
    </AuthProvider>
  )
}
