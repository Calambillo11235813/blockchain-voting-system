import { api } from './api'

/**
 * Obtiene el reporte de consolidación paritaria de una elección.
 * 
 * @param {string} eleccionId UUID de la elección.
 * @returns {Promise<any>} Datos del reporte de escrutinio.
 */
export async function getReporteConsolidacion(eleccionId) {
  // Asumimos que el endpoint será implementado o expuesto en /estadisticas/escrutinio/:eleccionId
  // o /elecciones/escrutinio/:eleccionId. Usaremos /estadisticas/escrutinio
  const response = await api.get(`/estadisticas/escrutinio/${eleccionId}`)
  return response?.data?.data || response?.data
}

/**
 * Obtiene la participación global de una elección (votos totales, habilitados, % y desglose).
 * 
 * @param {string} eleccionId UUID de la elección.
 * @returns {Promise<any>}
 */
export async function getParticipacion(eleccionId) {
  const response = await api.get(`/estadisticas/participacion/${eleccionId}`)
  return response?.data?.data || response?.data
}

/**
 * Obtiene las estadísticas de estudiantes.
 * 
 * @param {string} eleccionId UUID de la elección.
 * @returns {Promise<any>}
 */
export async function getEstadisticasEstudiantes(eleccionId) {
  const response = await api.get(`/estadisticas/estudiantes/${eleccionId}`)
  return response?.data?.data || response?.data
}

/**
 * Obtiene las estadísticas de docentes.
 * 
 * @param {string} eleccionId UUID de la elección.
 * @returns {Promise<any>}
 */
export async function getEstadisticasDocentes(eleccionId) {
  const response = await api.get(`/estadisticas/docentes/${eleccionId}`)
  return response?.data?.data || response?.data
}
