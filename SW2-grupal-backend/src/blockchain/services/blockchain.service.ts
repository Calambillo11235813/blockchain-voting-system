import { BadRequestException, Injectable, NotFoundException, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ethers } from 'ethers';
import VotacionAbi from '../abi/VotacionABI.json';

interface VotacionContract {
  votar(eleccionHash: string, candidatoHash: string, electorHash: string): Promise<ethers.ContractTransactionResponse>;
  obtenerVotos(eleccionHash: string, candidatoHash: string): Promise<bigint>;
  connect(signer: ethers.Signer): VotacionContract;
}

/**
 * Servicio de comunicacion con el contrato de votacion en blockchain.
 */
@Injectable()
export class BlockchainService implements OnModuleInit {
  private provider?: ethers.JsonRpcProvider;
  private contract?: ethers.Contract;
  private readonly rpcUrl = process.env.BLOCKCHAIN_RPC_URL || process.env.BLOCKCHAIN_URL || 'http://127.0.0.1:8545';
  private readonly contractAddress =
    process.env.VOTACION_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  /**
   * Inicializa el proveedor y la instancia del contrato al arrancar el modulo.
   * @returns void
   * @throws BadRequestException si la direccion del contrato es invalida.
   * @throws ServiceUnavailableException si el ABI esta vacio.
   */
  onModuleInit(): void {
    if (!ethers.isAddress(this.contractAddress)) {
      throw new BadRequestException('VOTACION_CONTRACT_ADDRESS no es una direccion valida');
    }

    const abi = (VotacionAbi as { abi?: unknown }).abi ?? VotacionAbi;
    if (!Array.isArray(abi) || abi.length === 0) {
      throw new ServiceUnavailableException('Votacion ABI esta vacio. Pega el ABI generado por Hardhat.');
    }

    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.contract = new ethers.Contract(this.contractAddress, abi, this.provider);
  }

  private getProvider(): ethers.JsonRpcProvider {
    if (!this.provider) {
      throw new ServiceUnavailableException('BlockchainService no esta inicializado.');
    }

    return this.provider;
  }

  private getContract(): VotacionContract {
    if (!this.contract) {
      throw new ServiceUnavailableException('BlockchainService no esta inicializado.');
    }

    return this.contract as unknown as VotacionContract;
  }

  /**
   * Registra el voto de un elector en la blockchain usando la llave privada institucional.
   * @param eleccionId UUID de la eleccion
   * @param candidatoId UUID del candidato/frente
   * @param electorId UUID del elector
   * @param privateKey Llave privada de la wallet institucional
   * @returns Hash de la transaccion enviada.
   */
  async registrarVoto(eleccionId: string, candidatoId: string, electorId: string, privateKey: string): Promise<string> {
    const trimmedKey = privateKey.trim();
    const normalizedKey = trimmedKey.startsWith('0x') ? trimmedKey : `0x${trimmedKey}`;
    const wallet = new ethers.Wallet(normalizedKey, this.getProvider());
    const contractWithSigner = this.getContract().connect(wallet);

    const eleccionHash = ethers.keccak256(ethers.toUtf8Bytes(eleccionId));
    const candidatoHash = ethers.keccak256(ethers.toUtf8Bytes(candidatoId));
    const electorHash = ethers.keccak256(ethers.toUtf8Bytes(electorId));

    const tx = await contractWithSigner.votar(eleccionHash, candidatoHash, electorHash);
    await tx.wait();
    return tx.hash;
  }

  /**
   * Obtiene la cantidad de votos de un candidato/frente en una eleccion.
   * @param eleccionId UUID de la eleccion
   * @param candidatoId UUID del candidato/frente
   * @returns Cantidad de votos
   */
  async obtenerVotos(eleccionId: string, candidatoId: string): Promise<number> {
    const eleccionHash = ethers.keccak256(ethers.toUtf8Bytes(eleccionId));
    const candidatoHash = ethers.keccak256(ethers.toUtf8Bytes(candidatoId));
    
    const votos = await this.getContract().obtenerVotos(eleccionHash, candidatoHash);
    return Number(votos);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CU-20: Auditar integridad de la red
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Consulta los detalles de una transaccion por su hash.
   * @param hash Hash de la transaccion (0x...).
   * @returns Objeto con bloque, timestamp, confirmaciones y datos de la tx.
   * @throws NotFoundException si la transaccion no existe en la blockchain.
   */
  async obtenerTransaccion(hash: string): Promise<{
    hash: string;
    bloque: number | null;
    timestamp: number | null;
    confirmaciones: number;
    desde: string;
    hacia: string | null;
    valor: string;
    estado: 'confirmada' | 'pendiente' | 'no_encontrada';
  }> {
    const provider = this.getProvider();

    const tx = await provider.getTransaction(hash);
    if (!tx) {
      throw new NotFoundException(`Transaccion ${hash} no encontrada en la blockchain.`);
    }

    let timestamp: number | null = null;
    let confirmaciones = 0;

    if (tx.blockNumber !== null && tx.blockNumber !== undefined) {
      const bloque = await provider.getBlock(tx.blockNumber);
      timestamp = bloque ? bloque.timestamp : null;
      const currentBlock = await provider.getBlockNumber();
      confirmaciones = currentBlock - tx.blockNumber + 1;
    }

    return {
      hash: tx.hash,
      bloque: tx.blockNumber ?? null,
      timestamp,
      confirmaciones,
      desde: tx.from,
      hacia: tx.to,
      valor: ethers.formatEther(tx.value),
      estado: tx.blockNumber !== null ? 'confirmada' : 'pendiente',
    };
  }

  /**
   * Verifica y retorna el hash y datos de un bloque por su numero.
   * @param numero Numero de bloque a consultar.
   * @returns Objeto con hash, parentHash, timestamp y numero de transacciones.
   * @throws NotFoundException si el bloque no existe.
   */
  async verificarBloque(numero: number): Promise<{
    numero: number;
    hash: string;
    hashPadre: string;
    timestamp: number;
    totalTransacciones: number;
    minero: string | null;
  }> {
    const provider = this.getProvider();

    const bloque = await provider.getBlock(numero);
    if (!bloque) {
      throw new NotFoundException(`Bloque numero ${numero} no encontrado en la blockchain.`);
    }

    return {
      numero: bloque.number,
      hash: bloque.hash ?? '',
      hashPadre: bloque.parentHash,
      timestamp: bloque.timestamp,
      totalTransacciones: bloque.transactions.length,
      minero: bloque.miner,
    };
  }
}
