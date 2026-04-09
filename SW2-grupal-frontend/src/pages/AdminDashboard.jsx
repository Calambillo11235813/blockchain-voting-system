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
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="bg-blue-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Panel de Administración Electoral</h1>
            <p className="mt-1 text-sm text-white/90">
              Gestión del padrón electoral de estudiantes habilitados.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-lg bg-white/10 px-3 py-2 text-right sm:block">
              <p className="text-xs text-white/80">Sesión</p>
              <p className="text-sm font-medium text-white">Administrador</p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <WhitelistUpload onUpload={uploadWhitelistFile} />
      </div>
    </main>
  )
}
