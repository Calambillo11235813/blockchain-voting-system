import { api } from './api'

/**
 * @typedef {{ eleccionCargoId: string, candidatoId: string }} SeleccionVoto
 */

/**
 * @typedef {{
 *  eleccionId: string,
 *  selecciones: SeleccionVoto[],
 * }} EmitirVotoBatchPayload
 */

/**
 * @typedef {{
 *  hashTransaccion: string,
 *  fechaSufragio: string,
 *  mensaje: string,
 *  papeletasVotadas: string[],
 * }} VotoBatchComprobante
 */

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

  return response?.data?.data
}

/**
 * Emite un lote de votos (flujo Crucero) en una sola transacción blockchain.
 * El electorId y estamento se infieren del JWT en el backend.
 *
 * @param {EmitirVotoBatchPayload} payload
 * @returns {Promise<VotoBatchComprobante>}
 */
export async function emitirVotoBatch(payload) {
  const response = await api.post('/elecciones/candidato/votar-batch', payload)
  return response?.data?.data
}
