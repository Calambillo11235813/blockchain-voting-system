import { api } from './api'

/**
 * Obtiene información del contrato actualmente desplegado.
 * @returns {Promise<Object>} Info del contrato (dirección, admin, red, etc.)
 */
export async function getContractInfo() {
  const response = await api.get('/admin/blockchain/contract-info')
  return response.data?.datos
}

/**
 * Despliega una nueva instancia del contrato Votacion en la blockchain.
 * @returns {Promise<Object>} Resultado del deploy (dirección, txHash, deployer)
 */
export async function deployContract() {
  const response = await api.post('/admin/blockchain/deploy')
  return response.data?.datos
}
