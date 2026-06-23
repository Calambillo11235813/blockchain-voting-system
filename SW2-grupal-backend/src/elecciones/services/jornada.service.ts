import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Eleccion } from '../entities/eleccion.entity';
import { EleccionCargo } from '../entities/eleccion-cargo.entity';
import { EstadoEleccionEnum } from '../enums/estado-eleccion.enum';
import { ApiResponse, createApiResponse } from '../../compartido/respuesta';
import { ConfiguracionService } from './configuracion.service';
import { BlockchainService } from 'src/blockchain/services/blockchain.service';

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Acción de control sobre el estado operativo de la jornada. */
export type AccionJornada = 'ABRIR' | 'CERRAR';

/** Información del estado actual de la jornada electoral. */
export interface EstadoJornada {
  eleccionId: string;
  titulo: string;
  estado: EstadoEleccionEnum;
  estaActiva: boolean;
  fecha: Date;
  accionEjecutada: AccionJornada;
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

/**
 * Servicio dedicado al control del estado operativo de la jornada electoral.
 * Gestiona la apertura y cierre de una elección en base a horarios.
 *
 * Repositorio inyectado: Eleccion.
 */
@Injectable()
export class JornadaService {
  private static readonly VOTING_START_HOUR = 8;
  private static readonly VOTING_END_HOUR = 16;
  private readonly logger = new Logger(JornadaService.name);

