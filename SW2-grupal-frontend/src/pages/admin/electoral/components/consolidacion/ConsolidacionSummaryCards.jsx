/**
 * @param {{ papeleta: object | null }} props
 */
export default function ConsolidacionSummaryCards({ papeleta }) {
  if (!papeleta) return null

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        title="Votos estudiantes"
        value={`${papeleta.totalSufragiosEstudiantes ?? 0} / ${papeleta.totalHabilitadosEstudiantes ?? 0}`}
      />
      <Card
        title="Votos docentes"
        value={`${papeleta.totalSufragiosDocentes ?? 0} / ${papeleta.totalHabilitadosDocentes ?? 0}`}
      />
      <Card title="Sufragios en papeleta" value={papeleta.totalSufragiosEmitidos ?? 0} />
      <Card
        title="Veredicto"
        value={papeleta.veredictoLabel ?? '—'}
        highlight
        veredicto={papeleta.veredicto}
      />
    </div>
  )
}

function Card({ title, value, highlight = false, veredicto }) {
  if (highlight) {
    const valueColor =
      veredicto === 'GANADOR'
        ? 'text-yellow-300'
        : veredicto === 'SEGUNDA_VUELTA'
          ? 'text-amber-200'
          : 'text-blue-200'

    return (
      <div className="rounded-xl border border-blue-900 bg-blue-900 p-4 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase text-blue-200">{title}</p>
        <p className={`mt-2 text-xl font-bold ${valueColor}`}>{value}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-slate-500">{title}</p>
      <p className="mt-2 text-xl font-bold text-blue-900">{value}</p>
    </div>
  )
}
