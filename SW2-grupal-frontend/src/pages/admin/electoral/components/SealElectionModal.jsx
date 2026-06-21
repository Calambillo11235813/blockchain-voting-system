/**
 * Modal de confirmación para sellar una elección.
 * @param {{
 *  open: boolean,
 *  electionLabel: string,
 *  isSubmitting: boolean,
 *  onClose: () => void,
 *  onConfirm: () => void,
 * }} props
 * @returns {import('react').JSX.Element | null}
 */
export default function SealElectionModal({
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
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-7 w-7 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        <h2 className="text-center text-lg font-bold text-slate-900">
          ¿Estás seguro de sellar esta elección?
        </h2>

        {electionLabel ? (
          <p className="mt-2 text-center text-sm font-semibold text-blue-900">{electionLabel}</p>
        ) : null}

        <p className="mt-3 text-center text-sm leading-relaxed text-slate-600">
          Esta acción es irreversible. Se bloqueará el padrón, los frentes y los candidatos. A
          partir de este momento, la elección quedará lista para que el Administrador de Sistemas
          despliegue el Smart Contract en la Blockchain.
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
                Sellando…
              </>
            ) : (
              'Confirmar y sellar'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
