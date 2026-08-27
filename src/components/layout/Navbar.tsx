'use client'

import { useAuth } from '@/lib/auth/AuthProvider'
import { Bell, User } from 'lucide-react'

export function Navbar() {
  const { profile } = useAuth()

  if (!profile) return null

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-3 sm:px-4 flex items-center justify-between sticky top-0 z-40 print:hidden min-w-0">
      {/* Brand logo for mobile screens */}
      <div className="flex items-center gap-2 md:hidden min-w-0 overflow-hidden">
        <img 
          src="/logos/LOGO MINERQUIM.jpg" 
          alt="Minerquim" 
          className="h-6 max-w-[100px] sm:max-w-[120px] object-contain flex-shrink-0" 
        />
        <span className="font-extrabold text-[10px] sm:text-xs text-orange-600 truncate flex-shrink-0">
          CONTROL FAUNA
        </span>
      </div>

      {/* Title for desktop screens */}
      <div className="hidden md:block">
        <h2 className="text-xs sm:text-sm font-semibold text-gray-800">
          Servicio de Control y Mitigación de Fauna Aeroportuaria
        </h2>
      </div>

      {/* User profile & Notifications */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <button className="p-1.5 text-gray-500 hover:text-orange-600 rounded-full hover:bg-gray-100 transition relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
        </button>

        <div className="flex items-center gap-2 border-l border-gray-200 pl-2 sm:pl-3">
          <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm border border-orange-200">
            {profile.full_name?.charAt(0) || <User className="w-3.5 h-3.5" />}
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <p className="text-xs font-semibold text-gray-800 truncate max-w-[120px]">{profile.full_name}</p>
            <p className="text-[9px] text-gray-500 uppercase font-medium">{profile.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
