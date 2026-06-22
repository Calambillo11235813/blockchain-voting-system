import CandidateCard from './CandidateCard'
import { resolveMediaUrl } from '../../../../utils/mediaUrlUtils'

/**
 * Tarjeta de frente con su fórmula de candidatos para una papeleta.
 * @param {{
 *  front: {
 *    id: string,
 *    nombreFrente: string,
 *    sigla: string,
 *    logoUrl?: string,
 *    candidates: object[],
 *  }
 * }} props
 * @returns {import('react').JSX.Element}
 */
function FrenteFormulaCard({ front }) {
  const logoSrc = resolveMediaUrl(front.logoUrl)

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-24 w-24 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={`Logo de ${front.nombreFrente}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-slate-50" aria-hidden="true" />
          )}
        </div>

        <div className="w-full">
          <p className="break-words text-sm font-semibold text-slate-900">{front.nombreFrente}</p>
          <p className="mt-0.5 text-xs text-slate-700">Sigla: {front.sigla || '—'}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {front.candidates.length ? (
          front.candidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Sin candidatos registrados para este frente.
          </p>
        )}
      </div>
    </article>
  )
}

/**
 * Previsualización de una papeleta individual (Rectorado, Decanato o Carrera).
 * @param {{
 *  preview: {
 *    id: string,
 *    index: number,
 *    title: string,
 *    subtitle: string,
 *    alcanceLabel: string,
 *    fronts: object[],
 *    hasFronts: boolean,
 *    hasCandidates: boolean,
 *  }
 * }} props
 * @returns {import('react').JSX.Element}
 */
export default function BallotPreview({ preview }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Papeleta {preview.index}
            </p>
            <h4 className="mt-1 text-base font-semibold text-blue-900">{preview.title}</h4>
            <p className="mt-1 text-sm text-slate-700">{preview.subtitle}</p>
          </div>

          <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900">
            {preview.alcanceLabel}
          </span>
        </div>
      </header>

      <div className="mt-4">
        {!preview.hasFronts ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Sin frentes registrados</p>
            <p className="mt-1 text-sm text-slate-700">
              Registre frentes para esta papeleta en Gestión de Frentes y Candidatos.
            </p>
          </div>
        ) : !preview.hasCandidates ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">Sin candidatos registrados</p>
            <p className="mt-1 text-sm text-amber-800">
              Esta papeleta tiene frentes, pero aún no tiene candidatos asignados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {preview.fronts.map((front) => (
              <FrenteFormulaCard key={front.id} front={front} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
