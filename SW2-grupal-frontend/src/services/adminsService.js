import { api } from './api'

/**
 * Servicio para gestión de administradores (CU-01)
 * Endpoints: /admin/admins
 */

/**
 * Obtiene la lista de todos los administradores.
 * Solo accesible para rol SISTEMAS.
 *
 * @returns {Promise<Array>} Lista de administradores
 */
export async function obtenerAdministradores() {
  const response = await api.get('/admin/admins')
  return response?.data?.data || []
}

/**
 * Obtiene el perfil del administrador actual.
 *
 * @returns {Promise<Object>} Datos del administrador actual
 */
export async function obtenerPerfil() {
  const response = await api.get('/admin/admins/perfil')
  return response?.data?.data || {}
}

/**
 * Crea un nuevo administrador.
 * Solo accesible para rol SISTEMAS.
 *
 * @param {Object} datos - Datos del nuevo administrador
 * @param {string} datos.correo - Email del administrador
 * @param {string} datos.password - Contraseña
 * @param {string} datos.rol - Rol: 'SISTEMAS' o 'ELECTORAL'
 * @returns {Promise<Object>} Administrador creado
 */
export async function crearAdministrador(datos) {
  const response = await api.post('/admin/admins', datos)
  return response?.data?.data || {}
}

/**
 * Actualiza la contraseña del administrador actual.
 *
 * @param {Object} datos - Datos para cambio de contraseña
 * @param {string} datos.passwordActual - Contraseña actual
 * @param {string} datos.passwordNueva - Nueva contraseña
 * @returns {Promise<Object>} Respuesta de éxito
 */
export async function cambiarContrasena(datos) {
  const response = await api.patch('/admin/admins/cambiar-contrasena', datos)
  return response?.data?.data || {}
}

/**
 * Elimina un administrador.
 * Solo accesible para rol SISTEMAS.
 *
 * @param {string} adminId - ID del administrador a eliminar
 * @returns {Promise<Object>} Respuesta de éxito
 */
export async function eliminarAdministrador(adminId) {
  const response = await api.delete(`/admin/admins/${adminId}`)
  return response?.data?.data || {}
}
