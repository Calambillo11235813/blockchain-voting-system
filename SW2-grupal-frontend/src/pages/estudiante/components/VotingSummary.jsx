/**
 * Paso 4: resumen de las selecciones antes de emitir el voto batch.
 *
 * @param {{
 *  electionLabel: string,
 *  summaryItems: Array<{ stepLabel: string, selection: object | null }>,
 *  stepNumber: number,
 *  totalSteps: number,
 *  isSubmitting: boolean,
 *  onBack: () => void,
 *  onSubmit: () => void,
 * }} props
 */
export default function VotingSummary({
  electionLabel,
  summaryItems,
  stepNumber,
  totalSteps,
  isSubmitting,
  onBack,
  onSubmit,
}) {
  const allSelected = summaryItems.every((item) => item.selection)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-900">
          Paso {stepNumber} de {totalSteps}
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">Resumen de Sufragio</h2>
        <p className="mt-1 text-sm text-slate-600">{electionLabel}</p>
        <p className="mt-2 text-sm text-slate-700">
          Revise sus decisiones. Al confirmar, se registrará una única transacción atómica en blockchain.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-blue-900 px-5 py-3">
          <p className="text-sm font-semibold text-white">Sus selecciones</p>
        </div>

        <div className="divide-y divide-slate-100">
          {summaryItems.map((item) => (
            <div key={item.ballotId} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {item.stepLabel}
                </p>
                <p className="mt-1 text-base font-bold text-slate-900">
                  {item.selection?.isBlankVote
                    ? 'Voto en Blanco'
                    : item.selection?.displayLabel || 'Sin selección'}
                </p>
                {item.selection && !item.selection.isBlankVote && (
                  <p className="mt-1 text-sm text-slate-600">
                    Candidato: {item.selection.candidateName || '—'}
                  </p>
                )}
              </div>

              <div className="shrink-0">
                {item.selection?.isBlankVote ? (
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Blanco
                  </span>
                ) : item.selection ? (
                  <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900">
                    {item.selection.sigla || 'Frente'}
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                    Pendiente
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Esta acción es <strong>irreversible</strong>. Una vez emitido, su sufragio quedará registrado en blockchain.
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Volver
        </button>

        <button
          type="button"
          id="btn-emitir-voto-batch"
          onClick={onSubmit}
          disabled={isSubmitting || !allSelected}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-500 px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-yellow-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Registrando sufragio…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Emitir Voto
            </>
          )}
        </button>
      </div>
    </div>
  )
}
