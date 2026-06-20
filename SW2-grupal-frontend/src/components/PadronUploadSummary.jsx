/**
 * Resumen estadístico tras una carga exitosa del padrón (HTTP 200).
 *
 * @param {{ data: import('../services/adminService').ResultadoCargaPadron | null | undefined, message?: string }} props
 */
export default function PadronUploadSummary({ data, message }) {
  if (!data) {
    return null
  }

  const advertencias = Array.isArray(data.erroresEstructurales)
    ? data.erroresEstructurales.filter(Boolean)
    : []

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
        <p className="font-semibold">{message || 'Padrón cargado correctamente'}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Estudiantes cargados"
          value={data.estudiantesProcesados}
        />
        <StatCard
          label="Docentes cargados"
          value={data.docentesProcesados}
        />
        <StatCard
          label="Total habilitados"
          value={data.registrosHabilitados}
          highlight
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
        <p>
          Total procesado: <span className="font-semibold text-slate-900">{data.totalProcesado ?? '—'}</span>
          {' · '}
          Nuevos: <span className="font-semibold text-slate-900">{data.electoresInsertados ?? '—'}</span>
          {' · '}
          Actualizados: <span className="font-semibold text-slate-900">{data.electoresActualizados ?? '—'}</span>
        </p>
      </div>

      {advertencias.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Advertencias (la carga se completó correctamente)</p>
          <p className="mt-1 text-xs text-amber-900">
            Estas observaciones no impiden la carga. Revise los casos indicados si lo considera necesario.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-950">
            {advertencias.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

/**
 * @param {{ label: string, value: number | undefined, highlight?: boolean }} props
 */
function StatCard({ label, value, highlight = false }) {
  return (
    <div
      className={
        `rounded-xl border p-4 ${highlight ? 'border-blue-200 bg-white shadow-sm' : 'border-slate-200 bg-white'}`
      }
    >
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-bold text-blue-900">{value ?? '—'}</p>
    </div>
  )
}
