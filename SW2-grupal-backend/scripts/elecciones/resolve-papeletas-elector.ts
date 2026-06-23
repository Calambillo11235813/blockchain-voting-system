import { EntityManager } from 'typeorm';
import { EleccionCargo } from '../../src/elecciones/entities/eleccion-cargo.entity';
import { AlcancePapeletaEnum } from '../../src/elecciones/enums/alcance-papeleta.enum';
import { TipoCargoEnum } from '../../src/elecciones/enums/tipo-cargo.enum';
import { CARRERA_SISTEMAS, FACULTAD_FICCT } from './electoral-fixtures';

export type PapeletaElectoralKey = 'RECTORADO' | 'DECANATO' | 'DIRECTOR';

export type PapeletasResueltas = Record<PapeletaElectoralKey, EleccionCargo>;

function normalizarTexto(valor?: string | null): string {
  return String(valor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function contienePatron(texto: string, patron: string): boolean {
  const base = normalizarTexto(texto);
  const needle = normalizarTexto(patron);
  return base !== '' && needle !== '' && base.includes(needle);
}

function describePapeleta(papeleta: EleccionCargo): string {
  const cargo = papeleta.cargo?.nombre ?? '(sin cargo)';
  const ambito =
    papeleta.alcance === AlcancePapeletaEnum.GLOBAL
      ? 'Universidad (todos)'
      : papeleta.alcance === AlcancePapeletaEnum.FACULTAD
        ? papeleta.facultadNombre ?? papeleta.codFacultad ?? 'Facultad'
        : `${papeleta.facultadNombre ?? ''} — ${papeleta.carreraNombre ?? papeleta.codCarrera ?? 'Carrera'}`.trim();

  return `${cargo} | ${papeleta.alcance} | ${ambito} | id=${papeleta.id}`;
}

/**
 * Resuelve las 3 papeletas estándar de una elección creada desde UI o seed,
 * emparejando por tipo de cargo, alcance y ámbito territorial.
 */
export async function resolverPapeletasEstandar(
  manager: EntityManager,
  eleccionId: string,
): Promise<PapeletasResueltas> {
  const papeletas = await manager.find(EleccionCargo, {
    where: { eleccion: { id: eleccionId } },
    relations: ['cargo'],
    order: { orden: 'ASC' },
  });

  if (papeletas.length === 0) {
    throw new Error(
      `La elección ${eleccionId} no tiene papeletas. Cree Decano (FICCT), Director (Sistemas) y Rector (Global).`,
    );
  }

  const rectorado = papeletas.find((p) => {
    const tipo = p.cargo?.tipoCargo;
    const nombre = p.cargo?.nombre ?? '';
    return (
      p.alcance === AlcancePapeletaEnum.GLOBAL &&
      (tipo === TipoCargoEnum.RECTOR ||
        contienePatron(nombre, 'rector') ||
        contienePatron(nombre, 'vicerrector'))
    );
  });

  const decanato = papeletas.find((p) => {
    const tipo = p.cargo?.tipoCargo;
    const nombre = p.cargo?.nombre ?? '';
    return (
      p.alcance === AlcancePapeletaEnum.FACULTAD &&
      (tipo === TipoCargoEnum.DECANO || contienePatron(nombre, 'decano')) &&
      (contienePatron(p.facultadNombre, FACULTAD_FICCT.busquedaNombre) ||
        contienePatron(p.facultadNombre, 'FICCT') ||
        contienePatron(p.facultadNombre, FACULTAD_FICCT.nombre))
    );
  });

  const director = papeletas.find((p) => {
    const tipo = p.cargo?.tipoCargo;
    const nombre = p.cargo?.nombre ?? '';
    return (
      p.alcance === AlcancePapeletaEnum.CARRERA &&
      (tipo === TipoCargoEnum.DIRECTOR_CARRERA ||
        contienePatron(nombre, 'director')) &&
      (contienePatron(p.facultadNombre, FACULTAD_FICCT.busquedaNombre) ||
        contienePatron(p.facultadNombre, 'FICCT') ||
        contienePatron(p.facultadNombre, FACULTAD_FICCT.nombre)) &&
      (contienePatron(p.carreraNombre, CARRERA_SISTEMAS.busquedaNombre) ||
        contienePatron(p.carreraNombre, CARRERA_SISTEMAS.nombre))
    );
  });

  const faltantes: string[] = [];
  if (!rectorado) {
    faltantes.push('Rector y Vicerrector | Global (Rectorado) | Universidad (todos)');
  }
  if (!decanato) {
    faltantes.push(
      `Decano y Vicedecano | Facultad (Decanato) | ${FACULTAD_FICCT.nombre}`,
    );
  }
  if (!director) {
    faltantes.push(
      `Director de Carrera | Carrera (Dirección) | ${FACULTAD_FICCT.nombre} — ${CARRERA_SISTEMAS.nombre}`,
    );
  }

  if (faltantes.length > 0) {
    const inventario = papeletas.map(describePapeleta).join('\n  - ');
    throw new Error(
      `No se pudieron resolver todas las papeletas estándar en la elección ${eleccionId}.\n` +
        `Faltan:\n  - ${faltantes.join('\n  - ')}\n` +
        `Papeletas encontradas:\n  - ${inventario}`,
    );
  }

  return {
    RECTORADO: rectorado!,
    DECANATO: decanato!,
    DIRECTOR: director!,
  };
}
