import { useEffect, useMemo, useState } from 'react'
import {
  fetchBallotComplete,
  fetchElections,
  sealElection,
} from '../../../services/electionsService'
import {
  ESTADO_ELECCION,
  formatEstadoEleccion,
  isElectionSealed,
} from '../../../utils/electionConstants'
import {
  buildBallotPreviews,
  getBallotRegistrationStats,
  getMissingAlcanceHints,
} from './ballotPreviewUtils'
import BallotPreview from './components/BallotPreview'
import BallotEmptyState from './components/BallotEmptyState'
import SealElectionModal from './components/SealElectionModal'

/**
 * Sección de Configuración de Papeleta.
 *
 * Previsualiza las papeletas separadas por alcance (Rectorado, Decanato, Carrera)
 * simulando la experiencia real del votante.
 *
 * @returns {import('react').JSX.Element}
 */
export default function ConfiguracionPapeleta() {
  const [elections, setElections] = useState([])
  const [selectedElectionId, setSelectedElectionId] = useState('')
  const [ballot, setBallot] = useState(null)

  const [isLoadingElections, setIsLoadingElections] = useState(true)
  const [isLoadingBallot, setIsLoadingBallot] = useState(false)
  const [isSealing, setIsSealing] = useState(false)
  const [showSealModal, setShowSealModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const selectedElection = useMemo(
    () => elections.find((election) => election.id === selectedElectionId) ?? null,
    [elections, selectedElectionId],
  )

  const selectedElectionLabel = useMemo(() => {
    if (!selectedElection) return ''
    return `${selectedElection.titulo} (${selectedElection.gestion})`
  }, [selectedElection])

  const electionEstado = useMemo(() => {
    return ballot?.estado || selectedElection?.estado || ESTADO_ELECCION.EN_CONFIGURACION
  }, [ballot?.estado, selectedElection?.estado])

  const registrationStats = useMemo(() => getBallotRegistrationStats(ballot), [ballot])
  const ballotPreviews = useMemo(() => buildBallotPreviews(ballot), [ballot])
  const missingAlcanceHints = useMemo(() => getMissingAlcanceHints(ballotPreviews), [ballotPreviews])

  const electionIsSealed = isElectionSealed(electionEstado)
  const canSealElection =
    electionEstado === ESTADO_ELECCION.EN_CONFIGURACION &&
    !isLoadingElections &&
    !isLoadingBallot &&
    !isSealing &&
    Boolean(selectedElectionId) &&
    (registrationStats.frentes > 0 || registrationStats.candidatos > 0)

  useEffect(() => {
    let isMounted = true

    async function loadElections() {
      try {
        setIsLoadingElections(true)
        setErrorMessage('')
        const data = await fetchElections()

        if (!isMounted) return
        setElections(data)

        if (data.length > 0) {
          setSelectedElectionId((prev) => prev || data[0].id)
        }
      } catch {
        if (!isMounted) return
        setErrorMessage('Hubo un problema al cargar las elecciones. Inténtelo más tarde.')
      } finally {
        if (!isMounted) return
        setIsLoadingElections(false)
      }
    }

    loadElections()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadBallot() {
      if (!selectedElectionId) return
      try {
        setIsLoadingBallot(true)
        setErrorMessage('')
        const data = await fetchBallotComplete(selectedElectionId)

        if (!isMounted) return
        setBallot(data)
      } catch {
        if (!isMounted) return
        setBallot(null)
        setErrorMessage(
          'No se pudo cargar la papeleta. Verifique que existan cargos, frentes y candidatos registrados.',
        )
      } finally {
        if (!isMounted) return
        setIsLoadingBallot(false)
      }
    }

    loadBallot()
    return () => {
      isMounted = false
    }
  }, [selectedElectionId])

  const handleConfirmSeal = async () => {
    if (!selectedElectionId) return

    setErrorMessage('')
    setSuccessMessage('')

    try {
      setIsSealing(true)
      const updatedElection = await sealElection(selectedElectionId)

      setElections((prev) =>
        prev.map((election) =>
          election.id === updatedElection.id ? { ...election, ...updatedElection } : election,
        ),
      )
      setBallot((prev) => (prev ? { ...prev, estado: updatedElection.estado } : prev))
      setSuccessMessage(
        'Elección sellada correctamente. Las listas quedaron bloqueadas y lista para blockchain.',
      )
      setShowSealModal(false)
    } catch (error) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0] ||
        'No se pudo sellar la elección. Inténtelo más tarde.'
      setErrorMessage(apiMessage)
    } finally {
      setIsSealing(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-blue-900">Configuración de Papeleta</h2>
            <p className="mt-1 text-sm text-slate-700">
              Previsualiza cómo verá el estudiante las papeletas separadas por alcance.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            {electionIsSealed ? (
              <span className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900">
                <span aria-hidden="true">🔒</span>
                Elección Sellada
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowSealModal(true)}
                disabled={!canSealElection}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              >
                Aprobar y Sellar Elección
              </button>
            )}

            {!electionIsSealed && !canSealElection && selectedElectionId && !isLoadingBallot ? (
              <p className="max-w-xs text-right text-xs text-slate-600">
                Registre al menos un frente o candidato para habilitar el sellado.
              </p>
            ) : null}
          </div>
        </div>

        {successMessage ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Elección">
            <select
              value={selectedElectionId}
              onChange={(e) => {
                setSelectedElectionId(e.target.value)
                setSuccessMessage('')
                setErrorMessage('')
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              disabled={isLoadingElections || elections.length === 0}
            >
              {elections.length === 0 ? (
                <option value="">No hay elecciones registradas</option>
              ) : (
                elections.map((election) => (
                  <option key={election.id} value={election.id}>
                    {election.titulo} ({election.gestion})
                  </option>
                ))
              )}
            </select>
          </Field>

          <Field label="Estado del proceso">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
              {isLoadingBallot || isLoadingElections
                ? 'Cargando…'
                : formatEstadoEleccion(electionEstado)}
            </div>
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-blue-900">Papeleta Digital de Votación</h3>
            <p className="mt-1 text-sm text-slate-700">
              {selectedElectionLabel || 'Seleccione una elección para ver la papeleta.'}
            </p>
          </div>
        </div>

        {isLoadingBallot ? (
          <div className="mt-5">
            <BallotEmptyState
              title="Cargando papeleta…"
              description="Espere un momento mientras se prepara la previsualización."
            />
          </div>
        ) : !selectedElectionId ? (
          <div className="mt-5">
            <BallotEmptyState
              title="Sin elección seleccionada"
              description="Seleccione una elección para continuar."
            />
          </div>
        ) : !ballot ? (
          <div className="mt-5">
            <BallotEmptyState
              title="Sin información para mostrar"
              description="Registre cargos, frentes y candidatos para ver la boleta completa."
            />
          </div>
        ) : !ballot.cargos?.length ? (
          <div className="mt-5">
            <BallotEmptyState
              title="Sin cargos registrados"
              description="Registre cargos y luego frentes y candidatos para ver la papeleta."
            />
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Previsualización por papeleta</p>
              <p className="mt-1 text-sm text-slate-700">
                Cada sección representa una papeleta independiente que el votante verá según su
                alcance territorial.
              </p>
            </div>

            {missingAlcanceHints.length ? (
              <div className="space-y-2">
                {missingAlcanceHints.map((hint) => (
                  <BallotEmptyState key={hint} title="Información" description={hint} tone="warning" />
                ))}
              </div>
            ) : null}

            {ballotPreviews.length ? (
              <div className="space-y-5">
                {ballotPreviews.map((preview) => (
                  <BallotPreview key={preview.id} preview={preview} />
                ))}
              </div>
            ) : (
              <BallotEmptyState
                title="Sin papeletas configuradas"
                description="No hay papeletas disponibles para previsualizar en esta elección."
              />
            )}
          </div>
        )}
      </section>

      <SealElectionModal
        open={showSealModal}
        electionLabel={selectedElectionLabel}
        isSubmitting={isSealing}
        onClose={() => setShowSealModal(false)}
        onConfirm={handleConfirmSeal}
      />
    </div>
  )
}

/**
 * Wrapper visual de campo para formularios.
 * @param {{ label: string, children: any }} props
 * @returns {import('react').JSX.Element}
 */
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-900">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
