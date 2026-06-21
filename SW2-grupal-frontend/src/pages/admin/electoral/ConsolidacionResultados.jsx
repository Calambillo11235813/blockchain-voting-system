import { useEffect, useMemo, useState } from 'react'
import { fetchElections } from '../../../services/electionsService'
import { getReporteConsolidacion, descargarActaPDF } from '../../../services/estadisticasService'
import { formatEstadoEleccion, isEleccionFinalizada } from '../../../utils/electionConstants'
import {
  ALCANCE_TAB,
  ALCANCE_TAB_LABELS,
  canGenerateConsolidacion,
  formatPapeletaConsolidacionLabel,
  getConsolidacionBlockReason,
  getDefaultScope,
  groupResultadosPorAlcance,
} from '../../../utils/consolidacionHierarchy'
import ConsolidacionEmptyState from './components/consolidacion/ConsolidacionEmptyState'
import ConsolidacionSummaryCards from './components/consolidacion/ConsolidacionSummaryCards'
import ConsolidacionFrenteCard from './components/consolidacion/ConsolidacionFrenteCard'

const TAB_ORDER = [ALCANCE_TAB.GLOBAL, ALCANCE_TAB.FACULTAD, ALCANCE_TAB.CARRERA]

export default function ConsolidacionResultados() {
  const [elections, setElections] = useState([])
  const [selectedElectionId, setSelectedElectionId] = useState('')
  const [reporte, setReporte] = useState(null)

  const [activeScope, setActiveScope] = useState(ALCANCE_TAB.GLOBAL)
  const [selectedPapeletaId, setSelectedPapeletaId] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadElections() {
      try {
        const data = await fetchElections()
        if (!isMounted) return
        setElections(data)
        if (data.length > 0) setSelectedElectionId(data[0].id)
      } catch {
        if (!isMounted) return
        setErrorMsg('No se pudieron cargar las elecciones.')
      } finally {
        if (!isMounted) return
        setIsLoading(false)
      }
    }

    loadElections()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    setReporte(null)
    setErrorMsg('')
  }, [selectedElectionId])

  const selectedElection = useMemo(
    () => elections.find((e) => e.id === selectedElectionId) ?? null,
    [elections, selectedElectionId],
  )

  const blockReason = getConsolidacionBlockReason(selectedElection)
  const canGenerate = canGenerateConsolidacion(selectedElection)

  const papeletas = reporte?.reporte?.resultadosPorPapeleta ?? []
  const groupedPapeletas = useMemo(() => groupResultadosPorAlcance(papeletas), [papeletas])
  const availableTabs = TAB_ORDER.filter((scope) => groupedPapeletas[scope]?.length > 0)

  useEffect(() => {
    if (!reporte) return
    const defaultScope = getDefaultScope(groupedPapeletas)
    setActiveScope((prev) => (groupedPapeletas[prev]?.length ? prev : defaultScope))
  }, [reporte, groupedPapeletas])

  const papeletasInScope = groupedPapeletas[activeScope] ?? []

  useEffect(() => {
    if (!papeletasInScope.length) {
      setSelectedPapeletaId('')
      return
    }
    setSelectedPapeletaId((prev) => {
      if (prev && papeletasInScope.some((p) => p.eleccionCargoId === prev)) return prev
      return papeletasInScope[0].eleccionCargoId
    })
  }, [activeScope, papeletasInScope])

  const selectedPapeleta = useMemo(
    () => papeletasInScope.find((p) => p.eleccionCargoId === selectedPapeletaId) ?? null,
    [papeletasInScope, selectedPapeletaId],
  )

  async function handleGenerateReport() {
    if (!selectedElectionId || !canGenerate) return
    setErrorMsg('')
    setReporte(null)
    try {
      setIsGenerating(true)
      const data = await getReporteConsolidacion(selectedElectionId)
      setReporte(data)
    } catch (error) {
      setErrorMsg(
        error?.response?.data?.message || 'Error al generar el acta de consolidación.',
      )
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleDownloadPDF() {
    if (!selectedElectionId || !canGenerate) return
    setErrorMsg('')
    try {
      setIsDownloading(true)
      await descargarActaPDF(selectedElectionId)
    } catch (error) {
      setErrorMsg(error?.response?.data?.message || 'Error al descargar el acta en PDF.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-blue-900">Consolidación de Resultados</h1>
        <p className="mt-1 text-sm text-slate-600">
          Acta oficial de escrutinio con ponderación paritaria 50% docentes / 50% estudiantes.
        </p>
      </header>

      {errorMsg ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      {isLoading ? (
        <div className="text-sm text-slate-500">Cargando elecciones…</div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-800">
                  Seleccionar elección
                </label>
                <select
                  value={selectedElectionId}
                  onChange={(e) => setSelectedElectionId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
                >
                  {elections.map((elec) => (
                    <option key={elec.id} value={elec.id}>
                      {elec.titulo} ({elec.gestion})
                    </option>
                  ))}
                </select>
              </div>

              {selectedElection ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  Estado:{' '}
                  <span className="font-semibold">
                    {formatEstadoEleccion(selectedElection.estado)}
                    {selectedElection.estaActiva ? ' (jornada abierta)' : ''}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={!canGenerate || isGenerating}
                className="rounded-lg bg-yellow-400 px-6 py-2 text-sm font-semibold text-blue-900 hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? 'Calculando…' : 'Generar Acta de Consolidación Final'}
              </button>
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={!canGenerate || isDownloading}
                className="rounded-lg border border-blue-900 bg-white px-6 py-2 text-sm font-semibold text-blue-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDownloading ? 'Descargando…' : 'Descargar Acta (PDF)'}
              </button>
            </div>
          </div>

          {blockReason && !reporte ? (
            <ConsolidacionEmptyState reason={blockReason} variant="block" />
          ) : null}

          {reporte?.reporte?.fuenteVotos === 'simulado' ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Datos simulados: no se pudo conectar con la blockchain. Verifique la red antes de
              emitir el acta oficial.
            </div>
          ) : null}

          {reporte ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                <h2 className="text-lg font-bold uppercase tracking-wide text-blue-900">
                  Acta de Consolidación Paritaria
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Emitida el: {new Date(reporte.fechaGeneracion).toLocaleString('es-BO')}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Participación global: {reporte.reporte.participacionPorcentaje}% · Sufragios:{' '}
                  {reporte.reporte.totalSufragiosEmitidos}
                </p>
              </div>

              {reporte.reporte.totalSufragiosEmitidos === 0 ? (
                <ConsolidacionEmptyState
                  reason="No hay sufragios registrados para consolidar en esta elección."
                  variant="empty"
                />
              ) : availableTabs.length === 0 ? (
                <ConsolidacionEmptyState
                  reason="Esta elección no tiene papeletas configuradas para consolidar."
                  variant="empty"
                />
              ) : (
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {availableTabs.map((scope) => (
                        <button
                          key={scope}
                          type="button"
                          onClick={() => setActiveScope(scope)}
                          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                            activeScope === scope
                              ? 'bg-blue-900 text-white'
                              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {ALCANCE_TAB_LABELS[scope]}
                          <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">
                            {groupedPapeletas[scope]?.length ?? 0}
                          </span>
                        </button>
                      ))}
                    </div>

                    {papeletasInScope.length > 1 ? (
                      <div className="w-full lg:max-w-md">
                        <label className="block text-xs font-semibold text-slate-900">
                          Papeleta en {ALCANCE_TAB_LABELS[activeScope]}
                        </label>
                        <select
                          value={selectedPapeletaId}
                          onChange={(e) => setSelectedPapeletaId(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                          {papeletasInScope.map((papeleta) => (
                            <option key={papeleta.eleccionCargoId} value={papeleta.eleccionCargoId}>
                              {formatPapeletaConsolidacionLabel(papeleta)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>

                  {selectedPapeleta ? (
                    <div className="mt-5 space-y-5">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatPapeletaConsolidacionLabel(selectedPapeleta)}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          Alcance: {selectedPapeleta.alcance}
                          {isEleccionFinalizada(selectedElection?.estado, selectedElection?.estaActiva)
                            ? ' · Elección finalizada'
                            : ''}
                        </p>
                      </div>

                      <ConsolidacionSummaryCards papeleta={selectedPapeleta} />

                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-blue-900">
                          Resultados por frente político
                        </h3>
                        {(selectedPapeleta.resultadosPorFrente ?? []).map((frente, index) => (
                          <ConsolidacionFrenteCard
                            key={`${selectedPapeleta.eleccionCargoId}-${frente.frenteId}`}
                            frente={frente}
                            index={index}
                            isLeader={index === 0}
                            papeleta={selectedPapeleta}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              )}

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center font-mono text-xs text-slate-600">
                Hash de integridad: {reporte.firmaSimulada}
              </div>
            </div>
          ) : canGenerate && !blockReason ? (
            <ConsolidacionEmptyState
              reason="Presione «Generar Acta de Consolidación Final» para calcular y visualizar los resultados oficiales."
              variant="empty"
            />
          ) : null}
        </>
      )}
    </div>
  )
}
