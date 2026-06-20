export interface NombreSplitResult {
  nombre: string;
  apellido: string;
  /** true si el nombre completo tenía un solo token (revisión manual recomendada). */
  nombreAmbiguo: boolean;
}

/**
 * Divide un nombre completo en nombre(s) y apellido(s).
 * Heurística para formato boliviano: APELLIDO_PATERNO APELLIDO_MATERNO NOMBRE(S).
 */
export function splitNombreCompleto(nombreCompleto: string): NombreSplitResult {
  const tokens = nombreCompleto.trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return { nombre: '', apellido: '', nombreAmbiguo: true };
  }

  if (tokens.length === 1) {
    return { nombre: tokens[0], apellido: '-', nombreAmbiguo: true };
  }

  if (tokens.length === 2) {
    return { nombre: tokens[1], apellido: tokens[0], nombreAmbiguo: false };
  }

  if (tokens.length === 3) {
    return {
      nombre: tokens[2],
      apellido: `${tokens[0]} ${tokens[1]}`,
      nombreAmbiguo: false,
    };
  }

  // 4+ tokens: últimos 2 → nombre, resto → apellido
  const nombre = tokens.slice(-2).join(' ');
  const apellido = tokens.slice(0, -2).join(' ');

  return { nombre, apellido, nombreAmbiguo: false };
}

/**
 * Normaliza CI boliviana: extrae el número principal, descartando complementos.
 * Ejemplos:
 *   "7453385 SC" → "7453385"
 *   "11341460-SCZ" → "11341460"
 *   "9647174-1S-SCZ" → "9647174"
 */
export function normalizarCi(ci: string): string {
  const trimmed = ci.trim();

  const leadingDigits = trimmed.match(/^(\d{5,10})/);
  if (leadingDigits) {
    return leadingDigits[1];
  }

  const sinComplemento = trimmed.replace(/[\s\-–—]+[A-Za-z].*$/i, '').trim();
  return sinComplemento.replace(/\D/g, '');
}

/** Parsea la columna RECTOR a boolean. */
export function parsearHabilitadoRector(valor: string): boolean | null {
  const v = valor.trim().toUpperCase();

  if (!v) {
    return null;
  }

  if (['SI', 'S', '1', 'TRUE', 'VERDADERO', 'Y', 'YES'].includes(v)) {
    return true;
  }

  if (['NO', 'N', '0', 'FALSE', 'FALSO'].includes(v)) {
    return false;
  }

  return null;
}

/** Valida registro / Cod.Docente: solo dígitos. */
export function esRegistroValido(registro: string): boolean {
  return /^\d+$/.test(registro);
}

/** Valida CI normalizada: 6–10 dígitos. */
export function esCiValida(ci: string): boolean {
  const normalizada = normalizarCi(ci);
  return /^\d{6,10}$/.test(normalizada);
}

/** Valida códigos alfanuméricos (facultad, lugar, carrera-pl). */
export function esCodigoValido(codigo: string): boolean {
  return /^[a-zA-Z0-9.\-_]+$/.test(codigo.trim());
}
