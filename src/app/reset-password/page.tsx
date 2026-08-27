'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, Mail, KeyRound, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [otpToken, setOtpToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validatingSession, setValidatingSession] = useState(true)
  const [isVerified, setIsVerified] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function verifyFromUrl() {
      try {
        const params = new URLSearchParams(window.location.search)
        const tokenFromUrl = params.get('token')
        const emailFromUrl = params.get('email')

        if (emailFromUrl) setEmail(emailFromUrl)
        if (tokenFromUrl) setOtpToken(tokenFromUrl)

        if (tokenFromUrl && emailFromUrl) {
          // Verificar automáticamente el OTP recibido en la URL
          const { data, error: verifyErr } = await supabase.auth.verifyOtp({
            email: emailFromUrl,
            token: tokenFromUrl,
            type: 'recovery'
          })

          if (!verifyErr && data.session) {
            setIsVerified(true)
            setValidatingSession(false)
            return
          }
        }

        // Comprobar si ya existe sesión activa
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData?.session) {
          setIsVerified(true)
        }
      } catch (err) {
        console.warn('Error verificando sesión:', err)
      } finally {
        setValidatingSession(false)
      }
    }

    verifyFromUrl()
  }, [])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor, verifica ambos campos.')
      return
    }

    setLoading(true)

    try {
      // Si la sesión no fue verificada automáticamente por la URL, verificar ahora
      if (!isVerified) {
        if (!email || !otpToken) {
          setError('Por favor, ingresa tu correo y el código de verificación.')
          setLoading(false)
          return
        }

        const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: otpToken.trim(),
          type: 'recovery'
        })

        if (verifyErr || !verifyData.session) {
          setError('El código de verificación o enlace ha expirado o es inválido.')
          setLoading(false)
          return
        }

        setIsVerified(true)
      }

      // Actualizar la clave
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateErr) {
        setError(updateErr.message || 'Error al actualizar la contraseña.')
      } else {
        setSuccess(true)
      }
    } catch (err: any) {
      setError('Ocurrió un error inesperado al actualizar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  if (validatingSession) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 bg-white p-6 rounded-2xl shadow-xl">
          <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
          <span className="text-xs font-semibold text-gray-700">Validando enlace de recuperación...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gray-700/30 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10 border border-gray-100">
        {/* Header Logos */}
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
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-tight">NUEVA CONTRASEÑA</h1>
          <p className="text-xs text-gray-500 font-medium mt-1">Plataforma Operacional • Grupo Minerquim</p>
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold">¡Contraseña Actualizada con Éxito!</h3>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Tu contraseña se ha cambiado correctamente. Ya puedes ingresar a la plataforma con tu nueva clave.
              </p>
            </div>

            <button
              onClick={() => router.push('/login')}
              className="w-full mt-2 py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-xs transition shadow flex items-center justify-center gap-2"
            >
              <span>Ir al Iniciar Sesión</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <p className="text-xs text-gray-600 leading-relaxed text-center">
              {isVerified
                ? 'Ingresa tu nueva contraseña para actualizar el acceso a tu cuenta.'
                : 'Ingresa tu correo, el código enviado por correo y tu nueva contraseña.'}
            </p>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {!isVerified && (
              <>
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
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Código de Verificación (6 dígitos)</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={otpToken}
                      onChange={(e) => setOtpToken(e.target.value)}
                      placeholder="Ej: 123456"
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 tracking-widest font-mono"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nueva Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 caracteres"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Confirmar Nueva Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu nueva contraseña"
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
                  <span>Guardando Contraseña...</span>
                </>
              ) : (
                <span>Guardar Nueva Contraseña</span>
              )}
            </button>
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
