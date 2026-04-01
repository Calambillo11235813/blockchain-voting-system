import { api } from './api'

/**
 * Sube la whitelist/padrón de estudiantes como archivo.
 *
 * Nota: En el backend actual, el endpoint es `/estudiantes/cargar-padron` y
 * recibe un archivo Excel `.xlsx` en el campo `file`.
 *
 * @param {File} file Archivo `.xlsx`.
 * @returns {Promise<any>} Respuesta del backend.
 */
export async function uploadWhitelistFile(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post('/estudiantes/cargar-padron', formData, {
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
