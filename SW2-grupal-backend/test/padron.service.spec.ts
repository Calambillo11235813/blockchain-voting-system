import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PadronService } from 'src/elecciones/services/padron.service';
import { PadronElectoral } from 'src/elecciones/entities/padron-electoral.entity';
import { Elector } from 'src/electores/entities/elector.entity';
import { RegistroSufragio } from 'src/elecciones/entities/registro-sufragio.entity';
import { EleccionEstadoService } from 'src/elecciones/services/eleccion-estado.service';
import { Eleccion } from 'src/elecciones/entities/eleccion.entity';

// Mocks para funciones puras importadas en PadronService
jest.mock('src/elecciones/services/padron/padron-excel.parser', () => ({
  parsePadronExcelBuffer: jest.fn(),
}));

jest.mock('src/elecciones/services/padron/padron-excel.validators', () => ({
  validateNoDuplicatesPadron: jest.fn(),
}));

jest.mock('src/elecciones/services/padron/padron-excel.merger', () => ({
  fusionarFilasDualRol: jest.fn(),
}));

import { parsePadronExcelBuffer } from 'src/elecciones/services/padron/padron-excel.parser';
import { validateNoDuplicatesPadron } from 'src/elecciones/services/padron/padron-excel.validators';
import { fusionarFilasDualRol } from 'src/elecciones/services/padron/padron-excel.merger';

describe('PadronService (Pb-05)', () => {
  let padronService: PadronService;
  let dataSource: jest.Mocked<DataSource>;
  let eleccionEstadoService: jest.Mocked<EleccionEstadoService>;

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      upsert: jest.fn(),
    };

    const mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
      transaction: jest.fn(),
    };

    const mockEleccionEstadoService = {
      assertEnConfiguracion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PadronService,
        { provide: getRepositoryToken(PadronElectoral), useValue: mockRepository },
        { provide: getRepositoryToken(Elector), useValue: mockRepository },
        { provide: getRepositoryToken(RegistroSufragio), useValue: mockRepository },
        { provide: DataSource, useValue: mockDataSource },
        { provide: EleccionEstadoService, useValue: mockEleccionEstadoService },
      ],
    }).compile();

    padronService = module.get<PadronService>(PadronService);
    dataSource = module.get(DataSource) as any;
    eleccionEstadoService = module.get(EleccionEstadoService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe arrojar NotFoundException si la elección no existe al cargar el padrón', async () => {
    const mockRepo = dataSource.getRepository(Eleccion);
    (mockRepo.findOne as jest.Mock).mockResolvedValue(null);

    await expect(padronService.cargarPadronElectoral('eleccion-123', Buffer.from('')))
      .rejects.toThrow(NotFoundException);
  });

  it('debe arrojar BadRequestException si el excel no tiene filas válidas (errores estructurales)', async () => {
    const mockRepo = dataSource.getRepository(Eleccion);
    (mockRepo.findOne as jest.Mock).mockResolvedValue({ id: 'eleccion-123' });
    eleccionEstadoService.assertEnConfiguracion.mockResolvedValue(undefined);

    (parsePadronExcelBuffer as jest.Mock).mockReturnValue({
      rows: [],
      errors: ['Falta la columna CI'],
      estudiantesProcesados: 0,
      docentesProcesados: 0,
    });

    await expect(padronService.cargarPadronElectoral('eleccion-123', Buffer.from('')))
      .rejects.toThrow(BadRequestException);
  });

  it('debe arrojar BadRequestException si se detectan filas duplicadas en el excel', async () => {
    const mockRepo = dataSource.getRepository(Eleccion);
    (mockRepo.findOne as jest.Mock).mockResolvedValue({ id: 'eleccion-123' });
    eleccionEstadoService.assertEnConfiguracion.mockResolvedValue(undefined);

    (parsePadronExcelBuffer as jest.Mock).mockReturnValue({
      rows: [{ ci: '123' }, { ci: '123' }],
      errors: [],
    });

    (validateNoDuplicatesPadron as jest.Mock).mockReturnValue([
      'Fila 2: CI duplicado',
    ]);

    await expect(padronService.cargarPadronElectoral('eleccion-123', Buffer.from('')))
      .rejects.toThrow(BadRequestException);
  });

  it('debe completar la transacción si los datos son correctos', async () => {
    const mockRepo = dataSource.getRepository(Eleccion);
    (mockRepo.findOne as jest.Mock).mockResolvedValue({ id: 'eleccion-123' });
    eleccionEstadoService.assertEnConfiguracion.mockResolvedValue(undefined);

    (parsePadronExcelBuffer as jest.Mock).mockReturnValue({
      rows: [{ registro: '1', ci: '123', nombre: 'A', apellido: 'B', carrera: '', facultad: '', codFacultad: '', codLugar: '', lugarVotacion: '' }],
      errors: [],
    });

    (validateNoDuplicatesPadron as jest.Mock).mockReturnValue([]);
    (fusionarFilasDualRol as jest.Mock).mockReturnValue({
      rows: [{ registro: '1', ci: '123', nombre: 'A', apellido: 'B', carrera: '', facultad: '', codFacultad: '', codLugar: '', lugarVotacion: '' }],
      advertencias: []
    });

    (dataSource.transaction as jest.Mock).mockImplementation(async (cb: any) => {
      // Mock manager with repositories
      const manager = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
          }),
          create: jest.fn().mockReturnValue({}),
          upsert: jest.fn().mockResolvedValue({}),
          find: jest.fn().mockResolvedValue([]),
        })
      };
      await cb(manager);
    });

    const result = await padronService.cargarPadronElectoral('eleccion-123', Buffer.from(''));
    expect(result.statusCode).toBe(200);
    expect(dataSource.transaction).toHaveBeenCalled();
  });
});
