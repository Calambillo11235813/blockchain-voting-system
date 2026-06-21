/**
 * Modal de confirmación para abrir la jornada electoral.
 * @param {{
 *  open: boolean,
 *  electionLabel: string,
 *  isSubmitting: boolean,
 *  onClose: () => void,
 *  onConfirm: () => void,
 * }} props
 * @returns {import('react').JSX.Element | null}
 */
export default function AbrirJornadaModal({
  open,
  electionLabel,
  isSubmitting,
  onClose,
  onConfirm,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <svg
            className="h-7 w-7 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
            />
          </svg>
        </div>

        <h2 className="text-center text-lg font-bold text-slate-900">
          ¿Confirma abrir la jornada electoral?
        </h2>

        {electionLabel ? (
          <p className="mt-2 text-center text-sm font-semibold text-blue-900">{electionLabel}</p>
        ) : null}

        <p className="mt-3 text-center text-sm leading-relaxed text-slate-600">
          Los electores habilitados podrán emitir su voto. Asegúrese de que el contrato esté
          desplegado en blockchain.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Abriendo…
              </>
            ) : (
              'Confirmar apertura'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
