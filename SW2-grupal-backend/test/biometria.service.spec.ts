import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BiometriaService } from 'src/biometria/biometria.service';
import { FaceMatchService } from 'src/biometria/services/face-match.service';
import { OcrService } from 'src/biometria/services/ocr.service';
import { ElectoresService } from 'src/electores/electores.service';
import { ConfiguracionService } from 'src/elecciones/services/configuracion.service';
import { ArchivosBiometriaValidados } from 'src/biometria/dto/validar-identidad-archivos.dto';
import { Elector, EstamentoEnum } from 'src/electores/entities/elector.entity';

describe('BiometriaService (Pb-10)', () => {
  let biometriaService: BiometriaService;
  let ocrService: jest.Mocked<OcrService>;
  let faceMatchService: jest.Mocked<FaceMatchService>;
  let electoresService: jest.Mocked<ElectoresService>;
  let configuracionService: jest.Mocked<ConfiguracionService>;

  beforeEach(async () => {
    // Mock the dependencies
    const mockOcrService = {
      extraerDatosDesdeCarnet: jest.fn(),
      normalizarCandidatosCi: jest.fn(),
      pareceFecha: jest.fn(),
    };
    const mockFaceMatchService = {
      verificarRostro: jest.fn(),
    };
    const mockElectoresService = {
      buscarPorCi: jest.fn(),
    };
    const mockConfiguracionService = {
      obtenerValor: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiometriaService,
        { provide: OcrService, useValue: mockOcrService },
        { provide: FaceMatchService, useValue: mockFaceMatchService },
        { provide: ElectoresService, useValue: mockElectoresService },
        { provide: ConfiguracionService, useValue: mockConfiguracionService },
      ],
    }).compile();

    biometriaService = module.get<BiometriaService>(BiometriaService);
    ocrService = module.get(OcrService);
    faceMatchService = module.get(FaceMatchService);
    electoresService = module.get(ElectoresService);
    configuracionService = module.get(ConfiguracionService);

    // Default configuration bypass to false
    configuracionService.obtenerValor.mockResolvedValue(false);

    // Mock file deletion explicitly to avoid fs/promises errors
    jest.spyOn(biometriaService as any, 'eliminarArchivosTemporales').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const crearMockArchivos = (): ArchivosBiometriaValidados => ({
    frontal: { path: 'frontal.jpg', originalname: 'frontal.jpg', mimetype: 'image/jpeg', size: 1000 } as any,
    trasera: { path: 'trasera.jpg', originalname: 'trasera.jpg', mimetype: 'image/jpeg', size: 1000 } as any,
    selfie: { path: 'selfie.jpg', originalname: 'selfie.jpg', mimetype: 'image/jpeg', size: 1000 } as any,
  });

  const crearMockElector = (): Elector => ({
    id: 'elector-123',
    registro: '1001',
    registroDocente: null,
    ci: '1234567',
    nombre: 'JUAN',
    apellido: 'PEREZ',
    estamento: EstamentoEnum.ESTUDIANTE,
    carrera: 'INGENIERIA',
    facultad: 'TECNOLOGIA',
    codFacultad: '01',
    codCarrera: 'ING-01',
    created_at: new Date(),
    updated_at: new Date(),
  } as Elector);

  it('debe validar exitosamente si el OCR, Padrón y FaceMatch coinciden', async () => {
    const archivos = crearMockArchivos();
    const elector = crearMockElector();

    ocrService.extraerDatosDesdeCarnet.mockResolvedValue({
      ci: '1234567',
      nombres: 'JUAN',
      apellidos: 'PEREZ',
      candidatosCi: [],
    });
    ocrService.normalizarCandidatosCi.mockReturnValue(['1234567']);
    electoresService.buscarPorCi.mockResolvedValue(elector);
    faceMatchService.verificarRostro.mockResolvedValue(true);

    const resultado = await biometriaService.validarIdentidad(archivos);

    expect(resultado.verificado).toBe(true);
    expect(resultado.datosElector.id).toBe(elector.id);
    expect(faceMatchService.verificarRostro).toHaveBeenCalledWith('frontal.jpg', 'selfie.jpg');
  });

  it('debe arrojar BadRequestException si el OCR extrae un nombre distinto al del padrón', async () => {
    const archivos = crearMockArchivos();
    const elector = crearMockElector();

    ocrService.extraerDatosDesdeCarnet.mockResolvedValue({
      ci: '1234567',
      nombres: 'PEDRO', // No coincide con "JUAN"
      apellidos: 'PEREZ',
      candidatosCi: [],
    });
    ocrService.normalizarCandidatosCi.mockReturnValue(['1234567']);
    electoresService.buscarPorCi.mockResolvedValue(elector);

    await expect(biometriaService.validarIdentidad(archivos))
      .rejects.toThrow(BadRequestException);
    
    // El facematch no deberia ser llamado porque falló la validación de nombres
    expect(faceMatchService.verificarRostro).not.toHaveBeenCalled();
  });

  it('debe arrojar BadRequestException si el FaceMatch falla', async () => {
    const archivos = crearMockArchivos();
    const elector = crearMockElector();

    ocrService.extraerDatosDesdeCarnet.mockResolvedValue({
      ci: '1234567',
      nombres: 'JUAN',
      apellidos: 'PEREZ',
      candidatosCi: [],
    });
    ocrService.normalizarCandidatosCi.mockReturnValue(['1234567']);
    electoresService.buscarPorCi.mockResolvedValue(elector);
    
    // Simulamos que el FaceMatch retorna falso (no es la misma persona)
    faceMatchService.verificarRostro.mockResolvedValue(false);

    await expect(biometriaService.validarIdentidad(archivos))
      .rejects.toThrow(BadRequestException);
  });
});
