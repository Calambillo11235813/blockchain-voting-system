import { api } from './api'

/**
 * Emite el voto de un estudiante para un candidato en una elección.
 * 
 * @param {string} eleccionId UUID de la elección.
 * @param {string} electorId UUID del elector (estudiante).
 * @param {string} candidatoId UUID del candidato seleccionado.
 * @returns {Promise<{ hashTransaccion: string }>} Comprobante del voto con el hash de la transacción.
 */
export async function emitirVoto(eleccionId, electorId, candidatoId) {
  const response = await api.post('/elecciones/candidato/votar', {
    eleccionId,
    electorId,
    candidatoId,
  })

  // Retornamos los datos directamente
  return response?.data?.data
}
