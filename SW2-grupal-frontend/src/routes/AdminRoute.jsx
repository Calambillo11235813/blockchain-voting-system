import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Ruta protegida para Administradores.
 *
 * Permite el acceso solo si el usuario tiene rol `ADMIN`.
 * Si no está autenticado, redirige a /login.
 * Si está autenticado pero no es ADMIN, redirige a /unauthorized.
 *
 * @returns {import('react').JSX.Element}
 */
export default function AdminRoute() {
  const { isAuthenticated, role } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (role !== 'ADMIN') {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
