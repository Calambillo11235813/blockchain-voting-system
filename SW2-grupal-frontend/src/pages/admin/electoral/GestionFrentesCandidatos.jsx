import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchCandidates,
  fetchElections,
  fetchFrentes,
  fetchPapeletasByEleccion,
} from '../../../services/electionsService'
import {
  ESTADO_ELECCION,
  formatEstadoEleccion,
  getEstadoEleccionBadgeClass,
  isElectionSealed,
} from '../../../utils/electionConstants'
import CoalitionsSection from '../partiesCandidates/CoalitionsSection'
import CandidatesSection from '../partiesCandidates/CandidatesSection'

/**
 * Sección de Frentes y Candidatos.
 *
 * - Permite visualizar frentes y candidatos por proceso electoral.
 * - Permite registrar nuevos frentes y candidatos.
 * - Consume la API de NestJS (módulo elecciones).
 *
 * @returns {import('react').JSX.Element}
 */
export default function GestionFrentesCandidatos() {
  const [elections, setElections] = useState([])
  const [selectedElectionId, setSelectedElectionId] = useState('')
  const [papeletas, setPapeletas] = useState([])
  const [coalitions, setCoalitions] = useState([])
  const [candidates, setCandidates] = useState([])

  const [activeView, setActiveView] = useState('elecciones')
  const [detailTab, setDetailTab] = useState('frentes')

  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingFrente, setIsCreatingFrente] = useState(false)
  const [isCreatingCandidate, setIsCreatingCandidate] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [warningMessage, setWarningMessage] = useState('')

  const selectedElection = useMemo(
    () => elections.find((item) => item.id === selectedElectionId) ?? null,
    [elections, selectedElectionId],
  )

  const selectedElectionLabel = useMemo(() => {
    if (!selectedElection) return ''
    return `${selectedElection.titulo} (${selectedElection.gestion})`
  }, [selectedElection])

  const electionEstado = selectedElection?.estado || ESTADO_ELECCION.EN_CONFIGURACION
  const isElectionReadOnly = isElectionSealed(electionEstado)

  useEffect(() => {
    if (!selectedElectionId) return
    const updated = elections.find((election) => election.id === selectedElectionId)
    if (!updated && activeView === 'detalles') {
      setSelectedElectionId('')
      setActiveView('elecciones')
      setPapeletas([])
      setCoalitions([])
      setCandidates([])
    }
  }, [elections, selectedElectionId, activeView])

  const loadElectionData = useCallback(async (eleccionId) => {
    if (!eleccionId) {
      setPapeletas([])
      setCoalitions([])
      setCandidates([])
      return
    }

    const [papeletasData, frentesData, candidatesData] = await Promise.all([
      fetchPapeletasByEleccion(eleccionId),
      fetchFrentes(eleccionId),
      fetchCandidates(eleccionId),
    ])

    setPapeletas(papeletasData)
    setCoalitions(frentesData)
    setCandidates(candidatesData)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const electionsData = await fetchElections()
        if (!isMounted) return

        setElections(electionsData)
      } catch {
        if (!isMounted) return
        setErrorMessage('Hubo un problema al cargar la información. Inténtelo más tarde.')
      } finally {
        if (!isMounted) return
        setIsLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [])

  const handleOpenDetalles = async (election) => {
    setSelectedElectionId(election.id)
    setErrorMessage('')
    setSuccessMessage('')
    setWarningMessage('')
    setDetailTab('frentes')
    setActiveView('detalles')

    try {
      setIsLoading(true)
      await loadElectionData(election.id)
    } catch {
      setErrorMessage('No se pudo cargar la información del proceso electoral seleccionado.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToElecciones = () => {
    setErrorMessage('')
    setSuccessMessage('')
    setWarningMessage('')
    setActiveView('elecciones')
  }

  const isBusy = isLoading || isCreatingFrente || isCreatingCandidate

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-blue-900">Frentes y Candidatos</h2>
            <p className="mt-1 text-sm text-slate-700">
              {activeView === 'elecciones'
                ? 'Seleccione un proceso electoral para gestionar sus frentes y candidatos.'
                : selectedElection
                  ? `Gestión de ${selectedElection.titulo} (${selectedElection.gestion})`
                  : 'Registra frentes estudiantiles y candidatos para armar la papeleta de un proceso electoral.'}
            </p>
          </div>

          {activeView === 'detalles' ? (
            <button
              type="button"
              onClick={handleBackToElecciones}
              disabled={isBusy}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-blue-900 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span aria-hidden="true">←</span>
              Volver a Elecciones
            </button>
          ) : null}
        </div>

        <nav
          className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200"
          aria-label="Vistas de frentes y candidatos"
        >
          <ViewTab active={activeView === 'elecciones'} onClick={handleBackToElecciones} disabled={isBusy}>
            Elecciones
          </ViewTab>
          <ViewTab
            active={activeView === 'detalles'}
            onClick={() => selectedElectionId && setActiveView('detalles')}
            disabled={isBusy || !selectedElectionId}
          >
            Frentes y Candidatos
            {selectedElection ? (
              <span className="ml-1 hidden font-normal text-slate-500 sm:inline">
                · {selectedElection.titulo}
              </span>
            ) : null}
          </ViewTab>
        </nav>

        {activeView === 'detalles' && selectedElection ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getEstadoEleccionBadgeClass(electionEstado)}`}
            >
              {formatEstadoEleccion(electionEstado)}
            </span>
            {isElectionReadOnly ? (
              <p className="text-xs font-medium text-amber-800">
                🔒 Elección sellada o activa: frentes y candidatos en solo lectura.
              </p>
            ) : (
              <p className="text-xs text-slate-600">Puede crear, editar y eliminar frentes y candidatos.</p>
            )}
          </div>
        ) : null}

        {warningMessage ? (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 shadow-sm">
            {warningMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-blue-900">
            {successMessage}
          </div>
        ) : null}
      </section>

      {activeView === 'elecciones' ? (
        <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-blue-900">Procesos electorales</h3>
            <p className="mt-1 text-sm text-slate-700">
              Elija una elección para administrar sus frentes y candidatos.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Título</Th>
                  <Th>Gestión</Th>
                  <Th>Fecha</Th>
                  <Th>Estado</Th>
                  <Th>Acciones</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-3 text-sm text-slate-700" colSpan={5}>
                      Cargando elecciones…
                    </td>
                  </tr>
                ) : elections.length === 0 ? (
                  <tr>
                    <td className="px-4 py-3 text-sm text-slate-700" colSpan={5}>
                      No hay elecciones registradas.
                    </td>
                  </tr>
                ) : (
                  elections.map((election) => {
                    const estado = election.estado || ESTADO_ELECCION.EN_CONFIGURACION

                    return (
                      <tr key={election.id}>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{election.titulo}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{election.gestion}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{formatElectionDate(election.fecha)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getEstadoEleccionBadgeClass(estado)}`}
                          >
                            {formatEstadoEleccion(estado)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleOpenDetalles(election)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                              />
                            </svg>
                            Gestionar Frentes/Candidatos
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : !selectedElectionId ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-700">
          <p className="font-semibold text-slate-900">No hay elección seleccionada</p>
          <p className="mt-1">
            Vuelva a la vista de elecciones y elija &quot;Gestionar Frentes/Candidatos&quot; en la fila deseada.
          </p>
          <button
            type="button"
            onClick={handleBackToElecciones}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-slate-50"
          >
            ← Volver a Elecciones
          </button>
        </section>
      ) : (
        <section className="w-full space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-blue-900">{selectedElectionLabel}</h3>
                <p className="mt-1 text-sm text-slate-700">
                  Administre frentes y candidatos del proceso electoral seleccionado.
                </p>
              </div>
            </div>

            <nav
              className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200"
              aria-label="Secciones de frentes y candidatos"
            >
              <ViewTab
                active={detailTab === 'frentes'}
                onClick={() => setDetailTab('frentes')}
                disabled={isBusy}
              >
                Frentes / Agrupaciones
              </ViewTab>
              <ViewTab
                active={detailTab === 'candidatos'}
                onClick={() => setDetailTab('candidatos')}
                disabled={isBusy}
              >
                Candidatos
              </ViewTab>
            </nav>
          </div>

          {detailTab === 'frentes' ? (
            <CoalitionsSection
              eleccionId={selectedElectionId}
              eleccionLabel={selectedElectionLabel}
              coalitions={coalitions}
              setCoalitions={setCoalitions}
              isLoading={isLoading}
              isBusy={isBusy}
              isElectionReadOnly={isElectionReadOnly}
              isCreatingFrente={isCreatingFrente}
              setIsCreatingFrente={setIsCreatingFrente}
              setErrorMessage={setErrorMessage}
              setSuccessMessage={setSuccessMessage}
              setWarningMessage={setWarningMessage}
            />
          ) : (
            <CandidatesSection
              eleccionId={selectedElectionId}
              papeletas={papeletas}
              coalitions={coalitions}
              candidates={candidates}
              setCandidates={setCandidates}
              isLoading={isLoading}
              isBusy={isBusy}
              isElectionReadOnly={isElectionReadOnly}
              isCreatingCandidate={isCreatingCandidate}
              setIsCreatingCandidate={setIsCreatingCandidate}
              setErrorMessage={setErrorMessage}
              setSuccessMessage={setSuccessMessage}
              setWarningMessage={setWarningMessage}
            />
          )}
        </section>
      )}
    </div>
  )
}

/**
 * Pestaña de navegación entre vistas.
 * @param {{ active: boolean, disabled?: boolean, onClick: () => void, children: import('react').ReactNode }} props
 * @returns {import('react').JSX.Element}
 */
function ViewTab({ active, disabled = false, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        active
          ? '-mb-px border-b-2 border-blue-900 px-4 py-2.5 text-sm font-semibold text-blue-900'
          : 'border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:border-transparent'
      }
    >
      {children}
    </button>
  )
}

/**
 * Celda de encabezado de tabla.
 * @param {{ children: import('react').ReactNode }} props
 * @returns {import('react').JSX.Element}
 */
function Th({ children }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
      {children}
    </th>
  )
}

/**
 * Formatea la fecha de elección para tabla.
 * @param {string} value
 * @returns {string}
 */
function formatElectionDate(value) {
  if (!value) return '—'

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, yyyy, mm, dd] = match
    return `${dd}/${mm}/${yyyy}`
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
