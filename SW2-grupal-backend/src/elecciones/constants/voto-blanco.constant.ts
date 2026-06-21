/** Identificador enviado por el frontend para representar voto en blanco. */
export const VOTO_BLANCO_ID = 'BLANCO';

/**
 * Indica si la selección corresponde a un voto en blanco.
 */
export function esVotoBlanco(candidatoId: string | null | undefined): boolean {
  return String(candidatoId || '').trim().toUpperCase() === VOTO_BLANCO_ID;
}
