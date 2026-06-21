import { Injectable } from '@nestjs/common';
import { Elector, EstamentoEnum } from 'src/electores/entities/elector.entity';
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

  private normalizarTexto(valor?: string | null): string {
    return String(valor ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private coincideFacultad(elector: Elector, eleccionCargo: EleccionCargo): boolean {
    const codElector = this.normalizarCodigo(elector.codFacultad);
    const codPapeleta = this.normalizarCodigo(eleccionCargo.codFacultad);

    if (codPapeleta && codElector) {
      return codElector === codPapeleta;
    }

    const facElector = this.normalizarTexto(elector.facultad);
    const facPapeleta = this.normalizarTexto(
      eleccionCargo.facultadNombre ?? eleccionCargo.cargo?.facultad,
    );

    return facElector !== '' && facPapeleta !== '' && facElector === facPapeleta;
  }

  private coincideCarrera(elector: Elector, eleccionCargo: EleccionCargo): boolean {
    const codCarreraPapeleta = this.normalizarCodigo(eleccionCargo.codCarrera);
    const codCarreraElector = this.normalizarCodigo(elector.codCarrera);

    if (codCarreraPapeleta && codCarreraElector) {
      return codCarreraElector === codCarreraPapeleta;
    }

    const carreraElector = this.normalizarTexto(elector.carrera);
    const carreraPapeleta = this.normalizarTexto(eleccionCargo.carreraNombre);

    return carreraElector !== '' && carreraPapeleta !== '' && carreraElector === carreraPapeleta;
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

    if (eleccionCargo.alcance === AlcancePapeletaEnum.FACULTAD) {
      return this.coincideFacultad(elector, eleccionCargo);
    }

    if (eleccionCargo.alcance === AlcancePapeletaEnum.CARRERA) {
      if (!this.coincideFacultad(elector, eleccionCargo)) {
        return false;
      }

      // Estudiantes: deben pertenecer a la carrera concreta.
      if (elector.estamento === EstamentoEnum.ESTUDIANTE) {
        return this.coincideCarrera(elector, eleccionCargo);
      }

      // Docentes transversales: dictan en varias carreras; basta la facultad.
      if (elector.estamento === EstamentoEnum.DOCENTE) {
        return true;
      }

      // Administrativos sin codCarrera: misma regla transversal por facultad.
      if (elector.estamento === EstamentoEnum.ADMINISTRATIVO) {
        const codCarreraElector = this.normalizarCodigo(elector.codCarrera);
        if (!codCarreraElector) {
          return true;
        }
        return this.coincideCarrera(elector, eleccionCargo);
      }

      return false;
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
