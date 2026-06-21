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
 * @typedef {'EN_CONFIGURACION' | 'SELLADA' | 'ACTIVA' | 'FINALIZADA'} EstadoEleccion
 */

/**
 * @typedef {{
 *  id: string,
 *  titulo: string,
 *  gestion: number,
 *  fecha: string,
 *  estaActiva: boolean,
 *  estado?: EstadoEleccion,
 *  restriccionAlfabeticaActiva?: boolean,
 * }} Election
 */

/**
 * @typedef {'GLOBAL' | 'FACULTAD' | 'CARRERA'} AlcancePapeleta
 */

/**
 * @typedef {{
 *  id: string,
 *  nombre: string,
 *  facultad: string,
 *  eleccion?: Election,
 *  eleccionCargoId?: string | null,
 *  alcance?: AlcancePapeleta,
 *  codFacultad?: string | null,
 *  facultadNombre?: string | null,
 *  codCarrera?: string | null,
 *  carreraNombre?: string | null,
 *  orden?: number,
 *  estaActiva?: boolean,
 * }} Position
 */

/**
 * @typedef {{ codFacultad: string, facultadNombre: string }} FacultadPadron
 */

/**
 * @typedef {{ codCarrera: string, carreraNombre: string }} CarreraPadron
 */

/**
 * @typedef {{
 *  id: string,
 *  nombreFrente: string,
 *  sigla: string,
 *  logoUrl: (string | null),
 *  eleccion?: Election,
 *  eleccionId?: string | null,
 *  candidatos?: Candidate[],
 * }} Frente
 */

/**
 * @typedef {{
 *  id: string,
 *  ci: string,
 *  nombres: string,
 *  apellidos: string,
 *  fotoUrl: (string | null),
 *  rolEspecifico?: (string | null),
 *  frente?: Frente,
 *  eleccionCargo?: Papeleta,
 * }} Candidate
 */

/**
 * @typedef {{
 *  id: string,
 *  cargoId?: string,
 *  cargoNombre?: string,
 *  nombre?: string,
 *  alcance?: AlcancePapeleta,
 *  codFacultad?: string | null,
 *  facultadNombre?: string | null,
 *  codCarrera?: string | null,
 *  carreraNombre?: string | null,
 *  cargo?: { id: string, nombre: string },
 *  eleccion?: Election,
 * }} Papeleta
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
 * Obtiene la lista de frentes, opcionalmente filtrados por elección.
 * @param {string} [eleccionId]
 * @returns {Promise<Frente[]>}
 */
export async function fetchFrentes(eleccionId) {
  if (eleccionId) {
    const response = await api.get(`/elecciones/${eleccionId}/frentes`)
    return response?.data?.data || []
  }
  const response = await api.get('/elecciones/frente/lista')
  return response?.data?.data || []
}

/**
 * Crea un frente en un proceso electoral.
 * @param {{ eleccionId: string, nombreFrente: string, sigla: string, logoUrl?: string, esOpcionGlobal?: boolean }} payload
 * @returns {Promise<Frente>}
 */
export async function createFrente(payload) {
  const { eleccionId, ...data } = payload
  const response = await api.post(`/elecciones/${eleccionId}/frentes`, data)
  return response?.data?.data
}

/**
 * Actualiza un frente.
 * @param {string} frenteId
 * @param {{ nombreFrente?: string, sigla?: string, logoUrl?: string, esOpcionGlobal?: boolean }} payload
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
 * Obtiene la lista de candidatos, opcionalmente filtrados por elección.
 * @param {string} [eleccionId]
 * @returns {Promise<Candidate[]>}
 */
export async function fetchCandidates(eleccionId) {
  const params = eleccionId ? { eleccionId } : {}
  const response = await api.get('/elecciones/candidato/lista', { params })
  return response?.data?.data || []
}

/**
 * Crea un candidato.
 * @param {{ ci: string, nombres: string, apellidos: string, frenteId: string, eleccionCargoId: string, rolEspecifico: string, fotoUrl?: string }} payload
 * @returns {Promise<Candidate>}
 */
export async function createCandidate(payload) {
  const response = await api.post('/elecciones/candidato', payload)
  return response?.data?.data
}

