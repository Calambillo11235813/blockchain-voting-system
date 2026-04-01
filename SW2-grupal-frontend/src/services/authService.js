import { api } from './api'

/**
 * Inicia sesión de estudiante (HU-002).
 *
 * Espera la respuesta del backend con el formato:
 * `{ statusCode, message, data: { token } }`.
 *
 * @param {{ studentId: string, password: string }} params
 * @returns {Promise<{ token: string }>} Token JWT
 */
export async function loginStudent({ studentId, password }) {
  const response = await api.post('/auth/login', {
    registro: studentId,
    password,
  })

  const token = response?.data?.data?.token
  if (!token) {
    throw new Error('No se recibió el token del servidor.')
  }

  return { token }
}