  constructor(
    @InjectRepository(Eleccion)
    private readonly eleccionRepository: Repository<Eleccion>,
    @InjectRepository(EleccionCargo)
    private readonly eleccionCargoRepository: Repository<EleccionCargo>,
    private readonly configuracionService: ConfiguracionService,
    private readonly blockchainService: BlockchainService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  //  RF5 — CONTROL DE APERTURA Y CIERRE DE JORNADA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * RF5 · Gestiona la apertura y cierre operativo de la jornada electoral
   * en base a horarios configurados.
   *
   * Reglas de negocio:
   * - ABRIR:
   *   1. Valida que la elección NO esté ya activa.
   *   2. Valida que la fecha de la elección coincida con la fecha actual.
   *   3. Valida que el horario esté dentro de la ventana permitida (08:00–16:00).
   *   4. Activa `estaActiva = true`, habilitando la recepción de votos.
   *
   * - CERRAR:
   *   1. Valida que la elección esté activa.
   *   2. Puede forzarse en cualquier momento (cierre de emergencia).
   *   3. Desactiva `estaActiva = false`, impidiendo nuevos sufragios.
   *
   * Si la variable de entorno `BYPASS_ELECTION_TIME === 'true'`, se omiten
   * las validaciones de fecha y hora (útil para desarrollo).
   *
   * @param eleccionId  UUID de la elección.
   * @param accion      'ABRIR' o 'CERRAR'.
   * @returns Estado actualizado de la jornada electoral.
   * @throws NotFoundException si la elección no existe.
   * @throws BadRequestException si la acción no es válida en el estado actual.
   * @throws ForbiddenException si el horario no permite la apertura.
   */
  async controlarEstadoJornada(
    eleccionId: string,
    accion: AccionJornada,
  ): Promise<ApiResponse<Eleccion>> {
    const eleccion = await this.buscarEleccionPorIdOrThrow(eleccionId);
    const rawBypass = await this.configuracionService.obtenerValor('BYPASS_ELECTION_TIME');
    const bypass =
      rawBypass === true || String(rawBypass).toLowerCase() === 'true' ||
      process.env.BYPASS_ELECTION_TIME === 'true';

    const estadoActual = eleccion.estado ?? EstadoEleccionEnum.EN_CONFIGURACION;

    if (accion === 'ABRIR') {
      if (
        estadoActual === EstadoEleccionEnum.ACTIVA &&
        eleccion.estaActiva
      ) {
        throw new BadRequestException('La jornada ya está abierta.');
      }

      if (estadoActual !== EstadoEleccionEnum.SELLADA) {
        throw new BadRequestException(
          'Solo se puede abrir una elección sellada.',
        );
      }

      // Corrige estado inconsistente (p. ej. seed con estaActiva=true y estado=SELLADA).
      if (eleccion.estaActiva) {
        this.logger.warn(
          `Corrigiendo inconsistencia en elección ${eleccionId}: SELLADA con estaActiva=true.`,
        );
        eleccion.estaActiva = false;
        await this.eleccionRepository.save(eleccion);
      }

      if (!bypass) {
        const ahora = new Date();
        const fechaEleccion = this.parseElectionDate(eleccion.fecha as unknown as string | Date);

        if (!this.isSameDay(fechaEleccion, ahora)) {
          throw new ForbiddenException(
            'Solo se puede abrir la jornada el día de la elección.',
          );
        }

        const horaActual = ahora.getHours();
        if (
          horaActual < JornadaService.VOTING_START_HOUR ||
          horaActual >= JornadaService.VOTING_END_HOUR
        ) {
          throw new ForbiddenException(
            'No se puede abrir la jornada fuera del horario permitido (08:00-16:00).',
          );
        }
      }

      eleccion.estaActiva = true;
      eleccion.estado = EstadoEleccionEnum.ACTIVA;
      const guardada = await this.eleccionRepository.save(eleccion);

      try {
        await this.activarPapeletasOnChain(guardada.id);
      } catch (error: any) {
        guardada.estaActiva = false;
        guardada.estado = EstadoEleccionEnum.SELLADA;
        await this.eleccionRepository.save(guardada);

        throw new ServiceUnavailableException(
          `La jornada se abrió en base de datos, pero falló la activación on-chain: ${error.message || error}`,
        );
      }

      return createApiResponse(
        HttpStatus.OK,
        guardada,
        'Jornada electoral abierta correctamente.',
      );
    }

    if (accion === 'CERRAR') {
      if (estadoActual !== EstadoEleccionEnum.ACTIVA || !eleccion.estaActiva) {
        throw new BadRequestException(
          'Solo se puede cerrar una jornada electoral activa.',
        );
      }

      eleccion.estaActiva = false;
      eleccion.estado = EstadoEleccionEnum.FINALIZADA;
      const guardada = await this.eleccionRepository.save(eleccion);

      return createApiResponse(
        HttpStatus.OK,
        guardada,
        'Jornada electoral cerrada correctamente.',
      );
    }

    // Acción no reconocida
    throw new BadRequestException(
      `Acción '${accion}' no reconocida. Use 'ABRIR' o 'CERRAR'.`,
    );
  }

  /**
   * RF5 · Consulta el estado actual de la jornada de una elección
   * sin modificarlo (lectura).
   *
   * @param eleccionId  UUID de la elección.
   * @returns Estado actual de la jornada (activa/inactiva, fecha, horarios).
   * @throws NotFoundException si la elección no existe.
   */
  async obtenerEstadoJornada(
    eleccionId: string,
  ): Promise<ApiResponse<EstadoJornada>> {
    const eleccion = await this.buscarEleccionPorIdOrThrow(eleccionId);

    // Determinar la "última acción lógica" en base al estado actual
    const accionLogica: AccionJornada = eleccion.estaActiva ? 'ABRIR' : 'CERRAR';

    return createApiResponse(
      HttpStatus.OK,
      this.buildEstadoJornada(eleccion, accionLogica),
      'Estado de la jornada obtenido correctamente.',
    );
  }

  /**
   * Endpoint de desarrollo: reactiva on-chain todas las papeletas de la elección ACTIVA.
   * Útil tras redeploy del contrato o reinicio de la red Hardhat local.
   */
  async forzarSyncBlockchain(): Promise<{
    message: string;
    papeletas: number;
    papeletasSincronizadas: number;
    papeletasYaActivas: number;
    eleccionId: string;
    titulo: string;
    txHashes: string[];
  }> {
    if (process.env.ENABLE_BLOCKCHAIN !== 'true') {
      throw new ServiceUnavailableException(
        'ENABLE_BLOCKCHAIN debe estar en true para sincronizar papeletas on-chain.',
      );
    }

    const eleccion = await this.eleccionRepository.findOne({
      where: {
        estado: EstadoEleccionEnum.ACTIVA,
        estaActiva: true,
      },
      order: { fecha: 'DESC' },
    });

    if (!eleccion) {
      throw new NotFoundException('No hay ninguna elección en estado ACTIVA.');
    }

    const papeletas = await this.eleccionCargoRepository.find({
      where: { eleccion: { id: eleccion.id } },
      order: { orden: 'ASC' },
    });

    if (papeletas.length === 0) {
      throw new BadRequestException(
        'La elección activa no tiene papeletas configuradas para sincronizar.',
      );
    }

    const privateKey = this.getVotingWalletPrivateKey();
    const papeletaIds = papeletas.map((papeleta) => papeleta.id);

    let yaActivas = 0;
    for (const papeleta of papeletas) {
      if (await this.blockchainService.esPapeletaActivaOnChain(papeleta.id)) {
        yaActivas += 1;
      }
    }

    this.logger.warn(
      `[DEV] Forzando sync on-chain de ${papeletas.length} papeleta(s) para "${eleccion.titulo}" (${eleccion.id}).`,
    );

    const txHashes = await this.blockchainService.configurarPapeletasActivasEnLote(
      papeletaIds,
      true,
      privateKey,
    );

    return {
      message: 'Blockchain sincronizada con éxito',
      papeletas: papeletas.length,
      papeletasSincronizadas: txHashes.length,
      papeletasYaActivas: yaActivas,
      eleccionId: eleccion.id,
      titulo: eleccion.titulo,
      txHashes,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  MÉTODOS PRIVADOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Activa on-chain todas las papeletas de una elección recién abierta.
   */
  private async activarPapeletasOnChain(eleccionId: string): Promise<void> {
    if (process.env.ENABLE_BLOCKCHAIN !== 'true') {
      this.logger.warn(
        `ENABLE_BLOCKCHAIN=false: se omitió la activación on-chain de papeletas para la elección ${eleccionId}.`,
      );
      return;
    }

    const papeletas = await this.eleccionCargoRepository.find({
      where: { eleccion: { id: eleccionId } },
      order: { orden: 'ASC' },
    });

    if (papeletas.length === 0) {
      throw new BadRequestException(
        'No hay papeletas configuradas para activar on-chain en esta elección.',
      );
    }

    const privateKey = this.getVotingWalletPrivateKey();
    const papeletaIds = papeletas.map((papeleta) => papeleta.id);

    const txHashes = await this.blockchainService.configurarPapeletasActivasEnLote(
      papeletaIds,
      true,
      privateKey,
    );

    this.logger.log(
      `Activadas on-chain ${txHashes.length}/${papeletas.length} papeleta(s) para la elección ${eleccionId}.`,
    );
  }

  private getVotingWalletPrivateKey(): string {
    const privateKey =
      process.env.VOTING_WALLET_PRIVATE_KEY ||
      process.env.WALLET_PRIVATE_KEY ||
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

    if (privateKey.trim() === 'example_wallet_private_key_change_me') {
      throw new ServiceUnavailableException(
        'La clave privada institucional no está configurada o no es válida.',
      );
    }

    return privateKey;
  }

  /**
   * Busca una elección por ID o lanza NotFoundException.
   */
  private async buscarEleccionPorIdOrThrow(eleccionId: string): Promise<Eleccion> {
    const eleccion = await this.eleccionRepository.findOne({
      where: { id: eleccionId },
    });

    if (!eleccion) {
      throw new NotFoundException(
        `No se encontró la elección con id ${eleccionId}.`,
      );
    }

    return eleccion;
  }

  /**
   * Construye el objeto de respuesta EstadoJornada a partir de una entidad Eleccion.
   */
  private buildEstadoJornada(eleccion: Eleccion, accionEjecutada: AccionJornada): EstadoJornada {
    return {
      eleccionId: eleccion.id,
      titulo: eleccion.titulo,
      estado: eleccion.estado ?? EstadoEleccionEnum.EN_CONFIGURACION,
      estaActiva: eleccion.estaActiva,
      fecha: eleccion.fecha as unknown as Date,
      accionEjecutada,
    };
  }

  /**
   * Compara dos fechas ignorando la hora, solo año-mes-día.
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Convierte un valor de fecha a un Date consistente.
   * - Si llega como `YYYY-MM-DD`, se interpreta en hora local (evita desfase UTC).
   * - Si llega como ISO o como Date, se parsea normalmente.
   */
  private parseElectionDate(value: string | Date): Date {
    if (value instanceof Date) {
      return new Date(value);
    }

    const raw = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      // Parsear como hora local para evitar desfase de zona horaria
      return new Date(`${raw}T00:00:00`);
    }

    return new Date(raw);
  }
}
