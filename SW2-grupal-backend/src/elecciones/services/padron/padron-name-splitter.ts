export interface NombreSplitResult {
  nombre: string;
  apellido: string;
  /** true si el nombre completo tenía un solo token (revisión manual recomendada). */
  nombreAmbiguo: boolean;
}

/** Nombres propios frecuentes en el padrón UAGRM (sin acentos para comparación). */
const NOMBRES_PROPIOS = new Set([
  'ABIGAIL',
  'ANA',
  'ANDREA',
  'ARTURO',
  'CAMILA',
  'CARLA',
  'CARLOS',
  'DANIEL',
  'DANIELA',
  'DAVID',
  'DIEGO',
  'ELIZABETH',
  'FERNANDO',
  'GABRIEL',
  'GABRIELA',
  'JORGE',
  'JOSE',
  'JUAN',
  'JULIA',
  'KAREN',
  'LAURA',
  'LUIS',
  'MARIA',
  'MARIO',
  'MARTHA',
  'MIGUEL',
  'MONICA',
  'PABLO',
  'PATRICIA',
  'PEDRO',
  'ROBERTO',
  'RODRIGO',
  'RUTH',
  'SANDRA',
  'SERGIO',
  'SOFIA',
  'VALERIA',
  'VICTOR',
  'WALTER',
]);

function normalizarTokenNombre(token: string): string {
  return token
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function esNombrePropioConocido(token: string): boolean {
  return NOMBRES_PROPIOS.has(normalizarTokenNombre(token));
}

function pareceNombrePropio(token: string): boolean {
  if (esNombrePropioConocido(token)) return true;
  const normalizado = normalizarTokenNombre(token);
  if (!normalizado) return false;
  // Heurística suave solo para tokens no ambiguos.
  return /^[A-Z]{3,}$/.test(normalizado) && /[AEIOU]$/.test(normalizado);
}

/**
 * Divide un nombre completo en nombre(s) y apellido(s).
 * Soporta formatos bolivianos:
 * - APELLIDO_PATERNO APELLIDO_MATERNO NOMBRE(S)
 * - NOMBRE(S) APELLIDO_PATERNO APELLIDO_MATERNO (columna "Nombre" del padrón UAGRM)
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
    const primeroConocido = esNombrePropioConocido(tokens[0]);
    const ultimoConocido = esNombrePropioConocido(tokens[2]);

    if (ultimoConocido && !primeroConocido) {
      return {
        nombre: tokens[2],
        apellido: `${tokens[0]} ${tokens[1]}`,
        nombreAmbiguo: false,
      };
    }

    if (primeroConocido && !ultimoConocido) {
      return {
        nombre: tokens[0],
        apellido: `${tokens[1]} ${tokens[2]}`,
        nombreAmbiguo: false,
      };
    }

    const ultimoPareceNombre = pareceNombrePropio(tokens[2]);
    const primeroPareceNombre = pareceNombrePropio(tokens[0]);

    if (ultimoPareceNombre && !primeroPareceNombre) {
      return {
        nombre: tokens[2],
        apellido: `${tokens[0]} ${tokens[1]}`,
        nombreAmbiguo: false,
      };
    }

    if (primeroPareceNombre && !ultimoPareceNombre) {
      return {
        nombre: tokens[0],
        apellido: `${tokens[1]} ${tokens[2]}`,
        nombreAmbiguo: false,
      };
    }

    // Fallback histórico: apellidos al inicio.
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
