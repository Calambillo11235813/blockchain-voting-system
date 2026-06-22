import { BadRequestException, Injectable, NotFoundException, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ethers } from 'ethers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParametroSistema } from '../../elecciones/entities/parametro-sistema.entity';
import VotacionAbi from '../abi/VotacionABI.json';
import { VOTO_BLANCO_ID } from '../../elecciones/constants/voto-blanco.constant';

interface VotacionContract {
  votar(eleccionHash: string, candidatoHash: string, electorHash: string): Promise<ethers.ContractTransactionResponse>;
  votarBatch(
    elecciones: string[],
    candidatos: string[],
    electorHash: string,
    estamento: number,
  ): Promise<ethers.ContractTransactionResponse>;
  configurarEleccionActiva(eleccionHash: string, activa: boolean): Promise<ethers.ContractTransactionResponse>;
  eleccionActiva(eleccionHash: string): Promise<boolean>;
  obtenerVotos(eleccionHash: string, candidatoHash: string): Promise<bigint>;
  obtenerVotosEstudiantes(eleccionHash: string, candidatoHash: string): Promise<bigint>;
  obtenerVotosDocentes(eleccionHash: string, candidatoHash: string): Promise<bigint>;
  connect(signer: ethers.Signer): VotacionContract;
}

export interface VotosParitarios {
  total: number;
  estudiantes: number;
  docentes: number;
}

/**
 * Servicio de comunicacion con el contrato de votacion en blockchain.
 */
@Injectable()
export class BlockchainService implements OnModuleInit {
  private provider?: ethers.JsonRpcProvider;
  private readonly rpcUrl = process.env.BLOCKCHAIN_RPC_URL || process.env.BLOCKCHAIN_URL || 'http://127.0.0.1:8545';
  private readonly defaultContractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  constructor(
    @InjectRepository(ParametroSistema)
    private readonly paramRepo: Repository<ParametroSistema>,
  ) {}

  /**
   * Inicializa el proveedor al arrancar el modulo.
   * @returns void
   * @throws ServiceUnavailableException si el ABI esta vacio.
   */
  onModuleInit(): void {
    const abi = (VotacionAbi as { abi?: unknown }).abi ?? VotacionAbi;
    if (!Array.isArray(abi) || abi.length === 0) {
      throw new ServiceUnavailableException('Votacion ABI esta vacio. Pega el ABI generado por Hardhat.');
    }

    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
  }

  /**
   * Obtiene la dirección del contrato activa de la BD, o del .env, o el default de Hardhat.
   */
  async getActiveContractAddress(): Promise<string> {
    const param = await this.paramRepo.findOne({ where: { clave: 'VOTACION_CONTRACT_ADDRESS' } });
    if (param && param.valor && ethers.isAddress(param.valor)) {
      return param.valor;
    }
    const envAddress = process.env.VOTACION_CONTRACT_ADDRESS;
    if (envAddress && ethers.isAddress(envAddress)) {
      return envAddress;
    }
    return this.defaultContractAddress;
  }

  /**
   * Guarda la nueva dirección del contrato en la base de datos (CU-03).
   */
  async guardarDireccionContrato(address: string, adminId?: string): Promise<void> {
    let param = await this.paramRepo.findOne({ where: { clave: 'VOTACION_CONTRACT_ADDRESS' } });
    if (!param) {
      param = this.paramRepo.create({
        clave: 'VOTACION_CONTRACT_ADDRESS',
        descripcion: 'Dirección del Smart Contract Votacion en uso',
        tipo: 'string',
      });
    }
    param.valor = address;
    if (adminId) param.actualizadoPor = adminId;
    await this.paramRepo.save(param);
  }

  private getProvider(): ethers.JsonRpcProvider {
    if (!this.provider) {
      throw new ServiceUnavailableException('BlockchainService no esta inicializado.');
    }

    return this.provider;
  }

