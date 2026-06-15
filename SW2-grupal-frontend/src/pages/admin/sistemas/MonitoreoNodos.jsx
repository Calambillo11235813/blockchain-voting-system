import { useEffect, useState } from 'react'
import { obtenerEstadoNodos, verificarSaludNodo } from '../../../services/nodosService'

const ESTADO_COLORES = {
  activo: 'bg-green-100 text-green-800 border-green-200',
  Sincronizado: 'bg-green-100 text-green-800 border-green-200',
  Online: 'bg-green-100 text-green-800 border-green-200',
  inactivo: 'bg-red-100 text-red-800 border-red-200',
  Caído: 'bg-red-100 text-red-800 border-red-200',
  lento: 'bg-yellow-100 text-yellow-800 border-yellow-200',
}

export default function MonitoreoNodos() {
  const [nodos, setNodos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [verificando, setVerificando] = useState(null)

  useEffect(() => {
    cargarNodos()
    // Actualizar cada 5 segundos (Polling)
    const intervalo = setInterval(cargarNodos, 5000)
    return () => clearInterval(intervalo)
  }, [])

  const cargarNodos = async () => {
    try {
      setError(null)
      const data = await obtenerEstadoNodos()
      console.log('Respuesta cruda de la API:', data)

      // Mapeo seguro de datos
      const arrayNodos = data?.nodos || data?.data || data
      setNodos(Array.isArray(arrayNodos) ? arrayNodos : [])
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Error cargando estado de nodos')
      console.error('Error en API de Nodos:', err)
      setNodos([]) // Asegura vaciar el array en caso de error
    } finally {
      setLoading(false)
    }
  }

  const handleVerificar = async (nodo) => {
    try {
      setVerificando(nodo.url)
      setError(null)
      const urlBase64 = btoa(nodo.url)
      const resultado = await verificarSaludNodo(urlBase64)

      // Actualizar el nodo con los resultados
      setNodos(
        nodos.map((n) =>
          n.url === nodo.url
            ? { ...n, ...resultado, ultima_verificacion: new Date().toLocaleString() }
            : n
        )
      )
    } catch (err) {
      setError(err?.response?.data?.message || 'Error verificando nodo')
      console.error('Error:', err)
    } finally {
      setVerificando(null)
    }
  }

  const getEstadoClase = (estado) => {
    // Normalizar estados para matchear con ESTADO_COLORES
    const normalized =
      estado === 'activo' || estado === 'Sincronizado' || estado === 'Online'
        ? 'Online'
        : estado === 'inactivo' || estado === 'Caído'
          ? 'Caído'
          : 'lento'

    return ESTADO_COLORES[normalized] || ESTADO_COLORES['Caído']
  }

  const getEstadoTexto = (estado) => {
    // Retornamos el estado como el requerimiento: Sincronizado/Online o Caído
    if (estado === 'activo' || estado === 'Sincronizado' || estado === 'Online') {
      return '🟢 Sincronizado / Online'
    } else if (estado === 'lento') {
      return '🟡 Online (Lento)'
    } else {
      return '🔴 Caído'
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Monitoreo de Nodos RPC</h1>
          <p className="mt-1 text-gray-600">
            Verificar estado y latencia de los nodos de la red Blockchain (CU-04)
          </p>
        </div>
        <button
          onClick={cargarNodos}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-[#0a3366] px-4 py-2 font-medium text-white hover:bg-[#0a3366]/90 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            '🔄 Actualizar'
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-[#d32f2f]/10 p-4 text-[#d32f2f]">
          <p className="font-semibold">Error de conexión</p>
          <p>{error}</p>
        </div>
      )}

      {nodos.length === 0 && !loading && !error ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No hay nodos disponibles</h3>
          <p className="mt-1 text-sm text-gray-500">Intenta actualizar o verifica la configuración del backend.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {nodos.map((nodo) => (
            <div
              key={nodo.url}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase text-gray-500">URL del Nodo</p>
                  <p className="mt-1 break-all font-mono text-sm text-gray-900">{nodo.url}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getEstadoClase(nodo.estado)}`}>
                  {getEstadoTexto(nodo.estado)}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Latencia</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {nodo.latencia ? `${nodo.latencia}ms` : 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Bloque Actual</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {nodo.bloque_actual !== null && nodo.bloque_actual !== undefined ? nodo.bloque_actual : 'N/A'}
                  </p>
                </div>
              </div>

              {nodo.error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-semibold uppercase text-red-800">Error</p>
                  <p className="mt-1 text-sm text-red-700">{nodo.error}</p>
                </div>
              )}

              {nodo.ultima_verificacion && (
                <p className="mt-3 text-xs text-gray-500">
                  Última verificación: {nodo.ultima_verificacion}
                </p>
              )}

              <button
                onClick={() => handleVerificar(nodo)}
                disabled={verificando === nodo.url}
                className="mt-4 w-full rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {verificando === nodo.url ? 'Verificando...' : '🔍 Verificar Salud'}
              </button>
            </div>
          ))}
        </div>
      )}

      {nodos.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="font-semibold text-blue-900">📊 Resumen</p>
          <div className="mt-2 grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-blue-800">
                🟢 Activos: {nodos.filter((n) => n.estado === 'activo').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-800">
                🟡 Lentos: {nodos.filter((n) => n.estado === 'lento').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-800">
                🔴 Inactivos: {nodos.filter((n) => n.estado === 'inactivo').length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
