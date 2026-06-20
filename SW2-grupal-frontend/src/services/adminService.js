import { api } from './api'

/**
 * @typedef {{
 *   totalProcesado: number,
 *   estudiantesProcesados: number,
 *   docentesProcesados: number,
 *   electoresInsertados: number,
 *   electoresActualizados: number,
 *   registrosHabilitados: number,
 *   erroresEstructurales: string[],
 * }} ResultadoCargaPadron
 */

/**
 * @typedef {{
 *   statusCode: number,
 *   data: ResultadoCargaPadron | null,
 *   message?: string,
 *   errors?: string[],
 *   metadata?: Record<string, unknown>,
 * }} ApiResponsePadronUpload
 */

/**
 * Sube el padrón electoral como archivo Excel para una elección específica.
 *
 * @param {string} eleccionId UUID de la elección destino.
 * @param {File} file Archivo `.xlsx` con hojas Estudiantes y/o Docentes.
 * @returns {Promise<ApiResponsePadronUpload>}
 */
export async function uploadWhitelistFile(eleccionId, file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post(`/elecciones/${eleccionId}/padron`, formData)
  return response.data
}

/**
 * @deprecated Usar uploadWhitelistFile con archivo Excel dual-sheet.
 * @param {Array<Record<string, unknown>>} students
 * @returns {Promise<unknown>}
 */
export async function uploadWhitelistArray(students) {
  const response = await api.post('/estudiantes/whitelist', {
    students,
  })

  return response.data
}

/**
 * Obtiene la lista de electores del padrón electoral para una elección.
 *
 * @param {string} eleccionId UUID de la elección.
 * @param {number} [page=1]
 * @param {number} [limit=50]
 * @param {string} [estamento] 'DOCENTE' | 'ESTUDIANTE'
 * @returns {Promise<import('./electionsService').ApiResponse>}
 */
export async function fetchPadronElectoral(eleccionId, page = 1, limit = 50, estamento = '') {
  const params = { page, limit }
  if (estamento) {
    params.estamento = estamento
  }

  const response = await api.get(`/elecciones/${eleccionId}/padron`, {
    params,
  })
  return response.data
}
