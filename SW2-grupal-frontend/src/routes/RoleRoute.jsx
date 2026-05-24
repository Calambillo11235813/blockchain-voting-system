import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Restriccion de ruta por rol.
 *
 * @param {{ allowedRoles?: string[], children: import('react').ReactNode }} props
 * @returns {import('react').JSX.Element}
 */
export default function RoleRoute({ allowedRoles, children }) {
  const { role } = useAuth()

  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
