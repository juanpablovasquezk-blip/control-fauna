'use client'

import { useAuth } from '@/lib/auth/AuthProvider'
import { Bell, User } from 'lucide-react'

export function Navbar() {
  const { profile } = useAuth()

  if (!profile) return null

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between sticky top-0 z-40 print:hidden">
      <div className="flex items-center gap-3 md:hidden">
        <img src="/logos/LOGO MINERQUIM.jpg" alt="Minerquim" className="h-7 object-contain" />
        <span className="font-bold text-xs text-orange-600">CONTROL FAUNA</span>
      </div>

      <div className="hidden md:block">
        <h2 className="text-sm font-semibold text-gray-800">
          Servicio de Control y Mitigación de Fauna Aeroportuaria
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 text-gray-500 hover:text-orange-600 rounded-full hover:bg-gray-100 transition relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
        </button>

        <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
          <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
            {profile.full_name?.charAt(0) || <User className="w-3.5 h-3.5" />}
          </div>
          <div className="hidden sm:block text-left leading-none">
            <p className="text-xs font-semibold text-gray-800">{profile.full_name}</p>
            <p className="text-[10px] text-gray-500 uppercase">{profile.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
