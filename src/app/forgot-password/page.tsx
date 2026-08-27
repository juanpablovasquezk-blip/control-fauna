'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { requestPasswordResetAction } from './actions'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const origin = window.location.origin
      const res = await requestPasswordResetAction(email, origin)

      if (!res.success) {
        setError(res.message)
      } else {
        setSubmitted(true)
        setMessage(res.message)
      }
    } catch (err: any) {
      setError('Ocurrió un error inesperado al procesar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos de fondo */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gray-700/30 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10 border border-gray-100">
        {/* Logos Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4 max-w-full">
            <img 
              src="/logos/Logo Control Fauna.jfif" 
              alt="Fauna Control" 
              style={{ maxHeight: '70px', width: 'auto', maxWidth: '140px', objectFit: 'contain' }}
              className="rounded-lg shadow-sm" 
            />
            <img 
              src="/logos/LOGO MINERQUIM.jpg" 
              alt="Grupo Minerquim" 
              style={{ maxHeight: '50px', width: 'auto', maxWidth: '140px', objectFit: 'contain' }}
            />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-tight">RECUPERAR CONTRASEÑA</h1>
          <p className="text-xs text-gray-500 font-medium mt-1">Plataforma Operacional • Grupo Minerquim</p>
        </div>

        {submitted ? (
          <div className="space-y-4 text-center">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold">Solicitud Procesada</h3>
              <p className="text-xs text-emerald-700 leading-relaxed">
                {message}
              </p>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Revisa tu bandeja de entrada (y la carpeta de spam o correo no deseado). El enlace vence automáticamente por seguridad.
            </p>

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-900 hover:bg-black text-white font-semibold rounded-lg text-xs transition shadow"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Iniciar Sesión</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-gray-600 leading-relaxed text-center">
              Ingresa el correo electrónico registrado con tu usuario. Te enviaremos un enlace seguro para definir una nueva contraseña.
            </p>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Correo Electrónico Registrado</label>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg text-sm transition-all duration-200 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando Instrucciones...</span>
                </>
              ) : (
                <span>Enviar Enlace de Recuperación</span>
              )}
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a Iniciar Sesión</span>
              </Link>
            </div>
          </form>
        )}

        <div className="mt-8 pt-4 border-t border-gray-100 text-center">
          <p className="text-[11px] text-gray-400">
            Comercializadora y Servicios de Ingeniería Minerquim • RUT: 76.135.448-5
          </p>
        </div>
      </div>
    </div>
  )
}
