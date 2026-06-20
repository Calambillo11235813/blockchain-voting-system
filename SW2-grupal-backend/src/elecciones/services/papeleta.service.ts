import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Eleccion } from 'src/elecciones/entities/eleccion.entity';
import { PadronElectoral } from 'src/elecciones/entities/padron-electoral.entity';
import { Elector } from 'src/electores/entities/elector.entity';

/**
 * Candidato serializado para la papeleta digital.
 */
export interface CandidatoPapeleta {
  id: string;
  nombres: string;
  apellidos: string;
  fotoUrl: string | null;
}

/**
 * Frente serializado para la papeleta digital.
 */
export interface FrentePapeleta {
  id: string;
  nombreFrente: string;
  sigla: string;
  logoUrl: string | null;
  esOpcionGlobal: boolean;
  candidatos: CandidatoPapeleta[];
}

/**
 * EleccionCargo serializado para la papeleta digital.
 */
export interface EleccionCargoPapeleta {
  id: string;
  cargoId: string;
  cargoNombre: string;
  cargoFacultad: string;
  frentes: FrentePapeleta[];
}

/**
 * Estructura de salida para la papeleta completa.
 */
export interface PapeletaDigital {
  id: string;
  titulo: string;
  gestion: number;
  fecha: Date;
  estaActiva: boolean;
  cargos: EleccionCargoPapeleta[];
}

/**
 * Servicio de aplicacion para generar la estructura de la papeleta.
 */
@Injectable()
export class PapeletaService {
  constructor(
    @InjectRepository(Eleccion)
    private readonly eleccionRepository: Repository<Eleccion>,

    @InjectRepository(PadronElectoral)
    private readonly padronElectoralRepository: Repository<PadronElectoral>,

    @InjectRepository(Elector)
    private readonly electorRepository: Repository<Elector>,
  ) {}

  /**
   * Obtiene la papeleta jerárquica completa de una elección.
   * @param eleccionId Identificador UUID de la eleccion.
   * @param registro Registro universitario opcional para ocultar Rector si no está habilitado.
   * @returns Estructura PapeletaDigital.
   */
  async obtenerPapeletaDigital(
    eleccionId: string,
    registro?: string,
  ): Promise<PapeletaDigital> {
    const eleccion = await this.eleccionRepository.findOne({
      where: { id: eleccionId },
      relations: {
        eleccionCargos: {
          cargo: true,
          frentes: {
            candidatos: true,
          },
        },
      },
    });

    if (!eleccion) {
      throw new NotFoundException(`No se encontro la eleccion con id ${eleccionId}`);
    }

    let habilitadoRector = true;
    if (registro?.trim()) {
      const elector = await this.electorRepository.findOne({
        where: [
          { registro: registro.trim() },
          { registroDocente: registro.trim() },
        ],
      });
      if (elector) {
        const entradaPadron = await this.padronElectoralRepository.findOne({
          where: {
            eleccion: { id: eleccionId },
            elector: { id: elector.id },
          },
        });
        habilitadoRector = entradaPadron?.habilitadoRector ?? false;
      } else {
        habilitadoRector = false;
      }
    }

    // Ordenamiento en memoria para garantizar estabilidad
    let cargosOrdenados = eleccion.eleccionCargos.sort((a, b) =>
      a.cargo.nombre.localeCompare(b.cargo.nombre),
    );

    if (registro?.trim() && !habilitadoRector) {
      cargosOrdenados = cargosOrdenados.filter(
        ec => ec.cargo.nombre.trim().toUpperCase() !== 'RECTOR',
      );
    }

    return {
      id: eleccion.id,
      titulo: eleccion.titulo,
      gestion: eleccion.gestion,
      fecha: eleccion.fecha,
      estaActiva: eleccion.estaActiva,
      cargos: cargosOrdenados.map((ec) => {
        
        const frentesOrdenados = ec.frentes.sort((a, b) => {
          // Las opciones globales (Blanco/Nulo) van al final generalmente, o simplemente por nombre
          if (a.esOpcionGlobal && !b.esOpcionGlobal) return 1;
          if (!a.esOpcionGlobal && b.esOpcionGlobal) return -1;
          return a.nombreFrente.localeCompare(b.nombreFrente);
        });

        return {
          id: ec.id,
          cargoId: ec.cargo.id,
          cargoNombre: ec.cargo.nombre,
          cargoFacultad: ec.cargo.facultad,
          frentes: frentesOrdenados.map((frente) => {
            const candidatosOrdenados = frente.candidatos.sort((a, b) => 
              a.apellidos.localeCompare(b.apellidos)
            );

            return {
              id: frente.id,
              nombreFrente: frente.nombreFrente,
              sigla: frente.sigla,
              logoUrl: frente.logoUrl,
              esOpcionGlobal: frente.esOpcionGlobal,
              candidatos: candidatosOrdenados.map((candidato) => ({
                id: candidato.id,
                nombres: candidato.nombres,
                apellidos: candidato.apellidos,
                fotoUrl: candidato.fotoUrl,
              })),
            };
          }),
        };
      }),
    };
  }
}
