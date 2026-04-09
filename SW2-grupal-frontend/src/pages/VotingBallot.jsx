/**
 * Pantalla de papeleta de votación (placeholder).
 *
 * Nota: Esta vista se completa en HU-003/HU-004.
 */
export default function VotingBallot() {
  return (
    <main className="min-h-screen bg-white">
      <header className="bg-blue-900">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="text-lg font-semibold text-white">Papeleta de votación</h1>
          <p className="mt-1 text-sm text-white/90">
            Seleccione su frente/candidato y confirme su voto.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-700">
            La papeleta estará disponible cuando la elección haya sido configurada.
          </p>
        </div>
      </div>
    </main>
  )
}
