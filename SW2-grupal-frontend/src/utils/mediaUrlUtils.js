const DEFAULT_API_BASE_URL = 'http://localhost:3000/api'

/**
 * Origen del backend (sin /api) para archivos estáticos en public/.
 */
export function getApiOrigin() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
  return apiBase.replace(/\/api\/?$/, '')
}

/**
 * Convierte rutas relativas del backend (/images/...) o URLs absolutas/data URLs
 * en una URL usable por <img src>.
 *
 * @param {string | null | undefined} url
 * @returns {string}
 */
export function resolveMediaUrl(url) {
  if (!url?.trim()) return ''

  const trimmed = url.trim()

  if (trimmed.startsWith('data:') || /^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  const origin = getApiOrigin()
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`

  return `${origin}${encodeURI(path)}`
}
