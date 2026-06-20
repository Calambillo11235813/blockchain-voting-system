/**
 * Extrae el mensaje de error de una respuesta Axios/NestJS.
 * @param {unknown} error
 * @param {string} fallback
 * @returns {string}
 */
export function getApiErrorMessage(error, fallback) {
  if (typeof error !== 'object' || error === null) {
    return fallback
  }

  const response = /** @type {{ response?: { data?: { message?: string } } }} */ (error).response
  const message = response?.data?.message

  if (typeof message === 'string' && message.trim().length > 0) {
    return message.trim()
  }

  return fallback
}

/**
 * Divide mensajes multilínea del backend en líneas útiles para listas UI.
 * @param {string} message
 * @returns {string[]}
 */
export function splitApiErrorLines(message) {
  return message
    .split('\n')
    .map((line) => line.replace(/^-\s*/, '').trim())
    .filter(Boolean)
}
