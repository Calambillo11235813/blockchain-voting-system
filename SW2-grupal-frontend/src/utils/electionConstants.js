/** @typedef {'EN_CONFIGURACION' | 'SELLADA' | 'ACTIVA' | 'FINALIZADA'} EstadoEleccion */

export const ESTADO_ELECCION = {
  EN_CONFIGURACION: 'EN_CONFIGURACION',
  SELLADA: 'SELLADA',
  ACTIVA: 'ACTIVA',
  FINALIZADA: 'FINALIZADA',
}

/** @type {Record<EstadoEleccion, string>} */
export const ESTADO_ELECCION_LABELS = {
  EN_CONFIGURACION: 'En configuración',
  SELLADA: 'Sellada',
  ACTIVA: 'Activa',
  FINALIZADA: 'Finalizada',
}

/**
 * @param {EstadoEleccion | string | undefined | null} estado
 * @returns {boolean}
 */
export function isElectionSealed(estado) {
  return estado === ESTADO_ELECCION.SELLADA || estado === ESTADO_ELECCION.ACTIVA
}

/**
 * @param {EstadoEleccion | string | undefined | null} estado
 * @returns {string}
 */
export function formatEstadoEleccion(estado) {
  if (!estado) return ESTADO_ELECCION_LABELS.EN_CONFIGURACION
  return ESTADO_ELECCION_LABELS[estado] || estado
}

/**
 * @param {EstadoEleccion | string | undefined | null} estado
 * @param {boolean | undefined} estaActiva
 * @returns {boolean}
 */
export function isEleccionFinalizada(estado, estaActiva = false) {
  if (estaActiva) return false
  return (
    estado === ESTADO_ELECCION.FINALIZADA ||
    (estado === ESTADO_ELECCION.ACTIVA && !estaActiva)
  )
}

export function canAbrirJornada(estado) {
  return estado === ESTADO_ELECCION.SELLADA
}

/**
 * @param {EstadoEleccion | string | undefined | null} estado
 * @param {boolean | undefined} estaActiva
 * @returns {boolean}
 */
export function canCerrarJornada(estado, estaActiva) {
  return estado === ESTADO_ELECCION.ACTIVA && Boolean(estaActiva)
}

/**
 * @param {EstadoEleccion | string | undefined | null} estado
 * @returns {boolean}
 */
export function isJornadaFinalizada(estado) {
  return estado === ESTADO_ELECCION.FINALIZADA
}

/** @type {Record<EstadoEleccion, string>} */
export const ESTADO_ELECCION_BADGE_CLASSES = {
  EN_CONFIGURACION: 'border-slate-200 bg-slate-100 text-slate-700',
  SELLADA: 'border-slate-300 bg-slate-50 text-slate-700',
  ACTIVA: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  FINALIZADA: 'border-blue-200 bg-blue-50 text-blue-900',
}

/**
 * @param {EstadoEleccion | string | undefined | null} estado
 * @returns {string}
 */
export function getEstadoEleccionBadgeClass(estado) {
  const key = estado || ESTADO_ELECCION.EN_CONFIGURACION
  return ESTADO_ELECCION_BADGE_CLASSES[key] || ESTADO_ELECCION_BADGE_CLASSES.EN_CONFIGURACION
}

export const SEALED_ELECTION_WARNING_MESSAGE =
  '🔒 Acción bloqueada: La elección ya ha sido sellada y no permite modificaciones.'

export const READ_ONLY_ELECTION_HELP =
  'La elección está sellada. No se pueden crear, editar ni eliminar registros.'
