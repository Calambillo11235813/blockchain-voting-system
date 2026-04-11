import { useEffect, useMemo, useState } from 'react'
import { fetchBallotComplete, fetchElections } from '../services/electionsService'

/**
 * Pantalla de papeleta de votación para el estudiante (HU-003).
 *
 * Carga automáticamente la elección activa y muestra los frentes/candidatos.
 * El estudiante selecciona un frente y confirma su voto.
 */
export default function VotingBallot() {
  const [ballot, setBallot] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedFrenteKey, setSelectedFrenteKey] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [voteSubmitted, setVoteSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [electionLabel, setElectionLabel] = useState('')

  // Carga la elección activa y su papeleta automáticamente
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
        const data = await fetchBallotComplete(active.id)
        if (isMounted) setBallot(data)
      } catch {
        if (isMounted) setErrorMessage('No se pudo cargar la papeleta. Inténtelo más tarde.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadActiveBallot()
    return () => { isMounted = false }
  }, [])

  // Construye columnas de frentes — idéntica lógica que BallotConfiguration del admin
  const ballotColumns = useMemo(() => {
    if (!ballot?.cargos?.length) return []

    const cargoOrder = ballot.cargos.map((cargo) => ({
      id: cargo.id,
      nombre: cargo.nombre,
      facultad: cargo.facultad,
    }))

    const groupMap = new Map()

    for (const cargo of ballot.cargos) {
      for (const frente of cargo.frentes || []) {
        const siglaKey = String(frente.sigla || '').trim().toUpperCase()
        const nameKey = String(frente.nombreFrente || '').trim().toLowerCase()
        const groupKey = `${siglaKey}|${nameKey}`

        const existing = groupMap.get(groupKey)
        const group = existing || {
          key: groupKey,
          nombreFrente: String(frente.nombreFrente || '').trim(),
          sigla: siglaKey,
          logoUrl: frente.logoUrl || '',
          cargos: new Map(),
        }

        group.cargos.set(cargo.id, {
          cargoId: cargo.id,
          cargoNombre: cargo.nombre,
          facultad: cargo.facultad,
          candidatos: frente.candidatos || [],
        })

        if (!group.logoUrl && frente.logoUrl) {
          group.logoUrl = frente.logoUrl
        }

        if (!existing) groupMap.set(groupKey, group)
      }
    }

    return Array.from(groupMap.values())
      .map((group) => ({ ...group, cargoOrder }))
      .sort((a, b) => {
        const aSigla = a.sigla || ''
        const bSigla = b.sigla || ''
        if (aSigla !== bSigla) return aSigla.localeCompare(bSigla)
        return String(a.nombreFrente || '').localeCompare(String(b.nombreFrente || ''))
      })
  }, [ballot])

  const selectedFrente = useMemo(
    () => ballotColumns.find((c) => c.key === selectedFrenteKey) || null,
    [ballotColumns, selectedFrenteKey]
  )

  function handleSelectFrente(key) {
    setSelectedFrenteKey((prev) => (prev === key ? null : key))
  }

  async function handleVoteSubmit() {
    setIsSubmitting(true)
    // TODO: Conectar con Smart Contract / endpoint de emisión de voto
    await new Promise((r) => setTimeout(r, 1500))
    setIsSubmitting(false)
    setShowConfirmModal(false)
    setVoteSubmitted(true)
  }

  // ─── Pantalla: Voto registrado ─────────────────────────────────────────────
  if (voteSubmitted) {
    return (
      <main className="min-h-screen bg-white">
        <header className="bg-blue-900">
          <div className="mx-auto max-w-6xl px-4 py-6">
            <h1 className="text-lg font-semibold text-white">Papeleta de Votación</h1>
            <p className="mt-1 text-sm text-white/90">Su voto ha sido registrado exitosamente.</p>
          </div>
        </header>

        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500 shadow-lg">
            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-blue-900">¡Voto Emitido Correctamente!</h2>
          <p className="mt-3 text-sm text-slate-600">
            Su voto ha sido registrado en el sistema. Gracias por participar en el proceso democrático.
          </p>
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Frente elegido</p>
            <p className="mt-1 text-xl font-bold text-blue-900">{selectedFrente?.nombreFrente}</p>
            <p className="text-sm text-slate-600">Sigla: {selectedFrente?.sigla}</p>
          </div>
        </div>
      </main>
    )
  }

  // ─── Pantalla principal ────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-white">
      {/* Header institucional — igual estilo que el admin */}
      <header className="bg-blue-900">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-white">Papeleta de Votación</h1>
              <p className="mt-1 text-sm text-white/90">
                {electionLabel || 'Seleccione su frente/candidato y confirme su voto.'}
              </p>
            </div>

            {/* Botón Confirmar voto */}
            {selectedFrenteKey && (
              <button
                id="btn-confirmar-voto"
                onClick={() => setShowConfirmModal(true)}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-yellow-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-yellow-400 active:scale-95 transition-all"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Confirmar voto
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">

        {/* Estado: cargando */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-900" />
            <p className="ml-4 text-sm text-slate-600">Cargando papeleta…</p>
          </div>
        )}

        {/* Estado: error */}
        {!isLoading && errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </div>
        )}

        {/* Estado: sin datos */}
        {!isLoading && !errorMessage && ballot && !ballotColumns.length && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-700">La papeleta aún no tiene frentes registrados.</p>
          </div>
        )}

        {/* ── Papeleta ── */}
        {!isLoading && !errorMessage && ballotColumns.length > 0 && (
          <>
            {/* Instrucción */}
            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Instrucción</p>
              <p className="mt-1 text-sm text-slate-700">
                Haga clic en el frente de su preferencia para seleccionarlo y luego confirme su voto.
              </p>
            </div>

            {/* Grid de columnas — mismo layout que BallotConfiguration */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {ballotColumns.map((column) => {
                const isSelected = selectedFrenteKey === column.key

                return (
                  <button
                    key={column.key}
                    id={`frente-${column.sigla}`}
                    type="button"
                    onClick={() => handleSelectFrente(column.key)}
                    className={`
                      group relative w-full rounded-xl border-2 text-left transition-all duration-150
                      focus:outline-none
                      ${isSelected
                        ? 'border-yellow-400 shadow-lg shadow-yellow-200/60 ring-2 ring-yellow-300'
                        : 'border-slate-200 bg-white shadow-sm hover:border-blue-300 hover:shadow-md'
                      }
                    `}
                  >
                    {/* Badge de selección */}
                    {isSelected && (
                      <span className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-yellow-500 shadow">
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}

                    {/* Cabecera del frente — logo + nombre + sigla */}
                    <div className="flex flex-col items-center gap-3 p-4 text-center">
                      {/* Logo cuadrado grande — mismo tamaño que admin (h-28 w-28) */}
                      <div className={`h-28 w-28 overflow-hidden rounded-2xl border ${isSelected ? 'border-yellow-300' : 'border-slate-200'} bg-slate-50`}>
                        {column.logoUrl ? (
                          <img
                            src={column.logoUrl}
                            alt={`Logo ${column.nombreFrente}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <span className="text-3xl font-black text-slate-300">
                              {column.sigla?.charAt(0) || '?'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="w-full">
                        <p className="break-words text-sm font-semibold text-slate-900">
                          {column.nombreFrente || 'Frente'}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">Sigla: {column.sigla || '—'}</p>
                      </div>
                    </div>

                    {/* Separador */}
                    <div className={`mx-4 border-t ${isSelected ? 'border-yellow-200' : 'border-slate-100'}`} />

                    {/* Cargos y candidatos */}
                    <div className="space-y-4 p-4">
                      {column.cargoOrder.map((cargo) => {
                        const cargoData = column.cargos.get(cargo.id)
                        const candidates = cargoData?.candidatos || []

                        return (
                          <div key={cargo.id} className="rounded-lg border border-slate-200 bg-white p-4">
                            {/* Encabezado del cargo */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-700">
                                  {cargo.nombre}
                                </p>
                                {cargo.facultad && (
                                  <p className="truncate text-xs text-blue-900 font-medium">{cargo.facultad}</p>
                                )}
                              </div>
                              <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-blue-900">
                                {candidates.length || 0}
                              </span>
                            </div>

                            {/* Candidatos — foto grande vertical igual que admin */}
                            {candidates.length ? (
                              <div className="mt-3 space-y-2">
                                {candidates.map((candidate) => (
                                  <div
                                    key={candidate.id}
                                    className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-center"
                                  >
                                    {/* Foto candidato GRANDE — igual h-50 w-50 que admin */}
                                    {candidate.fotoUrl ? (
                                      <img
                                        src={candidate.fotoUrl}
                                        alt={`Foto de ${candidate.nombres}`}
                                        className="h-50 w-50 shrink-0 rounded-2xl border border-slate-200 object-cover"
                                      />
                                    ) : (
                                      <div className="h-50 w-50 shrink-0 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                                        <span className="text-2xl font-black text-slate-300">
                                          {candidate.nombres?.charAt(0) || '?'}
                                        </span>
                                      </div>
                                    )}
                                    <div className="w-full min-w-0">
                                      <p className="truncate text-base font-semibold text-slate-900">
                                        {candidate.nombres}
                                      </p>
                                      {candidate.apellidos && (
                                        <p className="truncate text-xs text-slate-500">{candidate.apellidos}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-sm text-slate-500">Sin candidato registrado.</p>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Footer: seleccionado o invitación a elegir */}
                    <div className={`rounded-b-xl px-4 py-3 text-center text-xs font-semibold transition-colors
                      ${isSelected ? 'bg-yellow-500 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-900'}`}>
                      {isSelected ? '✓ Seleccionado' : 'Seleccionar este frente'}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Botón inferior de confirmación */}
            {selectedFrenteKey && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="rounded-xl bg-yellow-500 px-10 py-3 text-base font-bold text-white shadow-lg hover:bg-yellow-400 active:scale-95 transition-all"
                >
                  Confirmar voto por {selectedFrente?.sigla}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal de Confirmación ── */}
      {showConfirmModal && selectedFrente && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            {/* Ícono */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            <h2 className="text-center text-xl font-bold text-blue-900">¿Confirmar su voto?</h2>
            <p className="mt-2 text-center text-sm text-slate-600">
              Esta acción es <strong>irreversible</strong>. Una vez confirmado, su voto quedará
              registrado y no podrá modificarse.
            </p>

            {/* Frente elegido */}
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {selectedFrente.logoUrl ? (
                    <img src={selectedFrente.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-xl font-black text-slate-400">{selectedFrente.sigla?.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Frente seleccionado</p>
                  <p className="text-base font-bold text-blue-900">{selectedFrente.nombreFrente}</p>
                  <span className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-900">
                    {selectedFrente.sigla}
                  </span>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                id="btn-cancelar-voto"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                id="btn-emitir-voto"
                onClick={handleVoteSubmit}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-xl bg-yellow-500 py-3 text-sm font-bold text-white shadow hover:bg-yellow-400 transition-colors disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Registrando…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Sí, confirmar voto
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
