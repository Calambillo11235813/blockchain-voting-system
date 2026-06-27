import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { EscrutinioService } from 'src/elecciones/services/escrutinio.service';
import { Eleccion } from 'src/elecciones/entities/eleccion.entity';
import { EleccionCargo } from 'src/elecciones/entities/eleccion-cargo.entity';
import { Frente } from 'src/elecciones/entities/frente.entity';
import { RegistroSufragio } from 'src/elecciones/entities/registro-sufragio.entity';
import { PadronElectoral } from 'src/elecciones/entities/padron-electoral.entity';
import { BlockchainService } from 'src/blockchain/services/blockchain.service';
import { PapeletaEligibilityService } from 'src/elecciones/services/papeleta-eligibility.service';
import { EstadoEleccionEnum } from 'src/elecciones/enums/estado-eleccion.enum';

describe('EscrutinioService', () => {
  let service: EscrutinioService;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  const mockEleccionRepository = {
    findOne: jest.fn(),
  };

  const mockEleccionCargoRepository = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockFrenteRepository = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockRegistroSufragioRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockPadronElectoralRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockBlockchainService = {
    obtenerVotos: jest.fn().mockResolvedValue(0),
  };

  const mockPapeletaEligibilityService = {
    esPapeletaAplicable: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscrutinioService,
        {
          provide: getRepositoryToken(Eleccion),
          useValue: mockEleccionRepository,
        },
        {
          provide: getRepositoryToken(EleccionCargo),
          useValue: mockEleccionCargoRepository,
        },
        {
          provide: getRepositoryToken(Frente),
          useValue: mockFrenteRepository,
        },
        {
          provide: getRepositoryToken(RegistroSufragio),
          useValue: mockRegistroSufragioRepository,
        },
        {
          provide: getRepositoryToken(PadronElectoral),
          useValue: mockPadronElectoralRepository,
        },
        {
          provide: BlockchainService,
          useValue: mockBlockchainService,
        },
        {
          provide: PapeletaEligibilityService,
          useValue: mockPapeletaEligibilityService,
        },
      ],
    }).compile();

    service = module.get<EscrutinioService>(EscrutinioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('calcularResultadosParitarios', () => {
    it('debe lanzar NotFoundException si no se encuentra la elección', async () => {
      mockEleccionRepository.findOne.mockResolvedValue(null);
      await expect(service.calcularResultadosParitarios('123')).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ForbiddenException si la elección está activa', async () => {
      mockEleccionRepository.findOne.mockResolvedValue({
        id: '123',
        estaActiva: true,
        estado: EstadoEleccionEnum.ACTIVA,
      });
      await expect(service.calcularResultadosParitarios('123')).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar ForbiddenException si la elección no está finalizada', async () => {
      mockEleccionRepository.findOne.mockResolvedValue({
        id: '123',
        estaActiva: false,
        estado: EstadoEleccionEnum.EN_CONFIGURACION, 
      });
      await expect(service.calcularResultadosParitarios('123')).rejects.toThrow(ForbiddenException);
    });

    it('debe retornar resultados correctamente cuando la elección es válida', async () => {
      mockEleccionRepository.findOne.mockResolvedValue({
        id: '123',
        titulo: 'Elección de prueba',
        fecha: new Date(),
        estaActiva: false,
        estado: EstadoEleccionEnum.FINALIZADA,
      });

      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockEleccionCargoRepository.find.mockResolvedValue([]);

      const result = await service.calcularResultadosParitarios('123');

      expect(result.data).toBeDefined();
      expect(result.data?.eleccionId).toBe('123');
      expect(result.data?.totalHabilitados).toBe(0);
      expect(result.data?.totalSufragiosEmitidos).toBe(0);
      expect(result.data?.resultadosPorPapeleta).toEqual([]);
    });
  });
});
