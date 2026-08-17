'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Shield, Lock, Mail, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message === 'Invalid login credentials' ? 'Credenciales incorrectas. Verifique correo y contraseña.' : error.message)
      } else if (data.session) {
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError('Ocurrió un error al iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Graphic elements */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gray-700/30 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10 border border-gray-100">
        {/* Logos Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4 max-w-full">
            <img src="/logos/Logo Control Fauna.jfif" alt="Fauna Control" className="h-14 w-auto max-w-[140px] object-contain rounded-lg shadow-sm" />
            <img src="/logos/LOGO MINERQUIM.jpg" alt="Grupo Minerquim" className="h-10 w-auto max-w-[140px] object-contain" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-tight">CONTROL DE FAUNA AEROPORTUARIO</h1>
          <p className="text-xs text-gray-500 font-medium mt-1">Plataforma Operacional • Grupo Minerquim</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@minerquim.cl"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>Ingresar al Sistema</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-gray-100 text-center">
          <p className="text-[11px] text-gray-400">
            Comercializadora y Servicios de Ingeniería Minerquim • RUT: 76.135.448-5
          </p>
        </div>
      </div>
    </div>
  )
}
