import {
  esCiValida,
  esRegistroValido,
  normalizarCi,
  parsearHabilitadoRector,
  splitNombreCompleto,
} from './padron-name-splitter';

describe('padron-name-splitter', () => {
  describe('splitNombreCompleto', () => {
    it('divide tres tokens como dos apellidos + un nombre', () => {
      const result = splitNombreCompleto('PEREZ LOPEZ JUAN');
      expect(result.nombre).toBe('JUAN');
      expect(result.apellido).toBe('PEREZ LOPEZ');
      expect(result.nombreAmbiguo).toBe(false);
    });

    it('divide nombre completo boliviano típico (4+ tokens)', () => {
      const result = splitNombreCompleto('PEREZ LOPEZ JUAN CARLOS');
      expect(result.nombre).toBe('JUAN CARLOS');
      expect(result.apellido).toBe('PEREZ LOPEZ');
      expect(result.nombreAmbiguo).toBe(false);
    });

    it('divide dos tokens como apellido + nombre', () => {
      const result = splitNombreCompleto('GARCIA MARIA');
      expect(result.nombre).toBe('MARIA');
      expect(result.apellido).toBe('GARCIA');
      expect(result.nombreAmbiguo).toBe(false);
    });

    it('marca ambiguo un solo token', () => {
      const result = splitNombreCompleto('PEDRO');
      expect(result.nombre).toBe('PEDRO');
      expect(result.apellido).toBe('-');
      expect(result.nombreAmbiguo).toBe(true);
    });
  });

  describe('normalizarCi', () => {
    it('elimina puntos y guiones', () => {
      expect(normalizarCi('12.345.678')).toBe('12345678');
    });

    it('elimina complemento departamental con espacio', () => {
      expect(normalizarCi('7453385 SC')).toBe('7453385');
    });

    it('elimina complemento departamental con guión', () => {
      expect(normalizarCi('11341460-SCZ')).toBe('11341460');
    });

    it('elimina complemento con guión extendido (1S-SCZ)', () => {
      expect(normalizarCi('9647174-1S-SCZ')).toBe('9647174');
    });
  });

  describe('parsearHabilitadoRector', () => {
    it('acepta variantes afirmativas y negativas', () => {
      expect(parsearHabilitadoRector('SI')).toBe(true);
      expect(parsearHabilitadoRector('no')).toBe(false);
      expect(parsearHabilitadoRector('1')).toBe(true);
      expect(parsearHabilitadoRector('0')).toBe(false);
    });

    it('retorna null para valores no reconocidos', () => {
      expect(parsearHabilitadoRector('tal vez')).toBeNull();
    });
  });

  describe('validaciones de formato', () => {
    it('valida registro numérico', () => {
      expect(esRegistroValido('202012345')).toBe(true);
      expect(esRegistroValido('ABC')).toBe(false);
    });

    it('valida CI de 6 a 10 dígitos', () => {
      expect(esCiValida('1234567')).toBe(true);
      expect(esCiValida('12345')).toBe(false);
    });
  });
});
