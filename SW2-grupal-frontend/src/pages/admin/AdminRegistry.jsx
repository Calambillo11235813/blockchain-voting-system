import WhitelistUpload from '../../components/WhitelistUpload'
import { uploadWhitelistFile } from '../../services/adminService'

/**
 * Sección de Padrón Electoral.
 *
 * Permite cargar el archivo Excel y ver el resultado de la carga.
 *
 * @returns {import('react').JSX.Element}
 */
export default function AdminRegistry() {
  return <WhitelistUpload onUpload={uploadWhitelistFile} />
}
