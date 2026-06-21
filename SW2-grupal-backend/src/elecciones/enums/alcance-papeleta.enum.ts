/**
 * Alcance territorial de una papeleta/sub-elección dentro de un proceso electoral.
 */
export enum AlcancePapeletaEnum {
  /** Toda la universidad (ej. Rectorado). */
  GLOBAL = 'GLOBAL',
  /** Una facultad específica (ej. Decanato). Cruza con elector.codFacultad. */
  FACULTAD = 'FACULTAD',
  /** Una carrera/plan específico (ej. Dirección de Carrera). Cruza con elector.codCarrera. */
  CARRERA = 'CARRERA',
}
