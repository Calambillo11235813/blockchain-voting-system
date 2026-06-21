import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  abrirJornada,
  cerrarJornada,
  createElection,
  createPosition,
  deleteElection,
  deletePosition,
  fetchElections,
  fetchPositions,
  updateElection,
  updatePosition,
} from '../../../services/electionsService'
import PapeletaForm from './PapeletaForm'
import AbrirJornadaModal from './components/AbrirJornadaModal'
import CerrarJornadaModal from './components/CerrarJornadaModal'
import {
  ALCANCE_LABELS,
  ALCANCE_PAPELETA,
  buildPositionPayload,
  createEmptyPositionForm,
  formatPositionAmbito,
  validatePositionForm,
} from '../../../utils/papeletaConstants'
import {
  ESTADO_ELECCION,
  canAbrirJornada,
  canCerrarJornada,
  formatEstadoEleccion,
  getEstadoEleccionBadgeClass,
  isJornadaFinalizada,
} from '../../../utils/electionConstants'

/**
 * Sección de Gestión de Elección.
 *
 * Permite crear, actualizar y eliminar elecciones y cargos.
 *
 * @returns {import('react').JSX.Element}
 */
export default function ElectionManagement() {
  const [elections, setElections] = useState([])
  const [positions, setPositions] = useState([])

  const [isLoading, setIsLoading] = useState(true)
  const [isSavingElection, setIsSavingElection] = useState(false)
  const [isSavingPosition, setIsSavingPosition] = useState(false)
  const [isJornadaSubmitting, setIsJornadaSubmitting] = useState(false)

  const [jornadaModal, setJornadaModal] = useState(() => ({
    type: '',
    electionId: '',
    electionLabel: '',
  }))

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [editingElectionId, setEditingElectionId] = useState('')
  const [editingPositionId, setEditingPositionId] = useState('')

  const [electionForm, setElectionForm] = useState(() => ({
    title: '',
    year: '',
    dateLocal: '',
    isSurnameRestrictionActive: true,
  }))

  const [positionForm, setPositionForm] = useState(() => createEmptyPositionForm())

  const [activeView, setActiveView] = useState('elecciones')
  const [selectedElection, setSelectedElection] = useState(null)

  useEffect(() => {
    if (!selectedElection) return
    const updated = elections.find((election) => election.id === selectedElection.id)
    if (updated) {
      setSelectedElection(updated)
    } else {
      setSelectedElection(null)
      setActiveView('elecciones')
    }
  }, [elections, selectedElection?.id])

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const [electionsData, positionsData] = await Promise.all([
          fetchElections(),
          fetchPositions(),
        ])

        if (!isMounted) return
        setElections(electionsData)
        setPositions(positionsData)

        // Si hay elecciones y aún no se seleccionó nada para cargos,
        // sugerimos la primera para facilitar el flujo institucional.
        if (electionsData.length > 0) {
          setPositionForm((prev) =>
            prev.electionId ? prev : createEmptyPositionForm(electionsData[0].id),
          )
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
  }, [])

  const isBusy = isLoading || isSavingElection || isSavingPosition || isJornadaSubmitting

  const resetMessages = () => {
    setErrorMessage('')
    setSuccessMessage('')
  }

  const resetElectionForm = () => {
    setEditingElectionId('')
    setElectionForm({
      title: '',
      year: '',
      dateLocal: '',
      isSurnameRestrictionActive: true,
    })
  }

  const resetPositionForm = () => {
    setEditingPositionId('')
    const electionId = selectedElection?.id || elections[0]?.id || ''
    setPositionForm(createEmptyPositionForm(electionId))
  }

  const visiblePositions = useMemo(() => {
    if (!selectedElection) return positions
    return positions.filter(
      (position) => (position?.eleccion?.id || position.eleccionId) === selectedElection.id,
    )
  }, [positions, selectedElection])

  const electionsForPapeletaForm = useMemo(() => {
    if (selectedElection) return [selectedElection]
    return elections
  }, [elections, selectedElection])

  const handleOpenPapeletas = (election) => {
    resetMessages()
    setSelectedElection(election)
    setEditingPositionId('')
    setPositionForm(createEmptyPositionForm(election.id))
    setActiveView('papeletas')
  }

  const handleBackToElecciones = () => {
    resetMessages()
    setActiveView('elecciones')
  }

  const refreshLists = async () => {
    const [electionsData, positionsData] = await Promise.all([
      fetchElections(),
      fetchPositions(),
    ])
    setElections(electionsData)
    setPositions(positionsData)
  }

  const handleSaveElection = async () => {
    resetMessages()

    const validationError = validateElectionForm(electionForm)
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    const payload = {
      titulo: electionForm.title.trim(),
      gestion: Number(electionForm.year),
      fecha: electionForm.dateLocal,
      restriccionAlfabeticaActiva: Boolean(electionForm.isSurnameRestrictionActive),
    }

    try {
      setIsSavingElection(true)

      if (editingElectionId) {
        await updateElection(editingElectionId, payload)
        setSuccessMessage('Elección actualizada correctamente.')
      } else {
        await createElection(payload)
        setSuccessMessage('Elección creada correctamente.')
      }

      await refreshLists()
      resetElectionForm()
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, 'Hubo un problema al guardar la elección.'))
    } finally {
      setIsSavingElection(false)
    }
  }

  const handleEditElection = (election) => {
    resetMessages()
    setEditingElectionId(election.id)
    setElectionForm({
      title: election.titulo || '',
      year: String(election.gestion ?? ''),
      dateLocal: toDateInputValue(election.fecha),
      isSurnameRestrictionActive: Boolean(election.restriccionAlfabeticaActiva ?? true),
    })
  }

  const isElectionLocked = (election) => {
    const estado = election.estado || ESTADO_ELECCION.EN_CONFIGURACION
    return estado === ESTADO_ELECCION.ACTIVA || estado === ESTADO_ELECCION.FINALIZADA
  }

  const openJornadaModal = (type, election) => {
    resetMessages()
    setJornadaModal({
      type,
      electionId: election.id,
      electionLabel: `${election.titulo} (${election.gestion})`,
    })
  }

  const closeJornadaModal = () => {
    if (isJornadaSubmitting) return
    setJornadaModal({ type: '', electionId: '', electionLabel: '' })
  }

  const resetJornadaModal = () => {
    setJornadaModal({ type: '', electionId: '', electionLabel: '' })
  }

  const handleConfirmJornada = async () => {
    if (!jornadaModal.electionId || !jornadaModal.type) return

    resetMessages()
    try {
      setIsJornadaSubmitting(true)
      if (jornadaModal.type === 'abrir') {
        await abrirJornada(jornadaModal.electionId)
        setSuccessMessage('Jornada electoral abierta correctamente.')
      } else {
        await cerrarJornada(jornadaModal.electionId)
        setSuccessMessage('Jornada electoral cerrada correctamente.')
      }
      await refreshLists()
      resetJornadaModal()
    } catch (error) {
      setErrorMessage(
        getFriendlyErrorMessage(
          error,
          jornadaModal.type === 'abrir'
            ? 'No se pudo abrir la jornada electoral.'
            : 'No se pudo cerrar la jornada electoral.',
        ),
      )
    } finally {
      setIsJornadaSubmitting(false)
    }
  }

  const handleToggleRestriction = async (electionId, nextValue) => {
    resetMessages()
    try {
      setIsSavingElection(true)
      await updateElection(electionId, {
        restriccionAlfabeticaActiva: Boolean(nextValue),
      })

      // Si se está editando esa misma elección, mantenemos el formulario consistente.
      if (editingElectionId && editingElectionId === electionId) {
        setElectionForm((prev) => ({
          ...prev,
          isSurnameRestrictionActive: Boolean(nextValue),
        }))
      }

      await refreshLists()
      setSuccessMessage('Actualización exitosa')
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, 'No se pudo actualizar la restricción por apellido.'))
    } finally {
      setIsSavingElection(false)
    }
  }

  const handleDeleteElection = async (electionId) => {
    resetMessages()
    try {
      setIsSavingElection(true)
      await deleteElection(electionId)
      setSuccessMessage('Elección eliminada correctamente.')
      await refreshLists()

      if (editingElectionId === electionId) {
        resetElectionForm()
      }
      if (selectedElection?.id === electionId) {
        setSelectedElection(null)
        setActiveView('elecciones')
      }
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, 'No se pudo eliminar la elección.'))
    } finally {
      setIsSavingElection(false)
    }
  }

  const handleSavePosition = async () => {
    resetMessages()

    const validationError = validatePositionForm(positionForm)
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    const payload = editingPositionId
      ? { nombre: positionForm.name.trim() }
      : buildPositionPayload(positionForm)

    try {
      setIsSavingPosition(true)
      if (editingPositionId) {
        await updatePosition(editingPositionId, payload)
        setSuccessMessage('Papeleta actualizada correctamente.')
      } else {
        await createPosition(payload)
        setSuccessMessage('Papeleta creada correctamente.')
      }

      await refreshLists()
      resetPositionForm()
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, 'Hubo un problema al guardar el cargo.'))
    } finally {
      setIsSavingPosition(false)
    }
  }

  const handleEditPosition = (position) => {
    resetMessages()
    setEditingPositionId(position.id)
    setPositionForm({
      name: position.nombre || '',
      electionId: position?.eleccion?.id || positionForm.electionId,
      alcance: position.alcance || ALCANCE_PAPELETA.GLOBAL,
      codFacultad: position.codFacultad || '',
      facultadNombre: position.facultadNombre || '',
      codCarrera: position.codCarrera || '',
      carreraNombre: position.carreraNombre || '',
    })
  }

  const handleDeletePosition = async (positionId) => {
    resetMessages()
    try {
      setIsSavingPosition(true)
      await deletePosition(positionId)
      setSuccessMessage('Papeleta eliminada correctamente.')
      await refreshLists()

      if (editingPositionId === positionId) {
        resetPositionForm()
      }
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, 'No se pudo eliminar el cargo.'))
    } finally {
      setIsSavingPosition(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-blue-900">Gestión de Elección</h2>
            <p className="mt-1 text-sm text-slate-700">
              {activeView === 'elecciones'
                ? 'Crea y administra los procesos electorales. Desde cada fila puede configurar sus papeletas.'
                : selectedElection
                  ? `Papeletas de ${selectedElection.titulo} (${selectedElection.gestion})`
                  : 'Registre las papeletas del proceso con alcance global, por facultad o por carrera.'}
            </p>
          </div>

          {activeView === 'papeletas' ? (
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
          aria-label="Vistas de gestión electoral"
        >
          <ViewTab
            active={activeView === 'elecciones'}
            onClick={handleBackToElecciones}
            disabled={isBusy}
          >
            Elecciones
          </ViewTab>
          <ViewTab
            active={activeView === 'papeletas'}
            onClick={() => selectedElection && setActiveView('papeletas')}
            disabled={isBusy || !selectedElection}
          >
            Papeletas
            {selectedElection ? (
              <span className="ml-1 hidden font-normal text-slate-500 sm:inline">
                · {selectedElection.titulo}
              </span>
            ) : null}
          </ViewTab>
        </nav>

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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-blue-900">Elecciones</h3>
              <p className="mt-1 text-sm text-slate-700">Crea, edita o elimina el proceso electoral.</p>
            </div>
            <div className="flex items-center gap-2">
              {editingElectionId ? (
                <button
                  type="button"
                  onClick={() => {
                    resetMessages()
                    resetElectionForm()
                  }}
                  disabled={isBusy}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  Cancelar
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleSaveElection}
                disabled={isBusy}
                className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              >
                {isSavingElection
                  ? 'Guardando…'
                  : editingElectionId
                    ? 'Actualizar elección'
                    : 'Crear elección'}
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Título">
              <input
                value={electionForm.title}
                onChange={(e) => setElectionForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                placeholder="Ej. Elección Facultativa 2026"
                disabled={isBusy}
              />
            </Field>

            <Field label="Gestión">
              <input
                value={electionForm.year}
                onChange={(e) => setElectionForm((prev) => ({ ...prev, year: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                placeholder="Ej. 2026"
                disabled={isBusy}
                inputMode="numeric"
              />
            </Field>

            <Field label="Fecha de elección">
              <input
                type="date"
                value={electionForm.dateLocal}
                onChange={(e) => setElectionForm((prev) => ({ ...prev, dateLocal: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                disabled={isBusy}
              />
            </Field>

            <Field label="Horario de votación">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                08:00 a 16:00
              </div>
            </Field>

            <div className="sm:col-span-2 lg:col-span-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(electionForm.isSurnameRestrictionActive)}
                  onChange={(e) => {
                    const nextValue = e.target.checked
                    setElectionForm((prev) => ({ ...prev, isSurnameRestrictionActive: nextValue }))

                    if (editingElectionId) {
                      handleToggleRestriction(editingElectionId, nextValue)
                    }
                  }}
                  disabled={isBusy}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm font-semibold text-slate-900">Restricción por apellido activa</span>
                <span
                  title="Si se desactiva, los estudiantes podrán votar en cualquier horario sin importar su apellido."
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  ?
                </span>
              </label>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Título</Th>
                  <Th>Gestión</Th>
                  <Th>Fecha</Th>
                  <Th>Horario</Th>
                  <Th>Flujo</Th>
                  <Th>Estado</Th>
                  <Th>Jornada</Th>
                  <Th>Acciones</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-3 text-sm text-slate-700" colSpan={8}>
                      Cargando elecciones…
                    </td>
                  </tr>
                ) : elections.length === 0 ? (
                  <tr>
                    <td className="px-4 py-3 text-sm text-slate-700" colSpan={8}>
                      No hay elecciones registradas.
                    </td>
                  </tr>
                ) : (
                  elections.map((election) => {
                    const estado = election.estado || ESTADO_ELECCION.EN_CONFIGURACION
                    const locked = isElectionLocked(election)

                    return (
                      <tr key={election.id}>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{election.titulo}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{election.gestion}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{formatElectionDate(election.fecha)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">08:00 a 16:00</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleRestriction(
                                election.id,
                                !(election.restriccionAlfabeticaActiva ?? true),
                              )
                            }
                            disabled={isBusy || locked}
                            className={
                              (election.restriccionAlfabeticaActiva ?? true)
                                ? 'inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-900 hover:bg-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600'
                                : 'inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600'
                            }
                            title="Cambiar flujo de acceso por apellido"
                          >
                            {(election.restriccionAlfabeticaActiva ?? true)
                              ? 'Controlado (A-Z)'
                              : 'Libre'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getEstadoEleccionBadgeClass(estado)}`}
                          >
                            {formatEstadoEleccion(estado)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {canAbrirJornada(estado) ? (
                            <button
                              type="button"
                              onClick={() => openJornadaModal('abrir', election)}
                              disabled={isBusy}
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                            >
                              Abrir Votación
                            </button>
                          ) : canCerrarJornada(estado, election.estaActiva) ? (
                            <button
                              type="button"
                              onClick={() => openJornadaModal('cerrar', election)}
                              disabled={isBusy}
                              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                            >
                              Cerrar Votación
                            </button>
                          ) : isJornadaFinalizada(estado) ? (
                            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-900">
                              Jornada finalizada
                            </span>
                          ) : (
                            <p className="max-w-[12rem] text-xs text-slate-500">
                              Debe sellar la elección primero.{' '}
                              <Link
                                to="/admin/configuracion-papeleta"
                                className="font-semibold text-blue-900 underline hover:text-blue-700"
                              >
                                Configuración de Papeleta
                              </Link>
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenPapeletas(election)}
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
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              Configurar Papeletas
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditElection(election)}
                              disabled={isBusy || locked}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteElection(election.id)}
                              disabled={isBusy || locked}
                              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-blue-900">Papeletas / Cargos</h3>
              {selectedElection ? (
                <p className="mt-1 text-sm text-slate-700">
                  Proceso:{' '}
                  <span className="font-semibold text-blue-900">
                    {selectedElection.titulo} ({selectedElection.gestion})
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-700">
                  Seleccione una elección desde la vista anterior para configurar papeletas.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {editingPositionId ? (
                <button
                  type="button"
                  onClick={() => {
                    resetMessages()
                    resetPositionForm()
                  }}
                  disabled={isBusy}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  Cancelar
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleSavePosition}
                disabled={isBusy || !selectedElection}
                className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              >
                {isSavingPosition
                  ? 'Guardando…'
                  : editingPositionId
                    ? 'Actualizar papeleta'
                    : 'Crear papeleta'}
              </button>
            </div>
          </div>

          {!selectedElection ? (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center">
              <p className="text-sm font-semibold text-slate-900">No hay elección seleccionada</p>
              <p className="mt-1 text-sm text-slate-700">
                Vuelva a la vista de elecciones y elija &quot;Configurar Papeletas&quot; en la fila deseada.
              </p>
              <button
                type="button"
                onClick={handleBackToElecciones}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-slate-50"
              >
                ← Volver a Elecciones
              </button>
            </div>
          ) : (
            <>
              <PapeletaForm
                positionForm={positionForm}
                setPositionForm={setPositionForm}
                elections={electionsForPapeletaForm}
                isBusy={isBusy}
                isEditing={Boolean(editingPositionId)}
                onCatalogError={setErrorMessage}
              />

              <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <Th>Cargo</Th>
                      <Th>Alcance</Th>
                      <Th>Ámbito</Th>
                      <Th>Acciones</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {isLoading ? (
                      <tr>
                        <td className="px-4 py-3 text-sm text-slate-700" colSpan={4}>
                          Cargando cargos…
                        </td>
                      </tr>
                    ) : visiblePositions.length === 0 ? (
                      <tr>
                        <td className="px-4 py-3 text-sm text-slate-700" colSpan={4}>
                          No hay papeletas registradas para esta elección.
                        </td>
                      </tr>
                    ) : (
                      visiblePositions.map((position) => (
                        <tr key={position.id}>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900">{position.nombre}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {ALCANCE_LABELS[position.alcance] || position.alcance || ALCANCE_LABELS.GLOBAL}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{formatPositionAmbito(position)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditPosition(position)}
                                disabled={isBusy}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePosition(position.id)}
                                disabled={isBusy}
                                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      <AbrirJornadaModal
        open={jornadaModal.type === 'abrir'}
        electionLabel={jornadaModal.electionLabel}
        isSubmitting={isJornadaSubmitting}
        onClose={closeJornadaModal}
        onConfirm={handleConfirmJornada}
      />

      <CerrarJornadaModal
        open={jornadaModal.type === 'cerrar'}
        electionLabel={jornadaModal.electionLabel}
        isSubmitting={isJornadaSubmitting}
        onClose={closeJornadaModal}
        onConfirm={handleConfirmJornada}
      />
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

/**
 * Celda de encabezado de tabla.
 * @param {{ children: any }} props
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
 * Valida formulario de elección.
 * @param {{ title: string, year: string, dateLocal: string }} form
 * @returns {string}
 */
function validateElectionForm(form) {
  if (!form.title?.trim()) return 'Ingrese el título de la elección.'
  if (!form.year?.trim()) return 'Ingrese la gestión.'
  if (!/^\d{4}$/.test(form.year.trim())) return 'La gestión debe ser un año válido (4 dígitos).'
  if (Number(form.year) < 2000) return 'La gestión debe ser mayor o igual a 2000.'
  if (!form.dateLocal) return 'Seleccione la fecha de elección.'
  return ''
}

/**
 * Normaliza una fecha ISO o `YYYY-MM-DD` a valor compatible con `<input type="date" />`.
 * @param {string} value
 * @returns {string}
 */
function toDateInputValue(value) {
  if (!value) return ''

  // Importante: el backend puede devolver `date` como ISO con hora (ej. 2026-04-10T00:00:00.000Z).
  // Si usamos new Date() en zona horaria -04, puede mostrarse como un día menos.
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/)
  if (match?.[1]) return match[1]

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (v) => String(v).padStart(2, '0')
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
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

/**
 * Extrae un mensaje amigable desde un error de Axios u otro.
 * @param {unknown} error
 * @param {string} fallback
 * @returns {string}
 */
function getFriendlyErrorMessage(error, fallback) {
  const responseData = error?.response?.data
  const message = responseData?.message

  if (Array.isArray(message)) {
    return message.filter(Boolean).join(' ')
  }

  if (typeof message === 'string' && message.trim()) {
    return message
  }

  return fallback
}

