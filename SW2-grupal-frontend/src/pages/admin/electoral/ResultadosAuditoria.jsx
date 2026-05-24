import { useEffect, useState } from 'react'
import { fetchElections } from '../../../services/electionsService'
import { getReporteConsolidacion } from '../../../services/estadisticasService'

/**
 * Sección de Auditoría y Resultados.
 *
 * Permite verificar evidencias en blockchain y consultar el conteo (CU-18).
 *
 * @returns {import('react').JSX.Element}
 */
export default function AuditResults() {
  const [elections, setElections] = useState([])
  const [selectedElectionId, setSelectedElectionId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [reporte, setReporte] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

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
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [])

  const handleGenerateReport = async () => {
    if (!selectedElectionId) return
    setErrorMsg('')
    setReporte(null)
    try {
      setIsGenerating(true)
      const data = await getReporteConsolidacion(selectedElectionId)
      setReporte(data)
    } catch (error) {
      console.error(error)
      setErrorMsg(error?.response?.data?.message || 'Error al generar el acta de consolidación.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-blue-900">Auditoría y Resultados</h2>
      <p className="mt-1 text-sm text-slate-700">
        Verifica la integridad del proceso y genera el acta de consolidación paritaria.
      </p>

      {isLoading ? (
        <div className="mt-4 text-sm text-slate-500">Cargando elecciones...</div>
      ) : (
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-800">
              Seleccionar Elección
            </label>
            <select
              value={selectedElectionId}
              onChange={(e) => setSelectedElectionId(e.target.value)}
              className="mt-1 block w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
            >
              {elections.map((elec) => (
                <option key={elec.id} value={elec.id}>
                  {elec.titulo} ({elec.gestion})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={!selectedElectionId || isGenerating}
            className="inline-flex items-center justify-center rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-yellow-600 disabled:opacity-50"
          >
            {isGenerating ? 'Generando...' : 'Generar acta de consolidación'}
          </button>

          {errorMsg && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {reporte && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-lg font-bold text-blue-900 mb-4">Acta de Consolidación Paritaria</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-3 rounded shadow-sm border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Total Estudiantes</p>
                  <p className="text-lg font-bold text-blue-900">{reporte.votosEstudiantes || 0}</p>
                </div>
                <div className="bg-white p-3 rounded shadow-sm border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Total Docentes</p>
                  <p className="text-lg font-bold text-blue-900">{reporte.votosDocentes || 0}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded shadow-sm border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Resultados Ponderados (50/50)</h4>
                {reporte.resultadosFrentes && reporte.resultadosFrentes.length > 0 ? (
                  <ul className="space-y-3">
                    {reporte.resultadosFrentes.map((frente, idx) => (
                      <li key={idx} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                        <span className="font-medium text-slate-700">{frente.nombreFrente || `Frente ${idx + 1}`}</span>
                        <span className="text-blue-900 font-bold bg-blue-50 px-2 py-1 rounded">
                          {Number(frente.puntajePonderado || 0).toFixed(2)} pts
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No hay datos de frentes.</p>
                )}
              </div>
              
              {reporte.ganador && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded text-center">
                  <p className="text-sm text-green-700 uppercase font-semibold tracking-wide">Frente Ganador</p>
                  <p className="text-xl font-bold text-green-900">{reporte.ganador.nombreFrente}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

