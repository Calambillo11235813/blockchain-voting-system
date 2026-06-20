import { EstamentoEnum } from '../../../electores/entities/elector.entity';
import { FilaPadronNormalizada } from './padron-excel.schemas';
import { fusionarFilasDualRol } from './padron-excel.merger';
import { validateNoDuplicatesPadron } from './padron-excel.validators';

function filaBase(partial: Partial<FilaPadronNormalizada>): FilaPadronNormalizada {
  return {
    registro: '100',
    ci: '1234567',
    nombre: 'JUAN',
    apellido: 'PEREZ LOPEZ',
    estamento: EstamentoEnum.ESTUDIANTE,
    carrera: 'INFORMATICA',
    facultad: 'INGENIERIA',
    codFacultad: '01',
    codCarrera: 'CP01',
    codLugar: 'L01',
    lugarVotacion: 'AUDITORIO',
    habilitadoRector: true,
    __sheetName: 'Estudiantes',
    __rowNumber: 2,
    ...partial,
  };
}

describe('padron dual-rol', () => {
  it('permite la misma CI en estudiantes y docentes si es la misma persona', () => {
    const rows = [
      filaBase({
        registro: '981019986',
        ci: '4728253',
        nombre: 'ARTURO',
        apellido: 'SALAZAR ORIAS',
        carrera: 'DERECHO',
        __sheetName: 'estudiantes',
        __rowNumber: 673,
      }),
      filaBase({
        registro: '7580',
        ci: '4728253',
        nombre: 'ARTURO',
        apellido: 'SALAZAR ORIAS',
        estamento: EstamentoEnum.DOCENTE,
        carrera: 'INTEGRAL CHIQUITANA',
        codCarrera: undefined,
        __sheetName: 'docentes',
        __rowNumber: 12,
      }),
    ];

    expect(validateNoDuplicatesPadron(rows)).toEqual([]);
  });

  it('fusiona estudiante + docente en una sola fila con registroDocente', () => {
    const rows = [
      filaBase({
        registro: '981019986',
        ci: '4728253',
        nombre: 'ARTURO',
        apellido: 'SALAZAR ORIAS',
        carrera: 'DERECHO',
        __sheetName: 'estudiantes',
      }),
      filaBase({
        registro: '7580',
        ci: '4728253',
        nombre: 'ARTURO',
        apellido: 'SALAZAR ORIAS',
        estamento: EstamentoEnum.DOCENTE,
        __sheetName: 'docentes',
      }),
    ];

    const { rows: fusionadas, advertencias } = fusionarFilasDualRol(rows);

    expect(fusionadas).toHaveLength(1);
    expect(fusionadas[0].registro).toBe('981019986');
    expect(fusionadas[0].registroDocente).toBe('7580');
    expect(fusionadas[0].estamento).toBe(EstamentoEnum.DOCENTE);
    expect(fusionadas[0].carrera).toBe('DERECHO');
    expect(advertencias).toHaveLength(1);
  });
});
