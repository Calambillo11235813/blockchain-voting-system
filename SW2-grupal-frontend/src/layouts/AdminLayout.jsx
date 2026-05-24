import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const SIDEBAR_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', to: '/admin/dashboard' },
  { key: 'registry', label: 'Padrón Electoral', to: '/admin/padron' },
  { key: 'election', label: 'Gestión de Elección', to: '/admin/gestion-eleccion' },
  { key: 'parties', label: 'Frente y Candidatos', to: '/admin/frentes-candidatos' },
  { key: 'ballot', label: 'Configuración de Papeleta', to: '/admin/configuracion-papeleta' },
  { key: 'audit', label: 'Auditoría y Resultados', to: '/admin/auditoria-resultados' },
  { key: 'estadisticas', label: 'Estadísticas en Vivo', to: '/admin/estadisticas-vivo' },
  { key: 'admins', label: 'Gestión de Admins', to: '/admin/admins', rolesRequeridos: ['SISTEMAS'] },
  { key: 'configuracion', label: 'Configuración del Sistema', to: '/admin/configuracion', rolesRequeridos: ['SISTEMAS'] },
  { key: 'nodos', label: 'Monitoreo de Nodos', to: '/admin/nodos', rolesRequeridos: ['SISTEMAS'] },
  { key: 'auditoria', label: 'Auditoría Blockchain', to: '/admin/auditoria' },
]

/**
 * Layout del área de administración.
 *
 * Requisitos:
 * - Mantiene el header azul institucional.
 * - Sidebar persistente a la izquierda para navegación.
 * - Renderiza el contenido a la derecha mediante rutas anidadas (`Outlet`).
 *
 * @returns {import('react').JSX.Element}
 */
export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const activeItem = useMemo(() => {
    const match = SIDEBAR_ITEMS.find((item) => location.pathname.startsWith(item.to))
    return match?.label || 'Panel de Administración Electoral'
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    // En tablet/móvil cerramos el menú al navegar.
    setIsSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-blue-900">
        <div className="flex w-full flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-6">
          <div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 p-2 text-white hover:bg-white/15 lg:hidden"
                aria-label="Abrir menú"
              >
                <span className="block h-4 w-5">
                  <span className="block h-0.5 w-5 rounded bg-white" />
                  <span className="mt-1.5 block h-0.5 w-5 rounded bg-white" />
                  <span className="mt-1.5 block h-0.5 w-5 rounded bg-white" />
                </span>
              </button>

              <div>
                <h1 className="text-base font-semibold text-white sm:text-lg">
                  <span className="hidden sm:inline">Panel de Administración Electoral</span>
                  <span className="sm:hidden">Administración Electoral</span>
                </h1>
                <p className="mt-1 hidden text-sm text-white/90 sm:block">{activeItem}</p>
              </div>
            </div>
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
              <span className="hidden sm:inline">Cerrar sesión</span>
              <span className="sm:hidden">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex w-full gap-6 px-4 py-6 sm:py-8">
        {/* Sidebar fijo en escritorio */}
        <aside className="sticky top-6 hidden h-[calc(100vh-48px)] w-64 shrink-0 self-start overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:block">
          <AdminSidebar />
        </aside>

        {/* Sidebar colapsable en tablet/móvil */}
        <div
          className={
            'fixed inset-0 z-50 lg:hidden ' +
            (isSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none')
          }
          aria-hidden={!isSidebarOpen}
        >
          <div
            className={
              'absolute inset-0 bg-slate-900/40 transition-opacity ' +
              (isSidebarOpen ? 'opacity-100' : 'opacity-0')
            }
            onClick={() => setIsSidebarOpen(false)}
          />

          <aside
            className={
              'absolute left-4 top-4 h-[calc(100vh-32px)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-transform ' +
              (isSidebarOpen ? 'translate-x-0' : '-translate-x-[110%]')
            }
          >
            <div className="flex items-center justify-between gap-3 px-1 pb-2">
              <p className="text-sm font-semibold text-blue-900">Menú</p>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
            <AdminSidebar />
          </aside>
        </div>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/**
 * Navegación del Sidebar del administrador.
 *
 * Se extrae a un componente para reutilizarlo en escritorio y en el panel colapsable.
 *
 * @returns {import('react').JSX.Element}
 */
function AdminSidebar() {
  const { usuario } = useAuth()

  // Filtrar items según los roles requeridos del usuario
  const itemsVisibles = SIDEBAR_ITEMS.filter((item) => {
    if (!item.rolesRequeridos) return true
    return item.rolesRequeridos.includes(usuario?.rol)
  })

  return (
    <nav className="space-y-1">
      {itemsVisibles.map((item) => (
        <NavLink
          key={item.key}
          to={item.to}
          className={({ isActive }) => {
            const base =
              'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-semibold transition '

            if (isActive) {
              return base + 'border-yellow-500 bg-yellow-500 text-blue-900'
            }

            return base + 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50'
          }}
        >
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
