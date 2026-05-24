import { api } from './api'

/**
 * Servicio para monitoreo de nodos RPC (CU-04)
 * Endpoints: /admin/nodos
 */

/**
 * Obtiene el estado actual de todos los nodos RPC.
 * Realiza ping paralelo a cada nodo con timeout de 5 segundos.
 * Solo accesible para rol SISTEMAS.
 *
 * @returns {Promise<Array>} Lista de nodos con su estado
 * @example
 * [
 *   { url: 'https://sepolia.infura.io/v3/...', estado: 'activo', latencia: 150 },
 *   { url: 'http://localhost:8545', estado: 'inactivo', error: 'Connection refused' }
 * ]
 */
export async function obtenerEstadoNodos() {
  const response = await api.get('/admin/nodos/estado')
  return response?.data?.data || []
}

/**
 * Verifica el estado de un nodo específico.
 * Realiza un ping directo al nodo con timeout de 5 segundos.
 * Solo accesible para rol SISTEMAS.
 *
 * @param {string} urlBase64 - URL del nodo codificada en Base64
 * @returns {Promise<Object>} Estado del nodo específico
 * @example
 * {
 *   url: 'https://sepolia.infura.io/v3/...',
 *   estado: 'activo',
 *   latencia: 145,
 *   bloque_actual: 6234567,
 *   timestamp_verificacion: '2026-05-21T14:30:00Z'
 * }
 */
export async function verificarSaludNodo(urlBase64) {
  const response = await api.get(`/admin/nodos/verificar/${urlBase64}`)
  return response?.data?.data || {}
}

/**
 * Decodifica una URL de nodo desde Base64.
 * Función auxiliar para el cliente.
 *
 * @param {string} urlBase64 - URL codificada en Base64
 * @returns {string} URL decodificada
 */
export function decodificarUrlNodo(urlBase64) {
  try {
    return atob(urlBase64)
  } catch (error) {
    console.error('Error decodificando URL de nodo:', error)
    return ''
  }
}

/**
 * Codifica una URL de nodo a Base64.
 * Función auxiliar para el cliente.
 *
 * @param {string} url - URL a codificar
 * @returns {string} URL codificada en Base64
 */
export function codificarUrlNodo(url) {
  try {
    return btoa(url)
  } catch (error) {
    console.error('Error codificando URL de nodo:', error)
    return ''
  }
}
