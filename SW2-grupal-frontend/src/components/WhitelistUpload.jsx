import { useMemo, useRef, useState } from 'react'
import { getApiErrorMessage, splitApiErrorLines } from '../utils/apiErrors'

/**
 * Componente para cargar el padrón electoral (HU-001).
 *
 * Soporta selección por input y drag & drop.
 * El resumen de éxito lo renderiza el padre vía `onUploadSuccess`.
 *
 * @param {{
 *   onUpload: (file: File) => Promise<import('../services/adminService').ApiResponsePadronUpload>,
 *   onUploadSuccess?: (data: import('../services/adminService').ResultadoCargaPadron) => void,
 * }} props
 */
export default function WhitelistUpload({ onUpload, onUploadSuccess }) {
  const inputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [errorLines, setErrorLines] = useState([])
  const [isDragOver, setIsDragOver] = useState(false)

  const canUpload = useMemo(() => {
    return Boolean(file) && !isUploading
  }, [file, isUploading])

  const pickFile = () => {
    inputRef.current?.click()
  }

  /** Limpia archivo e input tras una carga exitosa. */
  function resetUploadState() {
    setFile(null)
    setErrorMessage('')
    setErrorLines([])
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const setSelectedFile = (nextFile) => {
    setErrorMessage('')
    setErrorLines([])
    setFile(nextFile || null)
  }

  const handleChange = (event) => {
    const nextFile = event.target.files?.[0]
    setSelectedFile(nextFile)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragOver(false)
    const nextFile = event.dataTransfer.files?.[0]
    setSelectedFile(nextFile)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleUpload = async () => {
    if (!file) return
    setErrorMessage('')
    setErrorLines([])

    try {
      setIsUploading(true)
      const response = await onUpload(file)

      if (response?.statusCode === 200 && response?.data) {
        resetUploadState()
        onUploadSuccess?.(response.data)
      } else {
        const fallback = response?.message || 'No se pudo procesar la carga del padrón.'
        setErrorMessage(fallback)
        setErrorLines(splitApiErrorLines(fallback))
      }
    } catch (err) {
      console.error(err)
      const message = getApiErrorMessage(err, 'Hubo un problema al cargar el padrón. Inténtelo más tarde.')
      setErrorMessage(message)
      setErrorLines(splitApiErrorLines(message))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-blue-900">Cargar Padrón Electoral</h2>
          <p className="mt-1 text-sm text-slate-700">
            Formato permitido: <span className="font-semibold">.xlsx</span> con hojas Estudiantes y/o Docentes.
          </p>
        </div>

        <button
          type="button"
          onClick={pickFile}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Seleccionar archivo
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3 text-xs text-slate-700">
        <p className="font-semibold text-blue-900">Formato del archivo Excel</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="font-medium text-slate-900">Hoja Estudiantes</p>
            <p className="mt-1 text-slate-600">
              Cod.Fac. / FAC, Facultad, Cod.lugar / Cod. Lugar, LUGAR DE VOTACION, CARR-PL, CARRERA,
              Registro, Nombre, CI, RECTOR
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-900">Hoja Docentes</p>
            <p className="mt-1 text-slate-600">
              Cod.Fac., Facultad, Cod.Lugar, Lugar, Cod.Docente, Docente, C.I., RECTOR
            </p>
          </div>
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-4 text-slate-600">
          <li>Al menos una hoja debe existir.</li>
          <li>CI acepta complemento (ej. 7453385 SC, 11341460-SCZ).</li>
          <li>RECTOR: SI / NO.</li>
          <li>Docente que también estudia puede aparecer en ambas hojas (se fusiona automáticamente).</li>
        </ul>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleChange}
      />

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={
          `mt-4 rounded-xl border-2 border-dashed p-6 text-center transition ` +
          (isDragOver
            ? 'border-blue-900 bg-slate-50'
            : 'border-slate-200 bg-slate-50')
        }
      >
        <p className="text-sm font-medium text-slate-900">
          Arrastra y suelta tu archivo <span className="font-semibold">.xlsx</span> aquí
        </p>
        <p className="mt-1 text-xs text-slate-600">
          o utiliza el botón <span className="font-semibold">Seleccionar archivo</span>
        </p>

        <div className="mt-4 text-xs text-slate-600">
          <div className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2">
            <span className="font-semibold text-slate-900">Archivo seleccionado:</span>
            <span className="text-slate-700">{file ? file.name : 'Ninguno'}</span>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errorLines.length > 1 ? (
            <ul className="list-disc space-y-1 pl-4">
              {errorLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            errorMessage
          )}
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleUpload}
          disabled={!canUpload}
          className="inline-flex items-center justify-center rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-blue-900 hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
        >
          {isUploading ? 'Cargando…' : 'Cargar padrón'}
        </button>
      </div>
    </section>
  )
}
