import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BlockchainService } from 'src/blockchain/services/blockchain.service';
import { RegistroSufragio } from 'src/elecciones/entities/registro-sufragio.entity';
import { Eleccion } from 'src/elecciones/entities/eleccion.entity';
import { EleccionCargo } from 'src/elecciones/entities/eleccion-cargo.entity';
import { PadronElectoral } from 'src/elecciones/entities/padron-electoral.entity';
import { Candidato } from 'src/elecciones/entities/candidato.entity';
import { Elector, EstamentoEnum } from 'src/electores/entities/elector.entity';
import { ApiResponse, createApiResponse } from 'src/compartido/respuesta';
import { PapeletaEligibilityService } from './papeleta-eligibility.service';
import { SeleccionVotoDto } from '../dto/voto/emitir-voto-batch.dto';
import { VOTO_BLANCO_ID, esVotoBlanco } from '../constants/voto-blanco.constant';

export interface VotoComprobante {
  hashTransaccion: string;
  fechaSufragio: Date;
  mensaje: string;
  eleccionCargoId: string;
}

export interface VotoBatchComprobante {
  hashTransaccion: string;
  fechaSufragio: Date;
  mensaje: string;
  papeletasVotadas: string[];
}

@Injectable()
export class VotoService {
  constructor(
    @InjectRepository(Eleccion)
    private readonly eleccionRepository: Repository<Eleccion>,

    @InjectRepository(EleccionCargo)
    private readonly eleccionCargoRepository: Repository<EleccionCargo>,

    @InjectRepository(RegistroSufragio)
    private readonly registroSufragioRepository: Repository<RegistroSufragio>,

    @InjectRepository(PadronElectoral)
    private readonly padronElectoralRepository: Repository<PadronElectoral>,

    @InjectRepository(Candidato)
    private readonly candidatoRepository: Repository<Candidato>,

    @InjectRepository(Elector)
    private readonly electorRepository: Repository<Elector>,

    private readonly blockchainService: BlockchainService,
    private readonly papeletaEligibilityService: PapeletaEligibilityService,
    private readonly dataSource: DataSource,
  ) {}

