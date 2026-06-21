import { useEffect, useMemo, useState } from 'react'
import { fetchElections } from '../../../services/electionsService'
import { getEstadisticasJerarquicas } from '../../../services/estadisticasService'
import { formatEstadoEleccion } from '../../../utils/electionConstants'
import {
  ALCANCE_TAB,
  ALCANCE_TAB_LABELS,
  formatPapeletaStatsLabel,
  getDefaultScope,
  groupPapeletasByAlcance,
  isPreVotingSealedState,
} from '../../../utils/estadisticasHierarchy'
import BallotParticipationPanel from './components/estadisticas/BallotParticipationPanel'
import StatsSummaryCards from './components/estadisticas/StatsSummaryCards'

const TAB_ORDER = [ALCANCE_TAB.GLOBAL, ALCANCE_TAB.FACULTAD, ALCANCE_TAB.CARRERA]

export default function EstadisticasEnVivo() {
  const [elections, setElections] = useState([])
  const [selectedElectionId, setSelectedElectionId] = useState('')
  const [stats, setStats] = useState(null)

  const [activeScope, setActiveScope] = useState(ALCANCE_TAB.GLOBAL)
  const [selectedPapeletaId, setSelectedPapeletaId] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadElections() {
      try {
        const data = await fetchElections()
        if (!isMounted) return
        setElections(data)
        if (data.length > 0) {
          setSelectedElectionId(data[0].id)
        }
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
    if (!selectedElectionId) return

    let isMounted = true
    let pollingTimer = null

    async function fetchData() {
      try {
        setIsRefreshing(true)
        setErrorMsg('')
        const data = await getEstadisticasJerarquicas(selectedElectionId)
        if (!isMounted) return
        setStats(data)
      } catch {
        if (!isMounted) return
        setErrorMsg('Error al obtener los datos en vivo.')
        setStats(null)
      } finally {
        if (!isMounted) return
        setIsRefreshing(false)
      }
    }

    fetchData()
    pollingTimer = setInterval(fetchData, 10000)

    return () => {
      isMounted = false
      if (pollingTimer) clearInterval(pollingTimer)
    }
  }, [selectedElectionId])

  const groupedPapeletas = useMemo(
    () => groupPapeletasByAlcance(stats?.papeletas ?? []),
    [stats?.papeletas],
  )

  const availableTabs = useMemo(
    () => TAB_ORDER.filter((scope) => groupedPapeletas[scope]?.length > 0),
    [groupedPapeletas],
  )

  useEffect(() => {
    if (!stats) return

    const defaultScope = getDefaultScope(groupedPapeletas)
    setActiveScope((prev) =>
      groupedPapeletas[prev]?.length ? prev : defaultScope,
    )
  }, [stats, groupedPapeletas])

  const papeletasInScope = groupedPapeletas[activeScope] ?? []

  useEffect(() => {
    if (!papeletasInScope.length) {
      setSelectedPapeletaId('')
      return
    }

    setSelectedPapeletaId((prev) => {
      if (prev && papeletasInScope.some((p) => p.eleccionCargoId === prev)) {
        return prev
      }
      return papeletasInScope[0].eleccionCargoId
    })
  }, [activeScope, papeletasInScope])

  const selectedPapeleta = useMemo(
    () => papeletasInScope.find((p) => p.eleccionCargoId === selectedPapeletaId) ?? null,
    [papeletasInScope, selectedPapeletaId],
  )

  const showPreVotingNotice = isPreVotingSealedState(stats)
  const selectedElection = elections.find((e) => e.id === selectedElectionId)

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Dashboard en Vivo</h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitoreo en tiempo real de la participación por papeleta y alcance.
          </p>
        </div>

        {stats?.ultimaActualizacion ? (
          <p className="text-xs text-slate-500">
            Última actualización:{' '}
            {new Date(stats.ultimaActualizacion).toLocaleTimeString('es-BO')}
            {isRefreshing ? ' · Actualizando…' : ''}
          </p>
        ) : null}
      </header>

      {errorMsg ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      {isLoading ? (
        <div className="text-sm text-slate-500">Cargando dashboard…</div>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-full sm:max-w-md">
              <label className="block text-sm font-medium text-slate-800">Seleccionar elección</label>
              <select
                value={selectedElectionId}
                onChange={(e) => setSelectedElectionId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
              >
                {elections.map((elec) => (
                  <option key={elec.id} value={elec.id}>
                    {elec.titulo} ({elec.gestion})
                  </option>
                ))}
              </select>
            </div>

            {stats ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                Estado:{' '}
                <span className="font-semibold">
                  {formatEstadoEleccion(stats.estado || selectedElection?.estado)}
                </span>
              </div>
            ) : null}
          </div>

          {stats ? (
            <>
              <StatsSummaryCards
                resumen={stats.resumenGeneral}
                papeletasCount={stats.papeletas?.length ?? 0}
              />

              {availableTabs.length ? (
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
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        >
                          {papeletasInScope.map((papeleta) => (
                            <option key={papeleta.eleccionCargoId} value={papeleta.eleccionCargoId}>
                              {formatPapeletaStatsLabel(papeleta)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5">
                    <BallotParticipationPanel
                      papeleta={selectedPapeleta}
                      showPreVotingNotice={showPreVotingNotice}
                    />
                  </div>
                </section>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-700">
                  Esta elección aún no tiene papeletas configuradas para monitorear.
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
              Seleccione una elección para ver las estadísticas en vivo.
            </div>
          )}
        </>
      )}
    </div>
  )
}