/**
 * Actualiza un candidato.
 * @param {string} candidateId
 * @param {{ ci?: string, nombres?: string, apellidos?: string, frenteId?: string, eleccionCargoId?: string, rolEspecifico?: string, fotoUrl?: string }} payload
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
 * @param {{ titulo: string, gestion: number, fecha: string, restriccionAlfabeticaActiva?: boolean }} payload
 * @returns {Promise<Election>}
 */
export async function createElection(payload) {
  const response = await api.post('/elecciones', payload)
  return response?.data?.data
}

/**
 * Actualiza una elección.
 * @param {string} electionId
 * @param {{ titulo?: string, gestion?: number, fecha?: string, restriccionAlfabeticaActiva?: boolean }} payload
 * @returns {Promise<Election>}
 */
export async function updateElection(electionId, payload) {
  const response = await api.patch(`/elecciones/${electionId}`, payload)
  return response?.data?.data
}

/**
 * Sella una elección: cierre legal de listas antes del despliegue del contrato.
 * @param {string} electionId
 * @returns {Promise<Election>}
 */
export async function sealElection(electionId) {
  const response = await api.patch(`/elecciones/${electionId}/sellar`)
  return response?.data?.data
}

/**
 * Abre la jornada electoral (SELLADA → ACTIVA).
 * @param {string} eleccionId
 * @returns {Promise<Election>}
 */
export async function abrirJornada(eleccionId) {
  const response = await api.patch(`/elecciones/${eleccionId}/abrir`)
  return response?.data?.data || response?.data
}

/**
 * Cierra la jornada electoral (ACTIVA → FINALIZADA).
 * @param {string} eleccionId
 * @returns {Promise<Election>}
 */
export async function cerrarJornada(eleccionId) {
  const response = await api.patch(`/elecciones/${eleccionId}/cerrar`)
  return response?.data?.data || response?.data
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
 * Facultades distintas del padrón habilitado de una elección.
 * @param {string} eleccionId
 * @returns {Promise<FacultadPadron[]>}
 */
export async function fetchFacultadesPadron(eleccionId) {
  const response = await api.get(`/elecciones/${eleccionId}/catalogo/facultades`)
  return response?.data?.data || []
}

/**
 * Carreras distintas del padrón habilitado filtradas por facultad.
 * @param {string} eleccionId
 * @param {string} codFacultad
 * @returns {Promise<CarreraPadron[]>}
 */
export async function fetchCarrerasPadron(eleccionId, codFacultad) {
  const response = await api.get(`/elecciones/${eleccionId}/catalogo/carreras`, {
    params: { codFacultad },
  })
  return response?.data?.data || []
}

/**
 * Crea un cargo.
 * @param {{
 *  nombre: string,
 *  eleccionId: string,
 *  alcance: AlcancePapeleta,
 *  codFacultad?: string,
 *  facultadNombre?: string,
 *  codCarrera?: string,
 *  carreraNombre?: string,
 *  orden?: number,
 * }} payload
 * @returns {Promise<Position>}
 */
export async function createPosition(payload) {
  const response = await api.post('/elecciones/cargo', payload)
  return response?.data?.data
}

/**
 * Actualiza un cargo.
 * @param {string} positionId
 * @param {{
 *  nombre?: string,
 *  eleccionId?: string,
 *  alcance?: AlcancePapeleta,
 *  codFacultad?: string,
 *  facultadNombre?: string,
 *  codCarrera?: string,
 *  carreraNombre?: string,
 * }} payload
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
   * - Si se pasa `registro`, el backend filtra cargos según alcance territorial y elegibilidad del elector.
 *
 * @param {string} electionId
 * @param {string} [registro] Número de registro del elector autenticado.
 * @returns {Promise<any>}
 */
export async function fetchBallotComplete(electionId, registro) {
  const params = registro ? { registro } : {}
  const response = await api.get(`/elecciones/${electionId}/papeleta`, { params })
  return response?.data
}

/**
 * Lista las papeletas (EleccionCargo) configuradas para un proceso electoral.
 * @param {string} eleccionId
 * @returns {Promise<Papeleta[]>}
 */
export async function fetchPapeletasByEleccion(eleccionId) {
  const ballot = await fetchBallotComplete(eleccionId)
  return ballot?.cargos || []
}

/**
 * Obtiene el total de estudiantes habilitados en el padrón.
 * @returns {Promise<number>}
 */
export async function fetchTotalStudents() {
  const response = await api.get('/estudiantes/total')
  return response?.data?.data?.total || 0
}
