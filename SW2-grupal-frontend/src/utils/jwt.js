/**
 * Decodifica el payload de un JWT (sin validar la firma).
 *
 * IMPORTANTE:
 * - Esto solo sirve para leer claims (por ejemplo, `role`) en el cliente.
 * - La validación real de permisos debe ocurrir en el backend.
 *
 * @param {string | null | undefined} token JWT en formato `header.payload.signature`.
 * @returns {Record<string, unknown> | null} Payload decodificado o null si es inválido.
 */
export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') {
    return null
  }

  const parts = token.split('.')
  if (parts.length < 2) {
    return null
  }

  try {
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')

    const json = base64DecodeToString(padded)
    return JSON.parse(json)
  } catch {
    return null
  }
}

/**
 * Obtiene el rol del usuario desde el JWT.
 * @param {string | null | undefined} token JWT.
 * @returns {'ADMIN' | 'SISTEMAS' | 'ELECTORAL' | 'ESTUDIANTE' | null} Rol si existe, caso contrario null.
 */
/**
 * Verifica si un JWT está expirado.
 * @param {string | null | undefined} token JWT.
 * @returns {boolean} true si expiró o es inválido.
 */
export function isTokenExpired(token) {
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return true
  // exp es en segundos, Date.now() en milisegundos
  return Date.now() >= payload.exp * 1000
}

export function getRoleFromToken(token) {
  if (isTokenExpired(token)) return null

  const payload = decodeJwtPayload(token)
  const role = payload?.role

  if (['ADMIN', 'SISTEMAS', 'ELECTORAL', 'ESTUDIANTE', 'DOCENTE', 'ADMINISTRATIVO'].includes(role)) {
    return role
  }

  return null
}

/**
 * Decodifica base64 a string con compatibilidad básica.
 * @param {string} base64 Base64 estándar.
 * @returns {string} Texto decodificado.
 */
function base64DecodeToString(base64) {
  if (typeof globalThis !== 'undefined' && typeof globalThis.atob === 'function') {
    return decodeURIComponent(
      Array.prototype.map
        .call(globalThis.atob(base64), (char) => {
          return `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`
        })
        .join(''),
    )
  }

  // Fallback para entornos no-browser.
  // eslint-disable-next-line no-undef
  return Buffer.from(base64, 'base64').toString('utf-8')
}
