import { useEffect, useState } from 'react'
import {
  obtenerParametros,
  actualizarParametro,
  crearParametro,
  eliminarParametro,
} from '../../../services/configuracionService'

export default function ConfiguracionSistema() {
  const [parametros, setParametros] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [editando, setEditando] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    clave: '',
    valor: '',
    tipo: 'STRING',
    descripcion: '',
  })

  useEffect(() => {
    cargarParametros()
  }, [])

  const cargarParametros = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await obtenerParametros()
      setParametros(data)
    } catch (err) {
      setError(err?.response?.data?.message || 'Error cargando parámetros')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleActualizar = async (parametro) => {
    try {
      setError(null)
      await actualizarParametro(parametro.clave, {
        valor: parametro.valor,
        descripcion: parametro.descripcion,
      })
      setEditando(null)
      await cargarParametros()
    } catch (err) {
      setError(err?.response?.data?.message || 'Error actualizando parámetro')
      console.error('Error:', err)
    }
  }

  const handleCrear = async (e) => {
    e.preventDefault()
    if (!formData.clave || !formData.valor) {
      setError('Por favor rellena los campos requeridos')
      return
    }

    try {
      setError(null)
      await crearParametro(formData)
      setFormData({ clave: '', valor: '', tipo: 'STRING', descripcion: '' })
      setShowForm(false)
      await cargarParametros()
    } catch (err) {
      setError(err?.response?.data?.message || 'Error creando parámetro')
      console.error('Error:', err)
    }
  }

  const handleEliminar = async (clave) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el parámetro "${clave}"?`)) return

    try {
      setError(null)
      await eliminarParametro(clave)
      await cargarParametros()
    } catch (err) {
      setError(err?.response?.data?.message || 'Error eliminando parámetro')
      console.error('Error:', err)
    }
  }

  const renderValor = (parametro) => {
    if (editando?.clave === parametro.clave) {
      if (parametro.tipo === 'BOOLEAN') {
        return (
          <select
            value={parametro.valor}
            onChange={(e) =>
              setEditando({ ...editando, valor: e.target.value === 'true' })
            }
            className="rounded border border-gray-300 px-2 py-1"
          >
            <option value="true">Activado</option>
            <option value="false">Desactivado</option>
          </select>
        )
      }
      return (
        <input
          type={parametro.tipo === 'NUMBER' ? 'number' : 'text'}
          value={parametro.valor}
          onChange={(e) => setEditando({ ...editando, valor: e.target.value })}
          className="w-full max-w-xs rounded border border-gray-300 px-2 py-1"
        />
      )
    }

    if (parametro.tipo === 'BOOLEAN') {
      return (
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            parametro.valor === true || parametro.valor === 'true'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {parametro.valor === true || parametro.valor === 'true' ? 'Activado' : 'Desactivado'}
        </span>
      )
    }

    return <span className="text-sm text-gray-900">{parametro.valor}</span>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p className="mt-1 text-gray-600">
            Gestionar parámetros dinámicos del sistema (CU-02)
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Parámetro'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {showForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Crear Nuevo Parámetro</h2>
          <form onSubmit={handleCrear} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Clave</label>
                <input
                  type="text"
                  required
                  value={formData.clave}
                  onChange={(e) => setFormData({ ...formData, clave: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="BYPASS_ELECTION_TIME"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="STRING">String</option>
                  <option value="BOOLEAN">Boolean</option>
                  <option value="NUMBER">Number</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Valor</label>
              <input
                type={formData.tipo === 'NUMBER' ? 'number' : 'text'}
                required
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Descripción</label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                rows="3"
                placeholder="Descripción del parámetro..."
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Crear Parámetro
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-600">Cargando parámetros...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {parametros.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-600">
              No hay parámetros configurados.
            </div>
          ) : (
            parametros.map((param) => (
              <div
                key={param.clave}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow"
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">Clave</p>
                    <p className="mt-1 font-mono text-sm text-gray-900">{param.clave}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">Valor</p>
                    <div className="mt-1">{renderValor(param)}</div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">Tipo</p>
                    <p className="mt-1 text-sm text-gray-900">{param.tipo}</p>
                  </div>
                </div>

                {param.descripcion && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase text-gray-500">Descripción</p>
                    <p className="mt-1 text-sm text-gray-700">{param.descripcion}</p>
                  </div>
                )}

                {editando?.clave === param.clave ? (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleActualizar(editando)}
                      className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditando(null)}
                      className="rounded bg-gray-400 px-4 py-2 text-sm text-white hover:bg-gray-500"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => setEditando(param)}
                      className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(param.clave)}
                      className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
