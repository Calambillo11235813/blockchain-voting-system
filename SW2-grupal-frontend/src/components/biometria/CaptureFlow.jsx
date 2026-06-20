import { useCallback, useMemo, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import { verifyBiometrics } from '../../services/biometriaService'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

const STEPS = [
  {
    key: 'frontal',
    title: 'Frontal del carnet',
    description: 'Coloque el carnet dentro del recuadro y tome la foto.',
    overlay: 'card',
  },
  {
    key: 'trasera',
    title: 'Trasera del carnet',
    description: 'Gire el carnet y vuelva a tomar la foto dentro del recuadro.',
    overlay: 'card',
  },
  {
    key: 'selfie',
    title: 'Foto del rostro',
    description: 'Alinee su rostro dentro del óvalo y tome la foto.',
    overlay: 'selfie',
  },
]

/**
 * Flujo de captura fotográfica por pasos para verificación de identidad.
 *
 * - UI en Español (Bolivia)
 * - Identificadores en inglés
 *
 * @param {{ onSuccess?: (result: { verificado: boolean, datosEstudiante: any }) => void }} props
 * @returns {import('react').JSX.Element}
 */
export default function CaptureFlow({ onSuccess }) {
  const webcamRef = useRef(null)
  const fileInputRef = useRef(null)

  const [stepIndex, setStepIndex] = useState(0)
  const [captures, setCaptures] = useState(() => ({
    frontal: null,
    trasera: null,
    selfie: null,
  }))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const currentStep = STEPS[stepIndex]

  const videoConstraints = useMemo(() => {
    const facingMode = currentStep.key === 'selfie' ? 'user' : 'environment'
    return {
      facingMode,
      width: { ideal: 640 },
      height: { ideal: 480 },
    }
  }, [currentStep.key])

  const progressPercent = useMemo(() => {
    if (STEPS.length <= 1) return 0
    return Math.round((stepIndex / (STEPS.length - 1)) * 100)
  }, [stepIndex])

  const canSubmit = Boolean(captures.frontal && captures.trasera && captures.selfie)

  const handleCapture = useCallback(async () => {
    setErrorMessage('')
    setSuccessMessage('')

    const screenshot = webcamRef.current?.getScreenshot()
    if (!screenshot) {
      setErrorMessage('No se pudo tomar la foto. Verifique el permiso de cámara e intente nuevamente.')
      return
    }

    try {
      const processedScreenshot = screenshot

      const blob = await resizeImage(processedScreenshot, 640, 0.8)
      if (!blob) {
        setErrorMessage('No se pudo procesar la imagen. Intente nuevamente.')
        return
      }

      const filename = `${currentStep.key}.jpg`
      const file = new File([blob], filename, { type: 'image/jpeg' })

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrorMessage('La imagen es muy pesada. Acérquese más y vuelva a intentar.')
        return
      }

      setCaptures((prev) => ({
        ...prev,
        [currentStep.key]: {
          file,
          previewUrl: URL.createObjectURL(blob),
        },
      }))

      if (stepIndex < STEPS.length - 1) {
        setStepIndex((prev) => prev + 1)
      }
    } catch {
      setErrorMessage('No se pudo procesar la imagen. Intente nuevamente.')
    }
  }, [currentStep.key, currentStep.overlay, stepIndex])

  const handleChooseFromDevice = useCallback(() => {
    if (isSubmitting) return
    fileInputRef.current?.click()
  }, [isSubmitting])

  const handleUploadFromDevice = useCallback(async (event) => {
    setErrorMessage('')
    setSuccessMessage('')

    const file = event.target?.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!/^image\/(jpeg|png)$/i.test(file.type)) {
      setErrorMessage('Solo se permiten archivos JPG o PNG.')
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage('La imagen no debe superar 5MB.')
      return
    }

    try {
      const dataUrl = await fileToDataURL(file)
      const compressedBlob = await resizeImage(dataUrl, 640, 0.8)
      if (!compressedBlob) {
        setErrorMessage('No se pudo procesar la imagen. Intente nuevamente.')
        return
      }

      const compressedFile = new File([compressedBlob], `${currentStep.key}.jpg`, { type: 'image/jpeg' })
      const previewUrl = URL.createObjectURL(compressedBlob)

      setCaptures((prev) => ({
        ...prev,
        [currentStep.key]: {
          file: compressedFile,
          previewUrl,
        },
      }))

      if (stepIndex < STEPS.length - 1) {
        setStepIndex((prev) => prev + 1)
      }
    } catch {
      setErrorMessage('No se pudo procesar la imagen. Intente nuevamente.')
    }
  }, [currentStep.key, stepIndex])

  const handleRetake = useCallback(() => {
    setErrorMessage('')
    setSuccessMessage('')

    setCaptures((prev) => ({
      ...prev,
      [currentStep.key]: null,
    }))
  }, [currentStep.key])

  const handleGoToStep = useCallback((nextStepIndex) => {
    if (isSubmitting) return
    setErrorMessage('')
    setSuccessMessage('')
    setStepIndex(nextStepIndex)
  }, [isSubmitting])

  const handleSubmit = useCallback(async () => {
    setErrorMessage('')
    setSuccessMessage('')

    if (!canSubmit) {
      setErrorMessage('Complete las 3 fotos antes de continuar.')
      return
    }

    try {
      setIsSubmitting(true)
      const result = await verifyBiometrics({
        frontalFile: captures.frontal.file,
        traseraFile: captures.trasera.file,
        selfieFile: captures.selfie.file,
      })

      if (!result.verificado) {
        setErrorMessage('No se pudo verificar su identidad. Revise las fotos e intente nuevamente.')
        return
      }

      setSuccessMessage('Identidad verificada. Continuando…')
      onSuccess?.(result)
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error al verificar biometria', {
          status: error?.response?.status,
          data: error?.response?.data,
          message: error?.message,
        })
      }
      const rawMessage = error?.response?.data?.message || error?.message
      setErrorMessage(getFriendlyBiometricsError(rawMessage))
    } finally {
      setIsSubmitting(false)
    }
  }, [canSubmit, captures, onSuccess])

  const handleResetAll = useCallback(() => {
    if (isSubmitting) return
    setErrorMessage('')
    setSuccessMessage('')
    setStepIndex(0)
    setCaptures({ frontal: null, trasera: null, selfie: null })
  }, [isSubmitting])

  const activeCapture = captures[currentStep.key]
  const isCaptured = Boolean(activeCapture)

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-blue-900">Verificación de identidad</h1>
          <p className="mt-1 text-sm text-slate-700">
            Tome las 3 fotos solicitadas para continuar con la votación.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetAll}
          disabled={isSubmitting}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reiniciar
        </button>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">
            Paso {stepIndex + 1} de {STEPS.length}: {currentStep.title}
          </p>
          <p className="text-xs text-slate-600">{progressPercent}%</p>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-yellow-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-slate-700">{currentStep.description}</p>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
            {isCaptured ? (
              <img
                src={activeCapture.previewUrl}
                alt="Vista previa"
                className="h-[360px] w-full object-cover"
              />
            ) : (
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                screenshotQuality={1}
                forceScreenshotSourceSize
                videoConstraints={videoConstraints}
                className="h-[360px] w-full object-cover"
                onUserMediaError={() => {
                  setErrorMessage('No se pudo acceder a la cámara. Revise los permisos del navegador.')
                }}
              />
            )}

            <CaptureOverlay type={currentStep.overlay} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {isCaptured ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={isSubmitting}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Volver a tomar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (stepIndex < STEPS.length - 1) {
                      handleGoToStep(stepIndex + 1)
                    }
                  }}
                  disabled={isSubmitting || stepIndex >= STEPS.length - 1}
                  className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                >
                  Siguiente
                </button>

                <button
                  type="button"
                  onClick={handleChooseFromDevice}
                  disabled={isSubmitting}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Subir desde dispositivo
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={isSubmitting}
                  className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                >
                  Tomar foto
                </button>

                <button
                  type="button"
                  onClick={handleChooseFromDevice}
                  disabled={isSubmitting}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Subir desde dispositivo
                </button>
              </>
            )}

            {isSubmitting ? (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-900" />
                <span>Procesando Biometría...</span>
              </div>
            ) : null}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleUploadFromDevice}
            className="hidden"
          />
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Resumen</p>

            <div className="mt-3 space-y-3">
              {STEPS.map((step, index) => {
                const item = captures[step.key]
                const isDone = Boolean(item)
                const isActive = index === stepIndex

                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => handleGoToStep(index)}
                    disabled={isSubmitting}
                    className={
                      'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ' +
                      (isActive
                        ? 'border-blue-900 bg-white'
                        : 'border-slate-200 bg-white hover:bg-slate-50')
                    }
                  >
                    <span className="font-medium text-slate-800">{step.title}</span>
                    <span className={isDone ? 'text-emerald-700' : 'text-slate-500'}>
                      {isDone ? 'Listo' : 'Pendiente'}
                    </span>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-950 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              Verificar y continuar
            </button>

            <p className="mt-2 text-xs text-slate-600">
              Si algo sale borroso, vuelva a tomar la foto.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CaptureOverlay({ type }) {
  if (type === 'selfie') {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-[260px] w-[200px] rounded-[999px] border-4 border-yellow-500/90" />
      </div>
    )
  }

  // Se eliminó el recuadro amarillo para el carnet, permitiendo capturar toda la pantalla
  return null
}

/**
 * Convierte un File a data URL.
 * @param {File} file Archivo de imagen.
 * @returns {Promise<string>}
 */
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsDataURL(file)
  })
}

