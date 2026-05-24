import { useEffect, useState, useMemo } from 'react'
import { fetchElections } from '../../../services/electionsService'
import { 
  getParticipacion, 
  getEstadisticasEstudiantes, 
  getEstadisticasDocentes 
} from '../../../services/estadisticasService'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

export default function EstadisticasEnVivo() {
  const [elections, setElections] = useState([])
  const [selectedElectionId, setSelectedElectionId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [participacion, setParticipacion] = useState(null)
  const [estudiantes, setEstudiantes] = useState(null)
  const [docentes, setDocentes] = useState(null)

  // Cargar elecciones iniciales
  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const data = await fetchElections()
        if (isMounted) {
          setElections(data)
          if (data.length > 0) {
            setSelectedElectionId(data[0].id)
          }
        }
      } catch (err) {
        console.error('Error al cargar elecciones:', err)
        if (isMounted) setErrorMsg('No se pudieron cargar las elecciones.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    load()
    return () => { isMounted = false }
  }, [])

  // Cargar estadísticas cada vez que cambie la elección o se presione refresh
  useEffect(() => {
    if (!selectedElectionId) return

    let isMounted = true
    let pollingTimer = null

    async function fetchData() {
      try {
        setIsRefreshing(true)
        setErrorMsg('')
        
        const [part, est, doc] = await Promise.all([
          getParticipacion(selectedElectionId),
          getEstadisticasEstudiantes(selectedElectionId),
          getEstadisticasDocentes(selectedElectionId)
        ])

        if (isMounted) {
          setParticipacion(part)
          setEstudiantes(est)
          setDocentes(doc)
        }
      } catch (err) {
        console.error('Error al cargar estadísticas:', err)
        if (isMounted) setErrorMsg('Error al obtener los datos en vivo.')
      } finally {
        if (isMounted) setIsRefreshing(false)
      }
    }

    fetchData()

    // Polling cada 10 segundos
    pollingTimer = setInterval(fetchData, 10000)

    return () => {
      isMounted = false
      if (pollingTimer) clearInterval(pollingTimer)
    }
  }, [selectedElectionId])

  // Preparar datos para el gráfico comparativo
  const chartData = useMemo(() => {
    if (!participacion?.desglose) return []
    return participacion.desglose.map(item => ({
      name: item.estamento,
      Habilitados: item.habilitados,
      Emitidos: item.votosEmitidos,
    }))
  }, [participacion])

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Dashboard en Vivo</h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitoreo en tiempo real de la participación electoral.
          </p>
        </div>
      </header>

      {errorMsg && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-slate-500">Cargando dashboard...</div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full sm:max-w-md">
              <label className="block text-sm font-medium text-slate-800">
                Seleccionar Elección
              </label>
              <select
                value={selectedElectionId}
                onChange={(e) => setSelectedElectionId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
              >
                {elections.map((elec) => (
                  <option key={elec.id} value={elec.id}>
                    {elec.titulo} ({elec.gestion})
                  </option>
                ))}
              </select>
            </div>
            {isRefreshing && (
              <span className="text-xs text-yellow-600 font-medium pb-2 animate-pulse">
                Actualizando...
              </span>
            )}
          </div>

          {participacion && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">Total Habilitados</p>
                <p className="mt-2 text-3xl font-bold text-blue-900">{participacion.totalHabilitados}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">Votos Emitidos</p>
                <p className="mt-2 text-3xl font-bold text-blue-900">{participacion.totalVotosEmitidos}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-blue-900 p-5 shadow-sm text-white">
                <p className="text-xs font-semibold uppercase text-blue-200">Participación Global</p>
                <p className="mt-2 text-3xl font-bold text-yellow-500">
                  {Number(participacion.porcentajeParticipacion || 0).toFixed(2)}%
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Estudiantes */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-blue-900 mb-4 border-b pb-2">Estamento Estudiantil</h3>
              {estudiantes ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded">
                    <span className="text-sm font-semibold text-slate-700">Participación General:</span>
                    <span className="text-lg font-bold text-blue-900">
                      {Number(estudiantes.participacionGlobal || 0).toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Desglose por Subgrupo</p>
                    <ul className="space-y-2">
                      {(estudiantes.desglose || []).map((item, idx) => (
                        <li key={idx} className="flex justify-between text-sm">
                          <span className="text-slate-700">{item.nombre}</span>
                          <span className="font-medium text-blue-900">
                            {Number(item.porcentaje || 0).toFixed(2)}% ({item.votosEmitidos}/{item.habilitados})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No hay datos disponibles.</p>
              )}
            </div>

            {/* Docentes */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-blue-900 mb-4 border-b pb-2">Estamento Docente</h3>
              {docentes ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded">
                    <span className="text-sm font-semibold text-slate-700">Participación General:</span>
                    <span className="text-lg font-bold text-blue-900">
                      {Number(docentes.participacionGlobal || 0).toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Desglose por Subgrupo</p>
                    <ul className="space-y-2">
                      {(docentes.desglose || []).map((item, idx) => (
                        <li key={idx} className="flex justify-between text-sm">
                          <span className="text-slate-700">{item.nombre}</span>
                          <span className="font-medium text-blue-900">
                            {Number(item.porcentaje || 0).toFixed(2)}% ({item.votosEmitidos}/{item.habilitados})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No hay datos disponibles.</p>
              )}
            </div>
          </div>

          {/* Gráfico Comparativo */}
          {chartData.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-blue-900 mb-6">Comparativa de Participación</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip cursor={{fill: '#f8fafc'}} />
                    <Legend />
                    <Bar dataKey="Habilitados" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Emitidos" fill="#f2a900" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

