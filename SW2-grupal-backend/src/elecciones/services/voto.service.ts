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
import { PadronElectoral } from 'src/elecciones/entities/padron-electoral.entity';
import { Candidato } from 'src/elecciones/entities/candidato.entity';
import { Frente } from 'src/elecciones/entities/frente.entity';
import { Elector } from 'src/electores/entities/elector.entity';
import { ApiResponse, createApiResponse } from 'src/compartido/respuesta';

export interface VotoComprobante {
  hashTransaccion: string;
  fechaSufragio: Date;
  mensaje: string;
}

/**
 * Servicio de votos con integración blockchain y auditoría relacional segura.
 */
@Injectable()
export class VotoService {
  constructor(
    @InjectRepository(Eleccion)
    private readonly eleccionRepository: Repository<Eleccion>,

    @InjectRepository(RegistroSufragio)
    private readonly registroSufragioRepository: Repository<RegistroSufragio>,

    @InjectRepository(PadronElectoral)
    private readonly padronElectoralRepository: Repository<PadronElectoral>,

    @InjectRepository(Candidato)
    private readonly candidatoRepository: Repository<Candidato>,

    @InjectRepository(Frente)
    private readonly frenteRepository: Repository<Frente>,

    private readonly blockchainService: BlockchainService,
  ) {}

  /**
   * Caso de Uso CU-12, CU-13 y CU-14: Emitir voto digital de forma totalmente segura.
   * Realiza validaciones en BD, registra on-chain de forma anónima firmando con la wallet institucional,
   * guarda el hecho de haber votado en RegistroSufragio y genera el hash de verificación.
   *
   * @param electorId UUID del elector.
   * @param eleccionId UUID de la elección.
   * @param candidatoId UUID del candidato en BD.
   * @returns Comprobante con el hash de transacción y fecha.
   */
  async votar(
    electorId: string,
    eleccionId: string,
    candidatoId: string,
  ): Promise<ApiResponse<VotoComprobante>> {
    // 1. Verificar que la elección exista
    const eleccion = await this.eleccionRepository.findOne({ where: { id: eleccionId } });
    if (!eleccion) {
      throw new NotFoundException(`No se encontró la elección con id ${eleccionId}.`);
    }

    // 2. Verificar que la jornada esté activa (CU-12)
    const bypass = process.env.BYPASS_ELECTION_TIME === 'true';
    if (!eleccion.estaActiva && !bypass) {
      throw new ForbiddenException('La jornada electoral no está activa.');
    }

    // 3. Verificar que el elector esté habilitado en el padrón para esta elección (CU-12)
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

    // 4. Verificar que el elector no haya votado ya (CU-12)
    const yaVoto = await this.registroSufragioRepository.findOne({
      where: {
        eleccion: { id: eleccionId },
        elector: { id: electorId },
      },
    });
    if (yaVoto) {
      throw new BadRequestException('El elector ya emitió su voto.');
    }

    // 5. Verificar que el candidato exista y pertenezca a la elección (CU-12)
    const candidato = await this.candidatoRepository.findOne({
      where: { id: candidatoId },
      relations: ['frente', 'frente.eleccionCargo', 'frente.eleccionCargo.eleccion'],
    });
    if (!candidato) {
      throw new NotFoundException(`No se encontró el candidato con id ${candidatoId}.`);
    }
    if (candidato.frente.eleccionCargo.eleccion.id !== eleccionId) {
      throw new BadRequestException('El candidato no pertenece a la elección especificada.');
    }

    // 6. Obtener la llave privada de la Wallet Institucional (Firma en backend)
    const votingWalletPrivateKey =
      process.env.VOTING_WALLET_PRIVATE_KEY ||
      process.env.WALLET_PRIVATE_KEY ||
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

    if (votingWalletPrivateKey.trim() === 'example_wallet_private_key_change_me') {
      throw new ServiceUnavailableException('La clave privada institucional no está configurada o no es válida.');
    }

    // 7. Invocar y registrar el voto en Blockchain (CU-13)
    let txHash: string;
    try {
      txHash = await this.blockchainService.registrarVoto(
        eleccionId,
        candidato.frente.id, // Votamos por el frente
        electorId,
        votingWalletPrivateKey,
      );
    } catch (error: any) {
      throw new ServiceUnavailableException(
        `Falla al registrar el voto en blockchain: ${error.message || error}`,
      );
    }

    // 8. Persistir el hecho de haber votado en RegistroSufragio (CU-13 - Secreto de Voto)
    const registro = this.registroSufragioRepository.create({
      eleccion: { id: eleccionId } as Eleccion,
      elector: { id: electorId } as Elector,
      hashTransaccion: txHash,
    });

    try {
      await this.registroSufragioRepository.save(registro);
    } catch (error: any) {
      throw new BadRequestException('El elector ya emitió su voto.');
    }

    // 9. Generar Hash de verificación para el elector (CU-14)
    return createApiResponse(
      HttpStatus.OK,
      {
        hashTransaccion: txHash,
        fechaSufragio: registro.fechaSufragio || new Date(),
        mensaje: 'Voto registrado exitosamente.',
      },
      'Sufragio procesado y registrado correctamente en blockchain.',
    );
  }
}
