import { EstamentoEnum, Elector } from '../../electores/entities/elector.entity';
import { EleccionCargo } from '../entities/eleccion-cargo.entity';
import { PadronElectoral } from '../entities/padron-electoral.entity';
import { AlcancePapeletaEnum } from '../enums/alcance-papeleta.enum';
import { TipoCargoEnum } from '../enums/tipo-cargo.enum';
import { PapeletaEligibilityService } from './papeleta-eligibility.service';

describe('PapeletaEligibilityService', () => {
  const service = new PapeletaEligibilityService();

  const baseElector: Elector = {
    id: 'e1',
    ci: '123',
    registro: '999',
    registroDocente: null,
    nombre: 'JUAN',
    apellido: 'PEREZ',
    estamento: EstamentoEnum.ESTUDIANTE,
    carrera: 'INGENIERIA',
    facultad: 'TECNOLOGIA',
    codFacultad: '15',
    codCarrera: '157-1',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const padronHabilitado = {
    habilitadoRector: true,
    estaHabilitado: true,
  } as PadronElectoral;

  function crearPapeleta(partial: Partial<EleccionCargo>): EleccionCargo {
    return {
      id: 'ec1',
      alcance: AlcancePapeletaEnum.GLOBAL,
      codFacultad: null,
      facultadNombre: null,
      codCarrera: null,
      carreraNombre: null,
      orden: 0,
      estaActiva: true,
      eleccion: {} as any,
      cargo: {
        id: 'c1',
        nombre: 'Rector',
        facultad: '',
        tipoCargo: TipoCargoEnum.RECTOR,
        eleccionCargos: [],
      },
      candidatos: [],
      frentesLegacy: [],
      ...partial,
    } as EleccionCargo;
  }

  it('incluye papeleta GLOBAL para cualquier elector habilitado', () => {
    const papeleta = crearPapeleta({ alcance: AlcancePapeletaEnum.GLOBAL });
    expect(service.esPapeletaAplicable(baseElector, papeleta, padronHabilitado)).toBe(true);
  });

  it('excluye Rector GLOBAL si habilitadoRector es false', () => {
    const papeleta = crearPapeleta({ alcance: AlcancePapeletaEnum.GLOBAL });
    const padron = { ...padronHabilitado, habilitadoRector: false } as PadronElectoral;
    expect(service.esPapeletaAplicable(baseElector, papeleta, padron)).toBe(false);
  });

  it('filtra papeleta FACULTAD por codFacultad', () => {
    const papeleta = crearPapeleta({
      alcance: AlcancePapeletaEnum.FACULTAD,
      codFacultad: '15',
      cargo: {
        id: 'c2',
        nombre: 'Decano',
        facultad: '',
        tipoCargo: TipoCargoEnum.DECANO,
        eleccionCargos: [],
      },
    });

    expect(service.esPapeletaAplicable(baseElector, papeleta, padronHabilitado)).toBe(true);

    const otroElector = { ...baseElector, codFacultad: '99' };
    expect(service.esPapeletaAplicable(otroElector, papeleta, padronHabilitado)).toBe(false);
  });

  it('filtra papeleta CARRERA por codFacultad y codCarrera para estudiantes', () => {
    const papeleta = crearPapeleta({
      alcance: AlcancePapeletaEnum.CARRERA,
      codFacultad: '15',
      codCarrera: '157-1',
      cargo: {
        id: 'c3',
        nombre: 'Director de Carrera',
        facultad: '',
        tipoCargo: TipoCargoEnum.DIRECTOR_CARRERA,
        eleccionCargos: [],
      },
    });

    expect(service.esPapeletaAplicable(baseElector, papeleta, padronHabilitado)).toBe(true);

    const otraCarrera = { ...baseElector, codCarrera: '999-9' };
    expect(service.esPapeletaAplicable(otraCarrera, papeleta, padronHabilitado)).toBe(false);
  });

  it('incluye docentes de la facultad en papeleta CARRERA aunque no tengan codCarrera', () => {
    const papeleta = crearPapeleta({
      alcance: AlcancePapeletaEnum.CARRERA,
      codFacultad: '15',
      codCarrera: '157-1',
      cargo: {
        id: 'c3',
        nombre: 'Director de Carrera',
        facultad: '',
        tipoCargo: TipoCargoEnum.DIRECTOR_CARRERA,
        eleccionCargos: [],
      },
    });

    const docente: Elector = {
      ...baseElector,
      estamento: EstamentoEnum.DOCENTE,
      codCarrera: null,
      carrera: 'DEPARTAMENTO INGENIERIA',
    };

    expect(service.esPapeletaAplicable(docente, papeleta, padronHabilitado)).toBe(true);

    const docenteOtraFacultad = { ...docente, codFacultad: '99' };
    expect(service.esPapeletaAplicable(docenteOtraFacultad, papeleta, padronHabilitado)).toBe(false);
  });
});
