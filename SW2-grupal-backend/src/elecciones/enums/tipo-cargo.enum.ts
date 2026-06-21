/**
 * Tipo semántico del cargo en el catálogo maestro.
 * Evita reglas frágiles basadas en comparar el nombre en texto libre.
 */
export enum TipoCargoEnum {
  RECTOR = 'RECTOR',
  DECANO = 'DECANO',
  DIRECTOR_CARRERA = 'DIRECTOR_CARRERA',
  OTRO = 'OTRO',
}
