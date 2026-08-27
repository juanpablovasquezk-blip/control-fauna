'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { Bell, User, LogOut, ChevronDown } from 'lucide-react'

export function Navbar() {
  const { profile, signOut } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  if (!profile) return null

  return (
    <header className="h-14 max-h-14 bg-white border-b border-gray-200 px-3 flex items-center justify-between sticky top-0 z-50 print:hidden min-w-0">
      {/* Brand logo for mobile screens - Strictly max 28% width & 20px height */}
      <div className="flex items-center gap-2 md:hidden min-w-0 overflow-hidden">
        <img 
          src="/logos/LOGO MINERQUIM.jpg" 
          alt="Minerquim" 
          style={{ height: '20px', maxHeight: '20px', maxWidth: '28%', width: 'auto', objectFit: 'contain' }}
          className="flex-shrink-0" 
        />
        <span className="font-extrabold text-[10px] text-orange-600 truncate flex-shrink-0">
          CONTROL FAUNA
        </span>
      </div>

      {/* Title for desktop screens */}
      <div className="hidden md:block">
        <h2 className="text-xs sm:text-sm font-semibold text-gray-800">
          Servicio de Control y Mitigación de Fauna Aeroportuaria
        </h2>
      </div>

      {/* User profile, Notifications & Logout */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 relative">
        <button 
          title="Notificaciones"
          className="p-1.5 text-gray-500 hover:text-orange-600 rounded-full hover:bg-gray-100 transition relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
        </button>

        <div className="relative border-l border-gray-200 pl-2 sm:pl-3">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-1.5 hover:bg-gray-50 p-1 rounded-xl transition border border-transparent hover:border-gray-200"
            title="Perfil de usuario / Opciones"
          >
            <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm border border-orange-200">
              {profile.full_name?.charAt(0) || <User className="w-3.5 h-3.5" />}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs font-semibold text-gray-800 truncate max-w-[120px]">{profile.full_name}</p>
              <p className="text-[9px] text-gray-500 uppercase font-medium">{profile.role}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {/* User Dropdown Menu */}
          {showMenu && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowMenu(false)} 
              />
              
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 text-left space-y-1">
                <div className="px-3.5 py-2 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-900 truncate">{profile.full_name}</p>
                  <p className="text-[10px] font-semibold text-orange-600 uppercase">{profile.role}</p>
                  <p className="text-[10px] text-gray-400 truncate mt-0.5">{profile.email}</p>
                </div>

                <button
                  onClick={() => {
                    setShowMenu(false)
                    signOut()
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Direct Mobile Logout Button for 1-click convenience */}
        <button
          onClick={signOut}
          title="Cerrar Sesión"
          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition border border-red-100 ml-1"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