  async votar(
    electorId: string,
    eleccionId: string,
    eleccionCargoId: string,
    candidatoId: string,
  ): Promise<ApiResponse<VotoComprobante>> {
    const eleccion = await this.eleccionRepository.findOne({ where: { id: eleccionId } });
    if (!eleccion) {
      throw new NotFoundException(`No se encontró la elección con id ${eleccionId}.`);
    }

    const bypass = process.env.BYPASS_ELECTION_TIME === 'true';
    if (!eleccion.estaActiva && !bypass) {
      throw new ForbiddenException('La jornada electoral no está activa.');
    }

    const eleccionCargo = await this.eleccionCargoRepository.findOne({
      where: { id: eleccionCargoId, eleccion: { id: eleccionId } },
      relations: ['cargo', 'eleccion'],
    });
    if (!eleccionCargo) {
      throw new NotFoundException(
        `No se encontró la papeleta ${eleccionCargoId} en la elección ${eleccionId}.`,
      );
    }

    const elector = await this.electorRepository.findOne({ where: { id: electorId } });
    if (!elector) {
      throw new NotFoundException(`No se encontró el elector con id ${electorId}.`);
    }

    const entradaPadron = await this.padronElectoralRepository.findOne({
      where: {
        eleccion: { id: eleccionId },
        elector: { id: electorId },
      },
    });
    if (!entradaPadron) {
      throw new ForbiddenException('El elector no está inscrito en el padrón de esta elección.');
    }
    if (!entradaPadron.estaHabilitado) {
      throw new ForbiddenException('El elector ha sido inhabilitado para esta elección.');
    }

    if (!this.papeletaEligibilityService.esPapeletaAplicable(elector, eleccionCargo, entradaPadron)) {
      throw new ForbiddenException('El elector no es elegible para esta papeleta.');
    }

    const yaVoto = await this.registroSufragioRepository.findOne({
      where: {
        eleccionCargo: { id: eleccionCargoId },
        elector: { id: electorId },
      },
    });
    if (yaVoto) {
      throw new BadRequestException('El elector ya emitió su voto en esta papeleta.');
    }

    const candidato = await this.candidatoRepository.findOne({
      where: { id: candidatoId },
      relations: ['frente', 'frente.eleccion', 'eleccionCargo', 'eleccionCargo.eleccion', 'eleccionCargo.cargo'],
    });
    if (!candidato) {
      throw new NotFoundException(`No se encontró el candidato con id ${candidatoId}.`);
    }
    if (candidato.eleccionCargo.id !== eleccionCargoId) {
      throw new BadRequestException('El candidato no pertenece a la papeleta especificada.');
    }
    if (candidato.eleccionCargo.eleccion.id !== eleccionId) {
      throw new BadRequestException('El candidato no pertenece a la elección especificada.');
    }
    if (candidato.frente.eleccion?.id && candidato.frente.eleccion.id !== eleccionId) {
      throw new BadRequestException('El frente del candidato no pertenece a la elección especificada.');
    }

    const votingWalletPrivateKey = this.getVotingWalletPrivateKey();

    let txHash: string;
    try {
      txHash = await this.blockchainService.registrarVoto(
        eleccionCargoId,
        candidato.frente.id,
        electorId,
        votingWalletPrivateKey,
      );
    } catch (error: any) {
      throw new ServiceUnavailableException(
        `Falla al registrar el voto en blockchain: ${error.message || error}`,
      );
    }

    const registro = this.registroSufragioRepository.create({
      eleccion: { id: eleccionId } as Eleccion,
      eleccionCargo: { id: eleccionCargoId } as EleccionCargo,
      elector: { id: electorId } as Elector,
      hashTransaccion: txHash,
    });

    try {
      await this.registroSufragioRepository.save(registro);
    } catch {
      throw new BadRequestException('El elector ya emitió su voto en esta papeleta.');
    }

    return createApiResponse(
      HttpStatus.OK,
      {
        hashTransaccion: txHash,
        fechaSufragio: registro.fechaSufragio || new Date(),
        mensaje: 'Voto registrado exitosamente.',
        eleccionCargoId,
      },
      'Sufragio procesado y registrado correctamente en blockchain.',
    );
  }

