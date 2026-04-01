import axios from 'axios'

const DEFAULT_BASE_URL = 'http://localhost:3000/api'

/**
 * Instancia de Axios configurada para el backend.
 *
 * Nota: El backend usa el prefijo global `/api` (ver `main.ts` en NestJS).
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Configura o limpia el token JWT en la instancia de Axios.
 *
 * @param {string | null} token Token JWT. Si es `null`, se elimina el header.
 */
export function setApiAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
    return
  }

  delete api.defaults.headers.common.Authorization
}

/**
 * Configura o limpia el token heredado tipo SaaS en la instancia de Axios.
 *
 * Importante: En el backend, varios endpoints usan `AuthSaasGuard` y esperan
 * el header `auth-token`.
 *
 * @param {string | null} token Token SaaS. Si es `null`, se elimina el header.
 */
export function setApiSaasToken(token) {
  if (token) {
    api.defaults.headers.common['auth-token'] = token
    return
  }

  delete api.defaults.headers.common['auth-token']
}
