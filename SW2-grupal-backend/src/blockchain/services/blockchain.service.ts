import { BadRequestException, Injectable, NotFoundException, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ethers } from 'ethers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParametroSistema } from '../../elecciones/entities/parametro-sistema.entity';
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

  private async getContract(): Promise<VotacionContract> {
    const address = await this.getActiveContractAddress();
    const abi = (VotacionAbi as { abi?: unknown }).abi ?? VotacionAbi;
    const provider = this.getProvider();
    
    const contract = new ethers.Contract(address, abi as any, provider);
    return contract as unknown as VotacionContract;
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
    const contractInstance = await this.getContract();
    const contractWithSigner = contractInstance.connect(wallet);

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
    
    const contractInstance = await this.getContract();
    const votos = await contractInstance.obtenerVotos(eleccionHash, candidatoHash);
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
