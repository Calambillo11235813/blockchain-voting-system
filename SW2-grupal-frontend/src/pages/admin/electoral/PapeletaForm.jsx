import { useEffect, useState } from 'react'
import { fetchCarrerasPadron, fetchFacultadesPadron } from '../../../services/electionsService'
import {
  ALCANCE_LABELS,
  ALCANCE_PAPELETA,
  DEFAULT_CARGO_NAMES,
} from '../../../utils/papeletaConstants'

/**
 * Formulario dinámico para crear/editar papeletas (EleccionCargo) con alcance multiterritorial.
 *
 * @param {{
 *  positionForm: object,
 *  setPositionForm: import('react').Dispatch<import('react').SetStateAction<any>>,
 *  elections: Array<{ id: string, titulo: string, gestion: number }>,
 *  isBusy: boolean,
 *  isEditing?: boolean,
 *  onCatalogError?: (message: string) => void,
 * }} props
 * @returns {import('react').JSX.Element}
 */
export default function PapeletaForm({
  positionForm,
  setPositionForm,
  elections,
  isBusy,
  isEditing = false,
  onCatalogError,
}) {
  const [facultades, setFacultades] = useState([])
  const [carreras, setCarreras] = useState([])
  const [isLoadingFacultades, setIsLoadingFacultades] = useState(false)
  const [isLoadingCarreras, setIsLoadingCarreras] = useState(false)
  const [catalogHint, setCatalogHint] = useState('')

  const needsFacultad =
    positionForm.alcance === ALCANCE_PAPELETA.FACULTAD ||
    positionForm.alcance === ALCANCE_PAPELETA.CARRERA

  const needsCarrera = positionForm.alcance === ALCANCE_PAPELETA.CARRERA

  useEffect(() => {
    if (!needsFacultad || !positionForm.electionId) {
      setFacultades([])
      setCatalogHint('')
      return undefined
    }

    let isMounted = true

    async function loadFacultades() {
      try {
        setIsLoadingFacultades(true)
        setCatalogHint('')
        const data = await fetchFacultadesPadron(positionForm.electionId)
        if (!isMounted) return
        setFacultades(data)

        if (data.length === 0) {
          setCatalogHint(
            'No hay facultades en el padrón. Cargue el padrón Excel del proceso antes de crear papeletas por facultad o carrera.',
          )
        }
      } catch {
        if (!isMounted) return
        setFacultades([])
        onCatalogError?.('No se pudo cargar el catálogo de facultades del padrón.')
      } finally {
        if (isMounted) setIsLoadingFacultades(false)
      }
    }

    loadFacultades()
    return () => {
      isMounted = false
    }
  }, [needsFacultad, positionForm.electionId, onCatalogError])

  useEffect(() => {
    if (!needsCarrera || !positionForm.electionId || !positionForm.codFacultad) {
      setCarreras([])
      return undefined
    }

    let isMounted = true

    async function loadCarreras() {
      try {
        setIsLoadingCarreras(true)
        const data = await fetchCarrerasPadron(positionForm.electionId, positionForm.codFacultad)
        if (!isMounted) return
        setCarreras(data)
      } catch {
        if (!isMounted) return
        setCarreras([])
        onCatalogError?.('No se pudo cargar el catálogo de carreras del padrón.')
      } finally {
        if (isMounted) setIsLoadingCarreras(false)
      }
    }

    loadCarreras()
    return () => {
      isMounted = false
    }
  }, [needsCarrera, positionForm.electionId, positionForm.codFacultad, onCatalogError])

  const handleAlcanceChange = (nextAlcance) => {
    setPositionForm((prev) => ({
      ...prev,
      alcance: nextAlcance,
      name: DEFAULT_CARGO_NAMES[nextAlcance] || prev.name,
      codFacultad: '',
      facultadNombre: '',
      codCarrera: '',
      carreraNombre: '',
    }))
  }

  const handleElectionChange = (electionId) => {
    setPositionForm((prev) => ({
      ...prev,
      electionId,
      codFacultad: '',
      facultadNombre: '',
      codCarrera: '',
      carreraNombre: '',
    }))
  }

  const handleFacultadChange = (codFacultad) => {
    const selected = facultades.find((f) => f.codFacultad === codFacultad)
    setPositionForm((prev) => ({
      ...prev,
      codFacultad,
      facultadNombre: selected?.facultadNombre || '',
      codCarrera: '',
      carreraNombre: '',
    }))
  }

  const handleCarreraChange = (codCarrera) => {
    const selected = carreras.find((c) => c.codCarrera === codCarrera)
    setPositionForm((prev) => ({
      ...prev,
      codCarrera,
      carreraNombre: selected?.carreraNombre || '',
    }))
  }

  return (
    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Elección">
        <select
          value={positionForm.electionId}
          onChange={(e) => handleElectionChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          disabled={isBusy || isEditing}
        >
          {elections.map((election) => (
            <option key={election.id} value={election.id}>
              {election.titulo} ({election.gestion})
            </option>
          ))}
        </select>
      </Field>

      <Field label="Alcance de la papeleta">
        <select
          value={positionForm.alcance}
          onChange={(e) => handleAlcanceChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          disabled={isBusy || isEditing}
        >
          {Object.entries(ALCANCE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Nombre del cargo">
        <input
          value={positionForm.name}
          onChange={(e) => setPositionForm((prev) => ({ ...prev, name: e.target.value }))}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          placeholder="Nombre de la papeleta"
          disabled={isBusy}
        />
      </Field>

      {needsFacultad ? (
        <Field label="Facultad (del padrón)">
          <select
            value={positionForm.codFacultad}
            onChange={(e) => handleFacultadChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            disabled={isBusy || isEditing || isLoadingFacultades || facultades.length === 0}
          >
            <option value="">
              {isLoadingFacultades ? 'Cargando facultades…' : 'Seleccione una facultad'}
            </option>
            {facultades.map((facultad) => (
              <option key={facultad.codFacultad} value={facultad.codFacultad}>
                {facultad.facultadNombre} ({facultad.codFacultad})
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      {needsCarrera ? (
        <Field label="Carrera (del padrón)">
          <select
            value={positionForm.codCarrera}
            onChange={(e) => handleCarreraChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            disabled={
              isBusy ||
              isEditing ||
              !positionForm.codFacultad ||
              isLoadingCarreras ||
              carreras.length === 0
            }
          >
            <option value="">
              {!positionForm.codFacultad
                ? 'Primero seleccione una facultad'
                : isLoadingCarreras
                  ? 'Cargando carreras…'
                  : 'Seleccione una carrera'}
            </option>
            {carreras.map((carrera) => (
              <option key={carrera.codCarrera} value={carrera.codCarrera}>
                {carrera.carreraNombre} ({carrera.codCarrera})
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      {isEditing ? (
        <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          El alcance y los códigos territoriales no se pueden modificar al editar. Solo puede cambiar el nombre del cargo.
        </div>
      ) : null}

      {catalogHint ? (
        <div className="sm:col-span-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
          {catalogHint}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Wrapper visual de campo para formularios.
 * @param {{ label: string, children: import('react').ReactNode }} props
 */
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-900">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
