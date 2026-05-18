import { useEffect, useState } from 'react'
import WhitelistUpload from '../../components/WhitelistUpload'
import { fetchElections } from '../../services/electionsService'
import { fetchPadronElectoral, uploadWhitelistFile } from '../../services/adminService'

/**
 * Sección de Padrón Electoral.
 *
 * Permite cargar el archivo Excel y ver el resultado de la carga,
 * así como listar los electores inscritos.
 *
 * @returns {import('react').JSX.Element}
 */
export default function AdminRegistry() {
  const [elections, setElections] = useState([])
  const [selectedElectionId, setSelectedElectionId] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const [padronList, setPadronList] = useState([])
  const [padronMetadata, setPadronMetadata] = useState(null)
  const [isLoadingPadron, setIsLoadingPadron] = useState(false)
  const [estamentoFilter, setEstamentoFilter] = useState('')

  const loadPadron = async (eleccionId, estamento = '') => {
    if (!eleccionId) {
      setPadronList([])
      return
    }
    try {
      setIsLoadingPadron(true)
      const result = await fetchPadronElectoral(eleccionId, 1, 500, estamento)
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
    setEstamentoFilter('') // Resetear filtro al cambiar elección
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

  const handleFilterChange = (nuevoEstamento) => {
    setEstamentoFilter(nuevoEstamento)
    loadPadron(selectedElectionId, nuevoEstamento)
  }

  if (isLoading) {
    return <div className="p-4 text-slate-600">Cargando datos...</div>
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-blue-900">Seleccionar Elección</h2>
        <p className="mt-1 text-sm text-slate-700">
          Elige la elección a la que asociarás este padrón electoral.
        </p>

        <div className="mt-4">
          <label className="block text-sm font-semibold text-slate-900 mb-1">
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
      </section>

      {selectedElectionId && (
        <>
          <WhitelistUpload onUpload={handleUpload} />

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-blue-900">Listado del Padrón</h2>
                <p className="mt-1 text-sm text-slate-700">
                  Total inscritos encontrados: <span className="font-semibold">{padronMetadata?.pagination?.total || 0}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleFilterChange('')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${estamentoFilter === '' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterChange('DOCENTE')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${estamentoFilter === 'DOCENTE' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Docentes
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterChange('ESTUDIANTE')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${estamentoFilter === 'ESTUDIANTE' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Estudiantes
                </button>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Registro</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CI</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Apellidos y Nombres</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estamento</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Carrera</th>
                    <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {isLoadingPadron ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-center text-sm text-slate-500">
                        Cargando padrón...
                      </td>
                    </tr>
                  ) : padronList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-center text-sm text-slate-500">
                        No hay electores inscritos en esta elección.
                      </td>
                    </tr>
                  ) : (
                    padronList.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                          {row.elector?.registro}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                          {row.elector?.ci}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900 font-medium">
                          {row.elector?.apellido} {row.elector?.nombre}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${row.elector?.estamento === 'DOCENTE' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                            {row.elector?.estamento}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {row.elector?.carrera}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                          {row.estaHabilitado ? (
                            <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                              Habilitado
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                              Inhabilitado
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {padronMetadata?.pagination?.pages > 1 && (
              <p className="mt-4 text-xs text-slate-500 text-center">
                Mostrando los primeros {padronList.length} registros de un total de {padronMetadata.pagination.total}.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
