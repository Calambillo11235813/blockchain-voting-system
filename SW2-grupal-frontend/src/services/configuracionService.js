import { api } from './api'

/**
 * Servicio para gestión de parámetros del sistema (CU-02)
 * Endpoints: /configuracion
 */

/**
 * Obtiene todos los parámetros del sistema.
 *
 * @returns {Promise<Array>} Lista de parámetros del sistema
 */
export async function obtenerParametros() {
  const response = await api.get('/admin/configuracion')
  return response?.data?.data || []
}

/**
 * Obtiene un parámetro específico del sistema.
 *
 * @param {string} clave - Clave del parámetro (ej: 'BYPASS_ELECTION_TIME')
 * @returns {Promise<Object>} Parámetro del sistema
 */
export async function obtenerParametro(clave) {
  const response = await api.get(`/admin/configuracion/${clave}`)
  return response?.data?.data || {}
}

/**
 * Actualiza un parámetro del sistema.
 * Solo accesible para rol SISTEMAS.
 *
 * @param {string} clave - Clave del parámetro
 * @param {Object} datos - Datos para actualizar
 * @param {string} datos.valor - Nuevo valor del parámetro
 * @param {string} [datos.descripcion] - Nueva descripción (opcional)
 * @returns {Promise<Object>} Parámetro actualizado
 */
export async function actualizarParametro(clave, datos) {
  const response = await api.patch(`/admin/configuracion/${clave}`, datos)
  return response?.data?.data || {}
}

/**
 * Crea un nuevo parámetro del sistema.
 * Solo accesible para rol SISTEMAS.
 *
 * @param {Object} datos - Datos del nuevo parámetro
 * @param {string} datos.clave - Clave única del parámetro
 * @param {string} datos.valor - Valor del parámetro
 * @param {string} datos.tipo - Tipo: 'STRING', 'BOOLEAN', 'NUMBER'
 * @param {string} [datos.descripcion] - Descripción (opcional)
 * @returns {Promise<Object>} Parámetro creado
 */
export async function crearParametro(datos) {
  const response = await api.post('/admin/configuracion', datos)
  return response?.data?.data || {}
}

/**
 * Elimina un parámetro del sistema.
 * Solo accesible para rol SISTEMAS.
 *
 * @param {string} clave - Clave del parámetro a eliminar
 * @returns {Promise<Object>} Respuesta de éxito
 */
export async function eliminarParametro(clave) {
  const response = await api.delete(`/admin/configuracion/${clave}`)
  return response?.data?.data || {}
}
