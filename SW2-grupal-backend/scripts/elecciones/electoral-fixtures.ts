import { AlcancePapeletaEnum } from '../../src/elecciones/enums/alcance-papeleta.enum';
import { TipoCargoEnum } from '../../src/elecciones/enums/tipo-cargo.enum';

/** Elección de prueba creada por seed-eleccion-papeletas.ts */
export const ELECCION_ID = 'eeeeeeee-eeee-eeee-eeee-000000000001';

export const ELECCION_FIXTURE = {
  id: ELECCION_ID,
  titulo: 'Eleccion prueba 1',
  gestion: 2026,
  /** Fecha de jornada (YYYY-MM-DD) */
  fecha: '2026-06-22',
  restriccionAlfabeticaActiva: true,
};

/** IDs fijos de papeletas (eleccion_cargo) — usados también en seed-electoral-data.ts */
export const PAPELETA_RECTORADO = 'b62b9cba-fa63-455e-9108-dae297ff89a8';
export const PAPELETA_DECANATO = 'c1615ccd-a305-426a-8995-43c94a258068';
export const PAPELETA_DIRECTOR = 'e32d1032-dfbb-4a30-ae54-1744ac6a2da2';

export const FACULTAD_FICCT = {
  /** Patrón para resolver codFacultad desde el catálogo de electores */
  busquedaNombre: 'COMPUTACIÓN Y TELECOMUNICACIONES',
  nombre: 'FACULTAD DE INGENIERÍA EN CIENCIAS DE LA COMPUTACIÓN Y TELECOMUNICACIONES',
};

export const CARRERA_SISTEMAS = {
  busquedaNombre: 'SISTEMAS',
  nombre: 'INGENIERÍA EN SISTEMAS',
};

export const PAPELETAS_FIXTURE = [
  {
    id: PAPELETA_RECTORADO,
    cargoId: '22222222-2222-2222-2222-000000000003',
    nombre: 'Rector y Vicerrector',
    tipoCargo: TipoCargoEnum.RECTOR,
    alcance: AlcancePapeletaEnum.GLOBAL,
    orden: 1,
    codFacultad: null as string | null,
    facultadNombre: null as string | null,
    codCarrera: null as string | null,
    carreraNombre: null as string | null,
  },
  {
    id: PAPELETA_DECANATO,
    cargoId: '22222222-2222-2222-2222-000000000001',
    nombre: 'Decano y Vicedecano',
    tipoCargo: TipoCargoEnum.DECANO,
    alcance: AlcancePapeletaEnum.FACULTAD,
    orden: 2,
    codFacultad: null as string | null,
    facultadNombre: FACULTAD_FICCT.nombre,
    codCarrera: null as string | null,
    carreraNombre: null as string | null,
  },
  {
    id: PAPELETA_DIRECTOR,
    cargoId: '22222222-2222-2222-2222-000000000002',
    nombre: 'Director de Carrera',
    tipoCargo: TipoCargoEnum.DIRECTOR_CARRERA,
    alcance: AlcancePapeletaEnum.CARRERA,
    orden: 3,
    codFacultad: null as string | null,
    facultadNombre: FACULTAD_FICCT.nombre,
    codCarrera: null as string | null,
    carreraNombre: CARRERA_SISTEMAS.nombre,
  },
];

export const FRENTES_DATA = [
  { id: '83352964-9764-4888-a79b-4f0d58c23a40', nombreFrente: 'Renovacion estudiantil', sigla: 'RE', logoUrl: '/images/frentes/re.png' },
  { id: '518f73dc-c22f-4629-bb8a-3cc2c48656c3', nombreFrente: 'Fuerza Academica', sigla: 'FA', logoUrl: '/images/frentes/fa.png' },
  { id: '379aa559-d19d-4e00-a443-0377eaaa9ffd', nombreFrente: 'Juventud Innovadora', sigla: 'JI', logoUrl: '/images/frentes/ji.png' },
];

export const FRENTE_RE = '83352964-9764-4888-a79b-4f0d58c23a40';
export const FRENTE_FA = '518f73dc-c22f-4629-bb8a-3cc2c48656c3';
export const FRENTE_JI = '379aa559-d19d-4e00-a443-0377eaaa9ffd';
