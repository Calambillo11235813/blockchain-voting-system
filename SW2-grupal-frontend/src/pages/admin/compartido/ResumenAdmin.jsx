import { useEffect, useState } from 'react'
import {
  fetchElections,
  fetchFrentes,
  fetchCandidates,
  fetchTotalStudents,
} from '../../../services/electionsService'

/**
 * Vista de resumen del proceso electoral para administración.
 *
 * @returns {import('react').JSX.Element}
 */
export default function ResumenAdmin() {
  const [metrics, setMetrics] = useState({
    padron: '—',
    frentes: '—',
    candidatos: '—',
    estado: '—',
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadMetrics() {
      try {
        const [electionsRes, frentesRes, candidatesRes, totalStudentsRes] = await Promise.allSettled([
          fetchElections(),
          fetchFrentes(),
          fetchCandidates(),
          fetchTotalStudents(),
        ])

        const elections = electionsRes.status === 'fulfilled' ? electionsRes.value : []
        const frentesCount = frentesRes.status === 'fulfilled' ? frentesRes.value.length : 'Error'
        const candidatesCount = candidatesRes.status === 'fulfilled' ? candidatesRes.value.length : 'Error'
        const totalStudents = totalStudentsRes.status === 'fulfilled' ? totalStudentsRes.value : 'Error'

        const activeElection = elections.find((e) => e.estaActiva)
        const estadoText = activeElection ? 'Activa' : (electionsRes.status === 'fulfilled' ? 'Inactiva' : 'Error')

        setMetrics({
          padron: totalStudents.toString(),
          frentes: frentesCount.toString(),
          candidatos: candidatesCount.toString(),
          estado: estadoText,
        })
      } catch (error) {
        console.error('Error loading dashboard metrics:', error)
        setMetrics({
          padron: 'Error',
          frentes: 'Error',
          candidatos: 'Error',
          estado: 'Error',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadMetrics()
  }, [])

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-blue-900">Dashboard</h2>
      <p className="mt-1 text-sm text-slate-700">
        Revisa el estado general de la elección y los registros principales.
      </p>

      <div className={`mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 ${isLoading ? 'opacity-50' : ''}`}>
        <SummaryCard title="Padrón" value={metrics.padron} description="Estudiantes habilitados" />
        <SummaryCard title="Frentes" value={metrics.frentes} description="Frentes registrados" />
        <SummaryCard title="Candidatos" value={metrics.candidatos} description="Candidatos registrados" />
        <SummaryCard title="Estado" value={metrics.estado} description="Elección" />
      </div>
    </section>
  )
}

/**
 * Tarjeta simple de resumen.
 * @param {{ title: string, value: string, description: string }} props
 * @returns {import('react').JSX.Element}
 */
function SummaryCard({ title, value, description }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-blue-900">{value}</p>
      <p className="mt-1 text-xs text-slate-600">{description}</p>
    </div>
  )
}
