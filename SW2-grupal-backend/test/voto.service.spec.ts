import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { VotoService } from 'src/elecciones/services/voto.service';
import { Eleccion } from 'src/elecciones/entities/eleccion.entity';
import { EleccionCargo } from 'src/elecciones/entities/eleccion-cargo.entity';
import { RegistroSufragio } from 'src/elecciones/entities/registro-sufragio.entity';
import { PadronElectoral } from 'src/elecciones/entities/padron-electoral.entity';
import { Candidato } from 'src/elecciones/entities/candidato.entity';
import { Elector, EstamentoEnum } from 'src/electores/entities/elector.entity';
import { BlockchainService } from 'src/blockchain/services/blockchain.service';
import { PapeletaEligibilityService } from 'src/elecciones/services/papeleta-eligibility.service';

describe('VotoService (Pb-13)', () => {
  let votoService: VotoService;
  let eleccionRepository: jest.Mocked<Repository<Eleccion>>;
  let eleccionCargoRepository: jest.Mocked<Repository<EleccionCargo>>;
  let registroSufragioRepository: jest.Mocked<Repository<RegistroSufragio>>;
  let padronElectoralRepository: jest.Mocked<Repository<PadronElectoral>>;
  let candidatoRepository: jest.Mocked<Repository<Candidato>>;
  let electorRepository: jest.Mocked<Repository<Elector>>;
  let blockchainService: jest.Mocked<BlockchainService>;
  let papeletaEligibilityService: jest.Mocked<PapeletaEligibilityService>;

  beforeEach(async () => {
    // Configurar variable de entorno requerida por VotoService
    process.env.VOTING_WALLET_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';

    const mockRepository = () => ({
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    });

    const mockBlockchainService = {
      registrarVoto: jest.fn(),
      registrarVotoBatch: jest.fn(),
    };

    const mockPapeletaEligibilityService = {
      esPapeletaAplicable: jest.fn(),
    };

    const mockDataSource = {
      createQueryRunner: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VotoService,
        { provide: getRepositoryToken(Eleccion), useFactory: mockRepository },
        { provide: getRepositoryToken(EleccionCargo), useFactory: mockRepository },
        { provide: getRepositoryToken(RegistroSufragio), useFactory: mockRepository },
        { provide: getRepositoryToken(PadronElectoral), useFactory: mockRepository },
        { provide: getRepositoryToken(Candidato), useFactory: mockRepository },
        { provide: getRepositoryToken(Elector), useFactory: mockRepository },
        { provide: BlockchainService, useValue: mockBlockchainService },
        { provide: PapeletaEligibilityService, useValue: mockPapeletaEligibilityService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    votoService = module.get<VotoService>(VotoService);
    eleccionRepository = module.get(getRepositoryToken(Eleccion));
    eleccionCargoRepository = module.get(getRepositoryToken(EleccionCargo));
    registroSufragioRepository = module.get(getRepositoryToken(RegistroSufragio));
    padronElectoralRepository = module.get(getRepositoryToken(PadronElectoral));
    candidatoRepository = module.get(getRepositoryToken(Candidato));
    electorRepository = module.get(getRepositoryToken(Elector));
    blockchainService = module.get(BlockchainService);
    papeletaEligibilityService = module.get(PapeletaEligibilityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe arrojar ForbiddenException si el elector no está habilitado en el padrón', async () => {
    eleccionRepository.findOne.mockResolvedValue({ id: 'eleccion-1', estaActiva: true } as Eleccion);
    eleccionCargoRepository.findOne.mockResolvedValue({ id: 'cargo-1' } as EleccionCargo);
    electorRepository.findOne.mockResolvedValue({ id: 'elector-1' } as Elector);
    
    // El elector está en el padrón, pero no habilitado
    padronElectoralRepository.findOne.mockResolvedValue({ 
      estaHabilitado: false 
    } as PadronElectoral);

    await expect(votoService.votar('elector-1', 'eleccion-1', 'cargo-1', 'candidato-1'))
      .rejects.toThrow(ForbiddenException);
  });

  it('debe arrojar BadRequestException si el elector ya emitió su voto', async () => {
    eleccionRepository.findOne.mockResolvedValue({ id: 'eleccion-1', estaActiva: true } as Eleccion);
    eleccionCargoRepository.findOne.mockResolvedValue({ id: 'cargo-1' } as EleccionCargo);
    electorRepository.findOne.mockResolvedValue({ id: 'elector-1' } as Elector);
    padronElectoralRepository.findOne.mockResolvedValue({ estaHabilitado: true } as PadronElectoral);
    papeletaEligibilityService.esPapeletaAplicable.mockReturnValue(true);
    
    // Simula que el elector ya votó en esta papeleta
    registroSufragioRepository.findOne.mockResolvedValue({ id: 'sufragio-previo' } as RegistroSufragio);

    await expect(votoService.votar('elector-1', 'eleccion-1', 'cargo-1', 'candidato-1'))
      .rejects.toThrow(BadRequestException);
  });

  it('debe registrar exitosamente el voto en la blockchain y la BD', async () => {
    eleccionRepository.findOne.mockResolvedValue({ id: 'eleccion-1', estaActiva: true } as Eleccion);
    eleccionCargoRepository.findOne.mockResolvedValue({ id: 'cargo-1' } as EleccionCargo);
    electorRepository.findOne.mockResolvedValue({ id: 'elector-1' } as Elector);
    padronElectoralRepository.findOne.mockResolvedValue({ estaHabilitado: true } as PadronElectoral);
    papeletaEligibilityService.esPapeletaAplicable.mockReturnValue(true);
    
    // Simula que el elector NO ha votado
    registroSufragioRepository.findOne.mockResolvedValue(null);

    candidatoRepository.findOne.mockResolvedValue({
      id: 'candidato-1',
      frente: { id: 'frente-1', eleccion: { id: 'eleccion-1' } },
      eleccionCargo: { id: 'cargo-1', eleccion: { id: 'eleccion-1' } },
    } as any);

    // Mock Blockchain
    blockchainService.registrarVoto.mockResolvedValue('0xHashTransaccion');
    
    // Mock Save
    registroSufragioRepository.create.mockReturnValue({ id: 'nuevo-registro' } as RegistroSufragio);
    registroSufragioRepository.save.mockResolvedValue({ id: 'nuevo-registro', fechaSufragio: new Date() } as RegistroSufragio);

    const result = await votoService.votar('elector-1', 'eleccion-1', 'cargo-1', 'candidato-1');

    expect(result.statusCode).toBe(200);
    expect(result.data.hashTransaccion).toBe('0xHashTransaccion');
    expect(blockchainService.registrarVoto).toHaveBeenCalledWith(
      'cargo-1', 
      'frente-1', 
      'elector-1', 
      expect.any(String)
    );
    expect(registroSufragioRepository.save).toHaveBeenCalled();
  });
});
