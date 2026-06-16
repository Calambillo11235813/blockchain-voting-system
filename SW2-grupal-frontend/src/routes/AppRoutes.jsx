import { Navigate, Route, Routes } from 'react-router-dom'
import Login from '../pages/Login'
import Unauthorized from '../pages/Unauthorized'
import StudentDashboard from '../pages/StudentDashboard'
import BiometriaCapture from '../pages/BiometriaCapture'
import VotingBallot from '../pages/VotingBallot'
import AdminRoute from './AdminRoute'
import ElectorRoute from './ElectorRoute'
import RoleRoute from './RoleRoute'
import DashboardRouter from './DashboardRouter'
import AdminLayout from '../layouts/AdminLayout'
import ResumenAdmin from '../pages/admin/compartido/ResumenAdmin'
import DashboardSistemas from '../pages/admin/sistemas/DashboardSistemas'
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
import BitacoraTransacciones from '../pages/admin/sistemas/BitacoraTransacciones'
import DespliegueContratos from '../pages/admin/sistemas/DespliegueContratos'

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
          <Route index element={<DashboardRouter />} />
          <Route
            path="dashboard"
            element={
              <RoleRoute allowedRoles={['ELECTORAL']}>
                <ResumenAdmin />
              </RoleRoute>
            }
          />
          <Route
            path="dashboard-sistemas"
            element={
              <RoleRoute allowedRoles={['SISTEMAS']}>
                <DashboardSistemas />
              </RoleRoute>
            }
          />
          <Route
            path="padron"
            element={
              <RoleRoute allowedRoles={['ELECTORAL']}>
                <GestionPadron />
              </RoleRoute>
            }
          />
          <Route
            path="frentes-candidatos"
            element={
              <RoleRoute allowedRoles={['ELECTORAL']}>
                <GestionFrentesCandidatos />
              </RoleRoute>
            }
          />
          <Route
            path="configuracion-papeleta"
            element={
              <RoleRoute allowedRoles={['ELECTORAL']}>
                <ConfiguracionPapeleta />
              </RoleRoute>
            }
          />
          <Route
            path="gestion-eleccion"
            element={
              <RoleRoute allowedRoles={['ELECTORAL']}>
                <GestionElecciones />
              </RoleRoute>
            }
          />
          <Route
            path="auditoria-resultados"
            element={
              <RoleRoute allowedRoles={['ELECTORAL']}>
                <ResultadosAuditoria />
              </RoleRoute>
            }
          />
          <Route
            path="estadisticas-vivo"
            element={
              <RoleRoute allowedRoles={['ELECTORAL']}>
                <EstadisticasEnVivo />
              </RoleRoute>
            }
          />
          <Route
            path="admins"
            element={
              <RoleRoute allowedRoles={['SISTEMAS']}>
                <GestionAdministradores />
              </RoleRoute>
            }
          />
          <Route
            path="configuracion"
            element={
              <RoleRoute allowedRoles={['SISTEMAS']}>
                <ConfiguracionSistema />
              </RoleRoute>
            }
          />
          <Route
            path="nodos"
            element={
              <RoleRoute allowedRoles={['SISTEMAS']}>
                <MonitoreoNodos />
              </RoleRoute>
            }
          />
          <Route
            path="auditoria"
            element={
              <RoleRoute allowedRoles={['SISTEMAS']}>
                <AuditoriaBlockchain />
              </RoleRoute>
            }
          />
          <Route
            path="bitacora"
            element={
              <RoleRoute allowedRoles={['SISTEMAS']}>
                <BitacoraTransacciones />
              </RoleRoute>
            }
          />
          <Route
            path="despliegue-contratos"
            element={
              <RoleRoute allowedRoles={['SISTEMAS']}>
                <DespliegueContratos />
              </RoleRoute>
            }
          />
        </Route>
      </Route>

      <Route element={<ElectorRoute />}>
        <Route path="/estudiante/dashboard" element={<StudentDashboard />} />
        <Route path="/estudiante/biometria" element={<BiometriaCapture />} />
        <Route path="/estudiante/votacion" element={<VotingBallot />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
