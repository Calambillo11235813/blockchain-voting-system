import { useMemo, useRef, useState } from 'react'

/**
 * Componente para cargar la whitelist/padrón de estudiantes (HU-001).
 *
 * Soporta selección por input y drag & drop.
 *
 * @param {{ onUpload: (file: File) => Promise<any> }} props
 */
export default function WhitelistUpload({ onUpload }) {
  const inputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  const canUpload = useMemo(() => {
    return Boolean(file) && !isUploading
  }, [file, isUploading])

  const pickFile = () => {
    inputRef.current?.click()
  }

  const setSelectedFile = (nextFile) => {
    setResult(null)
    setErrorMessage('')
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
    setResult(null)

    try {
      setIsUploading(true)
      const response = await onUpload(file)
      setResult(response)
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'No se pudo cargar la whitelist.'
      setErrorMessage(message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Whitelist Upload</h2>
          <p className="mt-1 text-sm text-slate-600">
            Sube el padrón en formato <span className="font-medium">.xlsx</span>.
          </p>
        </div>

        <button
          type="button"
          onClick={pickFile}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Choose file
        </button>
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
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-slate-200 bg-slate-50')
        }
      >
        <p className="text-sm font-medium text-slate-800">
          Drag & drop your .xlsx here
        </p>
        <p className="mt-1 text-xs text-slate-500">
          o usa el botón <span className="font-medium">Choose file</span>
        </p>

        <div className="mt-4 text-xs text-slate-600">
          <div className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2">
            <span className="font-medium">Selected:</span>
            <span>{file ? file.name : 'None'}</span>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <p className="font-medium">Carga completada</p>
          <p className="mt-1 text-xs text-emerald-900/80">
            Total: {result?.data?.total ?? '-'} · Inserted: {result?.data?.inserted ?? '-'} · Updated: {result?.data?.updated ?? '-'}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleUpload}
          disabled={!canUpload}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isUploading ? 'Uploading…' : 'Upload whitelist'}
        </button>
      </div>
    </section>
  )
}
