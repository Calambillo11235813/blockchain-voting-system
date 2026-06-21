import { SEALED_ELECTION_WARNING_MESSAGE } from './electionConstants'

/**
 * Detecta si un error de API corresponde a una elección sellada o activa (403).
 * @param {unknown} error
 * @returns {boolean}
 */
export function isSealedElectionError(error) {
  const status = error?.response?.status
  const message = String(
    error?.response?.data?.message ||
      error?.response?.data?.error ||
      (Array.isArray(error?.response?.data?.errors)
        ? error.response.data.errors.join(' ')
        : '') ||
      error?.message ||
      '',
  ).toLowerCase()

  if (status === 403) {
    return message.includes('sellad') || message.includes('sealed')
  }

  return message.includes('sellad') && message.includes('modificar')
}

/**
 * Maneja errores de mutaciones mostrando un aviso amigable si la elección está sellada.
 * @param {unknown} error
 * @param {{
 *  setWarningMessage?: (value: string) => void,
 *  setErrorMessage?: (value: string) => void,
 *  defaultMessage?: string,
 * }} handlers
 * @returns {boolean} true si el error fue por elección sellada
 */
export function handleMutationApiError(
  error,
  { setWarningMessage, setErrorMessage, defaultMessage },
) {
  setWarningMessage?.('')
  setErrorMessage?.('')

  if (isSealedElectionError(error)) {
    setWarningMessage?.(SEALED_ELECTION_WARNING_MESSAGE)
    return true
  }

  setErrorMessage?.(defaultMessage || 'Ocurrió un error inesperado. Inténtelo más tarde.')
  return false
}
