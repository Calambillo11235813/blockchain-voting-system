/**
 * Vista de resumen del proceso electoral para administración.
 *
 * Nota: Esta pantalla se completa a medida que existan métricas reales.
 *
 * @returns {import('react').JSX.Element}
 */
export default function AdminOverview() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-blue-900">Dashboard</h2>
      <p className="mt-1 text-sm text-slate-700">
        Revisa el estado general de la elección y los registros principales.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard title="Padrón" value="—" description="Estudiantes habilitados" />
        <SummaryCard title="Frentes" value="—" description="Frentes registrados" />
        <SummaryCard title="Candidatos" value="—" description="Candidatos registrados" />
        <SummaryCard title="Estado" value="—" description="Elección" />
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
