import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockchainService } from 'src/blockchain/services/blockchain.service';
import { RegistroSufragio } from 'src/elecciones/entities/registro-sufragio.entity';
import { Eleccion } from 'src/elecciones/entities/eleccion.entity';
import { EleccionCargo } from 'src/elecciones/entities/eleccion-cargo.entity';
import { PadronElectoral } from 'src/elecciones/entities/padron-electoral.entity';
import { Candidato } from 'src/elecciones/entities/candidato.entity';
import { Elector } from 'src/electores/entities/elector.entity';
import { ApiResponse, createApiResponse } from 'src/compartido/respuesta';
import { PapeletaEligibilityService } from './papeleta-eligibility.service';

export interface VotoComprobante {
  hashTransaccion: string;
  fechaSufragio: Date;
  mensaje: string;
  eleccionCargoId: string;
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

    const votingWalletPrivateKey =
      process.env.VOTING_WALLET_PRIVATE_KEY ||
      process.env.WALLET_PRIVATE_KEY ||
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

    if (votingWalletPrivateKey.trim() === 'example_wallet_private_key_change_me') {
      throw new ServiceUnavailableException('La clave privada institucional no está configurada o no es válida.');
    }

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
}
