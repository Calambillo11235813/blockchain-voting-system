import {
  ALCANCE_TAB,
  ALCANCE_TAB_LABELS,
  formatPapeletaStatsLabel,
  getDefaultScope,
  groupPapeletasByAlcance,
} from './estadisticasHierarchy'

export { ALCANCE_TAB, ALCANCE_TAB_LABELS, formatPapeletaStatsLabel, getDefaultScope }

/**
 * Agrupa resultados de escrutinio por alcance.
 * @param {object[]} papeletas
 * @returns {Record<string, object[]>}
 */
export function groupResultadosPorAlcance(papeletas) {
  return groupPapeletasByAlcance(papeletas || [])
}

/**
 * Determina veredicto de una papeleta (usa backend si disponible, fallback local).
 * @param {object} papeleta
 * @returns {{ tipo: string, label: string }}
 */
export function getVeredictoPapeleta(papeleta) {
  if (papeleta?.veredicto && papeleta?.veredictoLabel) {
    return { tipo: papeleta.veredicto, label: papeleta.veredictoLabel }
  }
  return determinarVeredicto(papeleta?.resultadosPorFrente ?? [])
}

/**
 * @param {object[]} frentesOrdenados
 * @returns {{ tipo: string, label: string }}
 */
export function determinarVeredicto(frentesOrdenados) {
  if (!frentesOrdenados?.length || frentesOrdenados[0].votosBlockchain === 0) {
    return { tipo: 'SIN_DATOS', label: 'Sin votos registrados' }
  }

  const lider = frentesOrdenados[0]
  const segundo = frentesOrdenados[1]
  const empate =
    segundo &&
    segundo.resultadoPonderado === lider.resultadoPonderado &&
    segundo.votosBlockchain > 0

  if (empate) return { tipo: 'SEGUNDA_VUELTA', label: 'Segunda Vuelta' }
  if (lider.resultadoPonderado > 50) return { tipo: 'GANADOR', label: 'Ganador' }
  return { tipo: 'SEGUNDA_VUELTA', label: 'Segunda Vuelta' }
}

/**
 * @param {object | null} election
 * @returns {boolean}
 */
export function canGenerateConsolidacion(election) {
  if (!election) return false
  if (election.estaActiva) return false

  const estado = election.estado
  return (
    estado === 'FINALIZADA' ||
    (estado === 'ACTIVA' && !election.estaActiva)
  )
}

/**
 * @param {object | null} election
 * @returns {string}
 */
export function getConsolidacionBlockReason(election) {
  if (!election) return 'Seleccione una elección.'
  if (election.estaActiva) {
    return 'La jornada electoral aún está abierta. Cierre la jornada para consolidar resultados.'
  }
  if (election.estado === 'EN_CONFIGURACION' || election.estado === 'SELLADA') {
    return 'La jornada electoral aún no ha finalizado.'
  }
  if (!canGenerateConsolidacion(election)) {
    return 'La elección debe estar finalizada para generar el acta de consolidación.'
  }
  return ''
}

/**
 * Calcula proporciones docente/estudiante para desglose visual.
 * @param {object} papeleta
 * @returns {{ propDocentes: number, propEstudiantes: number }}
 */
export function getProporcionesEstamento(papeleta) {
  const total = papeleta?.totalSufragiosEmitidos ?? 0
  if (total <= 0) return { propDocentes: 0.5, propEstudiantes: 0.5 }

  return {
    propDocentes: (papeleta.totalSufragiosDocentes ?? 0) / total,
    propEstudiantes: (papeleta.totalSufragiosEstudiantes ?? 0) / total,
  }
}

/**
 * Etiqueta de papeleta para escrutinio (incluye campos de backend).
 * @param {object} papeleta
 * @returns {string}
 */
export function formatPapeletaConsolidacionLabel(papeleta) {
  if (!papeleta) return 'Papeleta'

  return formatPapeletaStatsLabel({
    cargoNombre: papeleta.cargoNombre,
    alcance: papeleta.alcance,
    ambito: {
      codFacultad: papeleta.codFacultad,
      facultadNombre: papeleta.facultadNombre,
      codCarrera: papeleta.codCarrera,
      carreraNombre: papeleta.carreraNombre,
    },
  })
}
