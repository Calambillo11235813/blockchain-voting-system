import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Eleccion } from 'src/elecciones/entities/eleccion.entity';
import { PadronElectoral } from 'src/elecciones/entities/padron-electoral.entity';
import { Elector } from 'src/electores/entities/elector.entity';
import { EleccionCargo } from 'src/elecciones/entities/eleccion-cargo.entity';
import { AlcancePapeletaEnum } from 'src/elecciones/enums/alcance-papeleta.enum';
import { PapeletaEligibilityService } from './papeleta-eligibility.service';

export interface CandidatoPapeleta {
  id: string;
  nombres: string;
  apellidos: string;
  fotoUrl: string | null;
  rolEspecifico: string | null;
}

export interface FrentePapeleta {
  id: string;
  nombreFrente: string;
  sigla: string;
  logoUrl: string | null;
  esOpcionGlobal: boolean;
  candidatos: CandidatoPapeleta[];
}

export interface EleccionCargoPapeleta {
  id: string;
  cargoId: string;
  cargoNombre: string;
  cargoFacultad: string;
  alcance: AlcancePapeletaEnum;
  codFacultad: string | null;
  facultadNombre: string | null;
  codCarrera: string | null;
  carreraNombre: string | null;
  orden: number;
  frentes: FrentePapeleta[];
}

export interface PapeletaDigital {
  id: string;
  titulo: string;
  gestion: number;
  fecha: Date;
  estaActiva: boolean;
  estado: string;
  cargos: EleccionCargoPapeleta[];
}

@Injectable()
export class PapeletaService {
  constructor(
    @InjectRepository(Eleccion)
    private readonly eleccionRepository: Repository<Eleccion>,

    @InjectRepository(PadronElectoral)
    private readonly padronElectoralRepository: Repository<PadronElectoral>,

    @InjectRepository(Elector)
    private readonly electorRepository: Repository<Elector>,

    private readonly papeletaEligibilityService: PapeletaEligibilityService,
  ) {}

  async obtenerPapeletaDigital(
    eleccionId: string,
    registro?: string,
  ): Promise<PapeletaDigital> {
    const eleccion = await this.cargarEleccionConCargos(eleccionId);

    if (registro?.trim()) {
      return this.obtenerPapeletasParaVotante(eleccion, registro.trim());
    }

    const cargosOrdenados = this.ordenarCargos(eleccion.eleccionCargos);

    return this.armarPapeletaDigital(eleccion, cargosOrdenados);
  }

  /**
   * Devuelve solo las papeletas aplicables al elector autenticado según alcance territorial.
   *
   * Regla: GLOBAL siempre (salvo habilitadoRector=false en Rector) OR
   * FACULTAD si coincide facultad OR CARRERA si coincide facultad y carrera.
   */
  async obtenerPapeletasParaVotante(
    eleccion: Eleccion,
    registro: string,
  ): Promise<PapeletaDigital> {
    const elector = await this.electorRepository.findOne({
      where: [{ registro }, { registroDocente: registro }],
    });

    if (!elector) {
      return this.armarPapeletaDigital(eleccion, []);
    }

    const entradaPadron = await this.padronElectoralRepository.findOne({
      where: {
        eleccion: { id: eleccion.id },
        elector: { id: elector.id },
      },
    });

    const cargosOrdenados = this.papeletaEligibilityService.filtrarPapeletasAplicables(
      elector,
      this.ordenarCargos(eleccion.eleccionCargos),
      entradaPadron,
    );

    return this.armarPapeletaDigital(eleccion, cargosOrdenados);
  }

  private async cargarEleccionConCargos(eleccionId: string): Promise<Eleccion> {
    const eleccion = await this.eleccionRepository.findOne({
      where: { id: eleccionId },
      relations: {
        eleccionCargos: {
          cargo: true,
          candidatos: {
            frente: true,
          },
        },
      },
    });

    if (!eleccion) {
      throw new NotFoundException(`No se encontro la eleccion con id ${eleccionId}`);
    }

    return eleccion;
  }

  private ordenarCargos(cargos: EleccionCargo[]): EleccionCargo[] {
    return [...cargos].sort((a, b) => {
      if (a.orden !== b.orden) return a.orden - b.orden;
      return a.cargo.nombre.localeCompare(b.cargo.nombre);
    });
  }

  private armarPapeletaDigital(eleccion: Eleccion, cargos: EleccionCargo[]): PapeletaDigital {
    return {
      id: eleccion.id,
      titulo: eleccion.titulo,
      gestion: eleccion.gestion,
      fecha: eleccion.fecha,
      estaActiva: eleccion.estaActiva,
      estado: eleccion.estado,
      cargos: cargos.map((ec) => this.serializarPapeleta(ec)),
    };
  }

  private serializarPapeleta(ec: EleccionCargo): EleccionCargoPapeleta {
    const frentesMap = new Map<string, FrentePapeleta>();

    for (const candidato of ec.candidatos ?? []) {
      const frente = candidato.frente;
      if (!frente) continue;

      if (!frentesMap.has(frente.id)) {
        frentesMap.set(frente.id, {
          id: frente.id,
          nombreFrente: frente.nombreFrente,
          sigla: frente.sigla,
          logoUrl: frente.logoUrl,
          esOpcionGlobal: frente.esOpcionGlobal,
          candidatos: [],
        });
      }

      frentesMap.get(frente.id)!.candidatos.push({
        id: candidato.id,
        nombres: candidato.nombres,
        apellidos: candidato.apellidos,
        fotoUrl: candidato.fotoUrl,
        rolEspecifico: candidato.rolEspecifico ?? null,
      });
    }

    const frentesOrdenados = Array.from(frentesMap.values()).sort((a, b) => {
      if (a.esOpcionGlobal && !b.esOpcionGlobal) return 1;
      if (!a.esOpcionGlobal && b.esOpcionGlobal) return -1;
      return a.nombreFrente.localeCompare(b.nombreFrente);
    });

    for (const frente of frentesOrdenados) {
      frente.candidatos.sort((a, b) => a.apellidos.localeCompare(b.apellidos));
    }

    return {
      id: ec.id,
      cargoId: ec.cargo.id,
      cargoNombre: ec.cargo.nombre,
      cargoFacultad: ec.facultadNombre ?? ec.cargo.facultad ?? '',
      alcance: ec.alcance,
      codFacultad: ec.codFacultad,
      facultadNombre: ec.facultadNombre,
      codCarrera: ec.codCarrera,
      carreraNombre: ec.carreraNombre,
      orden: ec.orden,
      frentes: frentesOrdenados,
    };
  }
}
