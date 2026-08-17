'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'
import { 
  LayoutDashboard, 
  Compass, 
  ShieldAlert, 
  Dog, 
  FileCheck, 
  HeartHandshake, 
  Bird, 
  FileText, 
  BarChart3, 
  Settings, 
  HelpCircle,
  LogOut 
} from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()

  if (!profile) return null

  const role = profile.role

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'supervisor', 'canes', 'caza', 'client'] },
    { label: 'Rondas Perimetrales', href: '/rounds', icon: Compass, roles: ['admin', 'supervisor', 'canes'] },
    { label: 'Intervenciones Canes', href: '/events', icon: ShieldAlert, roles: ['admin', 'supervisor', 'canes'] },
    { label: 'Control de Canil & Aseo', href: '/kennel', icon: Dog, roles: ['admin', 'supervisor', 'canes'] },
    { label: 'Actas de Entrega', href: '/delivery-acts', icon: FileCheck, roles: ['admin', 'supervisor', 'canes'] },
    { label: 'Pendiente Adopción', href: '/adoptions', icon: HeartHandshake, roles: ['admin', 'supervisor'] },
    { label: 'Control Caza (Conejos/Palomas)', href: '/pest-control', icon: Bird, roles: ['admin', 'supervisor', 'caza'] },
    { label: 'Expediente Digital', href: '/expedients', icon: FileText, roles: ['admin', 'supervisor', 'canes', 'caza', 'client'] },
    { label: 'Solicitudes Servicio', href: '/requests', icon: HelpCircle, roles: ['admin', 'supervisor', 'client'] },
    { label: 'Indicadores & KPIs', href: '/indicators', icon: BarChart3, roles: ['admin', 'supervisor'] },
    { label: 'Reportes Mensuales', href: '/reports', icon: FileText, roles: ['admin', 'supervisor', 'client'] },
    { label: 'Ajustes y Configuración', href: '/settings', icon: Settings, roles: ['admin'] },
  ]

  const filteredNav = navItems.filter(item => item.roles.includes(role))

  return (
    <aside className="w-64 bg-[#1E2024] text-white flex flex-col min-h-screen border-r border-gray-800 hidden md:flex">
      {/* Brand Header */}
      <div className="p-4 border-b border-gray-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center p-1">
          <img src="/logos/LOGO MINERQUIM.jpg" alt="Minerquim" className="h-full object-contain" />
        </div>
        <div>
          <h1 className="font-bold text-sm leading-tight text-orange-500">CONTROL FAUNA</h1>
          <p className="text-[10px] text-gray-400">Grupo Minerquim</p>
        </div>
      </div>

      {/* User Badge */}
      <div className="px-4 py-3 bg-gray-900/60 border-b border-gray-800 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-xs font-bold uppercase">
          {profile.full_name?.charAt(0) || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{profile.full_name}</p>
          <span className="inline-block px-1.5 py-0.5 text-[9px] font-medium uppercase bg-orange-950 text-orange-400 rounded">
            {profile.role}
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-orange-600 text-white font-semibold shadow-md'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer Sign Out */}
      <div className="p-3 border-t border-gray-800">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-950/40 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  )
}
