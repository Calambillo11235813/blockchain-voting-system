import {
  ALCANCE_PAPELETA,
  ALCANCE_LABELS,
  DEFAULT_CARGO_NAMES,
  ROLES_POR_ALCANCE,
} from '../../../utils/papeletaConstants'

/** @typedef {'GLOBAL' | 'FACULTAD' | 'CARRERA'} AlcancePapeleta */

/** @type {Record<AlcancePapeleta, number>} */
const ALCANCE_ORDER = {
  GLOBAL: 0,
  FACULTAD: 1,
  CARRERA: 2,
}

/**
 * Resuelve el alcance de una papeleta con fallback para datos legacy.
 * @param {object} cargo
 * @returns {AlcancePapeleta}
 */
export function resolveAlcance(cargo) {
  if (cargo?.alcance && ALCANCE_ORDER[cargo.alcance] !== undefined) {
    return cargo.alcance
  }

  const nombre = String(cargo?.cargoNombre || cargo?.nombre || '').toLowerCase()

  if (nombre.includes('rector')) return ALCANCE_PAPELETA.GLOBAL
  if (nombre.includes('decano')) return ALCANCE_PAPELETA.FACULTAD
  if (nombre.includes('director') || nombre.includes('carrera')) {
    return ALCANCE_PAPELETA.CARRERA
  }

  return ALCANCE_PAPELETA.GLOBAL
}

/**
 * Prioridad visual de una papeleta según alcance.
 * @param {AlcancePapeleta} alcance
 * @returns {number}
 */
export function getBallotPreviewOrder(alcance) {
  return ALCANCE_ORDER[alcance] ?? 99
}

/**
 * @param {object} cargo
 * @param {AlcancePapeleta} alcance
 * @returns {string}
 */
function getPreviewTitle(cargo, alcance) {
  return cargo?.cargoNombre || cargo?.nombre || DEFAULT_CARGO_NAMES[alcance] || 'Papeleta'
}

/**
 * @param {object} cargo
 * @param {AlcancePapeleta} alcance
 * @returns {string}
 */
function getPreviewSubtitle(cargo, alcance) {
  if (alcance === ALCANCE_PAPELETA.GLOBAL) {
    return 'Universidad (todos los estamentos)'
  }

  if (alcance === ALCANCE_PAPELETA.FACULTAD) {
    return cargo?.facultadNombre || cargo?.cargoFacultad || cargo?.codFacultad || 'Facultad'
  }

  const facultad = cargo?.facultadNombre || cargo?.cargoFacultad || ''
  const carrera = cargo?.carreraNombre || cargo?.codCarrera || ''

  if (facultad && carrera) return `${facultad} — ${carrera}`
  return carrera || facultad || 'Carrera'
}

/**
 * @param {object} a
 * @param {object} b
 * @returns {number}
 */
function compareBallotCargos(a, b) {
  const alcanceA = resolveAlcance(a)
  const alcanceB = resolveAlcance(b)
  const orderDiff = getBallotPreviewOrder(alcanceA) - getBallotPreviewOrder(alcanceB)

  if (orderDiff !== 0) return orderDiff

  const ordenDiff = (a?.orden ?? 0) - (b?.orden ?? 0)
  if (ordenDiff !== 0) return ordenDiff

  const facultadDiff = String(a?.facultadNombre || '').localeCompare(String(b?.facultadNombre || ''))
  if (facultadDiff !== 0) return facultadDiff

  return String(a?.carreraNombre || '').localeCompare(String(b?.carreraNombre || ''))
}

/**
 * Ordena candidatos de una fórmula según el orden de roles del alcance.
 * @param {object[]} candidates
 * @param {AlcancePapeleta} alcance
 * @returns {object[]}
 */
function sortCandidatesByRole(candidates, alcance) {
  const roleOrder = ROLES_POR_ALCANCE[alcance] || []

  return [...candidates].sort((a, b) => {
    const roleA = a.rolEspecifico || ''
    const roleB = b.rolEspecifico || ''
    const indexA = roleOrder.indexOf(roleA)
    const indexB = roleOrder.indexOf(roleB)

    if (indexA !== -1 && indexB !== -1 && indexA !== indexB) {
      return indexA - indexB
    }

    if (indexA !== -1 && indexB === -1) return -1
    if (indexA === -1 && indexB !== -1) return 1

    return String(a.apellidos || '').localeCompare(String(b.apellidos || ''))
  })
}

/**
 * Transforma la respuesta de papeleta completa en previews ordenados por alcance.
 * @param {object | null | undefined} ballot
 * @returns {object[]}
 */
export function buildBallotPreviews(ballot) {
  if (!ballot?.cargos?.length) return []

  return [...ballot.cargos].sort(compareBallotCargos).map((cargo, index) => {
    const type = resolveAlcance(cargo)
    const fronts = (cargo.frentes || []).map((frente) => ({
      id: frente.id,
      nombreFrente: frente.nombreFrente || 'Frente',
      sigla: frente.sigla || '',
      logoUrl: frente.logoUrl || '',
      candidates: sortCandidatesByRole(
        (frente.candidatos || []).map((candidate) => ({
          id: candidate.id,
          nombres: candidate.nombres || '',
          apellidos: candidate.apellidos || '',
          fullName: `${candidate.nombres || ''} ${candidate.apellidos || ''}`.trim(),
          fotoUrl: candidate.fotoUrl || '',
          rolEspecifico: candidate.rolEspecifico?.trim() || '',
        })),
        type,
      ),
    }))

    const hasFronts = fronts.length > 0
    const hasCandidates = fronts.some((front) => front.candidates.length > 0)

    return {
      id: cargo.id,
      index: index + 1,
      type,
      alcanceLabel: ALCANCE_LABELS[type] || type,
      title: getPreviewTitle(cargo, type),
      subtitle: getPreviewSubtitle(cargo, type),
      order: cargo.orden ?? index,
      fronts,
      hasFronts,
      hasCandidates,
    }
  })
}

/**
 * Mensajes informativos cuando faltan papeletas de ciertos alcances.
 * @param {object[]} previews
 * @returns {string[]}
 */
export function getMissingAlcanceHints(previews) {
  if (!previews.length) return []

  const present = new Set(previews.map((preview) => preview.type))
  const hints = []

  if (!present.has(ALCANCE_PAPELETA.GLOBAL)) {
    hints.push('Esta elección no incluye papeleta de Rectorado.')
  }

  if (!present.has(ALCANCE_PAPELETA.FACULTAD) && present.has(ALCANCE_PAPELETA.CARRERA)) {
    hints.push('Esta elección no incluye papeletas de Decanato por facultad.')
  }

  if (!present.has(ALCANCE_PAPELETA.CARRERA) && present.has(ALCANCE_PAPELETA.FACULTAD)) {
    hints.push('Esta elección no incluye papeletas de Dirección de Carrera.')
  }

  return hints
}

/**
 * Cuenta frentes y candidatos registrados en la papeleta completa.
 * @param {object | null | undefined} ballot
 * @returns {{ frentes: number, candidatos: number }}
 */
export function getBallotRegistrationStats(ballot) {
  if (!ballot?.cargos?.length) {
    return { frentes: 0, candidatos: 0 }
  }

  let frentes = 0
  let candidatos = 0

  for (const cargo of ballot.cargos) {
    for (const frente of cargo.frentes || []) {
      frentes += 1
      candidatos += (frente.candidatos || []).length
    }
  }

  return { frentes, candidatos }
}
