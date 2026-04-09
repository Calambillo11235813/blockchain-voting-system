import { useNavigate } from 'react-router-dom'

/**
 * Panel básico del estudiante.
 */
export default function StudentDashboard() {
  const navigate = useNavigate()

  return (
    <main className="min-h-screen bg-white">
      <header className="bg-blue-900">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="text-lg font-semibold text-white">Panel del estudiante</h1>
          <p className="mt-1 text-sm text-white/90">
            Acceso a verificación de identidad y papeleta.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-700">
            Para emitir su voto, primero debe completar la verificación de identidad.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/estudiante/biometria')}
              className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-yellow-600"
            >
              Realizar verificación
            </button>

            <button
              type="button"
              onClick={() => navigate('/estudiante/votacion')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Ir a la papeleta
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
