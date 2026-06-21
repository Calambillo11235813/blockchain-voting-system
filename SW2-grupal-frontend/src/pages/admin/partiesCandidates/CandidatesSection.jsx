import { useEffect, useMemo, useState } from 'react'
import {
  createCandidate,
  deleteCandidate,
  fetchCandidates,
  updateCandidate,
} from '../../../services/electionsService'
import { handleMutationApiError } from '../../../utils/apiErrorUtils'
import { READ_ONLY_ELECTION_HELP } from '../../../utils/electionConstants'
import {
  ALCANCE_LABELS,
  ALCANCE_PAPELETA,
  formatAmbito,
  formatPapeletaLabel,
  getRolesForPapeleta,
} from '../../../utils/papeletaConstants'
import {
  ActionButton,
  Field,
  ReadOnlyElectionBanner,
  Th,
  readImageAsDataUrl,
  validateCandidateForm,
  validateImageFile,
} from './shared'

/** @typedef {'TODOS' | import('../../../utils/papeletaConstants').AlcancePapeleta} FiltroAlcanceCandidatos */

const FILTRO_ALCANCE_OPCIONES = [
  { value: 'TODOS', label: 'Todos' },
  { value: ALCANCE_PAPELETA.GLOBAL, label: ALCANCE_LABELS.GLOBAL },
  { value: ALCANCE_PAPELETA.FACULTAD, label: ALCANCE_LABELS.FACULTAD },
  { value: ALCANCE_PAPELETA.CARRERA, label: ALCANCE_LABELS.CARRERA },
]

/**
 * Resuelve la papeleta asociada a un candidato.
 * @param {object} candidate
 * @param {Map<string, object>} papeletaById
 * @returns {object | null}
 */
function resolveCandidatePapeleta(candidate, papeletaById) {
  const cargoId = candidate?.eleccionCargo?.id
  if (candidate?.eleccionCargo) return candidate.eleccionCargo
  if (cargoId) return papeletaById.get(cargoId) ?? null
  return null
}

/**
 * @param {object | null} papeleta
 * @returns {string}
 */
function resolvePapeletaAlcance(papeleta) {
  return papeleta?.alcance || ALCANCE_PAPELETA.GLOBAL
}

/**
 * Gestión de Candidatos.
 * @param {{
 *  eleccionId: string
 *  papeletas: any[]
 *  coalitions: any[]
 *  candidates: any[]
 *  setCandidates: (value: any[]) => void
 *  isLoading: boolean
 *  isBusy: boolean
 *  isElectionReadOnly: boolean
 *  isCreatingCandidate: boolean
 *  setIsCreatingCandidate: (value: boolean) => void
 *  setErrorMessage: (value: string) => void
 *  setSuccessMessage: (value: string) => void
 *  setWarningMessage: (value: string) => void
 * }} props
 * @returns {import('react').JSX.Element}
 */
