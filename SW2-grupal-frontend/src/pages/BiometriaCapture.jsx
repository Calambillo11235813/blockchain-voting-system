import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import CaptureFlow from '../components/biometria/CaptureFlow'

/**
 * Página de verificación de identidad para estudiantes.
 */
export default function BiometriaCapture() {
  const navigate = useNavigate()

  const handleSuccess = useCallback(() => {
    navigate('/estudiante/votacion', { replace: true })
  }, [navigate])

  return (
    <main className="min-h-screen bg-white">
      <header className="bg-blue-900">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="text-lg font-semibold text-white">Sistema de Votación Universitaria</h1>
          <p className="mt-1 text-sm text-white/90">
            Verificación de identidad del estudiante.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <CaptureFlow onSuccess={handleSuccess} />
      </div>
    </main>
  )
}
