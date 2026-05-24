import { api } from './api'

/**
 * Descarga el certificado de sufragio de una elección.
 * 
 * @param {string} eleccionId UUID de la elección.
 * @returns {Promise<void>} 
 */
export async function descargarCertificado(eleccionId) {
  try {
    const response = await api.get(`/elecciones/certificado/${eleccionId}`, {
      responseType: 'blob', // Importante para recibir archivos binarios
    })

    // Crear un blob y generar una URL temporal para forzar la descarga
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    
    // Intentar extraer el nombre del archivo de los headers
    let fileName = 'certificado_sufragio.pdf'
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
    console.error('Error al descargar el certificado:', error)
    throw error
  }
}
