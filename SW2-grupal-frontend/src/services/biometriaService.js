import { api } from './api'

/**
 * Envía las capturas para verificación de identidad.
 *
 * Importante: Este servicio no expone detalles técnicos en UI.
 *
 * @param {{ frontalFile: File, traseraFile: File, selfieFile: File }} params
 * @returns {Promise<{ verificado: boolean, datosEstudiante: any }>} Resultado de verificación.
 */
export async function verifyBiometrics({ frontalFile, traseraFile, selfieFile }) {
  const formData = new FormData()
  formData.append('frontal', frontalFile)
  formData.append('trasera', traseraFile)
  formData.append('selfie', selfieFile)

  // Importante: no fijar manualmente `Content-Type` para que el navegador
  // agregue el boundary correctamente.
  const response = await api.post('/biometria/verificar', formData)

  const payload = response?.data?.data
  const isVerified = Boolean(payload?.verificado)
  const studentData = payload?.datosEstudiante

  return { verificado: isVerified, datosEstudiante: studentData }
}
