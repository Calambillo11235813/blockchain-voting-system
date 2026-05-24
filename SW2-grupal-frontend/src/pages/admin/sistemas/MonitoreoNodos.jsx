import { useEffect, useState } from 'react'
import { obtenerEstadoNodos, verificarSaludNodo } from '../../../services/nodosService'

const ESTADO_COLORES = {
  activo: 'bg-green-100 text-green-800',
  inactivo: 'bg-red-100 text-red-800',
  lento: 'bg-yellow-100 text-yellow-800',
}

export default function MonitoreoNodos() {
  const [nodos, setNodos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [verificando, setVerificando] = useState(null)

  useEffect(() => {
    cargarNodos()
    // Actualizar cada 30 segundos
    const intervalo = setInterval(cargarNodos, 30000)
    return () => clearInterval(intervalo)
  }, [])

  const cargarNodos = async () => {
    try {
      setError(null)
      const data = await obtenerEstadoNodos()
      setNodos(data)
    } catch (err) {
      setError(err?.response?.data?.message || 'Error cargando estado de nodos')
      console.error('Error:', err)
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
    return ESTADO_COLORES[estado] || ESTADO_COLORES.inactivo
  }

  const getEstadoTexto = (estado) => {
    const textos = {
      activo: '🟢 Activo',
      inactivo: '🔴 Inactivo',
      lento: '🟡 Lento',
    }
    return textos[estado] || estado
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
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Actualizando...' : '🔄 Actualizar'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {nodos.length === 0 ? (
          <div className="col-span-full rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-600">
            {loading ? 'Cargando nodos...' : 'No hay nodos disponibles.'}
          </div>
        ) : (
          nodos.map((nodo) => (
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
                    {nodo.bloque_actual || 'N/A'}
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
          ))
        )}
      </div>

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
