const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Wrapper visual de campo para formularios.
 * @param {{ label: string, children: any }} props
 * @returns {import('react').JSX.Element}
 */
export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-900">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

/**
 * Celda de encabezado de tabla.
 * @param {{ children: any }} props
 * @returns {import('react').JSX.Element}
 */
export function Th({ children }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
      {children}
    </th>
  )
}

/**
 * Aviso de elección en solo lectura (sellada o activa).
 * @returns {import('react').JSX.Element}
 */
export function ReadOnlyElectionBanner() {
  return (
    <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      🔒 Esta elección está sellada. Los frentes y candidatos son de solo lectura y no pueden
      modificarse.
    </p>
  )
}

/**
 * Botón de acción con tooltip nativo cuando está deshabilitado por elección sellada.
 * @param {{
 *  children: any,
 *  disabled?: boolean,
 *  readOnly?: boolean,
 *  readOnlyTitle?: string,
 *  className?: string,
 *  onClick?: () => void,
 *  type?: 'button' | 'submit',
 * }} props
 * @returns {import('react').JSX.Element}
 */
export function ActionButton({
  children,
  disabled = false,
  readOnly = false,
  readOnlyTitle = '',
  className = '',
  onClick,
  type = 'button',
}) {
  const isDisabled = disabled || readOnly

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      title={readOnly ? readOnlyTitle : undefined}
      className={className}
    >
      {children}
    </button>
  )
}

/**
 * Valida el formulario de registro de frentes.
 * @param {{ nombreFrente: string, sigla: string, eleccionId?: string }} form
 * @returns {string}
 */
export function validateCoalitionForm(form) {
  if (!form.eleccionId) return 'Seleccione un proceso electoral.'
  if (!form.nombreFrente?.trim()) return 'Ingrese el nombre del frente.'
  if (!form.sigla?.trim()) return 'Ingrese la sigla del frente.'
  if (form.sigla.trim().length > 12) return 'La sigla es demasiado larga.'
  return ''
}

/**
 * Valida el formulario de registro de candidatos.
 * @param {{ ci: string, nombres: string, apellidos: string, eleccionCargoId: string, frenteId: string, rolEspecifico: string }} form
 * @returns {string}
 */
export function validateCandidateForm(form) {
  const ci = String(form.ci || '').trim()
  if (!ci) return 'Ingrese el carnet de identidad (CI).'
  if (!/^\d{6,10}$/.test(ci)) return 'El CI debe contener solo números (6 a 10 dígitos).'
  if (!form.nombres?.trim()) return 'Ingrese los nombres del candidato.'
  if (!form.apellidos?.trim()) return 'Ingrese los apellidos del candidato.'
  if (!form.eleccionCargoId) return 'Seleccione la papeleta a la que postula.'
  if (!form.rolEspecifico) return 'Seleccione el cargo al que postula dentro de la fórmula.'
  if (!form.frenteId) return 'Seleccione un frente.'
  return ''
}

/**
 * Valida un archivo de imagen.
 * @param {File} file
 * @returns {string}
 */
export function validateImageFile(file) {
  if (!file) return ''
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Solo se permiten imágenes JPG, PNG o WEBP.'
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return 'La imagen no debe superar 5MB.'
  }
  return ''
}

/**
 * Lee una imagen como Data URL (base64).
 *
 * Importante:
 * - Se usa para enviar `logoUrl`/`fotoUrl` como string sin un servicio de archivos.
 *
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    reader.readAsDataURL(file)
  })
}
