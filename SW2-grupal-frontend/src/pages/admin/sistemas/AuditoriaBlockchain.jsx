import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { obtenerDetallesTransaccion, obtenerDetallesBloque } from '../../../services/auditoriaService'

export default function AuditoriaBlockchain() {
  const location = useLocation()
  
  const [tipoConsulta, setTipoConsulta] = useState('transaccion')
  const [busqueda, setBusqueda] = useState('')
  const [resultado, setResultado] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Cargar hash desde react-router state si viene redirigido desde la bitácora
  useEffect(() => {
    if (location.state?.parametroHash) {
      setTipoConsulta('transaccion')
      setBusqueda(location.state.parametroHash)
      // Opcional: auto-buscar aquí (requiere envolver handleBuscarForm en useCallback o pasar el param)
      buscarAutomáticamente(location.state.parametroHash)
    }
  }, [location.state])

  const buscarAutomáticamente = async (hash) => {
    try {
      setLoading(true)
      setError(null)
      setResultado(null)
      const datos = await obtenerDetallesTransaccion(hash)
      setResultado({ tipo: 'transaccion', datos })
    } catch (err) {
      setError(err?.response?.data?.message || 'Error en la consulta')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBuscar = async (e) => {
    e.preventDefault()
    if (!busqueda.trim()) {
      setError('Por favor ingresa un valor para buscar')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setResultado(null)

      if (tipoConsulta === 'transaccion') {
        const datos = await obtenerDetallesTransaccion(busqueda)
        setResultado({ tipo: 'transaccion', datos })
      } else {
        const numero = parseInt(busqueda, 10)
        if (isNaN(numero)) {
          setError('El número de bloque debe ser un número válido')
          setLoading(false)
          return
        }
        const datos = await obtenerDetallesBloque(numero)
        setResultado({ tipo: 'bloque', datos })
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Error en la consulta')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const renderTransaccion = (datos) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">Hash</p>
          <p className="mt-2 break-all font-mono text-sm text-gray-900">{datos.hash}</p>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">Estado</p>
          <span
            className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              datos.estado === 'confirmada' || datos.estado === 'exitosa'
                ? 'bg-green-100 text-green-800'
                : datos.estado === 'pendiente' 
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {datos.estado}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">Bloque</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">{datos.bloque}</p>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">Confirmaciones</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">{datos.confirmaciones}</p>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">Timestamp</p>
          <p className="mt-2 text-sm text-gray-900">
            {datos.timestamp ? new Date(datos.timestamp * 1000).toLocaleString() : 'Pendiente'}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">Valor (ETH)</p>
          <p className="mt-2 font-mono text-sm text-gray-900">{datos.valor || '0.0'}</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold uppercase text-gray-500">Desde</p>
        <p className="mt-2 break-all font-mono text-sm text-gray-900">{datos.desde}</p>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold uppercase text-gray-500">Hacia</p>
        <p className="mt-2 break-all font-mono text-sm text-gray-900">{datos.hacia}</p>
      </div>


    </div>
  )

  const renderBloque = (datos) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">Número de Bloque</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">{datos.numero}</p>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">Transacciones</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">{datos.transacciones}</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold uppercase text-gray-500">Hash</p>
        <p className="mt-2 break-all font-mono text-sm text-gray-900">{datos.hash}</p>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold uppercase text-gray-500">Hash del Bloque Anterior</p>
        <p className="mt-2 break-all font-mono text-sm text-gray-900">{datos.hashPadre}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">Timestamp</p>
          <p className="mt-2 text-sm text-gray-900">
            {datos.timestamp ? new Date(datos.timestamp * 1000).toLocaleString() : 'N/A'}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">Dificultad</p>
          <p className="mt-2 font-mono text-sm text-gray-900">{datos.dificultad}</p>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">Gas Usado</p>
          <p className="mt-2 font-mono text-sm text-gray-900">{datos.gasUsado}</p>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">Gas Límite</p>
          <p className="mt-2 font-mono text-sm text-gray-900">{datos.gasLimite}</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold uppercase text-gray-500">Minero</p>
        <p className="mt-2 break-all font-mono text-sm text-gray-900">{datos.minero}</p>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold uppercase text-gray-500">Raíz Merkle</p>
        <p className="mt-2 break-all font-mono text-sm text-gray-900">{datos.raizMerkle}</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Auditoría de Blockchain</h1>
        <p className="mt-1 text-gray-600">
          Buscar y verificar la integridad de transacciones y bloques (CU-20)
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleBuscar} className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo de Consulta</label>
            <select
              value={tipoConsulta}
              onChange={(e) => {
                setTipoConsulta(e.target.value)
                setBusqueda('')
                setResultado(null)
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="transaccion">Transacción (Hash)</option>
              <option value="bloque">Bloque (Número)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {tipoConsulta === 'transaccion' ? 'Hash de Transacción' : 'Número de Bloque'}
            </label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder={tipoConsulta === 'transaccion' ? '0x123abc...' : '6234567'}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Buscando...' : '🔍 Buscar'}
            </button>
          </div>
        </div>
      </form>

      {resultado && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {resultado.tipo === 'transaccion' ? 'Detalles de la Transacción' : 'Detalles del Bloque'}
            </h2>
            <span className="inline-block rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-800">
              ✓ Verificado
            </span>
          </div>

          {resultado.tipo === 'transaccion'
            ? renderTransaccion(resultado.datos)
            : renderBloque(resultado.datos)}
        </div>
      )}

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="font-semibold text-blue-900">💡 Información</p>
        <ul className="mt-2 space-y-1 text-sm text-blue-800">
          <li>
            • Busca por <strong>hash de transacción</strong> para verificar detalles de sufragios
            registrados en blockchain.
          </li>
          <li>
            • Busca por <strong>número de bloque</strong> para auditar la integridad de bloques
            específicos.
          </li>
          <li>
            • Las transacciones con <strong>confirmaciones ≥ 12</strong> son consideradas
            inmutables.
          </li>
        </ul>
      </div>
    </div>
  )
}
