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
} from '../../../services/electionsService'

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
    dateLocal: '',
    isActive: true,
    isSurnameRestrictionActive: true,
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
      dateLocal: '',
      isActive: true,
      isSurnameRestrictionActive: true,
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
      fecha: electionForm.dateLocal,
      estaActiva: Boolean(electionForm.isActive),
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
      isActive: Boolean(election.estaActiva),
      isSurnameRestrictionActive: Boolean(election.restriccionAlfabeticaActiva ?? true),
    })
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

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(electionForm.isSurnameRestrictionActive)}
                  onChange={(e) => {
                    const nextValue = e.target.checked
                    setElectionForm((prev) => ({ ...prev, isSurnameRestrictionActive: nextValue }))

                    // Guardado inmediato solo en modo edición.
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
                  <Th>Acciones</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-3 text-sm text-slate-700" colSpan={7}>
                      Cargando elecciones…
                    </td>
                  </tr>
                ) : elections.length === 0 ? (
                  <tr>
                    <td className="px-4 py-3 text-sm text-slate-700" colSpan={7}>
                      No hay elecciones registradas.
                    </td>
                  </tr>
                ) : (
                  elections.map((election) => (
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
                          disabled={isBusy}
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
                        {position?.eleccion ? `${position.eleccion.titulo} (${position.eleccion.gestion})` : '—'}
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

