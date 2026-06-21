import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchCandidates,
  fetchElections,
  fetchFrentes,
  fetchPapeletasByEleccion,
} from '../../../services/electionsService'
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

  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingFrente, setIsCreatingFrente] = useState(false)
  const [isCreatingCandidate, setIsCreatingCandidate] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const selectedElectionLabel = useMemo(() => {
    const election = elections.find((item) => item.id === selectedElectionId)
    if (!election) return ''
    return `${election.titulo} (${election.gestion})`
  }, [elections, selectedElectionId])

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

        const defaultElection =
          electionsData.find((election) => election.estaActiva) || electionsData[0] || null

        if (defaultElection) {
          setSelectedElectionId(defaultElection.id)
          await loadElectionData(defaultElection.id)
        }
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
  }, [loadElectionData])

  const handleElectionChange = async (eleccionId) => {
    setSelectedElectionId(eleccionId)
    setErrorMessage('')
    setSuccessMessage('')

    if (!eleccionId) {
      setPapeletas([])
      setCoalitions([])
      setCandidates([])
      return
    }

    try {
      setIsLoading(true)
      await loadElectionData(eleccionId)
    } catch {
      setErrorMessage('No se pudo cargar la información del proceso electoral seleccionado.')
    } finally {
      setIsLoading(false)
    }
  }

  const isBusy = isLoading || isCreatingFrente || isCreatingCandidate

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-blue-900">Frentes y Candidatos</h2>
        <p className="mt-1 text-sm text-slate-700">
          Registra frentes estudiantiles y candidatos para armar la papeleta de un proceso electoral.
        </p>

        <div className="mt-4 max-w-xl">
          <label className="block">
            <span className="text-xs font-semibold text-slate-900">Proceso electoral</span>
            <select
              value={selectedElectionId}
              onChange={(e) => handleElectionChange(e.target.value)}
              disabled={isBusy || elections.length === 0}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">
                {elections.length === 0 ? 'No hay elecciones registradas' : 'Seleccione una elección'}
              </option>
              {elections.map((election) => (
                <option key={election.id} value={election.id}>
                  {election.titulo} ({election.gestion})
                  {election.estaActiva ? ' — Activa' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

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

      {!selectedElectionId ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-700">
          Seleccione un proceso electoral para gestionar frentes y candidatos.
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <CoalitionsSection
            eleccionId={selectedElectionId}
            eleccionLabel={selectedElectionLabel}
            coalitions={coalitions}
            setCoalitions={setCoalitions}
            isLoading={isLoading}
            isBusy={isBusy}
            isCreatingFrente={isCreatingFrente}
            setIsCreatingFrente={setIsCreatingFrente}
            setErrorMessage={setErrorMessage}
            setSuccessMessage={setSuccessMessage}
          />

          <CandidatesSection
            eleccionId={selectedElectionId}
            papeletas={papeletas}
            coalitions={coalitions}
            candidates={candidates}
            setCandidates={setCandidates}
            isLoading={isLoading}
            isBusy={isBusy}
            isCreatingCandidate={isCreatingCandidate}
            setIsCreatingCandidate={setIsCreatingCandidate}
            setErrorMessage={setErrorMessage}
            setSuccessMessage={setSuccessMessage}
          />
        </div>
      )}
    </div>
  )
}
