import { useEffect, useState } from 'react'
import { fetchElections } from '../../../services/electionsService'
import { getReporteConsolidacion, descargarActaPDF } from '../../../services/estadisticasService'

// Componentes de Íconos SVG
const StudentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7" />
  </svg>
)

const TeacherIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

const TrophyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
)

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
  const [isDownloading, setIsDownloading] = useState(false)
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

  const handleDownloadPDF = async () => {
    if (!selectedElectionId) return
    setErrorMsg('')
    try {
      setIsDownloading(true)
      await descargarActaPDF(selectedElectionId)
    } catch (error) {
      console.error(error)
      setErrorMsg(error?.response?.data?.message || 'Error al descargar el acta en PDF.')
    } finally {
      setIsDownloading(false)
    }
  }

  // Cálculos de totales y proporciones para los frentes
  const totalSufragiosEmitidos = reporte?.reporte?.totalSufragiosEmitidos || 0
  const propDocentes = totalSufragiosEmitidos > 0 ? (reporte?.reporte?.totalSufragiosDocentes || 0) / totalSufragiosEmitidos : 0.5
  const propEstudiantes = totalSufragiosEmitidos > 0 ? (reporte?.reporte?.totalSufragiosEstudiantes || 0) / totalSufragiosEmitidos : 0.5

  // Agrupar frentes por nombreFrente para evitar duplicados en la vista (en caso de que apliquen a múltiples cargos)
  const frentesUnicos = []
  if (reporte?.reporte?.resultadosPorFrente) {
    const mapFrentes = new Map()
    reporte.reporte.resultadosPorFrente.forEach(frente => {
      const key = frente.nombreFrente?.toLowerCase().trim() || frente.frenteId
      if (!mapFrentes.has(key)) {
        mapFrentes.set(key, { ...frente })
        frentesUnicos.push(mapFrentes.get(key))
      } else {
        const existente = mapFrentes.get(key)
        existente.votosBlockchain += (frente.votosBlockchain || 0)
        existente.scoreDocente = (existente.scoreDocente || 0) + (frente.scoreDocente || 0)
        existente.scoreEstudiante = (existente.scoreEstudiante || 0) + (frente.scoreEstudiante || 0)
        existente.resultadoPonderado = (existente.resultadoPonderado || 0) + (frente.resultadoPonderado || 0)
      }
    })
    
    // Volver a ordenar por resultado ponderado una vez unificados
    frentesUnicos.sort((a, b) => (b.resultadoPonderado || 0) - (a.resultadoPonderado || 0))
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-[#0a3366] mb-2">Auditoría y Resultados</h2>
      <p className="text-sm text-slate-600 mb-6">
        Verifica la integridad del proceso y genera el acta de consolidación paritaria oficial.
      </p>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a3366]"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <label className="block text-sm font-semibold text-[#0a3366] mb-2">
              Seleccionar Elección Habilitada
            </label>
            <div className="flex flex-col sm:flex-row gap-4">
              <select
                value={selectedElectionId}
                onChange={(e) => setSelectedElectionId(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-[#0a3366] focus:outline-none focus:ring-1 focus:ring-[#0a3366]"
              >
                {elections.map((elec) => (
                  <option key={elec.id} value={elec.id}>
                    {elec.titulo} ({elec.gestion})
                  </option>
                ))}
              </select>
              <button
                onClick={handleGenerateReport}
                disabled={!selectedElectionId || isGenerating}
                className="inline-flex items-center justify-center rounded-lg bg-[#f2a900] px-6 py-2 text-sm font-semibold text-[#0a3366] hover:bg-yellow-500 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isGenerating ? 'Calculando...' : 'Generar Acta de Consolidación'}
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={!selectedElectionId || isDownloading}
                className="inline-flex items-center justify-center rounded-lg border border-[#0a3366] bg-white px-6 py-2 text-sm font-semibold text-[#0a3366] hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm gap-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {isDownloading ? 'Descargando...' : 'Descargar Acta (PDF)'}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-[#d32f2f] font-medium flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              {errorMsg}
            </div>
          )}

          {reporte && (
            <div className="mt-8">
              <div className="text-center mb-8 border-b-2 border-[#0a3366] pb-4">
                <h3 className="text-xl font-bold text-[#0a3366] uppercase tracking-wider">Acta de Consolidación Paritaria</h3>
                <p className="text-slate-500 mt-2">Emitida el: {new Date(reporte.fechaGeneracion).toLocaleString('es-BO')}</p>
              </div>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-[#0a3366] flex items-center justify-between transition-transform hover:-translate-y-1">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold tracking-widest mb-1">Total Estudiantes</p>
                    <p className="text-2xl font-bold text-[#0a3366]">{reporte.reporte?.totalSufragiosEstudiantes || 0}</p>
                    <p className="text-sm text-slate-500 mt-1">Votos Válidos</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-full">
                    <StudentIcon />
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-[#0a3366] flex items-center justify-between transition-transform hover:-translate-y-1">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold tracking-widest mb-1">Total Docentes</p>
                    <p className="text-2xl font-bold text-[#0a3366]">{reporte.reporte?.totalSufragiosDocentes || 0}</p>
                    <p className="text-sm text-slate-500 mt-1">Votos Válidos</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-full">
                    <TeacherIcon />
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h4 className="text-lg font-semibold text-[#0a3366] mb-4 border-b pb-2">Desglose por Frente Político</h4>
                {frentesUnicos.length > 0 ? (
                  <div className="space-y-6">
                    {frentesUnicos.map((frente, index) => {
                      // El ganador es el primero de la lista unificada (que ya está ordenada de mayor a menor)
                      const isWinner = index === 0 && frente.resultadoPonderado > 0;
                      const votosEstDocentes = Math.round(frente.votosBlockchain * propDocentes);
                      const votosEstEstudiantes = Math.round(frente.votosBlockchain * propEstudiantes);
                      const ptsDocentes = Number((frente.scoreDocente || 0) * 0.5).toFixed(2);
                      const ptsEstudiantes = Number((frente.scoreEstudiante || 0) * 0.5).toFixed(2);

                      return (
                        <div 
                          key={frente.frenteId} 
                          className={`relative p-6 rounded-xl shadow-sm border-2 transition-all ${
                            isWinner 
                              ? 'bg-[#f0f7ff] border-[#0a3366] shadow-md scale-[1.01]' 
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {isWinner && (
                            <div className="absolute -top-4 -right-4 bg-[#f2a900] text-[#0a3366] font-semibold px-4 py-1 rounded-full shadow flex items-center text-sm border-2 border-white">
                              <TrophyIcon /> Frente Ganador
                            </div>
                          )}
                          
                          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 border-b border-slate-200 pb-4">
                            <div>
                              <h5 className="text-lg font-bold text-[#0a3366] uppercase">{frente.nombreFrente}</h5>
                              <p className="text-sm font-medium text-slate-500 mt-1">Sigla: {frente.sigla}</p>
                            </div>
                            <div className={`text-right ${isWinner ? 'bg-[#0a3366] text-white' : 'bg-slate-100 text-[#0a3366]'} px-6 py-3 rounded-lg`}>
                              <p className="text-xs uppercase font-semibold opacity-80 mb-1">Puntaje Final Ponderado</p>
                              <p className="text-2xl font-bold leading-none">
                                {Number(frente.resultadoPonderado || 0).toFixed(2)}
                                <span className="text-lg font-semibold ml-1">pts</span>
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 flex justify-between items-center">
                              <div>
                                <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Estudiantes</p>
                                <p className="text-base font-medium text-slate-800">{votosEstEstudiantes} votos brutos</p>
                              </div>
                              <div className="text-right">
                                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded font-medium text-base">
                                  {ptsEstudiantes} / 50 pts
                                </span>
                              </div>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 flex justify-between items-center">
                              <div>
                                <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Docentes</p>
                                <p className="text-base font-medium text-slate-800">{votosEstDocentes} votos brutos</p>
                              </div>
                              <div className="text-right">
                                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded font-medium text-base">
                                  {ptsDocentes} / 50 pts
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-slate-500 font-medium">No hay datos de frentes o votos procesados en la blockchain para esta elección.</p>
                  </div>
                )}
              </div>

              {/* Integrity Info */}
              <div className="bg-slate-100 rounded-lg p-4 text-xs text-slate-500 font-mono text-center border border-slate-200">
                Hash de Integridad (Simulado): {reporte.firmaSimulada}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}