  /**
   * Emite un lote de votos (flujo Crucero) en una sola transacción blockchain.
   * El estamento se infiere del elector autenticado (JWT).
   */
  async votarBatch(
    elector: Elector,
    eleccionId: string,
    selecciones: SeleccionVotoDto[],
  ): Promise<ApiResponse<VotoBatchComprobante>> {
    const eleccion = await this.eleccionRepository.findOne({ where: { id: eleccionId } });
    if (!eleccion) {
      throw new NotFoundException(`No se encontró la elección con id ${eleccionId}.`);
    }

    const bypass = process.env.BYPASS_ELECTION_TIME === 'true';
    if (!eleccion.estaActiva && !bypass) {
      throw new ForbiddenException('La jornada electoral no está activa.');
    }

    const entradaPadron = await this.padronElectoralRepository.findOne({
      where: {
        eleccion: { id: eleccionId },
        elector: { id: elector.id },
      },
    });
    if (!entradaPadron) {
      throw new ForbiddenException('El elector no está inscrito en el padrón de esta elección.');
    }
    if (!entradaPadron.estaHabilitado) {
      throw new ForbiddenException('El elector ha sido inhabilitado para esta elección.');
    }

    const papeletasIds: string[] = [];
    const frentesIds: string[] = [];
    const papeletasUnicas = new Set<string>();

    for (const seleccion of selecciones) {
      if (papeletasUnicas.has(seleccion.eleccionCargoId)) {
        throw new BadRequestException('No se puede votar dos veces en la misma papeleta dentro del lote.');
      }
      papeletasUnicas.add(seleccion.eleccionCargoId);

      const eleccionCargo = await this.eleccionCargoRepository.findOne({
        where: { id: seleccion.eleccionCargoId, eleccion: { id: eleccionId } },
        relations: ['cargo', 'eleccion'],
      });
      if (!eleccionCargo) {
        throw new NotFoundException(
          `No se encontró la papeleta ${seleccion.eleccionCargoId} en la elección ${eleccionId}.`,
        );
      }

      if (!this.papeletaEligibilityService.esPapeletaAplicable(elector, eleccionCargo, entradaPadron)) {
        throw new ForbiddenException(`El elector no es elegible para la papeleta ${seleccion.eleccionCargoId}.`);
      }

      const yaVoto = await this.registroSufragioRepository.findOne({
        where: {
          eleccionCargo: { id: seleccion.eleccionCargoId },
          elector: { id: elector.id },
        },
      });
      if (yaVoto) {
        throw new BadRequestException(`El elector ya emitió su voto en la papeleta ${seleccion.eleccionCargoId}.`);
      }

      papeletasIds.push(seleccion.eleccionCargoId);

      if (esVotoBlanco(seleccion.candidatoId)) {
        // Voto anónimo: no se persiste candidato en BD; on-chain se hashea el literal "BLANCO".
        frentesIds.push(VOTO_BLANCO_ID);
        continue;
      }

      const candidato = await this.candidatoRepository.findOne({
        where: { id: seleccion.candidatoId },
        relations: ['frente', 'frente.eleccion', 'eleccionCargo', 'eleccionCargo.eleccion', 'eleccionCargo.cargo'],
      });
      if (!candidato) {
        throw new NotFoundException(`No se encontró el candidato con id ${seleccion.candidatoId}.`);
      }
      if (candidato.eleccionCargo.id !== seleccion.eleccionCargoId) {
        throw new BadRequestException('El candidato no pertenece a la papeleta especificada.');
      }
      if (candidato.eleccionCargo.eleccion.id !== eleccionId) {
        throw new BadRequestException('El candidato no pertenece a la elección especificada.');
      }
      if (candidato.frente.eleccion?.id && candidato.frente.eleccion.id !== eleccionId) {
        throw new BadRequestException('El frente del candidato no pertenece a la elección especificada.');
      }

      frentesIds.push(candidato.frente.id);
    }

    const estamento = this.mapEstamentoToOnChain(elector.estamento);
    const votingWalletPrivateKey = this.getVotingWalletPrivateKey();

    let txHash: string;
    try {
      txHash = await this.blockchainService.registrarVotoBatch(
        papeletasIds,
        frentesIds,
        elector.id,
        estamento,
        votingWalletPrivateKey,
      );
    } catch (error: any) {
      throw new ServiceUnavailableException(
        `Falla al registrar el lote de votos en blockchain: ${error.message || error}`,
      );
    }

    const fechaSufragio = new Date();
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const papeletaId of papeletasIds) {
        const registro = queryRunner.manager.create(RegistroSufragio, {
          eleccion: { id: eleccionId } as Eleccion,
          eleccionCargo: { id: papeletaId } as EleccionCargo,
          elector: { id: elector.id } as Elector,
          hashTransaccion: txHash,
        });
        await queryRunner.manager.save(registro);
      }
      await queryRunner.commitTransaction();
    } catch {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('No se pudo persistir el lote de sufragios. Es posible que ya haya votado en alguna papeleta.');
    } finally {
      await queryRunner.release();
    }

    return createApiResponse(
      HttpStatus.OK,
      {
        hashTransaccion: txHash,
        fechaSufragio,
        mensaje: 'Lote de votos registrado exitosamente.',
        papeletasVotadas: papeletasIds,
      },
      'Sufragio batch procesado y registrado correctamente en blockchain.',
    );
  }

  private getVotingWalletPrivateKey(): string {
    const votingWalletPrivateKey =
      process.env.VOTING_WALLET_PRIVATE_KEY ||
      process.env.WALLET_PRIVATE_KEY ||
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

    if (votingWalletPrivateKey.trim() === 'example_wallet_private_key_change_me') {
      throw new ServiceUnavailableException('La clave privada institucional no está configurada o no es válida.');
    }

    return votingWalletPrivateKey;
  }

  private mapEstamentoToOnChain(estamento: EstamentoEnum): number {
    if (estamento === EstamentoEnum.ESTUDIANTE) {
      return 0;
    }
    if (estamento === EstamentoEnum.DOCENTE) {
      return 1;
    }
    throw new ForbiddenException('El estamento del elector no está habilitado para votar.');
  }
}
