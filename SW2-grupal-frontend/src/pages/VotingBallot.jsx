import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchBallotComplete, fetchElections } from '../services/electionsService'
import { emitirVotoBatch } from '../services/votoService'
import { verificarEstadoVoto, descargarCertificado } from '../services/certificadoService'
import { getEstadisticasEstudiantes, getEstadisticasDocentes } from '../services/estadisticasService'
import { useAuth } from '../context/AuthContext'
import { decodeJwtPayload } from '../utils/jwt'
import { buildBallotPreviews } from './admin/electoral/ballotPreviewUtils'
import BallotStep from './estudiante/components/BallotStep'
import VotingSummary from './estudiante/components/VotingSummary'

const SUMMARY_STEP = { key: 'SUMMARY', type: 'SUMMARY', label: 'Resumen de Sufragio' }

/**
 * Pantalla de papeleta de votación con wizard dinámico según papeletas elegibles.
 */
export default function VotingBallot() {
  const [ballot, setBallot] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [electionLabel, setElectionLabel] = useState('')
  const [activeElectionId, setActiveElectionId] = useState(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [selectionsByBallot, setSelectionsByBallot] = useState({})

  const [haVotado, setHaVotado] = useState(false)
  const [txHash, setTxHash] = useState(null)
  const [estadisticas, setEstadisticas] = useState(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const { token, role, logout } = useAuth()
  const navigate = useNavigate()

  const orderedBallots = useMemo(() => buildBallotPreviews(ballot), [ballot])

  const wizardSteps = useMemo(() => {
    const ballotSteps = orderedBallots.map((ballotItem) => ({
      key: ballotItem.id,
      type: 'BALLOT',
      label: ballotItem.title || ballotItem.alcanceLabel,
      ballot: ballotItem,
    }))

    return [...ballotSteps, SUMMARY_STEP]
  }, [orderedBallots])

  const currentStep = wizardSteps[currentStepIndex] || null
  const isSummaryStep = currentStep?.type === 'SUMMARY'
  const totalSteps = wizardSteps.length

  const currentBallotStep = isSummaryStep ? null : currentStep?.ballot || null

  const currentSelection = currentBallotStep
    ? selectionsByBallot[currentBallotStep.id] || null
    : null

  const summaryItems = useMemo(() => (
    orderedBallots.map((ballotItem) => ({
      stepLabel: ballotItem.title || ballotItem.alcanceLabel,
      ballotId: ballotItem.id,
      selection: selectionsByBallot[ballotItem.id] || null,
    }))
  ), [orderedBallots, selectionsByBallot])

  const canGoNext = useMemo(() => {
    if (isSummaryStep) return false
    if (!currentBallotStep) return false
    return Boolean(selectionsByBallot[currentBallotStep.id])
  }, [currentBallotStep, isSummaryStep, selectionsByBallot])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    setCurrentStepIndex(0)
    setSelectionsByBallot({})
  }, [ballot?.id])

  useEffect(() => {
    if (currentStepIndex >= wizardSteps.length && wizardSteps.length > 0) {
      setCurrentStepIndex(wizardSteps.length - 1)
    }
  }, [currentStepIndex, wizardSteps.length])

  useEffect(() => {
    let isMounted = true

    async function loadActiveBallot() {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const elections = await fetchElections()
        const active = elections.find((e) => e.estaActiva)

        if (!active) {
          if (isMounted) setErrorMessage('No hay ninguna elección activa en este momento.')
          return
        }

        setElectionLabel(`${active.titulo} (${active.gestion})`)
        setActiveElectionId(active.id)

        const estadoVoto = await verificarEstadoVoto(active.id)
        if (estadoVoto.haVotado) {
          if (isMounted) {
            setHaVotado(true)
            setTxHash(estadoVoto.txHash)
            const statsMethod = role === 'DOCENTE' ? getEstadisticasDocentes : getEstadisticasEstudiantes
            try {
              const statsData = await statsMethod(active.id)
              setEstadisticas(statsData)
            } catch (err) {
              console.error('Error cargando estadísticas', err)
            }
          }
        } else {
          const payload = decodeJwtPayload(token)
          const registro = typeof payload?.registro === 'string' ? payload.registro : undefined

          if (!registro) {
            if (isMounted) {
              setErrorMessage('No se pudo identificar su registro universitario. Vuelva a iniciar sesión.')
            }
            return
          }

          const data = await fetchBallotComplete(active.id, registro)
          if (isMounted) setBallot(data)
        }
      } catch {
        if (isMounted) setErrorMessage('No se pudo cargar la papeleta. Inténtelo más tarde.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadActiveBallot()
    return () => { isMounted = false }
  }, [token, role])

  function handleSelectOption(selection) {
    if (!selection?.eleccionCargoId) return

    setSelectionsByBallot((prev) => ({
      ...prev,
      [selection.eleccionCargoId]: selection,
    }))
  }

  function handlePreviousStep() {
    setErrorMessage('')
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0))
  }

  function handleNextStep() {
    if (!canGoNext) return
    setErrorMessage('')
    setCurrentStepIndex((prev) => Math.min(prev + 1, wizardSteps.length - 1))
  }

  async function loadPostVoteStats(eleccionId) {
    const statsMethod = role === 'DOCENTE' ? getEstadisticasDocentes : getEstadisticasEstudiantes
    try {
      const statsData = await statsMethod(eleccionId)
      setEstadisticas(statsData)
    } catch (err) {
      console.error('Error cargando estadísticas', err)
    }
  }

  async function handleBatchSubmit() {
    if (!activeElectionId) return

    const pending = summaryItems.filter((item) => !item.selection)
    if (pending.length > 0) {
      setErrorMessage('Debe completar todas las papeletas antes de emitir su voto.')
      return
    }

    const selecciones = summaryItems.map((item) => ({
      eleccionCargoId: item.selection.eleccionCargoId,
      candidatoId: item.selection.candidatoId,
    }))

    try {
      setIsSubmitting(true)
      setErrorMessage('')

      const result = await emitirVotoBatch({
        eleccionId: activeElectionId,
        selecciones,
      })

      setHaVotado(true)
      setTxHash(result?.hashTransaccion || result?.txHash)
      await loadPostVoteStats(activeElectionId)
    } catch (error) {
      console.error(error)
      const errorMsg = error?.response?.data?.message || error?.message || 'Error al emitir el voto.'
      setErrorMessage(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDownloadCertificate() {
    if (!activeElectionId) return
    try {
      setIsDownloading(true)
      await descargarCertificado(activeElectionId)
    } catch (err) {
      console.error(err)
      alert('Hubo un error al intentar descargar el certificado.')
    } finally {
      setIsDownloading(false)
    }
  }

  const wizardSubtitle = totalSteps > 1
    ? `Complete los ${totalSteps} pasos para emitir su sufragio.`
    : 'Complete el paso para emitir su sufragio.'

  return (
    <main className="min-h-screen bg-white">
      <header className="bg-blue-900">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-white">Crucero de Votación</h1>
              <p className="mt-1 text-sm text-white/90">
                {electionLabel || wizardSubtitle}
              </p>
            </div>

            {haVotado ? (
              <button
                id="btn-cerrar-sesion"
                onClick={handleLogout}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-red-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-red-400 active:scale-95 transition-all"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Cerrar sesión
              </button>
            ) : totalSteps > 0 ? (
              <div className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                Paso {currentStepIndex + 1} / {totalSteps}
              </div>
            ) : null}
          </div>

          {!haVotado && wizardSteps.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {wizardSteps.map((step, index) => {
                const isActive = index === currentStepIndex
                const isCompleted = index < currentStepIndex

                return (
                  <span
                    key={step.key}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      isActive
                        ? 'bg-yellow-500 text-blue-900'
                        : isCompleted
                          ? 'bg-white/20 text-white'
                          : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {index + 1}. {step.label}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-900" />
            <p className="ml-4 text-sm text-slate-600">Cargando papeleta…</p>
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </div>
        )}

        {!isLoading && haVotado && (
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">¡Voto Registrado Exitosamente!</h2>
              <p className="mt-2 text-slate-600">
                Ya has participado en esta elección. Puedes descargar tu certificado oficial a continuación.
              </p>

              <button
                onClick={handleDownloadCertificate}
                disabled={isDownloading}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-6 py-3 font-bold text-white shadow-lg shadow-yellow-500/30 transition-all hover:bg-yellow-400 hover:shadow-yellow-400/40 active:scale-95 disabled:opacity-70"
              >
                {isDownloading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Generando PDF...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Descargar Certificado
                  </>
                )}
              </button>
            </div>

            {estadisticas && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-slate-900">
                  Estadísticas en vivo - {role === 'DOCENTE' ? 'Docentes' : 'Estudiantes'}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">Total Habilitados</p>
                    <p className="mt-1 text-2xl font-black text-blue-900">{estadisticas.totalHabilitados}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">Votos Emitidos</p>
                    <p className="mt-1 text-2xl font-black text-green-600">{estadisticas.totalVotosEmitidos}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex flex-col items-center">
                    <p className="mb-4 text-sm font-semibold text-slate-700">Participación del Estamento</p>
                    {(() => {
                      const pct = Math.min(100, Math.max(0, estadisticas.porcentajeParticipacion))
                      const radius = 54
                      const circumference = 2 * Math.PI * radius
                      const filled = (pct / 100) * circumference
                      const remaining = circumference - filled
                      return (
                        <div className="relative inline-flex items-center justify-center">
                          <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
                            <circle cx="70" cy="70" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
                            <circle
                              cx="70"
                              cy="70"
                              r={radius}
                              fill="none"
                              stroke="url(#donutGradient)"
                              strokeWidth="12"
                              strokeLinecap="round"
                              strokeDasharray={`${filled} ${remaining}`}
                            />
                            <defs>
                              <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#2563eb" />
                                <stop offset="100%" stopColor="#16a34a" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black text-blue-900">{pct}%</span>
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">participación</span>
                          </div>
                        </div>
                      )
                    })()}

                    <div className="mt-4 flex items-center gap-5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                        <span className="text-slate-600">
                          Votaron: <strong className="text-slate-900">{estadisticas.totalVotosEmitidos}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-200" />
                        <span className="text-slate-600">
                          Pendientes: <strong className="text-slate-900">{estadisticas.totalHabilitados - estadisticas.totalVotosEmitidos}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {txHash && (
                    <div className="relative mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-5 group">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Comprobante de Sufragio (Blockchain)
                      </p>
                      <div className="flex flex-col items-center gap-3 pr-10 sm:flex-row">
                        <div className="relative w-full flex-1 overflow-hidden rounded border border-slate-200 bg-white p-2">
                          <code className="block break-all text-xs font-mono text-blue-900 sm:text-sm">
                            {txHash}
                          </code>
                        </div>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(txHash)}
                        title="Copiar Hash"
                        className="absolute right-4 top-1/2 mt-3 flex -translate-y-1/2 items-center justify-center rounded-lg bg-blue-100 p-2 text-blue-700 transition-colors hover:bg-blue-200"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {!isLoading && !haVotado && orderedBallots.length === 0 && !errorMessage && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-700">
              No tiene papeletas habilitadas para su perfil en esta elección.
            </p>
          </div>
        )}

        {!isLoading && !haVotado && orderedBallots.length > 0 && (
          <>
            {isSummaryStep ? (
              <VotingSummary
                electionLabel={electionLabel}
                summaryItems={summaryItems}
                stepNumber={currentStepIndex + 1}
                totalSteps={totalSteps}
                isSubmitting={isSubmitting}
                onBack={handlePreviousStep}
                onSubmit={handleBatchSubmit}
              />
            ) : (
              <>
                <BallotStep
                  ballot={currentBallotStep}
                  stepLabel={currentStep?.label}
                  stepNumber={currentStepIndex + 1}
                  totalSteps={totalSteps}
                  selectedOptionKey={currentSelection?.optionKey || null}
                  onSelect={handleSelectOption}
                />

                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={handlePreviousStep}
                    disabled={currentStepIndex === 0}
                    className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={!canGoNext}
                    className="rounded-xl bg-blue-900 px-6 py-3 text-sm font-bold text-white shadow hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}
