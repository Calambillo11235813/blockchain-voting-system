import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Ruta protegida para Electores (Estudiantes, Docentes, Administrativos).
 *
 * Permite el acceso solo si el usuario no es un administrador de sistema/electoral.
 * Si no está autenticado, redirige a /login.
 * Si está autenticado con rol de admin, redirige a /unauthorized.
 * Mientras el contexto no está listo (F5), muestra null para evitar flash de redirect.
 *
 * @returns {import('react').JSX.Element}
 */
export default function ElectorRoute() {
  const { isAuthenticated, role, isReady } = useAuth()

  // Esperar a que el contexto haya leído el token del localStorage
  if (!isReady) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const allowedRoles = ['ESTUDIANTE', 'DOCENTE', 'ADMINISTRATIVO']
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
