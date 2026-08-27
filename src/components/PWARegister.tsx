'use client'

import React, { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

// Extended window type to include beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWARegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  useEffect(() => {
    // Register Service Worker unconditionally for development and production
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service worker registration failed:', err)
      })
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Only show on mobile
      if (window.innerWidth <= 768) {
        setShowInstallBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowInstallBanner(false)
    }
  }

  const dismissBanner = () => {
    setShowInstallBanner(false)
  }

  if (!showInstallBanner) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:hidden">
      <div className="bg-orange-500 text-white rounded-xl shadow-lg p-4 flex items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Control de Fauna</h3>
          <p className="text-xs text-orange-100">Instala la app para un mejor acceso</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1 bg-white text-orange-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-50 transition-colors"
          >
            <Download size={16} />
            <span>Instalar</span>
          </button>
          
          <button
            onClick={dismissBanner}
            className="p-1 hover:bg-orange-600 rounded-full transition-colors text-white/80 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
