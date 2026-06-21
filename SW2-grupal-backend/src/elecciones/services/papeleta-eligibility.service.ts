import { Injectable } from '@nestjs/common';
import { Elector } from 'src/electores/entities/elector.entity';
import { EleccionCargo } from '../entities/eleccion-cargo.entity';
import { PadronElectoral } from '../entities/padron-electoral.entity';
import { AlcancePapeletaEnum } from '../enums/alcance-papeleta.enum';
import { TipoCargoEnum } from '../enums/tipo-cargo.enum';

/**
 * Reglas de elegibilidad de papeletas según alcance territorial y padrón.
 */
@Injectable()
export class PapeletaEligibilityService {
  normalizarCodigo(valor?: string | null): string {
    return String(valor ?? '').trim();
  }

  esCargoRector(eleccionCargo: EleccionCargo): boolean {
    const tipo = eleccionCargo.cargo?.tipoCargo;
    if (tipo === TipoCargoEnum.RECTOR) {
      return true;
    }

    const nombre = eleccionCargo.cargo?.nombre?.trim().toUpperCase() ?? '';
    return nombre === 'RECTOR' || nombre.includes('RECTOR');
  }

  /**
   * Determina si una papeleta aplica al elector según alcance y padrón.
   */
  esPapeletaAplicable(
    elector: Elector,
    eleccionCargo: EleccionCargo,
    entradaPadron?: PadronElectoral | null,
  ): boolean {
    if (eleccionCargo.estaActiva === false) {
      return false;
    }

    if (eleccionCargo.alcance === AlcancePapeletaEnum.GLOBAL) {
      if (this.esCargoRector(eleccionCargo) && entradaPadron && !entradaPadron.habilitadoRector) {
        return false;
      }
      return true;
    }

    const codFacElector = this.normalizarCodigo(elector.codFacultad);
    const codFacPapeleta = this.normalizarCodigo(eleccionCargo.codFacultad);

    if (eleccionCargo.alcance === AlcancePapeletaEnum.FACULTAD) {
      if (!codFacPapeleta || !codFacElector) {
        return false;
      }
      return codFacElector === codFacPapeleta;
    }

    if (eleccionCargo.alcance === AlcancePapeletaEnum.CARRERA) {
      const codCarreraElector = this.normalizarCodigo(elector.codCarrera);
      const codCarreraPapeleta = this.normalizarCodigo(eleccionCargo.codCarrera);

      if (!codFacPapeleta || !codCarreraPapeleta || !codFacElector || !codCarreraElector) {
        return false;
      }

      return codFacElector === codFacPapeleta && codCarreraElector === codCarreraPapeleta;
    }

    return false;
  }

  filtrarPapeletasAplicables(
    elector: Elector,
    papeletas: EleccionCargo[],
    entradaPadron?: PadronElectoral | null,
  ): EleccionCargo[] {
    return papeletas.filter((papeleta) => this.esPapeletaAplicable(elector, papeleta, entradaPadron));
  }
}
