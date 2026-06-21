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
 * Descarga el acta de consolidación paritaria en PDF de una elección.
 * Reutiliza la misma lógica que el certificado de sufragio.
 * 
 * @param {string} eleccionId UUID de la elección.
 * @returns {Promise<void>} 
 */
export async function descargarActaPDF(eleccionId) {
  try {
    const response = await api.get(`/estadisticas/escrutinio/${eleccionId}/pdf`, {
      responseType: 'blob', // Importante para recibir archivos binarios
    })

    // Crear un blob y generar una URL temporal para forzar la descarga
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    
    // Intentar extraer el nombre del archivo de los headers
    let fileName = 'acta_consolidacion.pdf'
    const contentDisposition = response.headers['content-disposition']
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/)
      if (match && match[1]) {
        fileName = match[1]
      }
    }

    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    
    // Limpieza
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error al descargar el acta en PDF:', error)
    throw error
  }
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

/**
 * Obtiene estadísticas jerárquicas agrupadas por papeleta (Global, Facultad, Carrera).
 * @param {string} eleccionId UUID de la elección.
 * @returns {Promise<any>}
 */
export async function getEstadisticasJerarquicas(eleccionId) {
  const response = await api.get(`/estadisticas/jerarquicas/${eleccionId}`)
  return response?.data?.data || response?.data
}

