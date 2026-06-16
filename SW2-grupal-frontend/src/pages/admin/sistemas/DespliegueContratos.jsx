import { useEffect, useState } from 'react'
import { getContractInfo, deployContract } from '../../../services/deployService'

/**
 * CU-03: Desplegar Smart Contracts.
 * 
 * Panel para visualizar la información del contrato actual y desplegar nuevos contratos.
 * Solo accesible para el rol SISTEMAS.
 */
export default function DespliegueContratos() {
  const [contractInfo, setContractInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [isDeploying, setIsDeploying] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [deployResult, setDeployResult] = useState(null)
  const [deployError, setDeployError] = useState('')

  async function loadContractInfo() {
    try {
      setIsLoading(true)
      setError('')
      const info = await getContractInfo()
      setContractInfo(info)
    } catch (err) {
      console.error(err)
      setError(err?.response?.data?.message || 'Error al obtener la información del contrato.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadContractInfo()
  }, [])

  async function handleDeploy() {
    try {
      setIsDeploying(true)
      setDeployError('')
      setDeployResult(null)
      const result = await deployContract()
      setDeployResult(result)
      setShowConfirmModal(false)
      // Recargar la info del contrato (mostrará el nuevo si cambiamos la var de entorno)
      await loadContractInfo()
    } catch (err) {
      console.error(err)
      setDeployError(err?.response?.data?.message || 'Error al desplegar el contrato.')
      setShowConfirmModal(false)
    } finally {
      setIsDeploying(false)
    }
  }

  // Helper para obtener el nombre legible de la red
  function getNetworkLabel(info) {
    if (!info?.network) return 'Desconocida'
    const { chainId, name } = info.network
    if (chainId === 31337 || chainId === 1337) return 'Hardhat Local'
    if (chainId === 11155111) return 'Sepolia Testnet'
    if (chainId === 1) return 'Ethereum Mainnet'
    return name || `Chain ID: ${chainId}`
  }

  return (
    <section className="space-y-6">
      {/* Encabezado */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <svg className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-blue-900">Despliegue de Smart Contracts</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Gestiona el despliegue del contrato <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-blue-800">Votacion.sol</code> en la blockchain.
            </p>
          </div>
        </div>
      </div>

      {/* Estado: cargando */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-900" />
          <p className="ml-4 text-sm text-slate-600">Consultando contrato...</p>
        </div>
      )}

      {/* Estado: error */}
      {!isLoading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Info del contrato actual */}
      {!isLoading && contractInfo && (
        <div className="space-y-6">
          {/* Tarjetas de info */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Red */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${contractInfo.hasCode ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Red Conectada</p>
              </div>
              <p className="mt-2 text-lg font-bold text-blue-900">{getNetworkLabel(contractInfo)}</p>
              <p className="mt-1 text-xs text-slate-500">Chain ID: {contractInfo.network?.chainId}</p>
            </div>

            {/* Dirección del contrato */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dirección del Contrato</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate text-sm font-mono text-blue-900">
                  {contractInfo.contractAddress}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(contractInfo.contractAddress)}
                  title="Copiar dirección"
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Estado: {contractInfo.hasCode
                  ? <span className="font-semibold text-green-600">Desplegado ✓</span>
                  : <span className="font-semibold text-red-600">Sin código</span>
                }
              </p>
            </div>

            {/* Total votos */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Votos Globales</p>
              <p className="mt-2 text-3xl font-black text-green-600">{contractInfo.totalVotosGlobal}</p>
              <p className="mt-1 text-xs text-slate-500">Registrados en el contrato actual</p>
            </div>
          </div>

          {/* Detalles adicionales */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Detalles técnicos</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">Admin (Deployer Wallet)</span>
                <code className="text-xs font-mono text-blue-900 max-w-[300px] truncate">
                  {contractInfo.admin || 'N/A'}
                </code>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">URL del nodo RPC</span>
                <code className="text-xs font-mono text-blue-900 max-w-[300px] truncate">
                  {contractInfo.rpcUrl}
                </code>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">Nombre de la Red</span>
                <span className="text-sm font-semibold text-slate-900">
                  {contractInfo.network?.name || 'unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Resultado del último deploy */}
          {deployResult && (
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm font-bold text-green-800">¡Contrato desplegado exitosamente!</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 font-semibold text-slate-700 w-32">Nueva Dirección:</span>
                  <code className="font-mono text-green-800 break-all">{deployResult.contractAddress}</code>
                </div>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 font-semibold text-slate-700 w-32">Hash de Tx:</span>
                  <code className="font-mono text-green-800 break-all">{deployResult.txHash}</code>
                </div>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 font-semibold text-slate-700 w-32">Deployer:</span>
                  <code className="font-mono text-green-800 break-all">{deployResult.deployer}</code>
                </div>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 font-semibold text-slate-700 w-32">Bloque:</span>
                  <span className="text-green-800">#{deployResult.blockNumber}</span>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs text-blue-800">
                  <strong>ℹ️ Configuración Automática:</strong> El sistema ha enlazado la base de datos a este nuevo contrato automáticamente. Todos los votos a partir de ahora se registrarán aquí.
                </p>
              </div>
            </div>
          )}

          {/* Error de deploy */}
          {deployError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <strong>Error al desplegar:</strong> {deployError}
            </div>
          )}

          {/* Botón de despliegue */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={isDeploying}
              className="flex items-center gap-2 rounded-xl bg-blue-900 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-blue-800 active:scale-95 transition-all disabled:opacity-50"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
              Desplegar nuevo contrato
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            <h2 className="text-center text-lg font-bold text-slate-900">
              ¿Desplegar nuevo contrato?
            </h2>
            <p className="mt-2 text-center text-sm text-slate-600">
              Se creará una <strong>nueva instancia</strong> del contrato Votacion en la blockchain.
              El sistema se actualizará automáticamente para utilizar este nuevo contrato.
            </p>

            <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
              <strong>Nota:</strong> Los registros de la base de datos no se borrarán, pero los nuevos votos irán al nuevo contrato.
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isDeploying}
                className="rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeploy}
                disabled={isDeploying}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-900 py-3 text-sm font-bold text-white shadow hover:bg-blue-800 transition-colors disabled:opacity-70"
              >
                {isDeploying ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Desplegando…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                    </svg>
                    Confirmar despliegue
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
