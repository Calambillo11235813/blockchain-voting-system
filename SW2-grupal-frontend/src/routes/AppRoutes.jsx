import { Navigate, Route, Routes } from 'react-router-dom'
import Login from '../pages/Login'
import Unauthorized from '../pages/Unauthorized'
import StudentDashboard from '../pages/StudentDashboard'
import BiometriaCapture from '../pages/BiometriaCapture'
import VotingBallot from '../pages/VotingBallot'
import AdminRoute from './AdminRoute'
import StudentRoute from './StudentRoute'
import AdminLayout from '../layouts/AdminLayout'
import ResumenAdmin from '../pages/admin/compartido/ResumenAdmin'
import GestionPadron from '../pages/admin/electoral/GestionPadron'
import GestionFrentesCandidatos from '../pages/admin/electoral/GestionFrentesCandidatos'
import ConfiguracionPapeleta from '../pages/admin/electoral/ConfiguracionPapeleta'
import GestionElecciones from '../pages/admin/electoral/GestionElecciones'
import ResultadosAuditoria from '../pages/admin/electoral/ResultadosAuditoria'
import EstadisticasEnVivo from '../pages/admin/electoral/EstadisticasEnVivo'
import GestionAdministradores from '../pages/admin/sistemas/GestionAdministradores'
import ConfiguracionSistema from '../pages/admin/sistemas/ConfiguracionSistema'
import MonitoreoNodos from '../pages/admin/sistemas/MonitoreoNodos'
import AuditoriaBlockchain from '../pages/admin/sistemas/AuditoriaBlockchain'
import VotoExitoso from '../pages/VotoExitoso'

/**
 * Definición básica de rutas.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Rutas protegidas por rol */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ResumenAdmin />} />
          <Route path="padron" element={<GestionPadron />} />
          <Route path="frentes-candidatos" element={<GestionFrentesCandidatos />} />
          <Route path="configuracion-papeleta" element={<ConfiguracionPapeleta />} />
          <Route path="gestion-eleccion" element={<GestionElecciones />} />
          <Route path="auditoria-resultados" element={<ResultadosAuditoria />} />
          <Route path="estadisticas-vivo" element={<EstadisticasEnVivo />} />
          <Route path="admins" element={<GestionAdministradores />} />
          <Route path="configuracion" element={<ConfiguracionSistema />} />
          <Route path="nodos" element={<MonitoreoNodos />} />
          <Route path="auditoria" element={<AuditoriaBlockchain />} />
        </Route>
      </Route>

      <Route element={<StudentRoute />}>
        <Route path="/estudiante/dashboard" element={<StudentDashboard />} />
        <Route path="/estudiante/biometria" element={<BiometriaCapture />} />
        <Route path="/estudiante/votacion" element={<VotingBallot />} />
        <Route path="/estudiante/voto-exitoso" element={<VotoExitoso />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
