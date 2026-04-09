/**
 * Vista simple para accesos no autorizados.
 */
export default function Unauthorized() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
        <div className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Unauthorized</h1>
          <p className="mt-2 text-sm text-slate-700">
            No tienes permisos para acceder a esta vista.
          </p>
        </div>
      </div>
    </main>
  )
}
