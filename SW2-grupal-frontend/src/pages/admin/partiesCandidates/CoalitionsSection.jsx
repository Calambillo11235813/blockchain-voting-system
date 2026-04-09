import { useState } from 'react'
import {
  createFrente,
  deleteFrente,
  fetchFrentes,
  updateFrente,
} from '../../../services/electionsService'
import {
  Field,
  Th,
  readImageAsDataUrl,
  validateCoalitionForm,
  validateImageFile,
} from './shared'

/**
 * Gestión de Frentes.
 * @param {{
 *  positions: any[]
 *  coalitions: any[]
 *  setCoalitions: (value: any[]) => void
 *  isLoading: boolean
 *  isBusy: boolean
 *  isCreatingFrente: boolean
 *  setIsCreatingFrente: (value: boolean) => void
 *  setErrorMessage: (value: string) => void
 *  setSuccessMessage: (value: string) => void
 * }} props
 * @returns {import('react').JSX.Element}
 */
export default function CoalitionsSection({
  positions,
  coalitions,
  setCoalitions,
  isLoading,
  isBusy,
  isCreatingFrente,
  setIsCreatingFrente,
  setErrorMessage,
  setSuccessMessage,
}) {
  const [editingCoalitionId, setEditingCoalitionId] = useState('')
  const [coalitionForm, setCoalitionForm] = useState(() => ({
    nombreFrente: '',
    sigla: '',
    cargoId: '',
    logoFile: null,
    logoPreview: '',
    existingLogoUrl: '',
  }))

  const handleCreateFrente = async () => {
    setErrorMessage('')
    setSuccessMessage('')

    const validationError = validateCoalitionForm(coalitionForm)
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    try {
      setIsCreatingFrente(true)
      const logoUrl = coalitionForm.logoFile
        ? await readImageAsDataUrl(coalitionForm.logoFile)
        : ''

      if (editingCoalitionId) {
        await updateFrente(editingCoalitionId, {
          nombreFrente: coalitionForm.nombreFrente.trim(),
          sigla: coalitionForm.sigla.trim().toUpperCase(),
          cargoId: coalitionForm.cargoId,
          ...(logoUrl ? { logoUrl } : {}),
        })
        setSuccessMessage('Frente actualizado correctamente.')
      } else {
        await createFrente({
          nombreFrente: coalitionForm.nombreFrente.trim(),
          sigla: coalitionForm.sigla.trim().toUpperCase(),
          cargoId: coalitionForm.cargoId,
          ...(logoUrl ? { logoUrl } : {}),
        })
        setSuccessMessage('Frente registrado correctamente.')
      }

      const updatedFrentes = await fetchFrentes()
      setCoalitions(updatedFrentes)
      setEditingCoalitionId('')
      setCoalitionForm({
        nombreFrente: '',
        sigla: '',
        cargoId: '',
        logoFile: null,
        logoPreview: '',
        existingLogoUrl: '',
      })
    } catch {
      setErrorMessage('Hubo un problema al guardar el frente. Inténtelo más tarde.')
    } finally {
      setIsCreatingFrente(false)
    }
  }

  const handleEditCoalition = (coalition) => {
    setErrorMessage('')
    setSuccessMessage('')
    setEditingCoalitionId(coalition.id)
    setCoalitionForm({
      nombreFrente: coalition.nombreFrente || '',
      sigla: coalition.sigla || '',
      cargoId: coalition?.cargo?.id || '',
      logoFile: null,
      logoPreview: coalition.logoUrl || '',
      existingLogoUrl: coalition.logoUrl || '',
    })
  }

  const handleDeleteCoalition = async (coalitionId) => {
    setErrorMessage('')
    setSuccessMessage('')
    try {
      await deleteFrente(coalitionId)
      const updatedFrentes = await fetchFrentes()
      setCoalitions(updatedFrentes)
      setSuccessMessage('Frente eliminado correctamente.')

      if (editingCoalitionId === coalitionId) {
        setEditingCoalitionId('')
        setCoalitionForm({
          nombreFrente: '',
          sigla: '',
          cargoId: '',
          logoFile: null,
          logoPreview: '',
          existingLogoUrl: '',
        })
      }
    } catch {
      setErrorMessage('No se pudo eliminar el frente. Inténtelo más tarde.')
    }
  }

  const handleFrenteLogoChange = async (file) => {
    setErrorMessage('')
    setSuccessMessage('')

    const validationError = validateImageFile(file)
    if (validationError) {
      setErrorMessage(validationError)
      setCoalitionForm((prev) => ({ ...prev, logoFile: null, logoPreview: '' }))
      return
    }

    const preview = await readImageAsDataUrl(file)
    setCoalitionForm((prev) => ({
      ...prev,
      logoFile: file,
      logoPreview: preview,
    }))
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-blue-900">Gestión de Frentes</h3>
          <p className="mt-1 text-sm text-slate-700">Visualiza y registra frentes por cargo.</p>
        </div>
        <div className="flex items-center gap-2">
          {editingCoalitionId ? (
            <button
              type="button"
              onClick={() => {
                setErrorMessage('')
                setSuccessMessage('')
                setEditingCoalitionId('')
                setCoalitionForm({
                  nombreFrente: '',
                  sigla: '',
                  cargoId: '',
                  logoFile: null,
                  logoPreview: '',
                  existingLogoUrl: '',
                })
              }}
              disabled={isBusy}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              Cancelar
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleCreateFrente}
            disabled={isBusy}
            className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          >
            {isCreatingFrente
              ? 'Guardando…'
              : editingCoalitionId
                ? 'Actualizar frente'
                : 'Registrar frente'}
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre del frente">
          <input
            value={coalitionForm.nombreFrente}
            onChange={(e) =>
              setCoalitionForm((prev) => ({ ...prev, nombreFrente: e.target.value }))
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            placeholder="Ej. Renovación Estudiantil"
            disabled={isBusy}
          />
        </Field>

        <Field label="Sigla">
          <input
            value={coalitionForm.sigla}
            onChange={(e) => setCoalitionForm((prev) => ({ ...prev, sigla: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            placeholder="Ej. RE"
            disabled={isBusy}
          />
        </Field>

        <Field label="Cargo">
          <select
            value={coalitionForm.cargoId}
            onChange={(e) => setCoalitionForm((prev) => ({ ...prev, cargoId: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            disabled={isBusy}
          >
            <option value="">Seleccione un cargo</option>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.nombre}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Logo (opcional)">
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFrenteLogoChange(file)
                e.target.value = ''
              }}
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-800"
              disabled={isBusy}
            />
            {coalitionForm.logoPreview ? (
              <img
                src={coalitionForm.logoPreview}
                alt="Logo"
                className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
              />
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-600">Formatos permitidos: JPG, PNG, WEBP (máx. 5MB)</p>
        </Field>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <Th>Frente</Th>
              <Th>Sigla</Th>
              <Th>Cargo</Th>
              <Th>Logo</Th>
              <Th>
                <span className="block text-center">Acciones</span>
              </Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {isLoading ? (
              <tr>
                <td className="px-4 py-3 text-sm text-slate-700" colSpan={5}>
                  Cargando frentes…
                </td>
              </tr>
            ) : coalitions.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-sm text-slate-700" colSpan={5}>
                  No hay frentes registrados.
                </td>
              </tr>
            ) : (
              coalitions.map((coalition) => (
                <tr key={coalition.id}>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">{coalition.nombreFrente}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{coalition.sigla}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{coalition?.cargo?.nombre || '—'}</td>
                  <td className="px-4 py-3">
                    {coalition.logoUrl ? (
                      <img
                        src={coalition.logoUrl}
                        alt="Logo"
                        className="h-9 w-9 rounded-lg border border-slate-200 object-cover"
                      />
                    ) : (
                      <span className="text-sm text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditCoalition(coalition)}
                        disabled={isBusy}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCoalition(coalition.id)}
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
  )
}
