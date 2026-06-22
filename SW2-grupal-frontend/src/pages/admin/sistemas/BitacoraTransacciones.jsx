import { useState, useEffect, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { obtenerBitacoraTransacciones } from '../../../services/auditoriaService'

export default function BitacoraTransacciones() {
  const [transacciones, setTransacciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copiadoIdx, setCopiadoIdx] = useState(null)
  const [expandedRows, setExpandedRows] = useState(new Set())
  
  const navigate = useNavigate()

  const toggleRow = (hash) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(hash)) {
      newExpanded.delete(hash)
    } else {
      newExpanded.add(hash)
    }
    setExpandedRows(newExpanded)
  }

  useEffect(() => {
    cargarBitacora()
  }, [])

  const cargarBitacora = async () => {
    try {
      setLoading(true)
      const data = await obtenerBitacoraTransacciones()
      setTransacciones(data)
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cargar la bitácora.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopiarHash = (hash, index) => {
    navigator.clipboard.writeText(hash)
    setCopiadoIdx(index)
    setTimeout(() => setCopiadoIdx(null), 2000)
  }

  const handleAuditarHash = (hash) => {
    // Redirige al panel de auditoría e incluye el hash en el state o URL
    // Usaremos un location state para pasarlo limpio, luego configuramos AuditoriaBlockchain para leerlo.
    navigate('/admin/auditoria', { state: { parametroHash: hash } })
  }

  const truncarHash = (hash) => {
    if (!hash) return ''
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-blue-900">Bitácora de Transacciones</h1>
        <p className="mt-1 text-gray-600">
          Explorador de bloques interno del sistema (Solo Metadatos)
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y border-b border-gray-200 divide-gray-200">
              <thead className="bg-[#0a3366] text-white">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">
                    Fecha y Hora
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">
                    Hash de Transacción (TXID)
                  </th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">
                    Tipo de Voto
                  </th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                      Cargando transacciones...
                    </td>
                  </tr>
                ) : transacciones.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                      No hay transacciones registradas todavía.
                    </td>
                  </tr>
                ) : (
                  transacciones.map((tx, idx) => (
                    <Fragment key={tx.txHash || idx}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {new Date(tx.fecha).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-700">
                          <div className="flex items-center space-x-2">
                            <span>{truncarHash(tx.txHash)}</span>
                            <button
                              onClick={() => handleCopiarHash(tx.txHash, idx)}
                              className="p-1 text-gray-400 hover:text-blue-600 focus:outline-none"
                              title="Copiar Hash Completo"
                            >
                              {copiadoIdx === idx ? '✅' : '📋'}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm">
                          {Number(tx.cantidadPapeletas) === 1 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Voto Único
                            </span>
                          ) : (
                            <div className="flex items-center justify-center space-x-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Lote ({tx.cantidadPapeletas} papeletas)
                              </span>
                              <button
                                onClick={() => toggleRow(tx.txHash)}
                                className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none transition-transform"
                                style={{ transform: expandedRows.has(tx.txHash) ? 'rotate(180deg)' : 'rotate(0deg)' }}
                              >
                                ⬇️
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium">
                          <button
                            onClick={() => handleAuditarHash(tx.txHash)}
                            className="rounded-lg bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600 transition-colors focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:outline-none"
                          >
                            🔍 Auditar Hash
                          </button>
                        </td>
                      </tr>
                      {Number(tx.cantidadPapeletas) > 1 && expandedRows.has(tx.txHash) && (
                        <tr className="bg-blue-50/50">
                          <td colSpan="4" className="px-6 py-4 border-t border-gray-200">
                            <div className="pl-4 border-l-4 border-blue-500 text-sm text-gray-600">
                              <p className="font-semibold text-blue-900 mb-2">IDs de Registros Internos de Sufragio (Lote):</p>
                              <ul className="list-disc space-y-1 font-mono text-xs pl-4 text-gray-700">
                                {tx.detallesVoto && tx.detallesVoto.map((id, i) => (
                                  <li key={i}>{id}</li>
                                ))}
                              </ul>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 p-4 text-xs text-gray-500 border-t border-gray-200">
            <p><strong>Privacidad garantizada:</strong> Esta tabla no almacena referencias a frentes políticos, identidades electorales ni direcciones de red vinculadas personalmente, velando por el estricto cumplimiento del secreto al sufragio universitario.</p>
          </div>
        </div>
      )}
    </div>
  )
}