import { Navigate, Route, Routes } from 'react-router-dom'
import Login from '../pages/Login'
import Unauthorized from '../pages/Unauthorized'
import StudentDashboard from '../pages/StudentDashboard'
import BiometriaCapture from '../pages/BiometriaCapture'
import VotingBallot from '../pages/VotingBallot'
import AdminRoute from './AdminRoute'
import StudentRoute from './StudentRoute'
import AdminLayout from '../layouts/AdminLayout'
import AdminOverview from '../pages/admin/AdminOverview'
import AdminRegistry from '../pages/admin/AdminRegistry'
import PartiesCandidates from '../pages/admin/PartiesCandidates'
import BallotConfiguration from '../pages/admin/BallotConfiguration'
import ElectionManagement from '../pages/admin/ElectionManagement'
import AuditResults from '../pages/admin/AuditResults'

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
          <Route path="dashboard" element={<AdminOverview />} />
          <Route path="padron" element={<AdminRegistry />} />
          <Route path="frentes-candidatos" element={<PartiesCandidates />} />
          <Route path="configuracion-papeleta" element={<BallotConfiguration />} />
          <Route path="gestion-eleccion" element={<ElectionManagement />} />
          <Route path="auditoria-resultados" element={<AuditResults />} />
        </Route>
      </Route>

      <Route element={<StudentRoute />}>
        <Route path="/estudiante/dashboard" element={<StudentDashboard />} />
        <Route path="/estudiante/biometria" element={<BiometriaCapture />} />
        <Route path="/estudiante/votacion" element={<VotingBallot />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
