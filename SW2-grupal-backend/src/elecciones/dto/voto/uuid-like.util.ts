import { validate as validateUuid } from 'uuid';

const UUID_LIKE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Acepta UUID RFC válidos y también IDs fijos de seeds/fixtures del proyecto.
 */
export function esUuidLike(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  return validateUuid(normalized) || UUID_LIKE_PATTERN.test(normalized);
}
