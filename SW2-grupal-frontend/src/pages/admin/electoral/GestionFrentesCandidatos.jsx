import { useEffect, useState } from 'react'
import {
  fetchCandidates,
  fetchCargos,
  fetchFrentes,
} from '../../../services/electionsService'
import CoalitionsSection from '../partiesCandidates/CoalitionsSection'
import CandidatesSection from '../partiesCandidates/CandidatesSection'

/**
 * Sección de Frentes y Candidatos.
 *
 * - Permite visualizar frentes y candidatos.
 * - Permite registrar nuevos frentes y candidatos.
 * - Consume la API de NestJS (módulo elecciones).
 *
 * @returns {import('react').JSX.Element}
 */
export default function GestionFrentesCandidatos() {
  const [positions, setPositions] = useState([])
  const [coalitions, setCoalitions] = useState([])
  const [candidates, setCandidates] = useState([])

  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingFrente, setIsCreatingFrente] = useState(false)
  const [isCreatingCandidate, setIsCreatingCandidate] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const [cargosData, frentesData, candidatesData] = await Promise.all([
          fetchCargos(),
          fetchFrentes(),
          fetchCandidates(),
        ])

        if (!isMounted) return

        setPositions(cargosData)
        setCoalitions(frentesData)
        setCandidates(candidatesData)
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

  const isBusy = isLoading || isCreatingFrente || isCreatingCandidate

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-blue-900">Frentes y Candidatos</h2>
        <p className="mt-1 text-sm text-slate-700">
          Registra frentes estudiantiles y candidatos para armar la papeleta.
        </p>

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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CoalitionsSection
          positions={positions}
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
          positions={positions}
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
    </div>
  )
}
