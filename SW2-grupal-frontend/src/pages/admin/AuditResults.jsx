/**
 * Sección de Auditoría y Resultados.
 *
 * Permite verificar evidencias en blockchain y consultar el conteo.
 *
 * @returns {import('react').JSX.Element}
 */
export default function AuditResults() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-blue-900">Auditoría y Resultados</h2>
      <p className="mt-1 text-sm text-slate-700">
        Verifica la integridad del proceso y consulta los resultados oficiales.
      </p>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Próximamente</p>
        <p className="mt-1 text-sm text-slate-700">
          Esta sección mostrará validaciones en blockchain y el conteo final.
        </p>
      </div>
    </section>
  )
}
