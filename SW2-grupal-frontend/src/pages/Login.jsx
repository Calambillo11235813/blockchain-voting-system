import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginStudent } from '../services/authService'
import { useAuth } from '../context/AuthContext'

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
      const { token } = await loginStudent({
        studentId: studentId.trim(),
        password: password.trim(),
      })

      login({
        token,
        student: {
          studentId: studentId.trim(),
        },
      })

      navigate('/admin', { replace: true })
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'No se pudo iniciar sesión. Verifica tus credenciales.'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-slate-900">Student Login</h1>
              <p className="mt-1 text-sm text-slate-600">
                Ingresa tu Registro y Contraseña universitaria.
              </p>
            </div>

            {errorMessage ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {errorMessage}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Student ID
                </label>
                <input
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  type="text"
                  inputMode="text"
                  autoComplete="username"
                  placeholder="Ej: 20201234"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <button
                disabled={isDisabled}
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </button>

              <p className="text-xs text-slate-500">
                Nota: El backend valida el acceso contra la whitelist/padrón cargado.
              </p>
            </form>
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            SW2 • Elecciones universitarias
          </p>
        </div>
      </div>
    </main>
  )
}
