import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Ruta protegida para Estudiantes.
 *
 * Permite el acceso solo si el usuario tiene rol `ESTUDIANTE`.
 * Si no está autenticado, redirige a /login.
 * Si está autenticado pero no es ESTUDIANTE, redirige a /unauthorized.
 *
 * @returns {import('react').JSX.Element}
 */
export default function StudentRoute() {
  const { isAuthenticated, role } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (role !== 'ESTUDIANTE') {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
