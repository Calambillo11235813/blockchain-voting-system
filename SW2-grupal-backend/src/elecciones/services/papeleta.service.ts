import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Eleccion } from 'src/elecciones/entities/eleccion.entity';

/**
 * Candidato serializado para la papeleta completa.
 */
export interface CandidatoPapeleta {
  id: string;
  nombres: string;
  apellidos: string;
  fotoUrl: string | null;
}

/**
 * Frente serializado para la papeleta completa.
 */
export interface FrentePapeleta {
  id: string;
  nombreFrente: string;
  sigla: string;
  logoUrl: string | null;
  candidatos: CandidatoPapeleta[];
}

/**
 * Cargo serializado para la papeleta completa.
 */
export interface CargoPapeleta {
  id: string;
  nombre: string;
  facultad: string;
  frentes: FrentePapeleta[];
}

/**
 * Estructura de salida para la papeleta completa.
 */
export interface PapeletaCompleta {
  id: string;
  titulo: string;
  gestion: number;
  fechaInicio: Date;
  fechaFin: Date;
  estaActiva: boolean;
  cargos: CargoPapeleta[];
}

/**
 * Servicio de aplicacion para consultas de papeleta.
 */
@Injectable()
export class PapeletaService {
  constructor(
    @InjectRepository(Eleccion)
    private readonly eleccionRepository: Repository<Eleccion>,
  ) {}

  /**
   * Obtiene la papeleta completa de una eleccion.
   * @param eleccionId Identificador UUID de la eleccion.
   * @returns Objeto anidado de papeleta completa.
   */
  async obtenerPapeletaCompleta(eleccionId: string): Promise<PapeletaCompleta> {
    const eleccion = await this.eleccionRepository.findOne({
      where: { id: eleccionId },
      relations: {
        cargos: {
          frentes: {
            candidatos: true,
          },
        },
      },
      order: {
        cargos: {
          nombre: 'ASC',
          frentes: {
            nombreFrente: 'ASC',
            candidatos: {
              apellidos: 'ASC',
            },
          },
        },
      },
    });

    if (!eleccion) {
      throw new NotFoundException(`No se encontro la eleccion con id ${eleccionId}`);
    }

    return {
      id: eleccion.id,
      titulo: eleccion.titulo,
      gestion: eleccion.gestion,
      fechaInicio: eleccion.fechaInicio,
      fechaFin: eleccion.fechaFin,
      estaActiva: eleccion.estaActiva,
      cargos: eleccion.cargos.map((cargo) => ({
        id: cargo.id,
        nombre: cargo.nombre,
        facultad: cargo.facultad,
        frentes: cargo.frentes.map((frente) => ({
          id: frente.id,
          nombreFrente: frente.nombreFrente,
          sigla: frente.sigla,
          logoUrl: frente.logoUrl,
          candidatos: frente.candidatos.map((candidato) => ({
            id: candidato.id,
            nombres: candidato.nombres,
            apellidos: candidato.apellidos,
            fotoUrl: candidato.fotoUrl,
          })),
        })),
      })),
    };
  }
}
