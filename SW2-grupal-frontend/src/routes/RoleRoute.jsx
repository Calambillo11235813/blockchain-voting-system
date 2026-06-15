import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Restriccion de ruta por rol.
 * Mientras el contexto no está listo (F5), muestra null para evitar flash de redirect.
 *
 * @param {{ allowedRoles?: string[], children: import('react').ReactNode }} props
 * @returns {import('react').JSX.Element}
 */
export default function RoleRoute({ allowedRoles, children }) {
  const { role, isReady } = useAuth()

  // Esperar a que el contexto haya leído el token del localStorage
  if (!isReady) return null

  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
