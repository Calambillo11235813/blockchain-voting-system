import { useEffect, useState } from 'react'
import {
  obtenerAdministradores,
  crearAdministrador,
  eliminarAdministrador,
} from '../../../services/adminsService'
import { useAuth } from '../../../context/AuthContext'

export default function GestionAdministradores() {
  const { usuario } = useAuth()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ correo: '', password: '', rol: 'ELECTORAL' })
  const [submitting, setSubmitting] = useState(false)

  // Solo SISTEMAS puede gestionar administradores
  const esAdmin = usuario?.rol === 'SISTEMAS'

  useEffect(() => {
    cargarAdministradores()
  }, [])

  const cargarAdministradores = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await obtenerAdministradores()
      setAdmins(data)
    } catch (err) {
      setError(err?.response?.data?.message || 'Error cargando administradores')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCrearAdmin = async (e) => {
    e.preventDefault()
    if (!formData.correo || !formData.password) {
      setError('Por favor rellena todos los campos')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      await crearAdministrador(formData)
      setFormData({ correo: '', password: '', rol: 'ELECTORAL' })
      setShowForm(false)
      await cargarAdministradores()
    } catch (err) {
      setError(err?.response?.data?.message || 'Error creando administrador')
      console.error('Error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEliminarAdmin = async (adminId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este administrador?')) return

    try {
      setError(null)
      await eliminarAdministrador(adminId)
      await cargarAdministradores()
    } catch (err) {
      setError(err?.response?.data?.message || 'Error eliminando administrador')
      console.error('Error:', err)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Administradores</h1>
          <p className="mt-1 text-gray-600">Crear, listar y eliminar cuentas administrativas (CU-01)</p>
        </div>
        {esAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {showForm ? 'Cancelar' : '+ Nuevo Administrador'}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {!esAdmin && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
          <p className="font-semibold">Acceso Restringido</p>
          <p>Solo los administradores de sistemas pueden gestionar otras cuentas.</p>
        </div>
      )}

      {showForm && esAdmin && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Crear Nuevo Administrador</h2>
          <form onSubmit={handleCrearAdmin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={formData.correo}
                onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="admin@uagrm.edu.bo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Contraseña</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Rol</label>
              <select
                value={formData.rol}
                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value="ELECTORAL">Electoral</option>
                <option value="SISTEMAS">Sistemas</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Creando...' : 'Crear Administrador'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-600">Cargando administradores...</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Rol</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-gray-600">
                    No hay administradores registrados.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{admin.correo}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          admin.rol === 'SISTEMAS'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {admin.rol}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {esAdmin && (
                        <button
                          onClick={() => handleEliminarAdmin(admin.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
