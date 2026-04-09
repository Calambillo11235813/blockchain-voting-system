import { api } from './api'

/**
 * Tipos base de respuesta del backend.
 *
 * Nota:
 * - Se documentan como JSDoc para integridad de datos en JS.
 *
 * @template T
 * @typedef {{
 *  statusCode: number,
 *  data: T | null,
 *  message?: string,
 *  errors?: string[],
 *  metadata?: any,
 * }} ApiResponse
 */

/**
 * @typedef {{ id: string, titulo: string, gestion: number, fechaInicio: string, fechaFin: string, estaActiva: boolean }} Election
 */

/**
 * @typedef {{ id: string, nombre: string, facultad: string, eleccion?: Election }} Position
 */

/**
 * @typedef {{ id: string, nombreFrente: string, sigla: string, logoUrl: (string | null), cargo?: Position }} Frente
 */

/**
 * @typedef {{ id: string, ci: string, nombres: string, apellidos: string, fotoUrl: (string | null), frente?: Frente }} Candidate
 */

/**
 * Obtiene la lista de cargos.
 * @returns {Promise<Position[]>}
 */
export async function fetchCargos() {
  const response = await api.get('/elecciones/cargo/lista')
  return response?.data?.data || []
}

/**
 * Obtiene la lista de cargos.
 *
 * Nota: Alias en inglés para cumplir convención de código.
 *
 * @returns {Promise<Position[]>}
 */
export async function fetchPositions() {
  return fetchCargos()
}

/**
 * Obtiene la lista de frentes.
 * @returns {Promise<Frente[]>}
 */
export async function fetchFrentes() {
  const response = await api.get('/elecciones/frente/lista')
  return response?.data?.data || []
}

/**
 * Crea un frente.
 * @param {{ nombreFrente: string, sigla: string, cargoId: string, logoUrl?: string }} payload
 * @returns {Promise<Frente>}
 */
export async function createFrente(payload) {
  const response = await api.post('/elecciones/frente', payload)
  return response?.data?.data
}

/**
 * Actualiza un frente.
 * @param {string} frenteId
 * @param {{ nombreFrente?: string, sigla?: string, cargoId?: string, logoUrl?: string }} payload
 * @returns {Promise<Frente>}
 */
export async function updateFrente(frenteId, payload) {
  const response = await api.patch(`/elecciones/frente/${frenteId}`, payload)
  return response?.data?.data
}

/**
 * Elimina un frente.
 * @param {string} frenteId
 * @returns {Promise<null>}
 */
export async function deleteFrente(frenteId) {
  const response = await api.delete(`/elecciones/frente/${frenteId}`)
  return response?.data?.data ?? null
}

/**
 * Obtiene la lista de candidatos.
 * @returns {Promise<Candidate[]>}
 */
export async function fetchCandidates() {
  const response = await api.get('/elecciones/candidato/lista')
  return response?.data?.data || []
}

/**
 * Crea un candidato.
 * @param {{ ci: string, nombres: string, apellidos: string, frenteId: string, fotoUrl?: string }} payload
 * @returns {Promise<Candidate>}
 */
export async function createCandidate(payload) {
  const response = await api.post('/elecciones/candidato', payload)
  return response?.data?.data
}

/**
 * Actualiza un candidato.
 * @param {string} candidateId
 * @param {{ ci?: string, nombres?: string, apellidos?: string, frenteId?: string, fotoUrl?: string }} payload
 * @returns {Promise<Candidate>}
 */
export async function updateCandidate(candidateId, payload) {
  const response = await api.patch(`/elecciones/candidato/${candidateId}`, payload)
  return response?.data?.data
}

/**
 * Elimina un candidato.
 * @param {string} candidateId
 * @returns {Promise<null>}
 */
export async function deleteCandidate(candidateId) {
  const response = await api.delete(`/elecciones/candidato/${candidateId}`)
  return response?.data?.data ?? null
}

/**
 * Obtiene la lista de elecciones.
 * @returns {Promise<Election[]>}
 */
export async function fetchElections() {
  const response = await api.get('/elecciones')
  return response?.data?.data || []
}

/**
 * Crea una elección.
 * @param {{ titulo: string, gestion: number, fechaInicio: string, fechaFin: string, estaActiva: boolean }} payload
 * @returns {Promise<Election>}
 */
export async function createElection(payload) {
  const response = await api.post('/elecciones', payload)
  return response?.data?.data
}

/**
 * Actualiza una elección.
 * @param {string} electionId
 * @param {{ titulo?: string, gestion?: number, fechaInicio?: string, fechaFin?: string, estaActiva?: boolean }} payload
 * @returns {Promise<Election>}
 */
export async function updateElection(electionId, payload) {
  const response = await api.patch(`/elecciones/${electionId}`, payload)
  return response?.data?.data
}

/**
 * Elimina una elección.
 * @param {string} electionId
 * @returns {Promise<null>}
 */
export async function deleteElection(electionId) {
  const response = await api.delete(`/elecciones/${electionId}`)
  return response?.data?.data ?? null
}

/**
 * Crea un cargo.
 * @param {{ nombre: string, facultad: string, eleccionId: string }} payload
 * @returns {Promise<Position>}
 */
export async function createPosition(payload) {
  const response = await api.post('/elecciones/cargo', payload)
  return response?.data?.data
}

/**
 * Actualiza un cargo.
 * @param {string} positionId
 * @param {{ nombre?: string, facultad?: string, eleccionId?: string }} payload
 * @returns {Promise<Position>}
 */
export async function updatePosition(positionId, payload) {
  const response = await api.patch(`/elecciones/cargo/${positionId}`, payload)
  return response?.data?.data
}

/**
 * Elimina un cargo.
 * @param {string} positionId
 * @returns {Promise<null>}
 */
export async function deletePosition(positionId) {
  const response = await api.delete(`/elecciones/cargo/${positionId}`)
  return response?.data?.data ?? null
}

/**
 * Obtiene la papeleta completa (cargos, frentes y candidatos) de una elección.
 *
 * Importante:
 * - Este endpoint devuelve el objeto directamente (no viene envuelto en ApiResponse).
 *
 * @param {string} electionId
 * @returns {Promise<any>}
 */
export async function fetchBallotComplete(electionId) {
  const response = await api.get(`/elecciones/${electionId}/papeleta`)
  return response?.data
}
