import { useAuth } from '../context/AuthContext'
import ResumenAdmin from '../pages/admin/compartido/ResumenAdmin'
import DashboardSistemas from '../pages/admin/sistemas/DashboardSistemas'

/**
 * Componente inteligente que renderiza el dashboard correcto según el rol del usuario.
 * - ELECTORAL: ResumenAdmin (Dashboard Electoral)
 * - SISTEMAS: DashboardSistemas (Dashboard de Sistemas)
 */
export default function DashboardRouter() {
  const { role } = useAuth()

  if (role === 'SISTEMAS') {
    return <DashboardSistemas />
  }

  if (role === 'ELECTORAL') {
    return <ResumenAdmin />
  }

  // Fallback (no debería llegar aquí con AdminRoute activo)
  return <div className="text-center py-8">Rol no reconocido</div>
}