/**
 * Redimensiona una imagen y la comprime como JPEG.
 * @param {string} dataUrl Data URL de imagen.
 * @param {number} maxWidth Ancho máximo en píxeles.
 * @param {number} quality Calidad JPEG (0–1).
 * @returns {Promise<Blob|null>}
 */
function resizeImage(dataUrl, maxWidth = 640, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ratio = Math.min(maxWidth / img.width, 1)
      canvas.width = Math.floor(img.width * ratio)
      canvas.height = Math.floor(img.height * ratio)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

/**
 * Normaliza el mensaje de error para evitar detalles técnicos.
 * @param {unknown} rawMessage Mensaje crudo del error.
 * @returns {string} Mensaje amigable.
 */
function getFriendlyBiometricsError(rawMessage) {
  const fallback = 'No se pudo verificar su identidad. Inténtelo nuevamente.'

  if (typeof rawMessage !== 'string') {
    return fallback
  }

  const trimmed = rawMessage.trim()
  if (!trimmed) {
    return fallback
  }

  const looksLikeJson = trimmed.includes('{') || trimmed.includes('}') || trimmed.includes('"')
  if (looksLikeJson) {
    return fallback
  }

  if (/internal server|stack|network|axios|multipart|boundary/i.test(trimmed)) {
    return 'Hubo un problema al conectar con el servidor. Inténtelo más tarde.'
  }

  if (trimmed.length > 160) {
    return fallback
  }

  return trimmed
}
