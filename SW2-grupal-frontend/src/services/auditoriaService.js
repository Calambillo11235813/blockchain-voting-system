import { api } from './api'

/**
 * Servicio para auditoría de integridad de Blockchain (CU-20)
 * Endpoints: /auditoria
 */

/**
 * Obtiene los detalles de una transacción específica en el blockchain.
 * Información pública - accesible por cualquier usuario autenticado.
 *
 * @param {string} hash - Hash de la transacción (txHash)
 * @returns {Promise<Object>} Detalles de la transacción
 * @example
 * {
 *   hash: '0x123abc...',
 *   bloque: 6234567,
 *   timestamp: '2026-05-21T14:30:00Z',
 *   confirmaciones: 12,
 *   estado: 'exitosa',
 *   desde: '0x...',
 *   hacia: '0x...',
 *   valor: '0',
 *   gastatotal: '21000',
 *   entrada: '0x...'
 * }
 */
export async function obtenerDetallesTransaccion(hash) {
  const response = await api.get(`/auditoria/transaccion/${hash}`)
  return response?.data?.datos || {}
}

/**
 * Obtiene los detalles de un bloque específico en el blockchain.
 * Solo accesible para rol SISTEMAS.
 *
 * @param {number} numero - Número del bloque
 * @returns {Promise<Object>} Detalles del bloque
 * @example
 * {
 *   numero: 6234567,
 *   hash: '0x...',
 *   hashPadre: '0x...',
 *   timestamp: '2026-05-21T14:30:00Z',
 *   minero: '0x...',
 *   dificultad: '2345643',
 *   transacciones: 145,
 *   gasUsado: '8450234',
 *   gasLimite: '30000000',
 *   raizMerkle: '0x...'
 * }
 */
export async function obtenerDetallesBloque(numero) {
  const response = await api.get(`/auditoria/bloque/${numero}`)
  return response?.data?.datos || {}
}

/**
 * Obtiene la bitácora anónima de las últimas transacciones registradas.
 * Solo accesible para rol SISTEMAS.
 *
 * @returns {Promise<Array>} Lista de transacciones (id, txHash, fecha)
 */
export async function obtenerBitacoraTransacciones() {
  const response = await api.get('/admin/auditoria/bitacora')
  return response?.data?.datos || []
}

/**
 * Obtiene estadísticas generales del blockchain.
 * Información pública - accesible por cualquier usuario autenticado.
 *
 * @returns {Promise<Object>} Estadísticas del blockchain
 * @example
 * {
 *   bloqueActual: 6234567,
 *   transacciones: 2345678,
 *   direcciones: 45678,
 *   totalGasUsado: '123456789012345',
 *   dificultadPromedio: '2345643',
 *   tiempoPromedioBloques: 12.5
 * }
 */
export async function obtenerEstadisticasBlockchain() {
  const response = await api.get('/auditoria/estadisticas')
  return response?.data?.data || {}
}

/**
 * Verifica la integridad de un rango de bloques.
 * Valida las cadenas de hash para detectar manipulaciones.
 * Solo accesible para rol SISTEMAS.
 *
 * @param {Object} params - Parámetros de verificación
 * @param {number} params.bloque_inicio - Número del bloque inicial
 * @param {number} params.bloque_fin - Número del bloque final
 * @returns {Promise<Object>} Resultado de la verificación
 * @example
 * {
 *   integridad: true,
 *   bloques_verificados: 100,
 *   anomalias: [],
 *   timestamp_verificacion: '2026-05-21T14:30:00Z'
 * }
 */
export async function verificarIntegridad(params) {
  const response = await api.post('/auditoria/verificar-integridad', params)
  return response?.data?.data || {}
}
