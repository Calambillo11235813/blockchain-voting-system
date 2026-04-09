import { useEffect, useMemo, useState } from 'react'
import {
  createElection,
  createPosition,
  deleteElection,
  deletePosition,
  fetchElections,
  fetchPositions,
  updateElection,
  updatePosition,
} from '../../services/electionsService'

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

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [editingElectionId, setEditingElectionId] = useState('')
  const [editingPositionId, setEditingPositionId] = useState('')

  const [electionForm, setElectionForm] = useState(() => ({
    title: '',
    year: '',
    startDateTimeLocal: '',
    endDateTimeLocal: '',
    isActive: true,
  }))

  const [positionForm, setPositionForm] = useState(() => ({
    name: '',
    faculty: '',
    electionId: '',
  }))

  const electionLabelById = useMemo(() => {
    const map = new Map()
    for (const election of elections) {
      map.set(election.id, `${election.titulo} (${election.gestion})`)
    }
    return map
  }, [elections])

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
          setPositionForm((prev) => (prev.electionId ? prev : { ...prev, electionId: electionsData[0].id }))
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

  const isBusy = isLoading || isSavingElection || isSavingPosition

  const resetMessages = () => {
    setErrorMessage('')
    setSuccessMessage('')
  }

  const resetElectionForm = () => {
    setEditingElectionId('')
    setElectionForm({
      title: '',
      year: '',
      startDateTimeLocal: '',
      endDateTimeLocal: '',
      isActive: true,
    })
  }

  const resetPositionForm = () => {
    setEditingPositionId('')
    setPositionForm({
      name: '',
      faculty: '',
      electionId: elections[0]?.id || '',
    })
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
      fechaInicio: toIsoFromDateTimeLocal(electionForm.startDateTimeLocal),
      fechaFin: toIsoFromDateTimeLocal(electionForm.endDateTimeLocal),
      estaActiva: Boolean(electionForm.isActive),
    }

    const dateValidationError = validateElectionDates(payload.fechaInicio, payload.fechaFin)
    if (dateValidationError) {
      setErrorMessage(dateValidationError)
      return
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
      startDateTimeLocal: toDateTimeLocal(election.fechaInicio),
      endDateTimeLocal: toDateTimeLocal(election.fechaFin),
      isActive: Boolean(election.estaActiva),
    })
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

    const payload = {
      nombre: positionForm.name.trim(),
      facultad: positionForm.faculty.trim(),
      eleccionId: positionForm.electionId,
    }

    try {
      setIsSavingPosition(true)
      if (editingPositionId) {
        await updatePosition(editingPositionId, payload)
        setSuccessMessage('Cargo actualizado correctamente.')
      } else {
        await createPosition(payload)
        setSuccessMessage('Cargo creado correctamente.')
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
      faculty: position.facultad || '',
      electionId: position?.eleccion?.id || positionForm.electionId,
    })
  }

  const handleDeletePosition = async (positionId) => {
    resetMessages()
    try {
      setIsSavingPosition(true)
      await deletePosition(positionId)
      setSuccessMessage('Cargo eliminado correctamente.')
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
        <h2 className="text-base font-semibold text-blue-900">Gestión de Elección</h2>
        <p className="mt-1 text-sm text-slate-700">
          Primero crea la elección y luego registra los cargos correspondientes.
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
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
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

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <Field label="Fecha y hora de inicio">
              <input
                type="datetime-local"
                value={electionForm.startDateTimeLocal}
                onChange={(e) =>
                  setElectionForm((prev) => ({ ...prev, startDateTimeLocal: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                disabled={isBusy}
              />
            </Field>

            <Field label="Fecha y hora de fin">
              <input
                type="datetime-local"
                value={electionForm.endDateTimeLocal}
                onChange={(e) =>
                  setElectionForm((prev) => ({ ...prev, endDateTimeLocal: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                disabled={isBusy}
              />
            </Field>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(electionForm.isActive)}
                  onChange={(e) => setElectionForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  disabled={isBusy}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm font-semibold text-slate-900">Elección activa</span>
              </label>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Título</Th>
                  <Th>Gestión</Th>
                  <Th>Inicio</Th>
                  <Th>Fin</Th>
                  <Th>Estado</Th>
                  <Th>Acciones</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-3 text-sm text-slate-700" colSpan={6}>
                      Cargando elecciones…
                    </td>
                  </tr>
                ) : elections.length === 0 ? (
                  <tr>
                    <td className="px-4 py-3 text-sm text-slate-700" colSpan={6}>
                      No hay elecciones registradas.
                    </td>
                  </tr>
                ) : (
                  elections.map((election) => (
                    <tr key={election.id}>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{election.titulo}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{election.gestion}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDateTime(election.fechaInicio)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDateTime(election.fechaFin)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {election.estaActiva ? 'Activa' : 'Inactiva'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditElection(election)}
                            disabled={isBusy}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteElection(election.id)}
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
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-blue-900">Cargos</h3>
              <p className="mt-1 text-sm text-slate-700">Registra los cargos por elección.</p>
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
                disabled={isBusy || elections.length === 0}
                className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              >
                {isSavingPosition
                  ? 'Guardando…'
                  : editingPositionId
                    ? 'Actualizar cargo'
                    : 'Crear cargo'}
              </button>
            </div>
          </div>

          {elections.length === 0 ? (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Primero cree una elección</p>
              <p className="mt-1 text-sm text-slate-700">
                Para registrar cargos, debe existir al menos una elección.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nombre del cargo">
                <input
                  value={positionForm.name}
                  onChange={(e) => setPositionForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  placeholder="Ej. Decano"
                  disabled={isBusy}
                />
              </Field>

              <Field label="Facultad">
                <input
                  value={positionForm.faculty}
                  onChange={(e) => setPositionForm((prev) => ({ ...prev, faculty: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  placeholder="Ej. FICCT"
                  disabled={isBusy}
                />
              </Field>

              <Field label="Elección">
                <select
                  value={positionForm.electionId}
                  onChange={(e) => setPositionForm((prev) => ({ ...prev, electionId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  disabled={isBusy}
                >
                  {elections.map((election) => (
                    <option key={election.id} value={election.id}>
                      {election.titulo} ({election.gestion})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Cargo</Th>
                  <Th>Facultad</Th>
                  <Th>Elección</Th>
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
                ) : positions.length === 0 ? (
                  <tr>
                    <td className="px-4 py-3 text-sm text-slate-700" colSpan={4}>
                      No hay cargos registrados.
                    </td>
                  </tr>
                ) : (
                  positions.map((position) => (
                    <tr key={position.id}>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{position.nombre}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{position.facultad}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {position?.eleccion?.id ? electionLabelById.get(position.eleccion.id) || '—' : '—'}
                      </td>
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
        </section>
      </div>
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
 * @param {{ title: string, year: string, startDateTimeLocal: string, endDateTimeLocal: string }} form
 * @returns {string}
 */
function validateElectionForm(form) {
  if (!form.title?.trim()) return 'Ingrese el título de la elección.'
  if (!form.year?.trim()) return 'Ingrese la gestión.'
  if (!/^\d{4}$/.test(form.year.trim())) return 'La gestión debe ser un año válido (4 dígitos).'
  if (Number(form.year) < 2000) return 'La gestión debe ser mayor o igual a 2000.'
  if (!form.startDateTimeLocal) return 'Seleccione la fecha y hora de inicio.'
  if (!form.endDateTimeLocal) return 'Seleccione la fecha y hora de fin.'
  return ''
}

/**
 * Valida el orden de fechas de una elección.
 * @param {string} startIso
 * @param {string} endIso
 * @returns {string}
 */
function validateElectionDates(startIso, endIso) {
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Las fechas seleccionadas no son válidas.'
  }
  if (end.getTime() <= start.getTime()) {
    return 'La fecha de fin debe ser posterior a la fecha de inicio.'
  }
  return ''
}

/**
 * Valida formulario de cargo.
 * @param {{ name: string, faculty: string, electionId: string }} form
 * @returns {string}
 */
function validatePositionForm(form) {
  if (!form.name?.trim()) return 'Ingrese el nombre del cargo.'
  if (!form.faculty?.trim()) return 'Ingrese la facultad.'
  if (!form.electionId) return 'Seleccione una elección.'
  return ''
}

/**
 * Convierte un `datetime-local` a ISO.
 *
 * Nota: El navegador entrega fecha/hora local; se normaliza a ISO para el backend.
 *
 * @param {string} dateTimeLocal
 * @returns {string}
 */
function toIsoFromDateTimeLocal(dateTimeLocal) {
  const date = new Date(dateTimeLocal)
  return date.toISOString()
}

/**
 * Convierte una fecha ISO a `datetime-local`.
 * @param {string} iso
 * @returns {string}
 */
function toDateTimeLocal(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (value) => String(value).padStart(2, '0')
  const yyyy = date.getFullYear()
  const mm = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const min = pad(date.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

/**
 * Formatea ISO para mostrar en tabla.
 * @param {string} iso
 * @returns {string}
 */
function formatDateTime(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
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
