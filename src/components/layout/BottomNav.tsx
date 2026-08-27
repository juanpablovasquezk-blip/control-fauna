'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'
import { LayoutDashboard, Compass, ShieldAlert, Dog, FileCheck, Bird } from 'lucide-react'

export function BottomNav() {
  const pathname = usePathname()
  const { profile } = useAuth()

  if (!profile) return null

  const role = profile.role

  const items = [
    { label: 'Inicio', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'supervisor', 'canes', 'caza', 'client'] },
    { label: 'Rondas', href: '/rounds', icon: Compass, roles: ['admin', 'supervisor', 'canes'] },
    { label: 'Intervención', href: '/events', icon: ShieldAlert, roles: ['admin', 'supervisor', 'canes'] },
    { label: 'Canil', href: '/kennel', icon: Dog, roles: ['admin', 'supervisor', 'canes'] },
    { label: 'Actas', href: '/delivery-acts', icon: FileCheck, roles: ['admin', 'supervisor', 'canes'] },
    { label: 'Caza', href: '/pest-control', icon: Bird, roles: ['admin', 'supervisor', 'caza'] },
  ]

  const filtered = items.filter(item => item.roles.includes(role)).slice(0, 5)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1E2024] border-t border-gray-800 z-40 flex items-center justify-around py-2 px-1 print:hidden">
      {filtered.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 ${
              isActive ? 'text-orange-500 font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] tracking-tight truncate">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
