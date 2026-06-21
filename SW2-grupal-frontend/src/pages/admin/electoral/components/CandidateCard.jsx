/**
 * Tarjeta de candidato dentro de una fórmula/frente.
 * @param {{
 *  candidate: {
 *    id: string,
 *    fullName: string,
 *    fotoUrl?: string,
 *    rolEspecifico?: string,
 *  }
 * }} props
 * @returns {import('react').JSX.Element}
 */
export default function CandidateCard({ candidate }) {
  const fullName = candidate.fullName || 'Candidato'
  const rolLabel = candidate.rolEspecifico?.trim() || 'Rol no asignado'

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
      {candidate.fotoUrl ? (
        <img
          src={candidate.fotoUrl}
          alt={fullName}
          className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover"
        />
      ) : (
        <div
          className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 bg-white"
          aria-hidden="true"
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{fullName}</p>
        <p className="mt-0.5 text-xs font-medium text-blue-900">{rolLabel}</p>
      </div>
    </div>
  )
}
