import { useEffect, useMemo, useState } from 'react'
import { fetchBallotComplete, fetchElections } from '../../services/electionsService'

/**
 * Sección de Configuración de Papeleta.
 *
 * Previsualiza la boleta digital completa (cargos, frentes y candidatos)
 * para una elección seleccionada.
 *
 * @returns {import('react').JSX.Element}
 */
export default function BallotConfiguration() {
  const [elections, setElections] = useState([])
  const [selectedElectionId, setSelectedElectionId] = useState('')
  const [ballot, setBallot] = useState(null)

  const [isLoadingElections, setIsLoadingElections] = useState(true)
  const [isLoadingBallot, setIsLoadingBallot] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const selectedElectionLabel = useMemo(() => {
    const election = elections.find((e) => e.id === selectedElectionId)
    if (!election) return ''
    return `${election.titulo} (${election.gestion})`
  }, [elections, selectedElectionId])

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

        // Guardamos candidatos asociados a este cargo y frente.
        group.cargos.set(cargo.id, {
          cargoId: cargo.id,
          cargoNombre: cargo.nombre,
          facultad: cargo.facultad,
          candidatos: frente.candidatos || [],
        })

        // Si algún frente trae logo y el grupo aún no tiene, lo usamos.
        if (!group.logoUrl && frente.logoUrl) {
          group.logoUrl = frente.logoUrl
        }

        if (!existing) groupMap.set(groupKey, group)
      }
    }

    const columns = Array.from(groupMap.values())
      .map((group) => ({
        ...group,
        cargoOrder,
      }))
      .sort((a, b) => {
        const aSigla = a.sigla || ''
        const bSigla = b.sigla || ''
        if (aSigla !== bSigla) return aSigla.localeCompare(bSigla)
        return String(a.nombreFrente || '').localeCompare(String(b.nombreFrente || ''))
      })

    return columns
  }, [ballot])

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
        setErrorMessage('No se pudo cargar la papeleta. Verifique que existan cargos, frentes y candidatos registrados.')
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

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-blue-900">Configuración de Papeleta</h2>
        <p className="mt-1 text-sm text-slate-700">
          Previsualiza cómo verá el estudiante la boleta de votación.
        </p>

        {errorMessage ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Elección">
            <select
              value={selectedElectionId}
              onChange={(e) => setSelectedElectionId(e.target.value)}
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

          <Field label="Estado">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
              {ballot?.estaActiva ? 'Activa' : ballot ? 'Inactiva' : isLoadingBallot ? 'Cargando…' : '—'}
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
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Cargando papeleta…</p>
            <p className="mt-1 text-sm text-slate-700">Espere un momento.</p>
          </div>
        ) : !selectedElectionId ? (
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Sin elección seleccionada</p>
            <p className="mt-1 text-sm text-slate-700">Seleccione una elección para continuar.</p>
          </div>
        ) : !ballot ? (
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Sin información para mostrar</p>
            <p className="mt-1 text-sm text-slate-700">
              Registre cargos, frentes y candidatos para ver la boleta completa.
            </p>
          </div>
        ) : ballot.cargos?.length ? (
          <div className="mt-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Frentes</p>
              <p className="mt-1 text-sm text-slate-700">
                Compare fácilmente los frentes y sus candidatos por cargo.
              </p>
            </div>

            {ballotColumns.length ? (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {ballotColumns.map((column) => (
                  <div key={column.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="h-28 w-28 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        {column.logoUrl ? (
                          <img
                            src={column.logoUrl}
                            alt="Logo del frente"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full rounded-xl border border-slate-200 bg-slate-50" />
                        )}
                      </div>

                      <div className="w-full">
                        <p className="break-words text-sm font-semibold text-slate-900">
                          {column.nombreFrente || 'Frente'}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-700">Sigla: {column.sigla || '—'}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      {column.cargoOrder.map((cargo) => {
                        const cargoData = column.cargos.get(cargo.id)
                        const candidates = cargoData?.candidatos || []

                        return (
                          <div key={cargo.id} className="rounded-lg border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-700">
                                  {cargo.nombre}
                                </p>
                                {cargo.facultad ? (
                                  <p className="truncate text-xs text-slate-600">{cargo.facultad}</p>
                                ) : null}
                              </div>
                              <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-blue-900">
                                {candidates.length || 0}
                              </span>
                            </div>

                            {candidates.length ? (
                              <div className="mt-3 space-y-2">
                                {candidates.map((candidate) => (
                                  <div
                                    key={candidate.id}
                                    className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-center"
                                  >
                                    {candidate.fotoUrl ? (
                                      <img
                                        src={candidate.fotoUrl}
                                        alt="Foto del candidato"
                                        className="h-50 w-50 shrink-0 rounded-2xl border border-slate-200 object-cover"
                                      />
                                    ) : (
                                      <div className="h-50 w-50 shrink-0 rounded-2xl border border-slate-200 bg-slate-50" />
                                    )}
                                    <div className="w-full min-w-0">
                                      <p className="truncate text-base font-semibold text-slate-900">
                                        {candidate.nombres} 
                                      </p>
                                      
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-sm text-slate-700">Sin candidato registrado.</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Sin frentes registrados</p>
                <p className="mt-1 text-sm text-slate-700">
                  Registre frentes y candidatos para ver la papeleta en formato de columnas.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Sin cargos registrados</p>
            <p className="mt-1 text-sm text-slate-700">
              Registre cargos y luego frentes y candidatos para ver la papeleta.
            </p>
          </div>
        )}
      </section>
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
