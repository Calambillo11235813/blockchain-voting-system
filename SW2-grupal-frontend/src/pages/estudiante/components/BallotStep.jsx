const BLANK_VOTE_ID = 'BLANCO'

/**
 * Resuelve el candidato principal de un frente para la papeleta actual.
 * @param {object} front
 * @returns {object | null}
 */
function getPrimaryCandidate(front) {
  const candidates = front?.candidates || []
  if (!candidates.length) return null
  return candidates[0]
}

/**
 * Paso de selección para una sola papeleta (Rectorado, Decanato o Carrera).
 *
 * @param {{
 *  ballot: object,
 *  stepLabel: string,
 *  stepNumber: number,
 *  totalSteps: number,
 *  selectedOptionKey: string | null,
 *  onSelect: (selection: object) => void,
 * }} props
 */
export default function BallotStep({
  ballot,
  stepLabel,
  stepNumber,
  totalSteps,
  selectedOptionKey,
  onSelect,
}) {
  if (!ballot) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
        No hay papeleta configurada para <strong>{stepLabel}</strong> en esta elección.
      </div>
    )
  }

  const fronts = ballot.fronts || []
  const blankOptionKey = `${ballot.id}|${BLANK_VOTE_ID}`

  function handleSelectFront(front) {
    const candidate = getPrimaryCandidate(front)
    if (!candidate?.id) return

    onSelect({
      optionKey: `${ballot.id}|${front.id}`,
      eleccionCargoId: ballot.id,
      candidatoId: candidate.id,
      isBlankVote: false,
      nombreFrente: front.nombreFrente || 'Frente',
      sigla: front.sigla || '',
      candidateName: candidate.fullName || `${candidate.nombres || ''} ${candidate.apellidos || ''}`.trim(),
      displayLabel: front.nombreFrente || front.sigla || 'Frente',
      alcanceLabel: ballot.alcanceLabel,
      title: ballot.title,
    })
  }

  function handleSelectBlank() {
    onSelect({
      optionKey: blankOptionKey,
      eleccionCargoId: ballot.id,
      candidatoId: BLANK_VOTE_ID,
      isBlankVote: true,
      nombreFrente: 'Voto en Blanco',
      sigla: 'BLANCO',
      candidateName: 'Voto en Blanco',
      displayLabel: 'Voto en Blanco',
      alcanceLabel: ballot.alcanceLabel,
      title: ballot.title,
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-900">
          Paso {stepNumber} de {totalSteps}
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">{stepLabel}</h2>
        <p className="mt-1 text-sm text-slate-600">{ballot.subtitle}</p>
        <p className="mt-2 text-sm text-slate-700">
          Seleccione un frente o marque <strong>Voto en Blanco</strong> para continuar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fronts.map((front) => {
          const optionKey = `${ballot.id}|${front.id}`
          const isSelected = selectedOptionKey === optionKey
          const candidate = getPrimaryCandidate(front)

          return (
            <button
              key={front.id}
              type="button"
              onClick={() => handleSelectFront(front)}
              disabled={!candidate?.id}
              className={`
                group relative w-full rounded-xl border-2 text-left transition-all duration-150
                focus:outline-none disabled:cursor-not-allowed disabled:opacity-60
                ${isSelected
                  ? 'border-yellow-400 shadow-lg shadow-yellow-200/60 ring-2 ring-yellow-300'
                  : 'border-slate-200 bg-white shadow-sm hover:border-blue-300 hover:shadow-md'
                }
              `}
            >
              {isSelected && (
                <span className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-yellow-500 shadow">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}

              <div className="flex flex-col items-center gap-3 p-4 text-center">
                <div className={`h-28 w-28 overflow-hidden rounded-2xl border ${isSelected ? 'border-yellow-300' : 'border-slate-200'} bg-slate-50`}>
                  {front.logoUrl ? (
                    <img
                      src={front.logoUrl}
                      alt={`Logo ${front.nombreFrente}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-3xl font-black text-slate-300">
                        {front.sigla?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="w-full">
                  <p className="break-words text-sm font-semibold text-slate-900">
                    {front.nombreFrente || 'Frente'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">Sigla: {front.sigla || '—'}</p>
                </div>
              </div>

              <div className={`mx-4 border-t ${isSelected ? 'border-yellow-200' : 'border-slate-100'}`} />

              <div className="p-4">
                {front.candidates && front.candidates.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {front.candidates.map((cand, idx) => (
                      <div key={cand.id || idx} className="rounded-lg border border-slate-200 bg-white p-3 text-center flex flex-col items-center">
                        {cand.fotoUrl ? (
                          <img
                            src={cand.fotoUrl}
                            alt={cand.fullName}
                            className="mx-auto h-40 w-40 rounded-2xl border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                            <span className="text-3xl font-black text-slate-300">
                              {cand.nombres?.charAt(0) || '?'}
                            </span>
                          </div>
                        )}
                        <p className="mt-3 text-sm font-semibold text-slate-900 leading-tight">
                          {cand.fullName || cand.nombres}
                        </p>
                        {cand.rolEspecifico && (
                          <p className="mt-1 text-xs uppercase tracking-wider text-slate-500 font-bold">{cand.rolEspecifico}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center">Sin candidatos registrados.</p>
                )}
              </div>

              <div className={`rounded-b-xl px-4 py-3 text-center text-xs font-semibold transition-colors
                ${isSelected ? 'bg-yellow-500 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-900'}`}>
                {isSelected ? '✓ Seleccionado' : 'Seleccionar este frente'}
              </div>
            </button>
          )
        })}

        {/* Tarjeta obligatoria: Voto en Blanco */}
        <button
          type="button"
          onClick={handleSelectBlank}
          className={`
            group relative w-full rounded-xl border-2 text-left transition-all duration-150
            focus:outline-none
            ${selectedOptionKey === blankOptionKey
              ? 'border-yellow-400 shadow-lg shadow-yellow-200/60 ring-2 ring-yellow-300'
              : 'border-dashed border-slate-300 bg-slate-50 shadow-sm hover:border-slate-400 hover:shadow-md'
            }
          `}
        >
          {selectedOptionKey === blankOptionKey && (
            <span className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-yellow-500 shadow">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}

          <div className="flex flex-col items-center gap-3 p-4 text-center">
            <div className={`flex h-28 w-28 items-center justify-center rounded-2xl border ${selectedOptionKey === blankOptionKey ? 'border-yellow-300 bg-white' : 'border-slate-300 bg-slate-100'}`}>
              <svg className="h-14 w-14 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <div className="w-full">
              <p className="text-sm font-semibold text-slate-700">Voto en Blanco</p>
              <p className="mt-0.5 text-xs text-slate-500">No seleccionar ningún frente</p>
            </div>
          </div>

          <div className={`rounded-b-xl px-4 py-3 text-center text-xs font-semibold transition-colors
            ${selectedOptionKey === blankOptionKey ? 'bg-yellow-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
            {selectedOptionKey === blankOptionKey ? '✓ Seleccionado' : 'Marcar voto en blanco'}
          </div>
        </button>
      </div>
    </div>
  )
}

export { BLANK_VOTE_ID }
