import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import WhitelistUpload from '../../../components/WhitelistUpload'
import PadronUploadSummary from '../../../components/PadronUploadSummary'
import { fetchElections } from '../../../services/electionsService'
import { fetchPadronElectoral, uploadWhitelistFile } from '../../../services/adminService'

/**
 * Sección de Padrón Electoral.
 *
 * Permite cargar el archivo Excel y ver el resultado de la carga,
 * así como listar los electores inscritos.
 *
 * @returns {import('react').JSX.Element}
 */
export default function GestionPadron() {
  const [elections, setElections] = useState([])
  const [selectedElectionId, setSelectedElectionId] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const [padronList, setPadronList] = useState([])
  const [padronMetadata, setPadronMetadata] = useState(null)
  const [isLoadingPadron, setIsLoadingPadron] = useState(false)
  const [estamentoFilter, setEstamentoFilter] = useState('')
  const [lastUploadResult, setLastUploadResult] = useState(null)

  const loadPadron = async (eleccionId, estamento = '') => {
    if (!eleccionId) {
      setPadronList([])
      return
    }
    try {
      setIsLoadingPadron(true)
      const result = await fetchPadronElectoral(eleccionId, 1, 1000, estamento)
      setPadronList(result?.data || [])
      setPadronMetadata(result?.metadata || null)
    } catch (err) {
      console.error('Error al cargar padrón:', err)
      setPadronList([])
    } finally {
      setIsLoadingPadron(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const data = await fetchElections()
        if (isMounted) {
          setElections(data)
          if (data.length > 0) {
            setSelectedElectionId(data[0].id)
            loadPadron(data[0].id)
          }
        }
      } catch (err) {
        console.error('Error al cargar elecciones:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [])

  const handleElectionChange = (e) => {
    const nextId = e.target.value
    setSelectedElectionId(nextId)
    setEstamentoFilter('')
    setLastUploadResult(null)
    loadPadron(nextId, '')
  }

  const handleUpload = async (file) => {
    if (!selectedElectionId) {
      throw new Error('Debe seleccionar una elección.')
    }
    const res = await uploadWhitelistFile(selectedElectionId, file)
    loadPadron(selectedElectionId, estamentoFilter)
    return res
  }

  const handleUploadSuccess = (data) => {
    setLastUploadResult(data)
  }

  const handleFilterChange = (nuevoEstamento) => {
    setEstamentoFilter(nuevoEstamento)
    loadPadron(selectedElectionId, nuevoEstamento)
  }

  const contadores = useMemo(() => {
    const total = padronMetadata?.pagination?.total ?? padronList.length
    const estudiantes = padronList.filter((row) => row.elector?.estamento === 'ESTUDIANTE').length
    const docentes = padronList.filter((row) => row.elector?.estamento === 'DOCENTE').length

    return { total, estudiantes, docentes }
  }, [padronList, padronMetadata])

  /** Docentes no tienen carrera; el backend puede repetir la facultad en ese campo. */
  function renderCarreraCell(elector) {
    if (elector?.estamento === 'DOCENTE') {
      return <span className="text-slate-400 italic">—</span>
    }

    if (elector?.carrera) {
      return elector.carrera
    }

    return <span className="text-slate-400 italic">—</span>
  }

  /** Estudiantes: registro universitario. Docentes: código docente (registroDocente) o registro. */
  function renderRegistroCell(elector) {
    const valor = elector?.estamento === 'DOCENTE'
      ? (elector.registroDocente || elector.registro)
      : elector?.registro

    if (valor) {
      return valor
    }

    return <span className="text-slate-400 italic">—</span>
  }

  const tableColumnCount = 7

  if (isLoading) {
    return <div className="p-4 text-slate-600">Cargando datos...</div>
  }

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-blue-900">Seleccionar Elección</h2>
        <p className="mt-1 text-sm text-slate-700">
          Elige la elección a la que asociarás este padrón electoral.
        </p>

        {elections.length === 0 ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p>No hay elecciones creadas.</p>
            <Link
              to="/admin/gestion-eleccion"
              className="mt-2 inline-block font-semibold text-blue-900 underline hover:text-blue-700"
            >
              Crear una elección primero
            </Link>
          </div>
        ) : (
          <div className="mt-4">
            <label className="mb-1 block text-sm font-semibold text-slate-900">
              Elección destino
            </label>
            <select
              value={selectedElectionId}
              onChange={handleElectionChange}
              className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="" disabled>Seleccione una elección</option>
              {elections.map((election) => (
                <option key={election.id} value={election.id}>
                  {election.titulo} ({election.gestion})
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {selectedElectionId && (
        <>
          <WhitelistUpload onUpload={handleUpload} onUploadSuccess={handleUploadSuccess} />

          {lastUploadResult ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <PadronUploadSummary data={lastUploadResult} />
            </section>
          ) : null}

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-blue-900">Listado del Padrón</h2>
                <p className="mt-1 text-sm text-slate-700">
                  Total inscritos: <span className="font-semibold">{contadores.total}</span>
                  {!estamentoFilter ? (
                    <>
                      {' · '}
                      Estudiantes: <span className="font-semibold">{contadores.estudiantes}</span>
                      {' · '}
                      Docentes: <span className="font-semibold">{contadores.docentes}</span>
                    </>
                  ) : null}
                </p>
              </div>

              <div className="flex w-full flex-wrap items-center gap-2 rounded-lg bg-slate-100 p-1 sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleFilterChange('')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${estamentoFilter === '' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterChange('DOCENTE')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${estamentoFilter === 'DOCENTE' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Docentes
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterChange('ESTUDIANTE')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${estamentoFilter === 'ESTUDIANTE' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Estudiantes
                </button>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500 md:hidden">
              Desliza horizontalmente para ver todas las columnas.
            </p>

            <div className="-mx-4 mt-4 w-[calc(100%+2rem)] max-w-none overflow-x-auto overscroll-x-contain sm:mx-0 sm:mt-6 sm:w-full sm:max-w-full">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden rounded-none border-y border-slate-200 sm:rounded-xl sm:border">
                  <table className="min-w-[760px] w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-4 sm:py-3">Registro / Código</th>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-4 sm:py-3">CI</th>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-4 sm:py-3">Apellidos y Nombres</th>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-4 sm:py-3">Estamento</th>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-4 sm:py-3">Facultad</th>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-4 sm:py-3">Carrera</th>
                        <th scope="col" className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-4 sm:py-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {isLoadingPadron ? (
                        <tr>
                          <td colSpan={tableColumnCount} className="px-2 py-4 text-center text-sm text-slate-500 sm:px-4">
                            Cargando padrón...
                          </td>
                        </tr>
                      ) : padronList.length === 0 ? (
                        <tr>
                          <td colSpan={tableColumnCount} className="px-2 py-4 text-center text-sm text-slate-500 sm:px-4">
                            No hay electores inscritos en esta elección.
                          </td>
                        </tr>
                      ) : (
                        padronList.map((row) => (
                          <tr key={row.id} className="transition-colors hover:bg-slate-50">
                            <td className="whitespace-nowrap px-2 py-2 text-sm font-medium text-slate-900 sm:px-4 sm:py-3">
                              {renderRegistroCell(row.elector)}
                            </td>
                            <td className="whitespace-nowrap px-2 py-2 text-sm text-slate-700 sm:px-4 sm:py-3">
                              {row.elector?.ci}
                            </td>
                            <td className="whitespace-nowrap px-2 py-2 text-sm font-medium text-slate-900 sm:px-4 sm:py-3">
                              {row.elector?.apellido} {row.elector?.nombre}
                            </td>
                            <td className="whitespace-nowrap px-2 py-2 text-sm text-slate-700 sm:px-4 sm:py-3">
                              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${row.elector?.estamento === 'DOCENTE' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                {row.elector?.estamento}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-sm text-slate-700 sm:px-4 sm:py-3">
                              {row.elector?.facultad || <span className="text-slate-400 italic">—</span>}
                            </td>
                            <td className="px-2 py-2 text-sm text-slate-700 sm:px-4 sm:py-3">
                              {renderCarreraCell(row.elector)}
                            </td>
                            <td className="px-2 py-2 text-center text-sm text-slate-700 sm:px-4 sm:py-3">
                              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${row.estaHabilitado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {row.estaHabilitado ? 'Habilitado' : 'Inhabilitado'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
