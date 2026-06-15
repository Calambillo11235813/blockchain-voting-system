import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { descargarCertificado } from '../services/certificadoService'

export default function VotoExitoso() {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Hash y eleccionId pasados a través del estado del router 
  const txHash = location.state?.txHash
  const eleccionId = location.state?.eleccionId
  const [isDownloading, setIsDownloading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleDownload = async () => {
    if (!eleccionId) {
      setErrorMsg('No se puede descargar el certificado. Falta la elección.')
      return
    }

    try {
      setIsDownloading(true)
      setErrorMsg('')
      await descargarCertificado(eleccionId)
    } catch (error) {
      console.error(error)
      setErrorMsg(error?.response?.data?.message || 'Error al descargar el certificado de sufragio.')
    } finally {
      setIsDownloading(false)
    }
  }

  if (!txHash) {
    // Si no hay hash, redirigir al inicio
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-4">
        <div className="text-center">
          <p className="text-slate-600">No se encontró información de la transacción.</p>
          <button 
            onClick={() => navigate('/estudiante/dashboard')}
            className="mt-4 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-blue-900 shadow hover:bg-yellow-600"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="bg-blue-900">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="text-lg font-semibold text-white">Comprobante de Sufragio</h1>
          <p className="mt-1 text-sm text-white/90">Su voto ha sido registrado y asegurado en la Blockchain.</p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500 shadow-lg">
          <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-blue-900">¡Voto Emitido Correctamente!</h2>
        <p className="mt-3 text-sm text-slate-600">
          Su voto ha sido registrado en el sistema. Gracias por participar en el proceso democrático institucional.
        </p>

        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5 text-left shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Hash de Transacción (Comprobante Blockchain)
          </p>
          <div className="mt-2 flex items-center gap-3 rounded bg-white p-3 border border-slate-200 relative">
            <code className="flex-1 text-xs font-mono text-blue-900 break-all">
              {txHash}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(txHash)}
              title="Copiar Hash"
              className="flex shrink-0 items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Guarde este hash para verificar que su voto fue registrado inmutablemente en la red.
          </p>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-4">
          <button
            onClick={handleDownload}
            disabled={isDownloading || !eleccionId}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-900 py-3 text-sm font-bold text-white shadow hover:bg-blue-800 transition-colors disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {isDownloading ? 'Descargando...' : 'Descargar Certificado'}
          </button>
          
          <button
            onClick={() => navigate('/estudiante/dashboard')}
            className="rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Volver al Panel
          </button>
        </div>
      </div>
    </main>
  )
}
