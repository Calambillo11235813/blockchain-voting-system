import { AlcancePapeletaEnum } from './alcance-papeleta.enum';

/** Roles válidos dentro de una fórmula según el alcance de la papeleta. */
export const ROLES_POR_ALCANCE: Record<AlcancePapeletaEnum, readonly string[]> = {
  [AlcancePapeletaEnum.GLOBAL]: ['Rector', 'Vicerrector'],
  [AlcancePapeletaEnum.FACULTAD]: ['Decano', 'Vicedecano'],
  [AlcancePapeletaEnum.CARRERA]: ['Director de Carrera'],
};

export function rolesValidosParaAlcance(alcance: AlcancePapeletaEnum): readonly string[] {
  return ROLES_POR_ALCANCE[alcance] ?? ROLES_POR_ALCANCE[AlcancePapeletaEnum.GLOBAL];
}

export function esRolValidoParaAlcance(alcance: AlcancePapeletaEnum, rol: string): boolean {
  return rolesValidosParaAlcance(alcance).includes(rol);
}
