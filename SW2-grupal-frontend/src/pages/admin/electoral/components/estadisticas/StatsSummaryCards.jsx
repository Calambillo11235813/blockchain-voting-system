/**
 * Tarjetas de resumen general del dashboard en vivo.
 * @param {{
 *  resumen: {
 *    totalHabilitados?: number,
 *    totalSufragiosEmitidos?: number,
 *    totalElectoresParticipantes?: number,
 *    porcentajeParticipacion?: number,
 *  } | null,
 *  papeletasCount?: number,
 * }} props
 */
export default function StatsSummaryCards({ resumen, papeletasCount = 0 }) {
  if (!resumen) return null

  const pendientes = Math.max(
    (resumen.totalHabilitados ?? 0) - (resumen.totalElectoresParticipantes ?? 0),
    0,
  )

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase text-slate-500">Total habilitados</p>
        <p className="mt-2 text-3xl font-bold text-blue-900">{resumen.totalHabilitados ?? 0}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase text-slate-500">Sufragios emitidos</p>
        <p className="mt-2 text-3xl font-bold text-blue-900">
          {resumen.totalSufragiosEmitidos ?? 0}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase text-slate-500">Electores que votaron</p>
        <p className="mt-2 text-3xl font-bold text-blue-900">
          {resumen.totalElectoresParticipantes ?? 0}
        </p>
        <p className="mt-1 text-xs text-slate-600">Pendientes: {pendientes}</p>
      </div>

      <div className="rounded-xl border border-blue-900 bg-blue-900 p-5 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase text-blue-200">Participación global</p>
        <p className="mt-2 text-3xl font-bold text-yellow-400">
          {Number(resumen.porcentajeParticipacion ?? 0).toFixed(2)}%
        </p>
        <p className="mt-1 text-xs text-blue-200">{papeletasCount} papeleta(s) monitoreadas</p>
      </div>
    </div>
  )
}