export default function CandidatesSection({
  eleccionId,
  papeletas,
  coalitions,
  candidates,
  setCandidates,
  isLoading,
  isBusy,
  isElectionReadOnly,
  isCreatingCandidate,
  setIsCreatingCandidate,
  setErrorMessage,
  setSuccessMessage,
  setWarningMessage,
}) {
  const [editingCandidateId, setEditingCandidateId] = useState('')
  const [filtroAlcance, setFiltroAlcance] = useState(/** @type {FiltroAlcanceCandidatos} */ ('TODOS'))

  const [candidateForm, setCandidateForm] = useState(() => ({
    ci: '',
    nombres: '',
    apellidos: '',
    eleccionCargoId: '',
    rolEspecifico: '',
    frenteId: '',
    fotoFile: null,
    fotoPreview: '',
    existingFotoUrl: '',
  }))

  const resetCandidateForm = () => ({
    ci: '',
    nombres: '',
    apellidos: '',
    eleccionCargoId: '',
    rolEspecifico: '',
    frenteId: '',
    fotoFile: null,
    fotoPreview: '',
    existingFotoUrl: '',
  })

  const coalitionById = useMemo(() => {
    const map = new Map()
    for (const coalition of coalitions) {
      map.set(coalition.id, coalition)
    }
    return map
  }, [coalitions])

  const papeletaById = useMemo(() => {
    const map = new Map()
    for (const papeleta of papeletas) {
      map.set(papeleta.id, papeleta)
    }
    return map
  }, [papeletas])

  const selectedPapeleta = useMemo(
    () => papeletaById.get(candidateForm.eleccionCargoId) ?? null,
    [papeletaById, candidateForm.eleccionCargoId],
  )

  const rolesForSelectedPapeleta = useMemo(
    () => (selectedPapeleta ? getRolesForPapeleta(selectedPapeleta) : []),
    [selectedPapeleta],
  )

  const filteredCandidates = useMemo(() => {
    if (filtroAlcance === 'TODOS') return candidates

    return candidates.filter((candidate) => {
      const papeleta = resolveCandidatePapeleta(candidate, papeletaById)
      return resolvePapeletaAlcance(papeleta) === filtroAlcance
    })
  }, [candidates, filtroAlcance, papeletaById])

  const formDisabled = isBusy || isElectionReadOnly

  useEffect(() => {
    setFiltroAlcance('TODOS')
  }, [eleccionId])

  useEffect(() => {
    if (!isElectionReadOnly) return
    setEditingCandidateId('')
    setCandidateForm(resetCandidateForm())
  }, [isElectionReadOnly])

  const handlePapeletaChange = (eleccionCargoId) => {
    const papeleta = papeletaById.get(eleccionCargoId)
    const roles = papeleta ? getRolesForPapeleta(papeleta) : []
    const rolEspecifico = roles.length === 1 ? roles[0] : ''

    setCandidateForm((prev) => ({
      ...prev,
      eleccionCargoId,
      rolEspecifico,
    }))
  }

  const handleCreateCandidate = async () => {
    setErrorMessage('')
    setSuccessMessage('')
    setWarningMessage('')

    if (isElectionReadOnly) {
      setWarningMessage(
        '🔒 Acción bloqueada: La elección ya ha sido sellada y no permite modificaciones.',
      )
      return
    }

    const validationError = validateCandidateForm(candidateForm)
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    try {
      setIsCreatingCandidate(true)
      const fotoUrl = candidateForm.fotoFile ? await readImageAsDataUrl(candidateForm.fotoFile) : ''

      const payload = {
        ci: candidateForm.ci.trim(),
        nombres: candidateForm.nombres.trim(),
        apellidos: candidateForm.apellidos.trim(),
        frenteId: candidateForm.frenteId,
        eleccionCargoId: candidateForm.eleccionCargoId,
        rolEspecifico: candidateForm.rolEspecifico,
        ...(fotoUrl ? { fotoUrl } : {}),
      }

      if (editingCandidateId) {
        await updateCandidate(editingCandidateId, payload)
        setSuccessMessage('Actualización exitosa')
      } else {
        await createCandidate(payload)
        setSuccessMessage('Registro exitoso')
      }

      const updatedCandidates = await fetchCandidates(eleccionId)
      setCandidates(updatedCandidates)
      setEditingCandidateId('')
      setCandidateForm(resetCandidateForm())
    } catch (error) {
      handleMutationApiError(error, {
        setWarningMessage,
        setErrorMessage,
        defaultMessage: 'Hubo un problema al guardar el candidato. Inténtelo más tarde.',
      })
    } finally {
      setIsCreatingCandidate(false)
    }
  }

  const handleEditCandidate = (candidate) => {
    if (isElectionReadOnly) return
    setErrorMessage('')
    setSuccessMessage('')
    setWarningMessage('')

    setEditingCandidateId(candidate.id)
    setCandidateForm({
      ci: candidate.ci || '',
      nombres: candidate.nombres || '',
      apellidos: candidate.apellidos || '',
      eleccionCargoId: candidate?.eleccionCargo?.id || '',
      rolEspecifico: candidate?.rolEspecifico || '',
      frenteId: candidate?.frente?.id || '',
      fotoFile: null,
      fotoPreview: candidate.fotoUrl || '',
      existingFotoUrl: candidate.fotoUrl || '',
    })
  }

  const handleDeleteCandidate = async (candidateId) => {
    setErrorMessage('')
    setSuccessMessage('')
    setWarningMessage('')

    if (isElectionReadOnly) {
      setWarningMessage(
        '🔒 Acción bloqueada: La elección ya ha sido sellada y no permite modificaciones.',
      )
      return
    }

    try {
      await deleteCandidate(candidateId)
      const updatedCandidates = await fetchCandidates(eleccionId)
      setCandidates(updatedCandidates)
      setSuccessMessage('Eliminación exitosa')

      if (editingCandidateId === candidateId) {
        setEditingCandidateId('')
        setCandidateForm(resetCandidateForm())
      }
    } catch (error) {
      handleMutationApiError(error, {
        setWarningMessage,
        setErrorMessage,
        defaultMessage: 'No se pudo eliminar el candidato. Inténtelo más tarde.',
      })
    }
  }

  const handleCandidatePhotoChange = async (file) => {
    setErrorMessage('')
    setSuccessMessage('')

    const validationError = validateImageFile(file)
    if (validationError) {
      setErrorMessage(validationError)
      setCandidateForm((prev) => ({ ...prev, fotoFile: null, fotoPreview: '' }))
      return
    }

    const preview = await readImageAsDataUrl(file)
    setCandidateForm((prev) => ({
      ...prev,
      fotoFile: file,
      fotoPreview: preview,
    }))
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-blue-900">Gestión de Candidatos</h3>
          <p className="mt-1 text-sm text-slate-700">
            Registra candidatos indicando frente, papeleta y el rol específico dentro de la fórmula.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editingCandidateId ? (
            <button
              type="button"
              onClick={() => {
                setErrorMessage('')
                setSuccessMessage('')
                setEditingCandidateId('')
                setCandidateForm(resetCandidateForm())
              }}
              disabled={isBusy}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              Cancelar
            </button>
          ) : null}

          <ActionButton
            type="button"
            onClick={handleCreateCandidate}
            disabled={isBusy || coalitions.length === 0 || papeletas.length === 0}
            readOnly={isElectionReadOnly}
            readOnlyTitle={READ_ONLY_ELECTION_HELP}
            className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          >
            {isCreatingCandidate
              ? 'Guardando…'
              : editingCandidateId
                ? 'Actualizar candidato'
                : 'Registrar candidato'}
          </ActionButton>
        </div>
      </div>

      {isElectionReadOnly ? <ReadOnlyElectionBanner /> : null}

      {coalitions.length === 0 ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Debe registrar al menos un frente antes de agregar candidatos.
        </p>
      ) : null}

      {papeletas.length === 0 ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Este proceso electoral aún no tiene papeletas configuradas. Créelas en Gestión de Elección.
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Carnet de identidad (CI)">
          <input
            value={candidateForm.ci}
            onChange={(e) => setCandidateForm((prev) => ({ ...prev, ci: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            placeholder="Ej. 12345678"
            disabled={formDisabled}
            inputMode="numeric"
          />
        </Field>

        <Field label="Nombres">
          <input
            value={candidateForm.nombres}
            onChange={(e) => setCandidateForm((prev) => ({ ...prev, nombres: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            placeholder="Ej. María Fernanda"
            disabled={formDisabled}
          />
        </Field>

        <Field label="Apellidos">
          <input
            value={candidateForm.apellidos}
            onChange={(e) => setCandidateForm((prev) => ({ ...prev, apellidos: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            placeholder="Ej. Pérez García"
            disabled={formDisabled}
          />
        </Field>

        <Field label="Papeleta">
          <select
            value={candidateForm.eleccionCargoId}
            onChange={(e) => handlePapeletaChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            disabled={formDisabled || papeletas.length === 0}
          >
            <option value="">Seleccione una papeleta</option>
            {papeletas.map((papeleta) => (
              <option key={papeleta.id} value={papeleta.id}>
                {formatPapeletaLabel(papeleta)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Cargo al que postula">
          <select
            value={candidateForm.rolEspecifico}
            onChange={(e) =>
              setCandidateForm((prev) => ({ ...prev, rolEspecifico: e.target.value }))
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            disabled={formDisabled || !candidateForm.eleccionCargoId}
          >
            <option value="">
              {candidateForm.eleccionCargoId
                ? 'Seleccione el rol dentro de la fórmula'
                : 'Seleccione una papeleta primero'}
            </option>
            {rolesForSelectedPapeleta.map((rol) => (
              <option key={rol} value={rol}>
                {rol}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Frente">
          <select
            value={candidateForm.frenteId}
            onChange={(e) => setCandidateForm((prev) => ({ ...prev, frenteId: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            disabled={formDisabled || coalitions.length === 0}
          >
            <option value="">
              {coalitions.length === 0 ? 'Registre un frente primero' : 'Seleccione un frente'}
            </option>
            {coalitions.map((coalition) => (
              <option key={coalition.id} value={coalition.id}>
                {coalition.nombreFrente} ({coalition.sigla})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Foto (opcional)">
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleCandidatePhotoChange(file)
                e.target.value = ''
              }}
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-800"
              disabled={formDisabled}
            />
            {candidateForm.fotoPreview ? (
              <img
                src={candidateForm.fotoPreview}
                alt="Foto"
                className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
              />
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-600">Formatos permitidos: JPG, PNG, WEBP (máx. 10MB)</p>
        </Field>
      </div>

      <div className="mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Filtrar por ámbito
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Segmenta la tabla según el alcance de la papeleta del candidato.
            </p>
          </div>
          <p className="text-xs text-slate-600">
            {filteredCandidates.length} de {candidates.length} candidato
            {candidates.length === 1 ? '' : 's'}
          </p>
        </div>

        <div
          className="mt-3 flex flex-wrap gap-2"
          role="group"
          aria-label="Filtro por ámbito de papeleta"
        >
          {FILTRO_ALCANCE_OPCIONES.map((opcion) => {
            const isActive = filtroAlcance === opcion.value
            return (
              <button
                key={opcion.value}
                type="button"
                onClick={() => setFiltroAlcance(opcion.value)}
                disabled={isBusy}
                className={
                  isActive
                    ? 'rounded-full border border-blue-900 bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60'
                    : 'rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-60'
                }
              >
                {opcion.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <Th>Nombre</Th>
              <Th>Frente</Th>
              <Th>Cargo</Th>
              <Th>Ámbito</Th>
              <Th>Foto</Th>
              <Th>
                <span className="block text-center">Acciones</span>
              </Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {isLoading ? (
              <tr>
                <td className="px-4 py-3 text-sm text-slate-700" colSpan={6}>
                  Cargando candidatos…
                </td>
              </tr>
            ) : candidates.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-sm text-slate-700" colSpan={6}>
                  No hay candidatos registrados en este proceso electoral.
                </td>
              </tr>
            ) : filteredCandidates.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-sm text-slate-700" colSpan={6}>
                  No hay candidatos registrados en este ámbito por el momento.
                </td>
              </tr>
            ) : (
              filteredCandidates.map((candidate) => {
                const coalition = candidate?.frente?.id ? coalitionById.get(candidate.frente.id) : null
                const coalitionName = coalition?.nombreFrente || candidate?.frente?.nombreFrente || '—'
                const fullName = `${candidate.nombres} ${candidate.apellidos}`.trim()
                const papeleta = resolveCandidatePapeleta(candidate, papeletaById)
                const cargoLabel = candidate.rolEspecifico?.trim() || 'Sin rol asignado'
                const ambitoLabel = formatAmbito(papeleta)

                return (
                  <tr key={candidate.id}>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{fullName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{coalitionName}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{cargoLabel}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{ambitoLabel}</td>
                    <td className="px-4 py-3">
                      {candidate.fotoUrl ? (
                        <img
                          src={candidate.fotoUrl}
                          alt={fullName}
                          className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
                        />
                      ) : (
                        <span className="text-sm text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <ActionButton
                          type="button"
                          onClick={() => handleEditCandidate(candidate)}
                          disabled={isBusy}
                          readOnly={isElectionReadOnly}
                          readOnlyTitle={READ_ONLY_ELECTION_HELP}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                        >
                          Editar
                        </ActionButton>
                        <ActionButton
                          type="button"
                          onClick={() => handleDeleteCandidate(candidate.id)}
                          disabled={isBusy}
                          readOnly={isElectionReadOnly}
                          readOnlyTitle={READ_ONLY_ELECTION_HELP}
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                        >
                          Eliminar
                        </ActionButton>
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
  )
}