  /**
   * Hashea un identificador off-chain (UUID de papeleta, frente, elector o literal "BLANCO").
   * El valor {@link VOTO_BLANCO_ID} produce un bytes32 válido y estable para votos en blanco.
   */
  private hashUuid(id: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(id));
  }

  private createWallet(privateKey: string): ethers.Wallet {
    const trimmedKey = privateKey.trim();
    const normalizedKey = trimmedKey.startsWith('0x') ? trimmedKey : `0x${trimmedKey}`;
    return new ethers.Wallet(normalizedKey, this.getProvider());
  }

  private async getContract(): Promise<VotacionContract> {
    const address = await this.getActiveContractAddress();
    const abi = (VotacionAbi as { abi?: unknown }).abi ?? VotacionAbi;
    const provider = this.getProvider();
    
    const contract = new ethers.Contract(address, abi as any, provider);
    return contract as unknown as VotacionContract;
  }

  /**
   * Registra el voto de un elector en la blockchain usando la llave privada institucional.
   * @param papeletaId UUID de la papeleta (EleccionCargo) — clave on-chain del comicio parcial.
   * @param frenteId UUID del frente
   * @param electorId UUID del elector
   * @param privateKey Llave privada de la wallet institucional
   * @returns Hash de la transaccion enviada.
   */
  async registrarVoto(papeletaId: string, frenteId: string, electorId: string, privateKey: string): Promise<string> {
    const wallet = this.createWallet(privateKey);
    const contractInstance = await this.getContract();
    const contractWithSigner = contractInstance.connect(wallet);

    const eleccionHash = this.hashUuid(papeletaId);
    const candidatoHash = this.hashUuid(frenteId);
    const electorHash = this.hashUuid(electorId);

    const tx = await contractWithSigner.votar(eleccionHash, candidatoHash, electorHash);
    await tx.wait();
    return tx.hash;
  }

  /**
   * Activa o cierra una papeleta/elección on-chain para recibir votos batch.
   * @param papeletaId UUID de la papeleta (EleccionCargo).
   * @param activa true para habilitar, false para cerrar.
   * @param privateKey Llave privada de la wallet institucional.
   * @returns Hash de la transacción enviada.
   */
  async configurarEleccionActiva(
    papeletaId: string,
    activa: boolean,
    privateKey: string,
  ): Promise<string> {
    const hashes = await this.configurarPapeletasActivasEnLote([papeletaId], activa, privateKey);
    return hashes[0] ?? '';
  }

  /**
   * Consulta si una papeleta está activa on-chain.
   */
  async esPapeletaActivaOnChain(papeletaId: string): Promise<boolean> {
    const contractInstance = await this.getContract();
    const eleccionHash = this.hashUuid(papeletaId);
    return contractInstance.eleccionActiva(eleccionHash);
  }

  /**
   * Activa o cierra varias papeletas en secuencia usando una sola wallet y nonce explícito.
   * Evita errores "Nonce too low" en Hardhat al no crear wallets nuevas por transacción.
   */
  async configurarPapeletasActivasEnLote(
    papeletaIds: string[],
    activa: boolean,
    privateKey: string,
  ): Promise<string[]> {
    if (papeletaIds.length === 0) {
      return [];
    }

    const wallet = this.createWallet(privateKey);
    const provider = this.getProvider();
    const address = await this.getActiveContractAddress();
    const abi = (VotacionAbi as { abi?: unknown }).abi ?? VotacionAbi;
    const contract = new ethers.Contract(address, abi as ethers.InterfaceAbi, wallet);
    const contractReadOnly = await this.getContract();

    let nonce = await provider.getTransactionCount(wallet.address, 'pending');
    const txHashes: string[] = [];

    for (const papeletaId of papeletaIds) {
      const eleccionHash = this.hashUuid(papeletaId);

      if (activa) {
        const yaActiva = await contractReadOnly.eleccionActiva(eleccionHash);
        if (yaActiva) {
          continue;
        }
      }

      const tx = await contract.configurarEleccionActiva(eleccionHash, activa, { nonce });
      await tx.wait();
      txHashes.push(tx.hash);
      nonce += 1;
    }

    return txHashes;
  }

  /**
   * Registra un lote de votos en una sola transacción atómica (flujo Crucero).
   * @param papeletasIds UUIDs de las papeletas (EleccionCargo).
   * @param frentesIds UUIDs de frentes o {@link VOTO_BLANCO_ID} por voto en blanco (paralelos a papeletasIds).
   * @param electorId UUID del elector.
   * @param estamento 0 = Estudiante, 1 = Docente.
   * @param privateKey Llave privada de la wallet institucional.
   * @returns Hash de la transacción enviada.
   */
  async registrarVotoBatch(
    papeletasIds: string[],
    frentesIds: string[],
    electorId: string,
    estamento: number,
    privateKey: string,
  ): Promise<string> {
    if (papeletasIds.length !== frentesIds.length) {
      throw new BadRequestException('Los arreglos de papeletas y frentes deben tener la misma longitud.');
    }
    if (papeletasIds.length === 0) {
      throw new BadRequestException('El lote debe contener al menos un voto.');
    }
    if (estamento !== 0 && estamento !== 1) {
      throw new BadRequestException('El estamento debe ser 0 (Estudiante) o 1 (Docente).');
    }

    const wallet = this.createWallet(privateKey);
    const contractInstance = await this.getContract();
    const contractWithSigner = contractInstance.connect(wallet);

    const elecciones = papeletasIds.map((id) => this.hashUuid(id));
    const candidatos = frentesIds.map((id) => this.hashUuid(id));
    const electorHash = this.hashUuid(electorId);

    const tx = await contractWithSigner.votarBatch(elecciones, candidatos, electorHash, estamento);
    await tx.wait();
    return tx.hash;
  }

  /**
   * Obtiene la cantidad de votos de un frente en una papeleta (EleccionCargo).
   * @param papeletaId UUID de la papeleta
   * @param frenteId UUID del frente
   * @returns Cantidad de votos
   */
  async obtenerVotos(papeletaId: string, frenteId: string): Promise<number> {
    const eleccionHash = this.hashUuid(papeletaId);
    const candidatoHash = this.hashUuid(frenteId);

    const contractInstance = await this.getContract();
    const votos = await contractInstance.obtenerVotos(eleccionHash, candidatoHash);
    return Number(votos);
  }

  /**
   * Obtiene el desglose paritario de votos on-chain para un frente en una papeleta.
   */
  async obtenerVotosParitarios(papeletaId: string, frenteId: string): Promise<VotosParitarios> {
    const eleccionHash = this.hashUuid(papeletaId);
    const candidatoHash = this.hashUuid(frenteId);
    const contractInstance = await this.getContract();

    const [total, estudiantes, docentes] = await Promise.all([
      contractInstance.obtenerVotos(eleccionHash, candidatoHash),
      contractInstance.obtenerVotosEstudiantes(eleccionHash, candidatoHash),
      contractInstance.obtenerVotosDocentes(eleccionHash, candidatoHash),
    ]);

    return {
      total: Number(total),
      estudiantes: Number(estudiantes),
      docentes: Number(docentes),
    };
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
    datosDecodificados?: any;
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

    let datosDecodificados: any = { rawData: tx.data };
    try {
      const abi = (VotacionAbi as { abi?: any }).abi ?? VotacionAbi;
      const iface = new ethers.Interface(abi as any);
      const parsed = iface.parseTransaction({ data: tx.data, value: tx.value });
      
      if (parsed) {
        datosDecodificados = {
          metodo: parsed.name,
          argumentos: parsed.args.map(a => typeof a === 'string' ? a : a.toString()),
        };
        // Si el metodo es 'votar', mapeamos los argumentos por conveniencia
        if (parsed.name === 'votar') {
          datosDecodificados.eleccionHash = typeof parsed.args[0] === 'string' ? parsed.args[0] : parsed.args[0].toString();
          datosDecodificados.candidatoHash = typeof parsed.args[1] === 'string' ? parsed.args[1] : parsed.args[1].toString();
          datosDecodificados.electorHash = typeof parsed.args[2] === 'string' ? parsed.args[2] : parsed.args[2].toString();
        }
        if (parsed.name === 'votarBatch') {
          datosDecodificados.elecciones = parsed.args[0];
          datosDecodificados.candidatos = parsed.args[1];
          datosDecodificados.electorHash = typeof parsed.args[2] === 'string' ? parsed.args[2] : parsed.args[2].toString();
          datosDecodificados.estamento = Number(parsed.args[3]);
        }
      }
    } catch (e) {
      // Falla la decodificación, se mantiene rawData
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
      datosDecodificados
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

  // ──────────────────────────────────────────────────────────────────────────
  // CU-03: Desplegar Smart Contracts
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Despliega una nueva instancia del contrato Votacion en la blockchain.
   * Usa ethers.ContractFactory con el ABI y bytecode del artefacto de Hardhat.
   * @returns Dirección del contrato desplegado y hash de la transacción.
   */
  async deployContract(): Promise<{
    contractAddress: string;
    txHash: string;
    deployer: string;
    blockNumber: number;
  }> {
    const provider = this.getProvider();

    const privateKey =
      process.env.VOTING_WALLET_PRIVATE_KEY ||
      process.env.WALLET_PRIVATE_KEY;

    if (!privateKey) {
      throw new ServiceUnavailableException(
        'No se encontró VOTING_WALLET_PRIVATE_KEY ni WALLET_PRIVATE_KEY en las variables de entorno.',
      );
    }

    const trimmedKey = privateKey.trim();
    const normalizedKey = trimmedKey.startsWith('0x') ? trimmedKey : `0x${trimmedKey}`;
    const wallet = new ethers.Wallet(normalizedKey, provider);

    const abi = (VotacionAbi as { abi?: unknown }).abi ?? VotacionAbi;
    // Bytecode del artefacto de Hardhat (generado al compilar Votacion.sol)
    const bytecode = (VotacionAbi as { bytecode?: string }).bytecode;

    if (!bytecode) {
      throw new ServiceUnavailableException(
        'No se encontró el bytecode en VotacionABI.json. Asegúrate de usar el artefacto completo de Hardhat.',
      );
    }

    const factory = new ethers.ContractFactory(abi as any, bytecode, wallet);
    const contract = await factory.deploy();
    const deployTx = contract.deploymentTransaction();
    await contract.waitForDeployment();

    const deployedAddress = await contract.getAddress();
    const blockNumber = deployTx?.blockNumber ?? 0;

    return {
      contractAddress: deployedAddress,
      txHash: deployTx?.hash ?? '',
      deployer: wallet.address,
      blockNumber,
    };
  }

  /**
   * Obtiene información del contrato actualmente configurado.
   * @returns Info del contrato: dirección, admin, votos globales, red y si tiene código.
   */
  async getContractInfo(): Promise<{
    contractAddress: string;
    admin: string;
    totalVotosGlobal: number;
    network: { chainId: number; name: string };
    hasCode: boolean;
    rpcUrl: string;
  }> {
    const provider = this.getProvider();

    const activeAddress = await this.getActiveContractAddress();
    const network = await provider.getNetwork();
    const code = await provider.getCode(activeAddress);
    const hasCode = code !== '0x' && code.length > 2;

    let admin = '';
    let totalVotosGlobal = 0;

    if (hasCode) {
      try {
        const abi = (VotacionAbi as { abi?: unknown }).abi ?? VotacionAbi;
        const contract = new ethers.Contract(activeAddress, abi as any, provider);
        admin = await (contract as any).admin();
        const total = await (contract as any).totalVotosGlobal();
        totalVotosGlobal = Number(total);
      } catch {
        // El contrato puede no existir o tener una interfaz incompatible
      }
    }

    return {
      contractAddress: activeAddress,
      admin,
      totalVotosGlobal,
      network: {
        chainId: Number(network.chainId),
        name: network.name,
      },
      hasCode,
      rpcUrl: this.rpcUrl,
    };
  }
}
