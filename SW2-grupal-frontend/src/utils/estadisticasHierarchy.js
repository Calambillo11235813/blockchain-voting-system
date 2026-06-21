/** @typedef {'GLOBAL' | 'FACULTAD' | 'CARRERA'} AlcancePapeleta */

export const ALCANCE_TAB = {
  GLOBAL: 'GLOBAL',
  FACULTAD: 'FACULTAD',
  CARRERA: 'CARRERA',
}

/** @type {Record<AlcancePapeleta, string>} */
export const ALCANCE_TAB_LABELS = {
  GLOBAL: 'Rectorado',
  FACULTAD: 'Facultad',
  CARRERA: 'Carrera',
}

/**
 * @param {object} papeleta
 * @returns {string}
 */
export function formatPapeletaStatsLabel(papeleta) {
  if (!papeleta) return 'Papeleta'

  const nombre = papeleta.cargoNombre || 'Papeleta'
  const { ambito, alcance } = papeleta

  if (alcance === 'GLOBAL') return nombre

  if (alcance === 'FACULTAD') {
    return `${nombre} — ${ambito?.facultadNombre || ambito?.codFacultad || 'Facultad'}`
  }

  const carrera = ambito?.carreraNombre || ambito?.codCarrera || 'Carrera'
  const facultad = ambito?.facultadNombre || ambito?.codFacultad || ''
  return facultad ? `${nombre} — ${facultad} / ${carrera}` : `${nombre} — ${carrera}`
}

/**
 * @param {object[]} papeletas
 * @returns {Record<AlcancePapeleta, object[]>}
 */
export function groupPapeletasByAlcance(papeletas) {
  return {
    GLOBAL: (papeletas || []).filter((p) => p.alcance === 'GLOBAL'),
    FACULTAD: (papeletas || []).filter((p) => p.alcance === 'FACULTAD'),
    CARRERA: (papeletas || []).filter((p) => p.alcance === 'CARRERA'),
  }
}

/**
 * @param {Record<AlcancePapeleta, object[]>} grouped
 * @returns {AlcancePapeleta}
 */
export function getDefaultScope(grouped) {
  if (grouped.GLOBAL?.length) return 'GLOBAL'
  if (grouped.FACULTAD?.length) return 'FACULTAD'
  if (grouped.CARRERA?.length) return 'CARRERA'
  return 'GLOBAL'
}

/**
 * @param {object} papeleta
 * @returns {object[]}
 */
export function buildParticipationChartData(papeleta) {
  if (!papeleta) return []

  return [
    {
      name: 'Resumen',
      Habilitados: papeleta.habilitados ?? 0,
      Emitidos: papeleta.votosEmitidos ?? 0,
      Pendientes: papeleta.pendientes ?? 0,
    },
  ]
}

/**
 * Normaliza métricas por estamento garantizando valores numéricos.
 * @param {object | null | undefined} porEstamento
 * @returns {{ estudiante: object, docente: object, administrativo: object }}
 */
export function normalizePorEstamento(porEstamento) {
  const empty = { habilitados: 0, votos: 0, porcentaje: 0 }

  return {
    estudiante: {
      ...empty,
      ...porEstamento?.estudiante,
      habilitados: porEstamento?.estudiante?.habilitados ?? 0,
      votos: porEstamento?.estudiante?.votos ?? 0,
      porcentaje: porEstamento?.estudiante?.porcentaje ?? 0,
    },
    docente: {
      ...empty,
      ...porEstamento?.docente,
      habilitados: porEstamento?.docente?.habilitados ?? 0,
      votos: porEstamento?.docente?.votos ?? 0,
      porcentaje: porEstamento?.docente?.porcentaje ?? 0,
    },
    administrativo: {
      ...empty,
      ...porEstamento?.administrativo,
      habilitados: porEstamento?.administrativo?.habilitados ?? 0,
      votos: porEstamento?.administrativo?.votos ?? 0,
      porcentaje: porEstamento?.administrativo?.porcentaje ?? 0,
    },
  }
}

/**
 * @param {object} papeleta
 * @param {{ includeEmptyEstamentos?: boolean }} [options]
 * @returns {object[]}
 */
export function buildEstamentoChartData(papeleta, options = {}) {
  if (!papeleta?.porEstamento) return []

  const { estudiante, docente, administrativo } = normalizePorEstamento(papeleta.porEstamento)
  const isCarreraScope = papeleta.alcance === ALCANCE_TAB.CARRERA

  const rows = [
    {
      name: 'Estudiantil',
      Habilitados: estudiante.habilitados,
      Emitidos: estudiante.votos,
    },
    {
      name: 'Docente',
      Habilitados: docente.habilitados,
      Emitidos: docente.votos,
    },
    {
      name: 'Administrativo',
      Habilitados: administrativo.habilitados,
      Emitidos: administrativo.votos,
    },
  ]

  if (options.includeEmptyEstamentos || isCarreraScope) {
    return rows.filter((row) => row.name === 'Estudiantil' || row.name === 'Docente')
  }

  return rows.filter((row) => row.Habilitados > 0 || row.Emitidos > 0)
}

/**
 * Métricas de estamento para tarjetas en vista de Carrera.
 * @param {object} papeleta
 * @returns {{ key: string, label: string, habilitados: number, votos: number, porcentaje: number }[]}
 */
export function getCarreraEstamentoCards(papeleta) {
  const { estudiante, docente } = normalizePorEstamento(papeleta?.porEstamento)

  return [
    {
      key: 'estudiante',
      label: 'Votos Estudiantes',
      habilitados: estudiante.habilitados,
      votos: estudiante.votos,
      porcentaje: estudiante.porcentaje,
    },
    {
      key: 'docente',
      label: 'Votos Docentes',
      habilitados: docente.habilitados,
      votos: docente.votos,
      porcentaje: docente.porcentaje,
    },
  ]
}

/**
 * @param {object | null} stats
 * @returns {boolean}
 */
export function isPreVotingSealedState(stats) {
  return (
    stats?.estado === 'SELLADA' &&
    (stats?.resumenGeneral?.totalSufragiosEmitidos ?? 0) === 0
  )
}
