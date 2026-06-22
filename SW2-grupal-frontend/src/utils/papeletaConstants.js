/** @typedef {'GLOBAL' | 'FACULTAD' | 'CARRERA'} AlcancePapeleta */

/** @type {Record<string, AlcancePapeleta>} */
export const ALCANCE_PAPELETA = {
  GLOBAL: 'GLOBAL',
  FACULTAD: 'FACULTAD',
  CARRERA: 'CARRERA',
}

/** Nombres por defecto del cargo según alcance. */
export const DEFAULT_CARGO_NAMES = {
  GLOBAL: 'Rector y Vicerrector',
  FACULTAD: 'Decano y Vicedecano',
  CARRERA: 'Director de Carrera',
}

/** Etiquetas legibles para la UI. */
export const ALCANCE_LABELS = {
  GLOBAL: 'Global (Rectorado)',
  FACULTAD: 'Facultad (Decanato)',
  CARRERA: 'Carrera (Dirección)',
}

/** Roles disponibles dentro de la fórmula según alcance de papeleta. */
export const ROLES_POR_ALCANCE = {
  GLOBAL: ['Rector', 'Vicerrector'],
  FACULTAD: ['Decano', 'Vicedecano'],
  CARRERA: ['Director de Carrera'],
}

/**
 * Devuelve los roles válidos para una papeleta según su alcance.
 * @param {object} papeleta
 * @returns {string[]}
 */
export function getRolesForPapeleta(papeleta) {
  const alcance = papeleta?.alcance || ALCANCE_PAPELETA.GLOBAL
  return ROLES_POR_ALCANCE[alcance] || ROLES_POR_ALCANCE.GLOBAL
}

/**
 * Estado inicial del formulario de papeleta/cargo.
 * @param {string} [electionId]
 * @returns {{ name: string, electionId: string, alcance: AlcancePapeleta, codFacultad: string, facultadNombre: string, codCarrera: string, carreraNombre: string }}
 */
export function createEmptyPositionForm(electionId = '') {
  return {
    name: DEFAULT_CARGO_NAMES.GLOBAL,
    electionId,
    alcance: ALCANCE_PAPELETA.GLOBAL,
    codFacultad: '',
    facultadNombre: '',
    codCarrera: '',
    carreraNombre: '',
  }
}

/**
 * Construye el payload para POST /elecciones/cargo.
 * @param {ReturnType<typeof createEmptyPositionForm>} form
 * @returns {object}
 */
export function buildPositionPayload(form) {
  const payload = {
    nombre: form.name.trim(),
    eleccionId: form.electionId,
    alcance: form.alcance,
  }

  if (form.alcance === ALCANCE_PAPELETA.GLOBAL) {
    payload.tipoCargo = 'RECTOR'
  } else if (form.alcance === ALCANCE_PAPELETA.FACULTAD) {
    payload.tipoCargo = 'DECANO'
  } else if (form.alcance === ALCANCE_PAPELETA.CARRERA) {
    payload.tipoCargo = 'DIRECTOR_CARRERA'
  }

  if (form.alcance === ALCANCE_PAPELETA.FACULTAD || form.alcance === ALCANCE_PAPELETA.CARRERA) {
    payload.codFacultad = form.codFacultad
    payload.facultadNombre = form.facultadNombre || undefined
  }

  if (form.alcance === ALCANCE_PAPELETA.CARRERA) {
    payload.codCarrera = form.codCarrera
    payload.carreraNombre = form.carreraNombre || undefined
  }

  return payload
}

/**
 * Valida el formulario de papeleta antes de enviar.
 * @param {ReturnType<typeof createEmptyPositionForm>} form
 * @returns {string}
 */
export function validatePositionForm(form) {
  if (!form.electionId) return 'Seleccione una elección.'
  if (!form.name?.trim()) return 'Ingrese el nombre del cargo.'
  if (!form.alcance) return 'Seleccione el alcance de la papeleta.'

  if (form.alcance === ALCANCE_PAPELETA.FACULTAD || form.alcance === ALCANCE_PAPELETA.CARRERA) {
    if (!form.codFacultad) return 'Seleccione una facultad del padrón.'
  }

  if (form.alcance === ALCANCE_PAPELETA.CARRERA) {
    if (!form.codCarrera) return 'Seleccione una carrera del padrón.'
  }

  return ''
}

/**
 * Formatea el ámbito territorial para mostrar en tablas.
 * @param {{ alcance?: string, facultadNombre?: string | null, codFacultad?: string | null, carreraNombre?: string | null, codCarrera?: string | null }} position
 * @returns {string}
 */
export function formatPositionAmbito(position) {
  const alcance = position?.alcance || ALCANCE_PAPELETA.GLOBAL

  if (alcance === ALCANCE_PAPELETA.GLOBAL) {
    return 'Universidad (todos)'
  }

  if (alcance === ALCANCE_PAPELETA.FACULTAD) {
    return position.facultadNombre || position.codFacultad || '—'
  }

  const facultad = position.facultadNombre || position.codFacultad || ''
  const carrera = position.carreraNombre || position.codCarrera || ''
  if (facultad && carrera) return `${facultad} — ${carrera}`
  return carrera || facultad || '—'
}

/**
 * Etiqueta legible de una papeleta para selectores y tablas.
 * @param {object} papeleta
 * @returns {string}
 */
export function formatPapeletaLabel(papeleta) {
  if (!papeleta) return '—'

  const nombre = papeleta.cargoNombre || papeleta.cargo?.nombre || papeleta.nombre || 'Papeleta'
  const alcance = papeleta.alcance || ALCANCE_PAPELETA.GLOBAL

  if (alcance === ALCANCE_PAPELETA.GLOBAL) {
    return `${nombre} — Global`
  }

  if (alcance === ALCANCE_PAPELETA.FACULTAD) {
    const facultad = papeleta.facultadNombre || papeleta.codFacultad || 'Facultad'
    return `${nombre} — ${facultad}`
  }

  const carrera = papeleta.carreraNombre || papeleta.codCarrera || 'Carrera'
  return `${nombre} — ${carrera}`
}

/**
 * Ámbito territorial legible para la tabla de candidatos.
 * @param {object} papeleta
 * @returns {string}
 */
export function formatAmbito(papeleta) {
  if (!papeleta) return '—'

  const alcance = papeleta.alcance || ALCANCE_PAPELETA.GLOBAL

  if (alcance === ALCANCE_PAPELETA.GLOBAL) {
    return 'Global (UAGRM)'
  }

  if (alcance === ALCANCE_PAPELETA.FACULTAD) {
    return papeleta.facultadNombre || papeleta.codFacultad || '—'
  }

  return papeleta.carreraNombre || papeleta.codCarrera || '—'
}
