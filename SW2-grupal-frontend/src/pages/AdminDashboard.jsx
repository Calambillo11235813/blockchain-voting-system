import { useNavigate } from 'react-router-dom'
import WhitelistUpload from '../components/WhitelistUpload'
import { uploadWhitelistFile } from '../services/adminService'
import { useAuth } from '../context/AuthContext'

/**
 * Dashboard del administrador (HU-001).
 *
 * Contiene la carga del padrón/whitelist de estudiantes.
 */
export default function AdminDashboard() {
  const navigate = useNavigate()
  const { logout, student } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Admin Dashboard</h1>
            <p className="text-sm text-slate-600">HU-001 • Cargar whitelist</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-slate-500">Sesión</p>
              <p className="text-sm font-medium text-slate-800">
                {student?.studentId ? `Student: ${student.studentId}` : 'Authenticated'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <WhitelistUpload onUpload={uploadWhitelistFile} />

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Notas técnicas</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>El backend actualmente espera un archivo Excel <span className="font-medium">.xlsx</span>.</li>
            <li>Endpoint usado: <span className="font-mono">POST /api/estudiantes/cargar-padron</span>.</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
