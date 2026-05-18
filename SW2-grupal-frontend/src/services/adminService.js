import { api } from './api'

/**
 * Sube la whitelist/padrón de estudiantes como archivo para una elección específica.
 *
 * @param {string} eleccionId UUID de la elección a la que pertenece el padrón.
 * @param {File} file Archivo `.xlsx`.
 * @returns {Promise<any>} Respuesta del backend.
 */
export async function uploadWhitelistFile(eleccionId, file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post(`/elecciones/${eleccionId}/padron`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

/**
 * Sube la whitelist como lista (array) de estudiantes.
 *
 * Importante: Este método asume que el backend expone un endpoint JSON.
 * Si tu backend solo soporta `.xlsx`, usa `uploadWhitelistFile`.
 *
 * @param {Array<Record<string, any>>} students Lista de estudiantes.
 * @returns {Promise<any>} Respuesta del backend.
 */
export async function uploadWhitelistArray(students) {
  const response = await api.post('/estudiantes/whitelist', {
    students,
  })

  return response.data
}

/**
 * Obtiene la lista de electores del padrón electoral para una elección específica.
 *
 * @param {string} eleccionId UUID de la elección.
 * @param {number} page Número de página (1-indexed).
 * @param {number} limit Límite de registros por página.
 * @param {string} [estamento] Filtro opcional por estamento ('DOCENTE' o 'ESTUDIANTE').
 * @returns {Promise<any>} Respuesta del backend con los datos de paginación.
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
