import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginAdmin, loginStudent } from '../services/authService'
import { useAuth } from '../context/AuthContext'
import { getRoleFromToken } from '../utils/jwt'

/**
 * Página de inicio de sesión para estudiante (HU-002).
 */
export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const isDisabled = useMemo(() => {
    return isSubmitting || studentId.trim().length === 0 || password.trim().length === 0
  }, [isSubmitting, studentId, password])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    try {
      setIsSubmitting(true)
      const identifier = studentId.trim()
      const passwordValue = password.trim()

      // Permitimos login admin sin agregar una pantalla extra: si parece correo, usamos /auth/login-admin.
      const { token } = identifier.includes('@')
        ? await loginAdmin({ email: identifier, password: passwordValue })
        : await loginStudent({ studentId: identifier, password: passwordValue })

      login({
        token,
        student: {
          studentId: identifier,
        },
      })

      const role = getRoleFromToken(token)
      const nextPath = role === 'ADMIN' ? '/admin/dashboard' : '/estudiante/biometria'
      navigate(nextPath, { replace: true })
    } catch (error) {
      // Mensaje amigable: evitamos mostrar JSON/stack traces.
      const rawMessage = error?.response?.data?.message || error?.message
      setErrorMessage(getFriendlyLoginError(rawMessage))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="bg-blue-900">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="text-lg font-semibold text-white">Sistema de Votación Universitaria</h1>
          <p className="mt-1 text-sm text-white/90">
            Ingreso seguro para estudiantes y administración electoral.
          </p>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-88px)] max-w-6xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-blue-900">Ingreso</h2>
              <p className="mt-1 text-sm text-slate-700">
                Ingrese su <span className="font-semibold">registro</span> (estudiantes) o su
                <span className="font-semibold"> correo</span> (administración) y su contraseña.
              </p>
            </div>

            {errorMessage ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {errorMessage}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-800">
                  Registro o correo
                </label>
                <input
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  type="text"
                  inputMode="text"
                  autoComplete="username"
                  placeholder="Ej: 20201234 o admin@uagrm.edu.bo"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800">
                  Contraseña
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  placeholder="Escriba su contraseña"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                />
              </div>

              <button
                disabled={isDisabled}
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-blue-900 hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              >
                {isSubmitting ? 'Ingresando…' : 'Ingresar'}
              </button>

              <p className="text-xs text-slate-600">
                Si tiene problemas para ingresar, verifique sus datos e intente nuevamente.
              </p>
            </form>
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            Elecciones universitarias • UAGRM
          </p>
        </div>
      </div>
    </main>
  )
}

/**
 * Normaliza el mensaje de error de inicio de sesión para evitar información técnica.
 * @param {unknown} rawMessage Mensaje crudo del error.
 * @returns {string} Mensaje amigable para mostrar en pantalla.
 */
function getFriendlyLoginError(rawMessage) {
  const fallback = 'No se pudo iniciar sesión. Verifique sus credenciales e intente nuevamente.'

  if (typeof rawMessage !== 'string') {
    return fallback
  }

  const trimmed = rawMessage.trim()
  if (!trimmed) {
    return fallback
  }

  const looksLikeJson = trimmed.includes('{') || trimmed.includes('}') || trimmed.includes('"')
  if (looksLikeJson) {
    return fallback
  }

  // Evitamos mensajes genéricos/ruidosos que vienen del servidor.
  if (/internal server|stack|error del servidor/i.test(trimmed)) {
    return 'Hubo un problema al conectar con el servidor. Inténtelo más tarde.'
  }

  if (trimmed.length > 120) {
    return fallback
  }

  return trimmed
}
