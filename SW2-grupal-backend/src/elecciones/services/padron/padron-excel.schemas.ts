import { EstamentoEnum } from '../../../electores/entities/elector.entity';

/** Fila normalizada tras parsear cualquiera de las hojas del padrón. */
export interface FilaPadronNormalizada {
  registro: string;
  ci: string;
  nombre: string;
  apellido: string;
  estamento: EstamentoEnum;
  carrera: string;
  facultad: string;
  codFacultad: string;
  codCarrera?: string;
  codLugar: string;
  lugarVotacion: string;
  habilitadoRector: boolean;
  /** Cod.Docente cuando la persona también figura como estudiante. */
  registroDocente?: string;
  __sheetName: string;
  __rowNumber: number;
}

export interface ResultadoParseoPadron {
  rows: FilaPadronNormalizada[];
  errors: string[];
  estudiantesProcesados: number;
  docentesProcesados: number;
}

export type CampoInternoPadron =
  | 'codFacultad'
  | 'facultad'
  | 'codLugar'
  | 'lugarVotacion'
  | 'codCarrera'
  | 'carrera'
  | 'registro'
  | 'nombreCompleto'
  | 'ci'
  | 'habilitadoRector';

export interface EsquemaHojaPadron {
  sheetAliases: string[];
  estamento: EstamentoEnum;
  requiredColumns: CampoInternoPadron[];
  headerAliases: Record<string, CampoInternoPadron>;
}

/** Esquema de la hoja Estudiantes. */
export const ESQUEMA_ESTUDIANTES: EsquemaHojaPadron = {
  sheetAliases: ['estudiantes', 'estudiante'],
  estamento: EstamentoEnum.ESTUDIANTE,
  requiredColumns: [
    'codFacultad',
    'facultad',
    'codLugar',
    'lugarVotacion',
    'codCarrera',
    'carrera',
    'registro',
    'nombreCompleto',
    'ci',
    'habilitadoRector',
  ],
  headerAliases: {
    'cod.fac.': 'codFacultad',
    'cod fac': 'codFacultad',
    'cod fac.': 'codFacultad',
    'codfac': 'codFacultad',
    fac: 'codFacultad',
    facultad: 'facultad',
    'cod.lugar': 'codLugar',
    'cod. lugar': 'codLugar',
    'cod lugar': 'codLugar',
    'lugar de votacion': 'lugarVotacion',
    'carr-pl': 'codCarrera',
    'carr pl': 'codCarrera',
    carrera: 'carrera',
    registro: 'registro',
    nombre: 'nombreCompleto',
    ci: 'ci',
    rector: 'habilitadoRector',
  },
};

/** Esquema de la hoja Docentes. */
export const ESQUEMA_DOCENTES: EsquemaHojaPadron = {
  sheetAliases: ['docentes', 'docente'],
  estamento: EstamentoEnum.DOCENTE,
  requiredColumns: [
    'codFacultad',
    'facultad',
    'codLugar',
    'lugarVotacion',
    'registro',
    'nombreCompleto',
    'ci',
    'habilitadoRector',
  ],
  headerAliases: {
    'cod.fac.': 'codFacultad',
    'cod fac': 'codFacultad',
    'codfac': 'codFacultad',
    facultad: 'facultad',
    'cod.lugar': 'codLugar',
    'cod lugar': 'codLugar',
    lugar: 'lugarVotacion',
    'cod.docente': 'registro',
    'cod docente': 'registro',
    docente: 'nombreCompleto',
    'c.i.': 'ci',
    ci: 'ci',
    rector: 'habilitadoRector',
  },
};

export const ESQUEMAS_PADRON: EsquemaHojaPadron[] = [
  ESQUEMA_ESTUDIANTES,
  ESQUEMA_DOCENTES,
];
